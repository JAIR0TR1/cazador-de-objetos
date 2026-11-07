import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming, Easing } from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { useReducedMotionPref } from '@/features/profile/settings';
import { colors, fonts, radii, rarityColors, space, typeColors } from '@/theme/tokens';
import type { CreatureStats, CreatureType, Rarity } from '@/types';

export function RarityBadge({ rarity, small }: { rarity: Rarity; small?: boolean }) {
  const r = rarityColors[rarity];
  return (
    <LinearGradient
      colors={r.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.badge, small && styles.small]}
      accessibilityLabel={`Rareza ${rarity}`}>
      <AppText maxFontSizeMultiplier={1.2} style={[styles.badgeText, { color: rarity === 'Común' ? colors.bg : '#fff' }]}>
        {rarity}
      </AppText>
    </LinearGradient>
  );
}

export function TypeBadge({ type, small }: { type: CreatureType; small?: boolean }) {
  const c = typeColors[type];
  return (
    <View style={[styles.badge, small && styles.small, { backgroundColor: c + '22', borderWidth: 1, borderColor: c + '66' }]} accessibilityLabel={`Tipo ${type}`}>
      <View style={[styles.dot, { backgroundColor: c }]} />
      <AppText maxFontSizeMultiplier={1.2} style={[styles.badgeText, { color: c }]}>
        {type}
      </AppText>
    </View>
  );
}

const STAT_LABELS: Record<keyof CreatureStats, string> = {
  ataque: 'ATQ',
  defensa: 'DEF',
  velocidad: 'VEL',
  energia: 'ENE',
};

/** Barra de stat animada (scaleX desde la izquierda: solo transform). */
export function StatBar({ stat, value, color, delay = 0 }: { stat: keyof CreatureStats; value: number; color: string; delay?: number }) {
  const reduce = useReducedMotionPref();
  const p = useSharedValue(reduce ? value / 100 : 0);
  useEffect(() => {
    p.value = reduce ? value / 100 : withDelay(delay, withTiming(value / 100, { duration: 900, easing: Easing.out(Easing.cubic) }));
  }, [value, delay, reduce, p]);
  const fill = useAnimatedStyle(() => ({ transform: [{ scaleX: p.value }] }));
  return (
    <View style={styles.statRow} accessible accessibilityLabel={`${stat} ${value} de 100`}>
      <AppText variant="label" style={styles.statLabel}>
        {STAT_LABELS[stat]}
      </AppText>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, { backgroundColor: color, transformOrigin: 'left' }, fill]} />
      </View>
      <AppText style={styles.statValue} maxFontSizeMultiplier={1.2}>
        {value}
      </AppText>
    </View>
  );
}

export function StatsBlock({ stats, color, stagger = true }: { stats: CreatureStats; color: string; stagger?: boolean }) {
  return (
    <View style={{ gap: space.xs }}>
      {(Object.keys(STAT_LABELS) as (keyof CreatureStats)[]).map((k, i) => (
        <StatBar key={k} stat={k} value={stats[k]} color={color} delay={stagger ? 200 + i * 120 : 0} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    height: 26,
    borderRadius: radii.pill,
    alignSelf: 'flex-start',
  },
  small: { height: 22, paddingHorizontal: 8 },
  badgeText: { fontFamily: fonts.monoBold, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  dot: { width: 6, height: 6, borderRadius: 3 },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs, minHeight: 20 },
  statLabel: { width: 36 },
  track: { flex: 1, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  fill: { height: '100%', width: '100%', borderRadius: 4 },
  statValue: { fontFamily: fonts.monoBold, fontSize: 13, width: 30, textAlign: 'right', color: colors.text },
});
