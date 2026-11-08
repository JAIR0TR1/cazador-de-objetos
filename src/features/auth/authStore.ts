import type { Session } from '@supabase/supabase-js';

import { clearOwnerCache, collectionStore, loadCollection, readCachedItems } from '@/features/collection/collectionStore';
import { createStore, useStore } from '@/services/storage/createStore';
import { getJSON, KEYS, setJSON } from '@/services/storage/kv';
import { AUTH_STORAGE_KEY, isSupabaseConfigured, supabase } from '@/services/supabase/client';
import { isNetworkError } from '@/services/supabase/errors';

interface AuthState {
  loaded: boolean;
  session: Session | null;
  /** El usuario eligió "Probar sin cuenta". */
  guest: boolean;
}

export const authStore = createStore<AuthState>({ loaded: false, session: null, guest: false });

export type AuthMode = 'user' | 'guest' | 'none';

export function getAuthMode(s: AuthState = authStore.get()): AuthMode {
  if (s.session) return 'user';
  return s.guest ? 'guest' : 'none';
}

export function useAuth() {
  const s = useStore(authStore);
  const user = s.session?.user ?? null;
  return {
    ...s,
    mode: getAuthMode(s),
    user,
    userId: user?.id ?? null,
    email: user?.email ?? null,
    username: (user?.user_metadata?.username as string | undefined) ?? null,
  };
}

/** Se ejecuta en cada cambio de cuenta: carga la caché del dueño y avisa a la sincronización. */
let onOwnerChanged: (owner: string) => void = () => {};
export const setOwnerChangedHandler = (fn: (owner: string) => void) => {
  onOwnerChanged = fn;
};

let currentOwner: string | null = null;

/** Idempotente: solo recarga la colección si cambió el dueño (invitado ↔ usuario). */
async function applySession(session: Session | null) {
  const owner = session?.user.id ?? 'guest';
  authStore.set((s) => ({ ...s, loaded: true, session, guest: session ? false : s.guest }));
  if (currentOwner === owner && collectionStore.get().loaded) return;
  currentOwner = owner;
  await loadCollection(owner);
  onOwnerChanged(owner);
}

/** Restaura la sesión guardada (AsyncStorage) y escucha cambios de autenticación. */
export async function initAuth() {
  const guest = await getJSON<boolean>(KEYS.guest, false);
  authStore.set((s) => ({ ...s, guest }));
  if (!isSupabaseConfigured()) {
    await applySession(null);
    return;
  }
  let session: Session | null = null;
  try {
    const { data, error } = await supabase.auth.getSession();
    session = data.session;
    // Sin red y con el token vencido, Supabase no puede refrescarlo y devuelve null.
    // En ese caso usamos la sesión guardada para mostrar la colección en caché (modo sin conexión);
    // el SDK la refrescará solo cuando vuelva la conexión.
    if (!session && error && isNetworkError(error)) session = await getJSON<Session | null>(AUTH_STORAGE_KEY, null);
  } catch (e) {
    if (isNetworkError(e)) session = await getJSON<Session | null>(AUTH_STORAGE_KEY, null);
  }
  await applySession(session?.user?.id ? session : null);
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'INITIAL_SESSION') return;
    void applySession(session);
  });
}

export function continueAsGuest() {
  authStore.set((s) => ({ ...s, guest: true }));
  void setJSON(KEYS.guest, true);
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error) throw error;
  await setJSON(KEYS.guest, false);
  await applySession(data.session);
  return data.session;
}

/** Registra la cuenta. El trigger de la base de datos crea el perfil con el username de metadata. */
export async function signUp(username: string, email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: { data: { username: username.trim() } },
  });
  if (error) throw error;
  // Con "confirmar correo" desactivado, Supabase devuelve la sesión de inmediato.
  if (data.session) {
    await setJSON(KEYS.guest, false);
    await applySession(data.session);
  }
  return { needsConfirmation: !data.session };
}

export async function sendPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
  if (error) throw error;
}

/** Cierra sesión en este teléfono y borra la caché de ese usuario. */
export async function signOut() {
  const owner = collectionStore.get().owner;
  // scope local: funciona sin conexión; el refresh token igual expira en el servidor.
  await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
  if (owner !== 'guest') await clearOwnerCache(owner);
  await setJSON(KEYS.guest, false);
  authStore.set((s) => ({ ...s, guest: false }));
  await applySession(null);
}

/** Criaturas reales (no demo) guardadas como invitado en este teléfono. */
export async function guestItemsToImport() {
  const items = await readCachedItems('guest');
  return items.filter((c) => !c.isDemo);
}
