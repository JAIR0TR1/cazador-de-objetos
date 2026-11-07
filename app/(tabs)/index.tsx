import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { EmptyState } from '@/components/EmptyState';
import { Icon } from '@/components/Icon';
import { Skeleton } from '@/components/Skeleton';
import { useCollection } from '@/features/collection/collectionStore';
import { CreatureThumb } from '@/features/creatures/CreatureThumb';
import { useReducedMotionPref } from '@/features/profile/settings';
import { isApiConfigured } from '@/services/api/client';
import { haptic } from '@/services/haptics';
import { colors, fonts, radii, RARITIES, rarityColors, space, TYPES } from '@/theme/tokens';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function PulseRing({ progress, size }: { progress: SharedValue<number>; size: number }) {
  const s = useAnimatedStyle(() => ({
    opacity: 0.55 * (1 - progress.value),
    transform: [{ scale: 1 + progress.value * 0.45 }],
  }));
  return <Animated.View pointerEvents="none" style={[styles.pulse, { width: size, height: size, borderRadius: size / 2 }, s]} />;
}

/** Botón protagonista con anillos animados (único efecto principal de la pantalla). */
function ScanHero() {
  const reduce = useReducedMotionPref();
  const a = useSharedValue(0);
  const b = useSharedValue(0);
  const spin = useSharedValue(0);
  const SIZE = 184;
  useEffect(() => {
    if (reduce) return;
    const loop = () => withRepeat(withTiming(1, { duration: 2400, easing: Easing.out(Easing.quad) }), -1, false);
    a.value = loop();
    b.value = withDelay(1200, loop());
    spin.value = withRepeat(withTiming(360, { duration: 14000, easing: Easing.linear }), -1, false);
  }, [reduce, a, b, spin]);
  const spinStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value}deg` }] }));

  return (
    <View style={styles.heroWrap}>
      <PulseRing progress={a} size={SIZE} />
      <PulseRing progress={b} size={SIZE} />
      <Animated.View style={[styles.dashRing, { width: SIZE + 28, height: SIZE + 28, borderRadius: (SIZE + 28) / 2 }, spinStyle]} pointerEvents="none" />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Escanear objeto"
        accessibilityHint="Abre la cámara para escanear un objeto en 360 grados"
        onPress={() => {
          haptic.medium();
          router.push('/scan');
        }}
        style={({ pressed }) => [styles.hero, { width: SIZE, height: SIZE, borderRadius: SIZE / 2 }, pressed && { transform: [{ scale: 0.96 }] }]}>
        <Icon name="scan" size={48} color={colors.onLime} strokeWidth={2} />
        <AppText style={styles.heroText} maxFontSizeMultiplier={1.2}>
          Escanear objeto
        </AppText>
      </Pressable>
    </View>
  );
}

export default function Home() {
  const insets = useSafeAreaInsets();
  const col = useCollection();
  const typesFound = Object.keys(col.byType).length;
  const total = col.items.length;

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingTop: insets.top + space.sm, paddingBottom: 140, paddingHorizontal: space.md }}>
      <View style={styles.topRow}>
        <View style={{ flex: 1 }}>
          <AppText variant="label">{greeting()}</AppText>
          <AppText variant="title" accessibilityRole="header">
            ¿Qué vas a cazar hoy?
          </AppText>
        </View>
        <View style={styles.streak} accessible accessibilityLabel={`Racha de ${col.streak} días`}>
          <Icon name="flame" size={18} color={col.streak ? '#FF6B3D' : colors.muted} />
          <AppText style={styles.streakText}>{col.streak}</AppText>
        </View>
      </View>

      {!isApiConfigured() && (
        <View style={styles.banner} accessibilityRole="alert">
          <AppText variant="small" color={colors.text}>
            Servidor no configurado: los escaneos usarán el modo demo.
          </AppText>
        </View>
      )}

      <ScanHero />

      <AppText variant="label" style={styles.sectionLabel}>
        Última captura
      </AppText>
      {!col.loaded ? (
        <Skeleton style={{ height: 240 }} radius={radii.md} />
      ) : col.latest ? (
        <CreatureThumb wide creature={col.latest} onPress={() => router.push({ pathname: '/creature/[id]', params: { id: col.latest!.id } })} />
      ) : (
        <View style={styles.panel}>
          <EmptyState
            icon="sparkle"
            title="Aún no tienes criaturas"
            message="Busca un objeto interesante a tu alrededor y rodéalo con la cámara."
            cta={{ label: 'Escanear mi primer objeto', icon: 'scan', onPress: () => router.push('/scan') }}
          />
        </View>
      )}

      <AppText variant="label" style={styles.sectionLabel}>
        Progreso de colección
      </AppText>
      <View style={styles.panel}>
        <View style={styles.progressRow}>
          <View>
            <AppText style={styles.bigNum}>{total}</AppText>
            <AppText variant="small">criaturas</AppText>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <AppText style={styles.bigNum}>
              {typesFound}
              <AppText style={styles.bigNumMuted}>/{TYPES.length}</AppText>
            </AppText>
            <AppText variant="small">tipos descubiertos</AppText>
          </View>
        </View>
        <View style={styles.bar} accessible accessibilityLabel={RARITIES.map((r) => `${col.byRarity[r]} ${r}`).join(', ')}>
          {total === 0 ? (
            <View style={[styles.barSeg, { flex: 1, backgroundColor: colors.surfaceRaised }]} />
          ) : (
            RARITIES.filter((r) => col.byRarity[r] > 0).map((r) => <View key={r} style={[styles.barSeg, { flex: col.byRarity[r], backgroundColor: rarityColors[r].solid }]} />)
          )}
        </View>
        <View style={styles.legend}>
          {RARITIES.map((r) => (
            <View key={r} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: rarityColors[r].solid }]} />
              <AppText variant="small">
                {r} {col.byRarity[r]}
              </AppText>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    minHeight: 44,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  streakText: { fontFamily: fonts.monoBold, fontSize: 16, color: colors.text },
  banner: { marginTop: space.sm, padding: space.sm, borderRadius: radii.sm, backgroundColor: colors.blueDim, borderWidth: 1, borderColor: 'rgba(47,107,255,0.4)' },
  heroWrap: { height: 300, alignItems: 'center', justifyContent: 'center' },
  pulse: { position: 'absolute', borderWidth: 2, borderColor: colors.lime },
  dashRing: { position: 'absolute', borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(198,255,61,0.4)' },
  hero: {
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    shadowColor: colors.lime,
    shadowOpacity: 0.5,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
    elevation: 14,
  },
  heroText: { fontFamily: fonts.title, fontSize: 18, color: colors.onLime },
  sectionLabel: { marginTop: space.md, marginBottom: space.xs },
  panel: { backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, padding: space.sm },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  bigNum: { fontFamily: fonts.display, fontSize: 36, lineHeight: 40, color: colors.text },
  bigNumMuted: { fontFamily: fonts.display, fontSize: 22, color: colors.muted },
  bar: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', marginTop: space.sm, gap: 2 },
  barSeg: { height: '100%' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
});
