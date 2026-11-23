/**
 * Migración invitado → cuenta, aislamiento entre usuarios en el mismo teléfono y guardado idempotente.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { authStore, signIn, signOut } from '@/features/auth/authStore';
import { addCreature, collectionStore, loadCollection, readCachedItems } from '@/features/collection/collectionStore';
import { saveSession, sessionStore, startNewSession } from '@/features/scanner/session';
import { importGuestCollection, refreshCollection, startSyncWatchers } from '@/features/sync/sync';
import { persistPhotos } from '@/services/storage/files';
import { supabase } from '@/services/supabase/client';
import * as remote from '@/services/supabase/creatures';
import { makeAnalysis, makeCreature } from '../../jest/factories';
import { fakeSession } from '../../jest/supabaseMock';

jest.mock('@/services/supabase/client', () => require('../../jest/supabaseMock').createSupabaseClientMock());
jest.mock('@/features/creatures/demo', () => ({ DEMO_ANALYSES: [], demoGlbUri: jest.fn(async () => null) }));
jest.mock('@/services/api/model3d/providers', () => ({ getModel3DProvider: () => ({ start: async () => null, status: async () => ({}) }) }));
jest.mock('@/services/supabase/creatures', () => ({
  isUuid: (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s),
  uploadPhotos: jest.fn(async (uid: string, id: string, uris: string[]) => uris.map((_, i) => `${uid}/${id}/${i}.jpg`)),
  upsertCreatureRow: jest.fn(async () => {}),
  deleteCreatureRemote: jest.fn(async () => {}),
  fetchCreatureRows: jest.fn(async () => []),
  signPhotoPaths: jest.fn(async () => ({})),
  rowToCreature: jest.fn(),
}));

const auth = supabase.auth as unknown as Record<string, jest.Mock>;
const api = remote as jest.Mocked<typeof remote>;
const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const flush = async () => {
  for (let i = 0; i < 6; i++) await new Promise((r) => setImmediate(r));
};
const login = async (uid: string) => {
  auth.signInWithPassword.mockResolvedValueOnce({ data: { session: fakeSession(uid) }, error: null });
  await signIn(`${uid.slice(0, 4)}@correo.com`, 'x');
  await flush();
};

beforeAll(() => startSyncWatchers());
beforeEach(async () => {
  await AsyncStorage.clear();
  authStore.set({ loaded: true, session: null, guest: true });
  await loadCollection('guest');
  await flush();
  jest.clearAllMocks();
});

describe('migración de invitado a cuenta ("Subir mi colección")', () => {
  it('sube las criaturas reales, deja fuera las demo y vacía la colección de invitado', async () => {
    addCreature(makeCreature({ id: 'viejo-id-local', photos: ['file:///cache/a.jpg'] }));
    addCreature(makeCreature({ id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', photos: ['file:///doc/b.jpg'] }));
    addCreature(makeCreature({ id: 'demo-1', isDemo: true }));
    await flush();

    await login(A);
    const n = await importGuestCollection();
    await flush();

    expect(n).toBe(2);
    const items = collectionStore.get().items;
    // El id no-UUID recibe un UUID nuevo y sus fotos se copian a la carpeta del nuevo id.
    expect(items.some((c) => c.id === 'viejo-id-local')).toBe(false);
    expect(items.some((c) => c.id === 'cccccccc-cccc-4ccc-8ccc-cccccccccccc')).toBe(true);
    expect(persistPhotos).toHaveBeenCalledTimes(1);
    expect(items.every((c) => !c.isDemo)).toBe(true);
    expect(items.every((c) => c.syncStatus === 'synced')).toBe(true);
    expect(api.upsertCreatureRow).toHaveBeenCalledTimes(2);
    expect(await readCachedItems('guest')).toEqual([]);
  });

  it('importar dos veces no duplica', async () => {
    addCreature(makeCreature({ id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' }));
    await flush();
    await login(A);
    await importGuestCollection();
    expect(await importGuestCollection()).toBe(0);
    expect(collectionStore.get().items.filter((c) => c.id === 'dddddddd-dddd-4ddd-8ddd-dddddddddddd')).toHaveLength(1);
  });

  it('sin sesión no importa nada', async () => {
    addCreature(makeCreature({ id: 'x' }));
    expect(await importGuestCollection()).toBe(0);
  });
});

describe('aislamiento entre usuarios en el mismo teléfono', () => {
  it('B nunca ve las criaturas de A (ni en memoria ni en la caché)', async () => {
    await login(A);
    addCreature(makeCreature({ id: 'de-A', syncStatus: 'synced' }));
    await flush();
    await signOut();
    await login(B);
    expect(collectionStore.get().owner).toBe(B);
    expect(collectionStore.get().items.map((c) => c.id)).not.toContain('de-A');
    expect(await readCachedItems(B)).toEqual([]);
    // Y la copia local de A se borró al cerrar su sesión.
    expect(await readCachedItems(A)).toEqual([]);
  });

  it('si la cuenta cambia mientras llega la respuesta de la nube, no mezcla datos', async () => {
    await login(A);
    let release!: () => void;
    api.fetchCreatureRows.mockImplementationOnce(
      () =>
        new Promise((res) => {
          release = () => res([{ id: 'fila-de-A', photo_urls: [], is_demo: false } as never]);
        }),
    );
    api.rowToCreature.mockImplementation((r) => makeCreature({ id: r.id, syncStatus: 'synced' }));
    const pending = refreshCollection();
    await flush();
    await signOut();
    await login(B);
    release();
    await pending;
    await flush();
    expect(collectionStore.get().owner).toBe(B);
    expect(collectionStore.get().items.map((c) => c.id)).not.toContain('fila-de-A');
  });
});

describe('guardar desde el resultado', () => {
  it('doble toque rápido en "Guardar" no duplica la criatura', async () => {
    startNewSession([{ uri: 'file:///cache/1.jpg', base64: 'x', segment: 0 }]);
    sessionStore.set((s) => ({ ...s, analysis: makeAnalysis(), analysisStatus: 'done' }));
    await Promise.all([saveSession(), saveSession(), saveSession()]);
    const id = sessionStore.get().id;
    expect(collectionStore.get().items.filter((c) => c.id === id)).toHaveLength(1);
  });

  it('sin análisis no guarda nada', async () => {
    startNewSession([{ uri: 'file:///cache/1.jpg', base64: 'x', segment: 0 }]);
    await expect(saveSession()).resolves.toBeNull();
    expect(collectionStore.get().items).toHaveLength(0);
  });
});
