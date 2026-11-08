import { router } from 'expo-router';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Icon, type IconName } from '@/components/Icon';
import { continueAsGuest } from '@/features/auth/authStore';
import { PointCloud } from '@/features/creatures/PointCloud';
import { useReducedMotionPref } from '@/features/profile/settings';
import { haptic } from '@/services/haptics';
import { isSupabaseConfigured } from '@/services/supabase/client';
import { colors, radii, space } from '@/theme/tokens';

const PERKS: { icon: IconName; text: string }[] = [
  { icon: 'cloud', text: 'Tu colección se guarda en la nube y no se pierde si cambias de teléfono.' },
  { icon: 'cloud-off', text: 'Funciona sin conexión: lo que captures se sube solo al volver la señal.' },
];

/** Bienvenida tras el onboarding: crear cuenta, iniciar sesión o probar sin cuenta. */
export default function Welcome() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reduce = useReducedMotionPref();
  const cloud = isSupabaseConfigured();
  const enter = (d: number) => (reduce ? undefined : FadeInDown.delay(d).springify().damping(16));

  const guest = () => {
    haptic.light();
    continueAsGuest();
    router.replace('/');
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + space.sm, paddingBottom: insets.bottom + space.md }]}>
      <AppText variant="label" color={colors.lime}>
        Cazador de Objetos
      </AppText>
      <View style={styles.hero}>
        <PointCloud size={Math.min(width - 96, 240)} />
      </View>

      <Animated.View entering={enter(100)}>
        <AppText variant="title" accessibilityRole="header">
          Guarda cada criatura que caces
        </AppText>
        <AppText variant="body" color={colors.muted} style={{ marginTop: space.xs }}>
          Crea una cuenta gratis para tener tu colección siempre contigo, o pruébala primero sin registrarte.
        </AppText>
      </Animated.View>

      {cloud && (
        <Animated.View entering={enter(200)} style={styles.perks}>
          {PERKS.map((p) => (
            <View key={p.icon} style={styles.perk}>
              <View style={styles.perkIcon}>
                <Icon name={p.icon} size={18} color={colors.lime} />
              </View>
              <AppText variant="small" color={colors.text} style={{ flex: 1 }}>
                {p.text}
              </AppText>
            </View>
          ))}
        </Animated.View>
      )}

      <Animated.View entering={enter(300)} style={styles.actions}>
        {cloud ? (
          <>
            <Button label="Crear cuenta" icon="sparkle" onPress={() => router.push('/sign-up')} />
            <Button label="Iniciar sesión" variant="secondary" onPress={() => router.push('/sign-in')} />
            <Button label="Probar sin cuenta" variant="ghost" onPress={guest} accessibilityHint="Tu colección se guardará solo en este teléfono. Podrás subirla al crear una cuenta." />
          </>
        ) : (
          <>
            <AppText variant="small" center>
              Las cuentas no están disponibles en esta versión. Tu colección se guardará en este teléfono.
            </AppText>
            <Button label="Empezar" icon="sparkle" onPress={guest} />
          </>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: space.md },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 160 },
  perks: { marginTop: space.md, gap: space.xs },
  perk: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  perkIcon: { width: 36, height: 36, borderRadius: radii.sm, backgroundColor: colors.limeDim, alignItems: 'center', justifyContent: 'center' },
  actions: { marginTop: space.lg, gap: space.xs },
});
