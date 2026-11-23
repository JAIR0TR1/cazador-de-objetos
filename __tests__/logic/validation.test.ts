import { validateEmail, validatePassword, validateUsername } from '@/features/auth/validation';

describe('validateUsername', () => {
  it('pide un nombre si está vacío o solo con espacios', () => {
    expect(validateUsername('')).toBe('Escribe un nombre de usuario.');
    expect(validateUsername('   ')).toBe('Escribe un nombre de usuario.');
  });
  it('exige entre 3 y 20 caracteres', () => {
    expect(validateUsername('ab')).toBe('Usa al menos 3 caracteres.');
    expect(validateUsername('a'.repeat(21))).toBe('Máximo 20 caracteres.');
    expect(validateUsername('abc')).toBeNull();
    expect(validateUsername('a'.repeat(20))).toBeNull();
  });
  it('solo acepta letras sin tilde, números, punto y guion bajo', () => {
    expect(validateUsername('josé')).toMatch(/sin tilde/);
    expect(validateUsername('con espacio')).toMatch(/sin tilde/);
    expect(validateUsername('cazador_01.mx')).toBeNull();
  });
  it('ignora espacios al inicio y al final', () => {
    expect(validateUsername('  cazador  ')).toBeNull();
  });
});

describe('validateEmail', () => {
  it('pide el correo si está vacío', () => {
    expect(validateEmail('')).toBe('Escribe tu correo.');
  });
  it.each(['sin-arroba.com', 'a@b', 'a@b.c', 'a b@c.com', '@correo.com'])('rechaza %s', (v) => {
    expect(validateEmail(v)).toMatch(/Revisa el correo/);
  });
  it.each(['nombre@correo.com', ' nombre@correo.com ', 'a.b+c@uni.edu.mx'])('acepta %s', (v) => {
    expect(validateEmail(v)).toBeNull();
  });
});

describe('validatePassword', () => {
  it('pide la contraseña si está vacía', () => {
    expect(validatePassword('')).toBe('Escribe tu contraseña.');
    expect(validatePassword('', 'signin')).toBe('Escribe tu contraseña.');
  });
  it('al registrarse exige 8 caracteres', () => {
    expect(validatePassword('1234567')).toBe('Usa al menos 8 caracteres.');
    expect(validatePassword('12345678')).toBeNull();
  });
  it('al iniciar sesión no impone largo (cuentas antiguas)', () => {
    expect(validatePassword('123', 'signin')).toBeNull();
  });
});
