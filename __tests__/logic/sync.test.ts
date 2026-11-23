/**
 * Cola de sincronización: local → pending → synced, idempotencia, errores y reintento al volver la red.
 */
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { authStore } from '@/features/auth/authStore';
import { addCreature, collectionStore, loadCollection, removeCreature } from '@/features/collection/collectionStore';
import { refreshCollection, startSyncWatchers, syncNow } from '@/features/sync/sync';
import * as remote from '@/services/supabase/creatures';
import { makeCreature } from '../../jest/factories';
import { fakeSession } from '../../jest/supabaseMock';

jest.mock('@/services/supabase/client', () => require('../../jest/supabaseMock').createSupabaseClientMock());
jest.mock('@/features/creatures/demo', () => ({ demoGlbUri: jest.fn(async () => null) }));
jest.mock('@/services/supabase/creatures', () => ({
  isUuid: (s: string) => /^[0-9a-f-]{36}$/i.test(s),
  uploadPhotos: jest.fn(async (uid: string, id: string, uris: string[]) => uris.map((_, i) => `${uid}/${id}/${i}.jpg`)),
  upsertCreatureRow: jest.fn(async () => {}),
  deleteCreatureRemote: jest.fn(async () => {}),
  fetchCreatureRows: jest.fn(async () => []),
  signPhotoPaths: jest.fn(async () => ({})),
  rowToCreature: jest.fn(),
}));

const net = NetInfo as unknown as { fetch: jest.Mock; __setState: (s: object) => void };
const api = remote as jest.Mocked<typeof remote>;
const UID = '33333333-3333-4333-8333-333333333333';
const NET_DOWN = new TypeError('Network request failed');
const flush = async () => {
  for (let i = 0; i < 5; i++) await new Promise((r) => setImmediate(r));
};
const item = (id: string) => collectionStore.get().items.find((c) => c.id === id);

beforeAll(() => startSyncWatchers());

/** "Base de datos" remota en memoria: lo que se sube con upsert es lo que vuelve en fetch. */
const db = new Map<string, ReturnType<typeof makeCreature>>();

beforeEach(async () => {
  // 1) Estado limpio ANTES de restaurar la red: así el observador de NetInfo no arrastra nada de la prueba anterior.
  await AsyncStorage.clear();
  authStore.set({ loaded: true, session: fakeSession(UID), guest: false });
  await loadCollection(UID);
  net.__setState({ isConnected: true, isInternetReachable: true });
  await flush();
  // 2) Mocks y "nube" en memoria a cero.
  jest.clearAllMocks();
  db.clear();
  api.upsertCreatureRow.mockImplementation(async (c) => {
    db.set(c.id, c);
  });
  api.deleteCreatureRemote.mockImplementation(async (_uid, id) => {
    db.delete(id);
  });
  api.fetchCreatureRows.mockImplementation(async () => [...db.values()].map((c) => ({ id: c.id, photo_urls: [], is_demo: false }) as never));
  api.rowToCreature.mockImplementation((r) => ({ ...db.get(r.id)!, syncStatus: 'synced' }));
});

describe('local → pending → synced', () => {
  it('sube fotos y ficha, y la marca como synced con sus rutas en Storage', async () => {
    addCreature(makeCreature({ id: 'p1', photos: ['file:///a.jpg', 'file:///b.jpg'] }));
    expect(item('p1')?.syncStatus).toBe('pending');
    await syncNow();
    expect(api.uploadPhotos).toHaveBeenCalledWith(UID, 'p1', ['file:///a.jpg', 'file:///b.jpg']);
    expect(api.upsertCreatureRow).toHaveBeenCalledTimes(1);
    expect(item('p1')).toMatchObject({ syncStatus: 'synced', photoPaths: [`${UID}/p1/0.jpg`, `${UID}/p1/1.jpg`] });
  });

  it('sin conexión no intenta nada y la criatura sigue pendiente', async () => {
    net.__setState({ isConnected: false, isInternetReachable: false });
    addCreature(makeCreature({ id: 'off' }));
    await syncNow();
    expect(api.upsertCreatureRow).not.toHaveBeenCalled();
    expect(item('off')?.syncStatus).toBe('pending');
  });

  it('si la red cae a mitad de la subida queda pendiente y se reintenta después', async () => {
    api.upsertCreatureRow.mockRejectedValueOnce(NET_DOWN);
    addCreature(makeCreature({ id: 'r1' })); // lanza la sincronización automática, que falla
    await flush();
    expect(item('r1')?.syncStatus).toBe('pending');
    await syncNow();
    expect(item('r1')?.syncStatus).toBe('synced');
    expect(api.upsertCreatureRow).toHaveBeenCalledTimes(2);
  });

  it('un error de datos en una criatura no bloquea a las demás', async () => {
    api.upsertCreatureRow.mockImplementation(async (c) => {
      if (c.id === 'mala') throw { code: '23514', message: 'violates check constraint' };
      db.set(c.id, c);
    });
    addCreature(makeCreature({ id: 'mala' }));
    addCreature(makeCreature({ id: 'buena' }));
    await syncNow();
    expect(item('mala')?.syncStatus).toBe('pending');
    expect(item('buena')?.syncStatus).toBe('synced');
  });

  it('como invitado nunca sincroniza', async () => {
    authStore.set({ loaded: true, session: null, guest: true });
    await loadCollection('guest');
    addCreature(makeCreature({ id: 'g' }));
    await syncNow();
    expect(api.upsertCreatureRow).not.toHaveBeenCalled();
    expect(item('g')?.syncStatus).toBe('local');
  });
});

