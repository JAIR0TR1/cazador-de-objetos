import { Redirect, Tabs } from 'expo-router';

import { TabBar } from '@/components/TabBar';
import { useOnboarding } from '@/features/profile/onboarding';
import { colors } from '@/theme/tokens';

export default function TabsLayout() {
  const onboarding = useOnboarding();
  if (onboarding.loaded && !onboarding.done) return <Redirect href="/onboarding" />;

  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}>
      <Tabs.Screen name="index" options={{ title: 'Inicio' }} />
      <Tabs.Screen name="collection" options={{ title: 'Colección' }} />
      <Tabs.Screen name="profile" options={{ title: 'Perfil' }} />
    </Tabs>
  );
}
