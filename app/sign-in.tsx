import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, type TextInput } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { FormBanner, FormScreen } from '@/components/FormScreen';
import { TextField } from '@/components/TextField';
import { guestItemsToImport, signIn } from '@/features/auth/authStore';
import { validateEmail, validatePassword } from '@/features/auth/validation';
import { haptic } from '@/services/haptics';
import { authErrorMessage } from '@/services/supabase/errors';
import { colors, sizes, space } from '@/theme/tokens';

type Field = 'email' | 'password';

export default function SignIn() {
  const [values, setValues] = useState({ email: '', password: '' });
  const [touched, setTouched] = useState<Record<Field, boolean>>({ email: false, password: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passRef = useRef<TextInput>(null);

  const errors = { email: validateEmail(values.email), password: validatePassword(values.password, 'signin') };
  const show = (f: Field) => (touched[f] ? errors[f] : null);
  const set = (f: Field) => (v: string) => {
    setValues((s) => ({ ...s, [f]: v }));
    setError(null);
  };

  const submit = async () => {
    setTouched({ email: true, password: true });
    if (errors.email || errors.password) {
      haptic.error();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await signIn(values.email, values.password);
      haptic.success();
      const pending = await guestItemsToImport();
      if (router.canDismiss()) router.dismissAll();
      router.replace(pending.length ? '/import-collection' : '/');
    } catch (e) {
      haptic.error();
      setError(authErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormScreen
      eyebrow="Hola de nuevo"
      title="Inicia sesión"
      subtitle="Tu colección te espera."
      footer={
        <AppText variant="small" center style={{ marginTop: space.md }}>
          ¿No tienes cuenta?{' '}
          <AppText variant="small" color={colors.lime} onPress={() => router.replace('/sign-up')} accessibilityRole="link" suppressHighlighting>
            Crea una
          </AppText>
        </AppText>
      }>
      {error && <FormBanner tone="error" message={error} />}
      <TextField
        label="Correo"
        icon="mail"
        value={values.email}
        onChangeText={set('email')}
        onBlur={() => setTouched((t) => ({ ...t, email: true }))}
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
        onBlur={() => setTouched((t) => ({ ...t, password: true }))}
        error={show('password')}
        secureToggle
        autoCapitalize="none"
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={submit}
      />
      <Pressable
        accessibilityRole="link"
        accessibilityLabel="¿Olvidaste tu contraseña?"
        onPress={() => router.push({ pathname: '/forgot-password', params: { email: values.email.trim() } })}
        style={styles.forgot}>
        <AppText variant="small" color={colors.lime}>
          ¿Olvidaste tu contraseña?
        </AppText>
      </Pressable>
      <Button label="Entrar" onPress={submit} loading={loading} disabled={loading} />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  forgot: { alignSelf: 'flex-end', minHeight: sizes.touch, justifyContent: 'center', paddingHorizontal: 4 },
});
