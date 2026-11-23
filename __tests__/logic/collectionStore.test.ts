import AsyncStorage from '@react-native-async-storage/async-storage';
import { renderHook } from '@testing-library/react-native';

import {
  addCreature,
  clearOwnerCache,
  collectionStore,
  computeStreak,
  loadCollection,
  readCachedItems,
  removeCreature,
  setSyncTrigger,
  useCollection,
} from '@/features/collection/collectionStore';
import { makeCreature } from '../../jest/factories';

const USER_A = '11111111-1111-4111-8111-111111111111';
const USER_B = '22222222-2222-4222-8222-222222222222';
const flush = () => new Promise((r) => setImmediate(r));
const trigger = jest.fn();

beforeEach(async () => {
  await AsyncStorage.clear();
  trigger.mockReset();
  setSyncTrigger(trigger);
  await loadCollection('guest');
});

describe('guardado y estados de sincronización', () => {
  it('como invitado la criatura queda "local" y no dispara la sincronización', () => {
    addCreature(makeCreature({ id: 'g1' }));
    expect(collectionStore.get().items[0]).toMatchObject({ id: 'g1', syncStatus: 'local' });
    expect(trigger).not.toHaveBeenCalled();
  });

  it('con cuenta la criatura nueva queda "pending" y avisa a la sincronización', async () => {
    await loadCollection(USER_A);
    addCreature(makeCreature({ id: 'a1' }));
    expect(collectionStore.get().items[0].syncStatus).toBe('pending');
    expect(trigger).toHaveBeenCalledTimes(1);
  });

  it('con cuenta, las criaturas demo quedan solo en el teléfono ("local")', async () => {
    await loadCollection(USER_A);
    addCreature(makeCreature({ id: 'demo-1', isDemo: true }));
    expect(collectionStore.get().items[0].syncStatus).toBe('local');
    expect(trigger).not.toHaveBeenCalled();
  });

  it('guardar dos veces el mismo id no duplica (idempotente)', async () => {
    await loadCollection(USER_A);
    const c = makeCreature({ id: 'dup' });
    addCreature(c);
    addCreature(c);
    expect(collectionStore.get().items.filter((x) => x.id === 'dup')).toHaveLength(1);
  });

  it('borrar una criatura sincronizada sin red la deja en la cola de borrados', async () => {
    await loadCollection(USER_A);
    addCreature(makeCreature({ id: 's1', syncStatus: 'synced' }));
    trigger.mockReset();
    removeCreature('s1');
    expect(collectionStore.get().items).toHaveLength(0);
    expect(collectionStore.get().pendingDeletes).toEqual(['s1']);
    expect(trigger).toHaveBeenCalledTimes(1);
  });

  it('borrar una criatura solo local no genera borrado remoto', async () => {
    await loadCollection(USER_A);
    addCreature(makeCreature({ id: 'l1', isDemo: true }));
    removeCreature('l1');
    expect(collectionStore.get().pendingDeletes).toEqual([]);
  });
});

describe('caché por usuario', () => {
  it('cada dueño (invitado, A, B) tiene su propia colección persistida', async () => {
    addCreature(makeCreature({ id: 'guest-1' }));
    await loadCollection(USER_A);
    addCreature(makeCreature({ id: 'a-1' }));
    await loadCollection(USER_B);
    expect(collectionStore.get().items).toEqual([]);
    addCreature(makeCreature({ id: 'b-1' }));
    await flush();

    expect((await readCachedItems('guest')).map((c) => c.id)).toEqual(['guest-1']);
    expect((await readCachedItems(USER_A)).map((c) => c.id)).toEqual(['a-1']);
    expect((await readCachedItems(USER_B)).map((c) => c.id)).toEqual(['b-1']);

    await loadCollection(USER_A);
    expect(collectionStore.get()).toMatchObject({ owner: USER_A, loaded: true });
    expect(collectionStore.get().items.map((c) => c.id)).toEqual(['a-1']);
  });

  it('cerrar sesión borra solo la caché de ese usuario', async () => {
    await loadCollection(USER_A);
    addCreature(makeCreature({ id: 'a-1' }));
    await loadCollection(USER_B);
    addCreature(makeCreature({ id: 'b-1' }));
    await flush();
    await clearOwnerCache(USER_A);
    expect(await readCachedItems(USER_A)).toEqual([]);
    expect(await readCachedItems(USER_B)).toHaveLength(1);
  });

  it('un modelo 3D que quedó "pending" de otra sesión se marca como fallido al leer la caché', async () => {
    addCreature(makeCreature({ id: 'm1', modelStatus: 'pending' }));
    await flush();
    expect((await readCachedItems('guest'))[0].modelStatus).toBe('failed');
  });
});

describe('estadísticas (useCollection)', () => {
  it('cuenta por rareza y tipo, la última captura y lo pendiente', async () => {
    await loadCollection(USER_A);
    addCreature(makeCreature({ id: '1', rareza: 'Común', tipo: 'Agua', syncStatus: 'synced' }));
    addCreature(makeCreature({ id: '2', rareza: 'Rara', tipo: 'Tecno' }));
    addCreature(makeCreature({ id: '3', rareza: 'Legendaria', tipo: 'Metal' }));
    addCreature(makeCreature({ id: '4', rareza: 'Común', tipo: 'Agua', syncStatus: 'synced' }));
    removeCreature('4');

    const { result } = await renderHook(() => useCollection());
    expect(result.current.byRarity).toEqual({ Común: 1, Rara: 1, Épica: 0, Legendaria: 1 });
    expect(result.current.byType).toEqual({ Agua: 1, Tecno: 1, Metal: 1 });
    expect(result.current.latest?.id).toBe('3');
    // 2 criaturas pendientes de subir + 1 borrado pendiente
    expect(result.current.pending).toBe(3);
  });
});

describe('computeStreak', () => {
  const day = (d: number, h = 12) => new Date(2026, 10, d, h).getTime();
  const at = (d: number, isDemo = false) => makeCreature({ createdAt: day(d), isDemo });

  it('cuenta días seguidos hasta hoy', () => {
    expect(computeStreak([at(20), at(21), at(22), at(22)], day(22, 20))).toBe(3);
  });
  it('si hoy no hay captura, la racha sigue viva desde ayer', () => {
    expect(computeStreak([at(20), at(21)], day(22))).toBe(2);
  });
  it('se rompe con un día vacío', () => {
    expect(computeStreak([at(18), at(20)], day(20))).toBe(1);
    expect(computeStreak([at(18)], day(22))).toBe(0);
  });
  it('las criaturas demo no cuentan', () => {
    expect(computeStreak([at(22, true)], day(22))).toBe(0);
  });
});
