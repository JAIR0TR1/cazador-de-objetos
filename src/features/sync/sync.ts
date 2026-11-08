import NetInfo from '@react-native-community/netinfo';
import * as Crypto from 'expo-crypto';
import { AppState } from 'react-native';

import { authStore, guestItemsToImport, setOwnerChangedHandler } from '@/features/auth/authStore';
import { clearGuestCollection, collectionStore, isSignedInOwner, patchState, setItems, setSyncTrigger } from '@/features/collection/collectionStore';
import { demoGlbUri } from '@/features/creatures/demo';
import { persistPhotos } from '@/services/storage/files';
import { deleteCreatureRemote, fetchCreatureRows, isUuid, rowToCreature, signPhotoPaths, upsertCreatureRow, uploadPhotos } from '@/services/supabase/creatures';
import { isNetworkError } from '@/services/supabase/errors';
import type { Creature } from '@/types';

const userId = () => authStore.get().session?.user.id ?? null;

async function isOnline() {
  const st = await NetInfo.fetch();
  return st.isConnected !== false && st.isInternetReachable !== false;
}

let running: Promise<void> | null = null;
let again = false;

/**
 * Procesa la cola: borra en el servidor lo eliminado sin conexión y sube las criaturas
 * "pending" (fotos → Storage, ficha → tabla). Si una falla, queda pendiente para el próximo intento.
 */
export function syncNow(): Promise<void> {
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    do {
      again = false;
      await syncOnce();
    } while (again);
  })().finally(() => {
    running = null;
  });
  return running;
}

async function syncOnce() {
  const uid = userId();
  const st = collectionStore.get();
  if (!uid || st.owner !== uid) return;
  const pendingItems = st.items.filter((c) => c.syncStatus === 'pending');
  if (!pendingItems.length && !st.pendingDeletes.length) return;
  if (!(await isOnline())) return;

  patchState({ syncing: true });
  try {
    for (const id of [...collectionStore.get().pendingDeletes]) {
      try {
        await deleteCreatureRemote(uid, id);
        patchState({ pendingDeletes: collectionStore.get().pendingDeletes.filter((x) => x !== id) });
      } catch (e) {
        if (isNetworkError(e)) return;
      }
    }
    for (const c of pendingItems) {
      if (collectionStore.get().owner !== uid) return; // cambió la cuenta a mitad de camino
      try {
        const localPhotos = c.photos.filter((p) => p.startsWith('file:'));
        const paths = localPhotos.length ? await uploadPhotos(uid, c.id, localPhotos) : (c.photoPaths ?? []);
        await upsertCreatureRow(c, uid, paths);
        const cur = collectionStore.get();
        setItems(cur.items.map((x) => (x.id === c.id ? { ...x, syncStatus: 'synced', photoPaths: paths } : x)));
      } catch (e) {
        if (isNetworkError(e)) return;
        // Error de datos/permisos: se deja pendiente y se reintenta más tarde sin bloquear al resto.
      }
    }
  } finally {
    patchState({ syncing: false });
  }
}

/**
 * Lee la colección desde Supabase y la cachea en local. Conserva lo que aún no se subió
 * (pending) y las criaturas solo locales (demo), y reutiliza fotos locales si existen.
 */
export async function refreshCollection(): Promise<void> {
  const uid = userId();
  if (!uid || collectionStore.get().owner !== uid) return;
  patchState({ remote: 'loading', remoteError: null });
  try {
    await syncNow();
    const rows = await fetchCreatureRows();
    const signed = await signPhotoPaths(rows.flatMap((r) => r.photo_urls));
    const demo = rows.some((r) => r.is_demo) ? await demoGlbUri() : null;
    if (collectionStore.get().owner !== uid) return;
    const local = new Map(collectionStore.get().items.map((c) => [c.id, c]));
    const remote = rows.map((r) => {
      const c = rowToCreature(r, signed, demo);
      const prev = local.get(c.id);
      // Fotos propias de este teléfono: se ven sin red y no caducan.
      if (prev && prev.photos.some((p) => p.startsWith('file:'))) return { ...c, photos: prev.photos, glbUri: c.glbUri ?? prev.glbUri, modelStatus: prev.modelStatus };
      return c;
    });
    const remoteIds = new Set(remote.map((c) => c.id));
    const deleted = new Set(collectionStore.get().pendingDeletes);
    const keep = collectionStore.get().items.filter((c) => !remoteIds.has(c.id) && c.syncStatus !== 'synced');
    const merged = [...keep, ...remote.filter((c) => !deleted.has(c.id))].sort((a, b) => b.createdAt - a.createdAt);
    setItems(merged);
    patchState({ remote: 'ok' });
  } catch (e) {
    patchState({
      remote: 'error',
      remoteError: isNetworkError(e) ? 'Sin conexión. Mostrando tu colección guardada en este teléfono.' : 'No pudimos cargar tu colección desde la nube.',
    });
  }
}

/**
 * Migra la colección de invitado a la cuenta: copia las fotos a la carpeta del usuario,
 * asigna UUID a las criaturas antiguas, las marca "pending" y sincroniza.
 */
export async function importGuestCollection(): Promise<number> {
  const uid = userId();
  if (!uid) return 0;
  const guestItems = await guestItemsToImport();
  if (!guestItems.length) return 0;
  const existing = new Set(collectionStore.get().items.map((c) => c.id));
  const imported: Creature[] = [];
  for (const c of guestItems) {
    const id = isUuid(c.id) ? c.id : Crypto.randomUUID();
    if (existing.has(id)) continue;
    const photos = id === c.id ? c.photos : await persistPhotos(id, c.photos.filter((p) => p.startsWith('file:')));
    imported.push({ ...c, id, photos, syncStatus: 'pending' });
  }
  const cur = collectionStore.get();
  setItems([...imported, ...cur.items].sort((a, b) => b.createdAt - a.createdAt));
  await clearGuestCollection();
  await syncNow();
  return imported.length;
}

let watching = false;

/** Arranca una vez: sincroniza al reconectar, al volver a primer plano y al cambiar de cuenta. */
export function startSyncWatchers() {
  setSyncTrigger(() => void syncNow());
  setOwnerChangedHandler((owner) => {
    if (owner !== 'guest') void refreshCollection();
  });
  if (watching) return;
  watching = true;
  let wasOffline = false;
  NetInfo.addEventListener((st) => {
    const offline = st.isConnected === false || st.isInternetReachable === false;
    if (wasOffline && !offline && isSignedInOwner()) void refreshCollection();
    wasOffline = offline;
  });
  AppState.addEventListener('change', (s) => {
    if (s === 'active' && isSignedInOwner()) void syncNow();
  });
}
