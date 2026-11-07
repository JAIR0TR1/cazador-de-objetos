import { useMemo } from 'react';

import { createStore, useStore } from '@/services/storage/createStore';
import { deleteAllFiles, deleteCreatureFiles } from '@/services/storage/files';
import { clearAllKeys, getJSON, KEYS, setJSON } from '@/services/storage/kv';
import type { Creature, CreatureType, Rarity } from '@/types';

interface CollectionState {
  loaded: boolean;
  items: Creature[]; // más reciente primero
}

export const collectionStore = createStore<CollectionState>({ loaded: false, items: [] });

const persist = () => setJSON(KEYS.collection, collectionStore.get().items);

export async function loadCollection() {
  const items = await getJSON<Creature[]>(KEYS.collection, []);
  // Un modelo que quedó "pending" de una sesión anterior ya no se puede recuperar.
  const fixed = items.map((c) => (c.modelStatus === 'pending' ? { ...c, modelStatus: 'failed' as const } : c));
  collectionStore.set({ loaded: true, items: fixed });
}

export function addCreature(c: Creature) {
  collectionStore.set((s) => ({ ...s, items: [c, ...s.items.filter((x) => x.id !== c.id)] }));
  persist();
}

export function updateCreature(id: string, patch: Partial<Creature>) {
  collectionStore.set((s) => ({ ...s, items: s.items.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  persist();
}

export function removeCreature(id: string) {
  collectionStore.set((s) => ({ ...s, items: s.items.filter((c) => c.id !== id) }));
  deleteCreatureFiles(id);
  persist();
}

export async function wipeAllData() {
  deleteAllFiles();
  await clearAllKeys();
  collectionStore.set({ loaded: true, items: [] });
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
    for (const c of state.items) {
      byRarity[c.analysis.criatura.rareza]++;
      byType[c.analysis.criatura.tipo] = (byType[c.analysis.criatura.tipo] ?? 0) + 1;
    }
    return {
      ...state,
      latest: state.items[0] ?? null,
      byRarity,
      byType,
      streak: computeStreak(state.items),
    };
  }, [state]);
}
