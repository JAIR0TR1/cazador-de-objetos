import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { Button } from '@/components/Button';
import { FormBanner, FormScreen } from '@/components/FormScreen';
import { TextField } from '@/components/TextField';
import { sendPasswordReset } from '@/features/auth/authStore';
import { validateEmail } from '@/features/auth/validation';
import { haptic } from '@/services/haptics';
import { authErrorMessage } from '@/services/supabase/errors';

export default function ForgotPassword() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const invalid = validateEmail(email);

  const submit = async () => {
    setTouched(true);
    if (invalid) {
      haptic.error();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await sendPasswordReset(email);
      haptic.success();
      setSent(true);
    } catch (e) {
      haptic.error();
      setError(authErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormScreen eyebrow="Recuperar acceso" title="¿Olvidaste tu contraseña?" subtitle="Te enviaremos un correo con un enlace para crear una nueva.">
      {sent && <FormBanner tone="success" message={`Listo. Si existe una cuenta con ${email.trim()}, recibirás el correo en unos minutos. Revisa también la carpeta de spam.`} />}
      {error && <FormBanner tone="error" message={error} />}
      <TextField
        label="Correo"
        icon="mail"
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          setSent(false);
          setError(null);
        }}
        onBlur={() => setTouched(true)}
        error={touched ? invalid : null}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="send"
        onSubmitEditing={submit}
        autoFocus={!email}
      />
      {sent ? (
        <Button label="Volver a iniciar sesión" onPress={() => router.back()} />
      ) : (
        <Button label="Enviar enlace" icon="mail" onPress={submit} loading={loading} disabled={loading} />
      )}
    </FormScreen>
  );
}
