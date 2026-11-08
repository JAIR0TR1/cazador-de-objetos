import { Redirect, Tabs } from 'expo-router';

import { TabBar } from '@/components/TabBar';
import { useAuth } from '@/features/auth/authStore';
import { useOnboarding } from '@/features/profile/onboarding';
import { colors } from '@/theme/tokens';

export default function TabsLayout() {
  const onboarding = useOnboarding();
  const auth = useAuth();
  if (onboarding.loaded && !onboarding.done) return <Redirect href="/onboarding" />;
  // Sin sesión ni modo invitado: pantalla de bienvenida (crear cuenta / entrar / probar).
  if (auth.loaded && auth.mode === 'none') return <Redirect href="/welcome" />;

  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}>
      <Tabs.Screen name="index" options={{ title: 'Inicio' }} />
      <Tabs.Screen name="collection" options={{ title: 'Colección' }} />
      <Tabs.Screen name="profile" options={{ title: 'Perfil' }} />
    </Tabs>
  );
}
