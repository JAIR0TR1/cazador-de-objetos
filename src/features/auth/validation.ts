/** Validaciones en línea de los formularios de cuenta (mensajes cortos y accionables). */
export function validateUsername(v: string): string | null {
  const s = v.trim();
  if (!s) return 'Escribe un nombre de usuario.';
  if (s.length < 3) return 'Usa al menos 3 caracteres.';
  if (s.length > 20) return 'Máximo 20 caracteres.';
  if (!/^[a-zA-Z0-9_.]+$/.test(s)) return 'Solo letras sin tilde, números, punto y guion bajo.';
  return null;
}

export function validateEmail(v: string): string | null {
  const s = v.trim();
  if (!s) return 'Escribe tu correo.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s)) return 'Revisa el correo: falta algo (ej. nombre@correo.com).';
  return null;
}

export function validatePassword(v: string, mode: 'signup' | 'signin' = 'signup'): string | null {
  if (!v) return 'Escribe tu contraseña.';
  if (mode === 'signup' && v.length < 8) return 'Usa al menos 8 caracteres.';
  return null;
}
