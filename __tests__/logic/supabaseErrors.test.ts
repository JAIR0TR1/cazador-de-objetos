import { authErrorMessage, isNetworkError } from '@/services/supabase/errors';

describe('authErrorMessage (errores de Supabase en español)', () => {
  it.each([
    [{ code: 'invalid_credentials' }, 'Correo o contraseña incorrectos.'],
    [{ message: 'Invalid login credentials' }, 'Correo o contraseña incorrectos.'],
    [{ code: 'user_already_exists' }, 'Ya existe una cuenta con ese correo. Inicia sesión.'],
    [{ code: 'email_exists' }, 'Ya existe una cuenta con ese correo. Inicia sesión.'],
    [{ message: 'User already registered' }, 'Ya existe una cuenta con ese correo. Inicia sesión.'],
    [{ code: 'weak_password' }, 'La contraseña es muy débil. Usa al menos 8 caracteres.'],
    [{ code: 'email_address_invalid' }, 'Ese correo no parece válido.'],
    [{ code: 'email_not_confirmed' }, 'Debes confirmar tu correo antes de entrar.'],
    [{ code: 'over_request_rate_limit' }, 'Demasiados intentos. Espera un minuto y vuelve a intentar.'],
    [{ status: 429, message: '' }, 'Demasiados intentos. Espera un minuto y vuelve a intentar.'],
    [{ message: 'Database error saving new user' }, 'Ese nombre de usuario ya está en uso.'],
    [{ code: 'signup_disabled' }, 'El registro está desactivado temporalmente.'],
    [{ code: 'same_password' }, 'La nueva contraseña debe ser distinta a la anterior.'],
  ])('%j → %s', (err, msg) => {
    expect(authErrorMessage(err)).toBe(msg);
  });

  it('sin red da un mensaje de conexión, no uno técnico', () => {
    expect(authErrorMessage(new TypeError('Network request failed'))).toBe('No hay conexión. Revisa tu internet e intenta de nuevo.');
    expect(authErrorMessage({ name: 'AuthRetryableFetchError', message: 'x' })).toMatch(/No hay conexión/);
  });

  it('un error desconocido (o null) no filtra detalles internos', () => {
    expect(authErrorMessage({ message: 'relation "x" does not exist at pg_xyz' })).toBe('Algo salió mal. Intenta de nuevo en un momento.');
    expect(authErrorMessage(null)).toBe('Algo salió mal. Intenta de nuevo en un momento.');
  });
});

describe('isNetworkError', () => {
  it.each([new TypeError('Network request failed'), new TypeError('Failed to fetch'), { name: 'AuthRetryableFetchError', message: '' }])('detecta %p', (e) => {
    expect(isNetworkError(e)).toBe(true);
  });
  it('no confunde errores de datos con falta de red', () => {
    expect(isNetworkError({ code: 'invalid_credentials', message: 'Invalid login credentials' })).toBe(false);
    expect(isNetworkError(null)).toBe(false);
  });
});
