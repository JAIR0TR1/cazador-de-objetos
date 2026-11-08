import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { type TextInput } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { FormBanner, FormScreen } from '@/components/FormScreen';
import { TextField } from '@/components/TextField';
import { guestItemsToImport, signUp } from '@/features/auth/authStore';
import { validateEmail, validatePassword, validateUsername } from '@/features/auth/validation';
import { haptic } from '@/services/haptics';
import { isUsernameAvailable } from '@/services/supabase/creatures';
import { authErrorMessage, isNetworkError } from '@/services/supabase/errors';
import { colors, space } from '@/theme/tokens';

type Field = 'username' | 'email' | 'password';

export default function SignUp() {
  const [values, setValues] = useState({ username: '', email: '', password: '' });
  const [touched, setTouched] = useState<Record<Field, boolean>>({ username: false, email: false, password: false });
  const [usernameTaken, setUsernameTaken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState<{ tone: 'error' | 'success'; message: string } | null>(null);
  const emailRef = useRef<TextInput>(null);
  const passRef = useRef<TextInput>(null);

  const errors = {
    username: validateUsername(values.username) ?? (usernameTaken ? 'Ese nombre de usuario ya está en uso.' : null),
    email: validateEmail(values.email),
    password: validatePassword(values.password),
  };
  const show = (f: Field) => (touched[f] ? errors[f] : null);
  const set = (f: Field) => (v: string) => {
    setValues((s) => ({ ...s, [f]: v }));
    if (f === 'username') setUsernameTaken(false);
    setBanner(null);
  };
  const blur = (f: Field) => () => setTouched((t) => ({ ...t, [f]: true }));

  const submit = async () => {
    setTouched({ username: true, email: true, password: true });
    if (errors.username || errors.email || errors.password) {
      haptic.error();
      return;
    }
    setLoading(true);
    setBanner(null);
    try {
      // Comprobación previa para dar un error claro en el campo (el trigger igual lo protege).
      const free = await isUsernameAvailable(values.username.trim()).catch((e) => {
        if (isNetworkError(e)) throw e;
        return true;
      });
      if (!free) {
        setUsernameTaken(true);
        haptic.error();
        return;
      }
      const { needsConfirmation } = await signUp(values.username, values.email, values.password);
      haptic.success();
      if (needsConfirmation) {
        setBanner({ tone: 'success', message: 'Cuenta creada. Revisa tu correo para confirmarla y luego inicia sesión.' });
        return;
      }
      const pending = await guestItemsToImport();
      if (router.canDismiss()) router.dismissAll();
      router.replace(pending.length ? '/import-collection' : '/');
    } catch (e) {
      haptic.error();
      const msg = authErrorMessage(e);
      if (msg.includes('nombre de usuario')) setUsernameTaken(true);
      else setBanner({ tone: 'error', message: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormScreen
      eyebrow="Nueva cuenta"
      title="Crea tu cuenta de cazador"
      subtitle="Así tu colección queda guardada en la nube."
      footer={
        <AppText variant="small" center style={{ marginTop: space.md }}>
          ¿Ya tienes cuenta?{' '}
          <AppText variant="small" color={colors.lime} onPress={() => router.replace('/sign-in')} accessibilityRole="link" suppressHighlighting>
            Inicia sesión
          </AppText>
        </AppText>
      }>
      {banner && <FormBanner tone={banner.tone} message={banner.message} />}
      <TextField
        label="Nombre de usuario"
        icon="at"
        value={values.username}
        onChangeText={set('username')}
        onBlur={blur('username')}
        error={show('username')}
        hint="Así te verán en la app. 3 a 20 caracteres."
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username-new"
        textContentType="username"
        returnKeyType="next"
        onSubmitEditing={() => emailRef.current?.focus()}
        maxLength={20}
      />
      <TextField
        ref={emailRef}
        label="Correo"
        icon="mail"
        value={values.email}
        onChangeText={set('email')}
        onBlur={blur('email')}
        error={show('email')}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => passRef.current?.focus()}
      />
      <TextField
        ref={passRef}
        label="Contraseña"
        icon="lock"
        value={values.password}
        onChangeText={set('password')}
        onBlur={blur('password')}
        error={show('password')}
        hint="Mínimo 8 caracteres."
        secureToggle
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={submit}
      />
      <Button label="Crear cuenta" onPress={submit} loading={loading} disabled={loading} style={{ marginTop: space.xs }} />
    </FormScreen>
  );
}
