import { useMemo } from 'react';

import { createStore, useStore } from '@/services/storage/createStore';
import { deleteAllFiles, deleteCreatureFiles } from '@/services/storage/files';
import { clearAllKeys, getJSON, KEYS, removeKeys, setJSON } from '@/services/storage/kv';
import type { Creature, CreatureType, Rarity } from '@/types';

/** 'guest' = colección local del modo invitado; si no, el id (uuid) del usuario. */
export type Owner = 'guest' | string;

export type RemoteStatus = 'idle' | 'loading' | 'ok' | 'error';

interface CollectionState {
  loaded: boolean;
  owner: Owner;
  items: Creature[]; // más reciente primero
  /** Ids de criaturas sincronizadas que se borraron sin conexión: se borran en el servidor al reconectar. */
  pendingDeletes: string[];
  remote: RemoteStatus;
  remoteError: string | null;
  syncing: boolean;
}

export const collectionStore = createStore<CollectionState>({
  loaded: false,
  owner: 'guest',
  items: [],
  pendingDeletes: [],
  remote: 'idle',
  remoteError: null,
  syncing: false,
});

const itemsKey = (o: Owner) => (o === 'guest' ? KEYS.collection : `cazador:collection:u:${o}:v1`);
const deletesKey = (o: Owner) => `cazador:pending-deletes:${o}:v1`;

const persist = () => {
  const s = collectionStore.get();
  setJSON(itemsKey(s.owner), s.items);
  setJSON(deletesKey(s.owner), s.pendingDeletes);
};

/** Avisa al motor de sincronización (se registra desde features/sync para evitar ciclos). */
let syncTrigger: () => void = () => {};
export const setSyncTrigger = (fn: () => void) => {
  syncTrigger = fn;
};

export const isSignedInOwner = (o: Owner = collectionStore.get().owner) => o !== 'guest';

export async function readCachedItems(owner: Owner): Promise<Creature[]> {
  const items = await getJSON<Creature[]>(itemsKey(owner), []);
  // Un modelo que quedó "pending" de una sesión anterior ya no se puede recuperar.
  return items.map((c) => (c.modelStatus === 'pending' ? { ...c, modelStatus: 'failed' as const } : c));
}

/** Carga la caché local del dueño indicado (se usa al abrir la app y al cambiar de cuenta). */
export async function loadCollection(owner: Owner = 'guest') {
  const [items, pendingDeletes] = await Promise.all([readCachedItems(owner), getJSON<string[]>(deletesKey(owner), [])]);
  collectionStore.set({ loaded: true, owner, items, pendingDeletes, remote: 'idle', remoteError: null, syncing: false });
}

export function setItems(items: Creature[]) {
  collectionStore.set((s) => ({ ...s, items }));
  persist();
}

export function patchState(p: Partial<Pick<CollectionState, 'remote' | 'remoteError' | 'syncing' | 'pendingDeletes'>>) {
  collectionStore.set((s) => ({ ...s, ...p }));
  if (p.pendingDeletes) persist();
}

/** Guardado optimista: primero en local; si hay cuenta, queda "pendiente" y se sube en segundo plano. */
export function addCreature(c: Creature) {
  const owner = collectionStore.get().owner;
  const syncStatus: Creature['syncStatus'] = owner === 'guest' ? 'local' : c.syncStatus === 'synced' ? 'synced' : c.isDemo ? 'local' : 'pending';
  const item = { ...c, syncStatus };
  collectionStore.set((s) => ({ ...s, items: [item, ...s.items.filter((x) => x.id !== c.id)] }));
  persist();
  if (syncStatus === 'pending') syncTrigger();
}

export function updateCreature(id: string, patch: Partial<Creature>) {
  collectionStore.set((s) => ({ ...s, items: s.items.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  persist();
}

export function removeCreature(id: string) {
  const s = collectionStore.get();
  const target = s.items.find((c) => c.id === id);
  const needsRemoteDelete = isSignedInOwner(s.owner) && target?.syncStatus !== 'local';
  collectionStore.set((st) => ({
    ...st,
    items: st.items.filter((c) => c.id !== id),
    pendingDeletes: needsRemoteDelete ? [...st.pendingDeletes.filter((x) => x !== id), id] : st.pendingDeletes,
  }));
  deleteCreatureFiles(id);
  persist();
  if (needsRemoteDelete) syncTrigger();
}

/** Borra la caché de un usuario (al cerrar sesión). Las fotos locales del teléfono también. */
export async function clearOwnerCache(owner: Owner) {
  const items = await readCachedItems(owner);
  items.forEach((c) => deleteCreatureFiles(c.id));
  await removeKeys([itemsKey(owner), deletesKey(owner)]);
}

export async function clearGuestCollection() {
  await removeKeys([itemsKey('guest'), deletesKey('guest')]);
  if (collectionStore.get().owner === 'guest') collectionStore.set((s) => ({ ...s, items: [], pendingDeletes: [] }));
}

export async function wipeAllData() {
  deleteAllFiles();
  await clearAllKeys();
  collectionStore.set((s) => ({ ...s, loaded: true, items: [], pendingDeletes: [] }));
}

export const getCreature = (id: string) => collectionStore.get().items.find((c) => c.id === id);

/** Días consecutivos (hasta hoy o ayer) con al menos una captura real. */
export function computeStreak(items: Creature[], now = Date.now()): number {
  const dayKey = (t: number) => {
    const d = new Date(t);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  };
  const days = new Set(items.filter((c) => !c.isDemo).map((c) => dayKey(c.createdAt)));
  const DAY = 86400000;
  let cursor = days.has(dayKey(now)) ? now : now - DAY;
  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak++;
    cursor -= DAY;
  }
  return streak;
}

export function useCollection() {
  const state = useStore(collectionStore);
  return useMemo(() => {
    const byRarity = { Común: 0, Rara: 0, Épica: 0, Legendaria: 0 } as Record<Rarity, number>;
    const byType: Partial<Record<CreatureType, number>> = {};
    let pending = 0;
    for (const c of state.items) {
      byRarity[c.analysis.criatura.rareza]++;
      byType[c.analysis.criatura.tipo] = (byType[c.analysis.criatura.tipo] ?? 0) + 1;
      if (c.syncStatus === 'pending') pending++;
    }
    return {
      ...state,
      latest: state.items[0] ?? null,
      byRarity,
      byType,
      pending: pending + state.pendingDeletes.length,
      streak: computeStreak(state.items),
    };
  }, [state]);
}
