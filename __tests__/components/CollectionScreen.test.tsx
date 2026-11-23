/**
 * Pantalla de colección: carga, vacío, error con "Reintentar", filtros, búsqueda y orden.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { AccessibilityInfo } from 'react-native';

import Collection from '../../app/(tabs)/collection';
import { authStore } from '@/features/auth/authStore';
import { collectionStore } from '@/features/collection/collectionStore';
import { refreshCollection } from '@/features/sync/sync';
import { makeCreature } from '../../jest/factories';
import { fakeSession } from '../../jest/supabaseMock';

jest.mock('@/services/supabase/client', () => require('../../jest/supabaseMock').createSupabaseClientMock());
jest.mock('@/features/sync/sync', () => ({ refreshCollection: jest.fn(async () => {}), syncNow: jest.fn(async () => {}) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const UID = '55555555-5555-4555-8555-555555555555';
const base = { loaded: true, owner: 'guest', items: [], pendingDeletes: [], remote: 'idle', remoteError: null, syncing: false } as const;
const setCollection = (p: Partial<ReturnType<typeof collectionStore.get>>) => collectionStore.set({ ...base, pendingDeletes: [], items: [], ...p });

const creatures = () => [
  makeCreature({ id: 'a', nombre: 'Tazaurio', objeto: 'Taza', rareza: 'Común', tipo: 'Agua', poder: 40 }),
  makeCreature({ id: 'b', nombre: 'Bajofón', objeto: 'Audífonos', rareza: 'Rara', tipo: 'Tecno', poder: 70 }),
  makeCreature({ id: 'c', nombre: 'Rumbóreo', objeto: 'Brújula', rareza: 'Legendaria', tipo: 'Metal', poder: 90 }),
];
const visibleNames = () => ['Tazaurio', 'Bajofón', 'Rumbóreo'].filter((n) => screen.queryByText(n));

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  authStore.set({ loaded: true, session: null, guest: true });
});

describe('estados', () => {
  it('carga: muestra esqueletos mientras la colección no está lista', async () => {
    setCollection({ loaded: false });
    await render(<Collection />);
    expect(screen.getAllByLabelText('Cargando').length).toBeGreaterThan(0);
    expect(screen.queryByText('Colección')).toBeNull();
  });

  it('carga inicial con cuenta y sin caché: esqueletos mientras llega la nube', async () => {
    authStore.set({ loaded: true, session: fakeSession(UID), guest: false });
    setCollection({ owner: UID, remote: 'loading' });
    await render(<Collection />);
    expect(screen.getAllByLabelText('Cargando').length).toBeGreaterThan(0);
  });

  it('vacío: explica qué hacer y lleva al escáner', async () => {
    setCollection({});
    await render(<Collection />);
    expect(screen.getByText('Tu colección está vacía')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Escanear objeto' }));
    expect(router.push).toHaveBeenCalledWith('/scan');
  });

  it('error sin caché: mensaje en español y "Reintentar" vuelve a pedir la nube', async () => {
    authStore.set({ loaded: true, session: fakeSession(UID), guest: false });
    setCollection({ owner: UID, remote: 'error', remoteError: 'Sin conexión. Mostrando tu colección guardada en este teléfono.' });
    await render(<Collection />);
    expect(screen.getByText('No pudimos cargar tu colección')).toBeOnTheScreen();
    (refreshCollection as jest.Mock).mockClear();
    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(refreshCollection).toHaveBeenCalledTimes(1);
  });

  it('error con caché: muestra las criaturas y un aviso con "Reintentar"', async () => {
    authStore.set({ loaded: true, session: fakeSession(UID), guest: false });
    setCollection({ owner: UID, items: creatures(), remote: 'error', remoteError: 'Sin conexión. Mostrando tu colección guardada en este teléfono.' });
    await render(<Collection />);
    expect(screen.getByText('Sin conexión. Mostrando tu colección guardada en este teléfono.')).toBeOnTheScreen();
    expect(visibleNames()).toHaveLength(3);
  });

  it('cambios pendientes: lo dice en singular o plural', async () => {
    authStore.set({ loaded: true, session: fakeSession(UID), guest: false });
    setCollection({ owner: UID, remote: 'ok', items: [makeCreature({ nombre: 'Uno', syncStatus: 'pending' })] });
    await render(<Collection />);
    expect(screen.getByText('1 cambio pendiente de sincronizar. Se subirá al volver la conexión.')).toBeOnTheScreen();
  });
});

describe('filtros, búsqueda y orden', () => {
  beforeEach(() => setCollection({ items: creatures() }));

  it('muestra todas y el contador', async () => {
    await render(<Collection />);
    expect(visibleNames()).toEqual(['Tazaurio', 'Bajofón', 'Rumbóreo']);
    expect(screen.getByText('3')).toBeOnTheScreen();
  });

  it('busca por nombre o por objeto, sin importar mayúsculas', async () => {
    await render(<Collection />);
    await fireEvent.changeText(screen.getByLabelText('Buscar en la colección'), 'BRÚJ');
    expect(visibleNames()).toEqual(['Rumbóreo']);
    await fireEvent.changeText(screen.getByLabelText('Buscar en la colección'), 'bajo');
    expect(visibleNames()).toEqual(['Bajofón']);
  });

  it('filtra por rareza y por tipo; tocar de nuevo quita el filtro', async () => {
    await render(<Collection />);
    await fireEvent.press(screen.getByRole('button', { name: 'Filtro Rara' }));
    expect(visibleNames()).toEqual(['Bajofón']);
    expect(screen.getByRole('button', { name: 'Filtro Rara' })).toBeSelected();
    await fireEvent.press(screen.getByRole('button', { name: 'Filtro Rara' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Filtro Metal' }));
    expect(visibleNames()).toEqual(['Rumbóreo']);
  });

  it('sin resultados ofrece "Limpiar filtros" y lo restablece todo', async () => {
    await render(<Collection />);
    await fireEvent.changeText(screen.getByLabelText('Buscar en la colección'), 'nada-que-ver');
    expect(screen.getByText('Sin resultados')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Limpiar filtros' }));
    expect(visibleNames()).toHaveLength(3);
  });

  it('ordena por rareza, poder y A–Z', async () => {
    await render(<Collection />);
    const order = () =>
      screen
        .getAllByText(/^(Tazaurio|Bajofón|Rumbóreo)$/)
        .map((n) => n.props.children as string);
    await fireEvent.press(screen.getByRole('button', { name: 'Filtro Rareza' }));
    expect(order()).toEqual(['Rumbóreo', 'Bajofón', 'Tazaurio']);
    await fireEvent.press(screen.getByRole('button', { name: 'Filtro Poder' }));
    expect(order()).toEqual(['Rumbóreo', 'Bajofón', 'Tazaurio']);
    await fireEvent.press(screen.getByRole('button', { name: 'Filtro A–Z' }));
    expect(order()).toEqual(['Bajofón', 'Rumbóreo', 'Tazaurio']);
  });

  it('tocar una criatura abre su detalle', async () => {
    await render(<Collection />);
    const card = screen.getByText('Tazaurio');
    await fireEvent.press(card);
    expect(router.push).toHaveBeenCalledWith({ pathname: '/creature/[id]', params: { id: 'a' } });
  });
});
