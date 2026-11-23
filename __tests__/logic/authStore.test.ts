/**
 * authStore: modo invitado, inicio de sesión, sesión guardada sin conexión y cierre de sesión.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { authStore, continueAsGuest, getAuthMode, guestItemsToImport, initAuth, signIn, signOut, signUp } from '@/features/auth/authStore';
import { addCreature, collectionStore, loadCollection, readCachedItems } from '@/features/collection/collectionStore';
import { supabase } from '@/services/supabase/client';
import { KEYS } from '@/services/storage/kv';
import { makeCreature } from '../../jest/factories';
import { fakeSession } from '../../jest/supabaseMock';

jest.mock('@/services/supabase/client', () => require('../../jest/supabaseMock').createSupabaseClientMock());

const auth = supabase.auth as unknown as Record<string, jest.Mock>;
const UID = '44444444-4444-4444-8444-444444444444';
const flush = async () => {
  for (let i = 0; i < 5; i++) await new Promise((r) => setImmediate(r));
};

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  authStore.set({ loaded: false, session: null, guest: false });
  await loadCollection('guest');
});

describe('getAuthMode', () => {
  it('none → guest → user', () => {
    expect(getAuthMode({ loaded: true, session: null, guest: false })).toBe('none');
    expect(getAuthMode({ loaded: true, session: null, guest: true })).toBe('guest');
    expect(getAuthMode({ loaded: true, session: fakeSession(UID), guest: true })).toBe('user');
  });
});

describe('modo invitado', () => {
  it('continuar como invitado se recuerda al volver a abrir la app', async () => {
    continueAsGuest();
    await flush();
    authStore.set({ loaded: false, session: null, guest: false });
    await initAuth();
    expect(getAuthMode()).toBe('guest');
    expect(collectionStore.get().owner).toBe('guest');
  });

  it('solo ofrece importar criaturas reales (no las demo)', async () => {
    addCreature(makeCreature({ id: 'real' }));
    addCreature(makeCreature({ id: 'demo', isDemo: true }));
    await flush();
    expect((await guestItemsToImport()).map((c) => c.id)).toEqual(['real']);
  });
});

describe('iniciar sesión / crear cuenta', () => {
  it('signIn normaliza el correo, guarda la sesión y carga la colección del usuario', async () => {
    auth.signInWithPassword.mockResolvedValueOnce({ data: { session: fakeSession(UID) }, error: null });
    await signIn('  Ana@Correo.COM ', 'secreta123');
    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: 'ana@correo.com', password: 'secreta123' });
    expect(getAuthMode()).toBe('user');
    expect(collectionStore.get().owner).toBe(UID);
  });

  it('signIn con error lo propaga y no cambia de modo', async () => {
    auth.signInWithPassword.mockResolvedValueOnce({ data: { session: null }, error: { code: 'invalid_credentials' } });
    await expect(signIn('a@b.com', 'x')).rejects.toEqual({ code: 'invalid_credentials' });
    expect(getAuthMode()).toBe('none');
  });

  it('signUp sin confirmación de correo entra directo', async () => {
    auth.signUp.mockResolvedValueOnce({ data: { session: fakeSession(UID) }, error: null });
    await expect(signUp(' cazador ', 'C@d.com', '12345678')).resolves.toEqual({ needsConfirmation: false });
    expect(auth.signUp).toHaveBeenCalledWith({ email: 'c@d.com', password: '12345678', options: { data: { username: 'cazador' } } });
    expect(getAuthMode()).toBe('user');
  });

  it('signUp con confirmación de correo pide revisar el correo', async () => {
    auth.signUp.mockResolvedValueOnce({ data: { session: null }, error: null });
    await expect(signUp('cazador', 'c@d.com', '12345678')).resolves.toEqual({ needsConfirmation: true });
    expect(getAuthMode()).toBe('none');
  });
});

describe('sesión guardada sin conexión', () => {
  it('si el token venció y no hay red, entra con la sesión guardada (modo sin conexión)', async () => {
    await AsyncStorage.setItem('cazador-auth-session', JSON.stringify(fakeSession(UID)));
    auth.getSession.mockResolvedValueOnce({ data: { session: null }, error: { name: 'AuthRetryableFetchError', message: 'Network request failed' } });
    await initAuth();
    expect(getAuthMode()).toBe('user');
    expect(collectionStore.get().owner).toBe(UID);
  });

  it('si el error no es de red, no usa la sesión guardada', async () => {
    await AsyncStorage.setItem('cazador-auth-session', JSON.stringify(fakeSession(UID)));
    auth.getSession.mockResolvedValueOnce({ data: { session: null }, error: { message: 'Invalid Refresh Token' } });
    await initAuth();
    expect(getAuthMode()).toBe('none');
  });
});

describe('cerrar sesión', () => {
  it('borra la caché de ese usuario, funciona sin red y vuelve a "none"', async () => {
    auth.signInWithPassword.mockResolvedValueOnce({ data: { session: fakeSession(UID) }, error: null });
    await signIn('a@b.com', 'x');
    addCreature(makeCreature({ id: 'mia', syncStatus: 'synced' }));
    await flush();
    expect(await readCachedItems(UID)).toHaveLength(1);

    auth.signOut.mockRejectedValueOnce(new TypeError('Network request failed'));
    await signOut();
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(await readCachedItems(UID)).toEqual([]);
    expect(getAuthMode()).toBe('none');
    expect(await AsyncStorage.getItem(KEYS.guest)).toBe('false');
  });
});
