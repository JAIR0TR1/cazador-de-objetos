/**
 * Mock del cliente de Supabase (se activa con jest.mock('@/services/supabase/client', ...)).
 * Ninguna prueba sale a la red: cada método es un jest.fn que la prueba configura.
 */
export function createSupabaseClientMock() {
  return {
    AUTH_STORAGE_KEY: 'cazador-auth-session',
    SCANS_BUCKET: 'scans',
    isSupabaseConfigured: jest.fn(() => true),
    supabase: {
      auth: {
        getSession: jest.fn(async () => ({ data: { session: null }, error: null })),
        onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
        signInWithPassword: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(async () => ({ error: null })),
        resetPasswordForEmail: jest.fn(async () => ({ error: null })),
        startAutoRefresh: jest.fn(),
        stopAutoRefresh: jest.fn(),
      },
    },
  };
}

export const fakeSession = (id: string, username = 'cazador') =>
  ({
    access_token: 'token-de-prueba',
    refresh_token: 'refresh-de-prueba',
    expires_in: 3600,
    token_type: 'bearer',
    user: { id, email: `${username}@correo.com`, user_metadata: { username }, app_metadata: {}, aud: 'authenticated', created_at: '' },
  }) as never;