describe('idempotencia', () => {
  it('llamadas simultáneas comparten la misma ejecución y no suben dos veces', async () => {
    addCreature(makeCreature({ id: 'once' }));
    await Promise.all([syncNow(), syncNow(), syncNow()]);
    expect(api.upsertCreatureRow).toHaveBeenCalledTimes(1);
  });

  it('una criatura ya sincronizada no se vuelve a subir', async () => {
    addCreature(makeCreature({ id: 'x' }));
    await syncNow();
    await syncNow();
    expect(api.upsertCreatureRow).toHaveBeenCalledTimes(1);
  });

  it('la subida usa el mismo id de la criatura (upsert): reintentar no crea duplicados', async () => {
    api.upsertCreatureRow.mockRejectedValueOnce(NET_DOWN);
    addCreature(makeCreature({ id: 'same' }));
    await flush();
    await syncNow();
    const ids = api.upsertCreatureRow.mock.calls.map(([c]) => c.id);
    expect(ids).toEqual(['same', 'same']);
  });
});

describe('borrados pendientes', () => {
  it('borra en el servidor lo eliminado sin conexión al volver la red', async () => {
    net.__setState({ isConnected: false, isInternetReachable: false });
    addCreature(makeCreature({ id: 'del', syncStatus: 'synced' }));
    removeCreature('del');
    await flush();
    expect(api.deleteCreatureRemote).not.toHaveBeenCalled();
    expect(collectionStore.get().pendingDeletes).toEqual(['del']);

    net.__setState({ isConnected: true, isInternetReachable: true });
    await flush();
    await syncNow();
    expect(api.deleteCreatureRemote).toHaveBeenCalledWith(UID, 'del');
    expect(collectionStore.get().pendingDeletes).toEqual([]);
  });
});

describe('reintento al volver la red', () => {
  it('al pasar de sin red a con red refresca la colección y sube lo pendiente', async () => {
    net.__setState({ isConnected: false, isInternetReachable: false });
    addCreature(makeCreature({ id: 'vuelve' }));
    await flush();
    expect(item('vuelve')?.syncStatus).toBe('pending');

    net.__setState({ isConnected: true, isInternetReachable: true });
    await flush();
    expect(api.fetchCreatureRows).toHaveBeenCalled();
    expect(item('vuelve')?.syncStatus).toBe('synced');
  });
});

describe('refreshCollection', () => {
  it('sin red muestra la caché con un aviso en español', async () => {
    addCreature(makeCreature({ id: 'cache', syncStatus: 'synced' }));
    api.fetchCreatureRows.mockRejectedValueOnce(NET_DOWN);
    await refreshCollection();
    expect(collectionStore.get()).toMatchObject({ remote: 'error', remoteError: 'Sin conexión. Mostrando tu colección guardada en este teléfono.' });
    expect(item('cache')).toBeDefined();
  });

  it('un error del servidor da un mensaje distinto al de falta de red', async () => {
    api.fetchCreatureRows.mockRejectedValueOnce({ code: '500', message: 'boom' });
    await refreshCollection();
    expect(collectionStore.get().remoteError).toBe('No pudimos cargar tu colección desde la nube.');
  });

  it('sube lo pendiente local y quita lo que se borró desde otro teléfono', async () => {
    addCreature(makeCreature({ id: 'viejo', syncStatus: 'synced' })); // ya no existe en la nube
    net.__setState({ isConnected: false, isInternetReachable: false });
    addCreature(makeCreature({ id: 'nuevo-local' }));
    await flush();
    net.__setState({ isConnected: true, isInternetReachable: true });
    await flush();
    await refreshCollection();
    const ids = collectionStore.get().items.map((c) => c.id);
    expect(ids).toEqual(['nuevo-local']);
    expect(item('nuevo-local')?.syncStatus).toBe('synced');
    expect(collectionStore.get().remote).toBe('ok');
  });
});
