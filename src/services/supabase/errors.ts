/** Traduce errores de Supabase/red a mensajes claros en español, con una acción sugerida. */
export function authErrorMessage(e: unknown): string {
  const raw = (e as { message?: string; code?: string; status?: number } | null) ?? {};
  const msg = (raw.message ?? '').toLowerCase();
  const code = (raw.code ?? '').toLowerCase();

  if (isNetworkError(e)) return 'No hay conexión. Revisa tu internet e intenta de nuevo.';
  if (code === 'invalid_credentials' || msg.includes('invalid login credentials')) return 'Correo o contraseña incorrectos.';
  if (code === 'user_already_exists' || code === 'email_exists' || msg.includes('already registered')) return 'Ya existe una cuenta con ese correo. Inicia sesión.';
  if (code === 'weak_password' || msg.includes('password should')) return 'La contraseña es muy débil. Usa al menos 8 caracteres.';
  if (code === 'email_address_invalid' || msg.includes('invalid format') || msg.includes('email address') && msg.includes('invalid')) return 'Ese correo no parece válido.';
  if (code === 'email_not_confirmed' || msg.includes('not confirmed')) return 'Debes confirmar tu correo antes de entrar.';
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' || msg.includes('rate limit') || raw.status === 429)
    return 'Demasiados intentos. Espera un minuto y vuelve a intentar.';
  if (msg.includes('database error saving new user') || msg.includes('duplicate key')) return 'Ese nombre de usuario ya está en uso.';
  if (code === 'signup_disabled') return 'El registro está desactivado temporalmente.';
  if (code === 'same_password') return 'La nueva contraseña debe ser distinta a la anterior.';
  return 'Algo salió mal. Intenta de nuevo en un momento.';
}

export function isNetworkError(e: unknown): boolean {
  const m = String((e as { message?: string } | null)?.message ?? e ?? '').toLowerCase();
  const name = String((e as { name?: string } | null)?.name ?? '');
  return name === 'AuthRetryableFetchError' || m.includes('network request failed') || m.includes('failed to fetch') || m.includes('network');
}
