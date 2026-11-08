import { router } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { useReducedMotionPref } from '@/features/profile/settings';
import { haptic } from '@/services/haptics';
import { colors, fonts, radii, space, springs } from '@/theme/tokens';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

type Slot = { kind: 'tab'; route: string; label: string; icon: IconName } | { kind: 'scan' };

/** Orden: Inicio · Escanear (central elevado) · Colección · Perfil */
const SLOTS: Slot[] = [
  { kind: 'tab', route: 'index', label: 'Inicio', icon: 'home' },
  { kind: 'scan' },
  { kind: 'tab', route: 'collection', label: 'Colección', icon: 'grid' },
  { kind: 'tab', route: 'profile', label: 'Perfil', icon: 'user' },
];

/** Tab bar flotante con indicador animado (spring) y botón de escaneo elevado en lima. */
export function TabBar({ state, navigation, insets }: BottomTabBarProps) {
  const reduce = useReducedMotionPref();
  const [width, setWidth] = useState(0);
  const slotW = width / SLOTS.length;
  const activeName = state.routes[state.index]?.name;
  const activeSlot = Math.max(
    0,
    SLOTS.findIndex((s) => s.kind === 'tab' && s.route === activeName),
  );
  const x = useSharedValue(0);

  useEffect(() => {
    if (!slotW) return;
    const target = activeSlot * slotW + slotW / 2 - 12;
    x.value = reduce ? withTiming(target, { duration: 0 }) : withSpring(target, springs.snappy);
  }, [activeSlot, slotW, reduce, x]);

  const indicator = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View pointerEvents="box-none" style={[styles.outer, { paddingBottom: Math.max(insets.bottom, space.sm) }]}>
      <View style={styles.bar} onLayout={(e) => setWidth(e.nativeEvent.layout.width)} accessibilityRole="tablist">
        {width > 0 && <Animated.View style={[styles.indicator, indicator]} />}
        {SLOTS.map((slot, i) => {
          if (slot.kind === 'scan') {
            return (
              <View key="scan" style={styles.slot}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Escanear objeto"
                  accessibilityHint="Abre la cámara para escanear un objeto en 360 grados"
                  onPress={() => {
                    haptic.medium();
                    router.push('/scan');
                  }}
                  style={({ pressed }) => [styles.scanBtn, pressed && { transform: [{ scale: 0.94 }] }]}>
                  <Icon name="scan" size={28} color={colors.onLime} strokeWidth={2.2} />
                </Pressable>
              </View>
            );
          }
          const route = state.routes.find((r) => r.name === slot.route);
          const focused = i === activeSlot;
          return (
            <Pressable
              key={slot.route}
              accessibilityRole="tab"
              accessibilityLabel={slot.label}
              accessibilityState={{ selected: focused }}
              onPress={() => {
                if (!route || focused) return;
                haptic.tap();
                navigation.navigate(route.name);
              }}
              style={styles.slot}>
              <Icon name={slot.icon} size={22} color={focused ? colors.text : colors.muted} />
              <AppText maxFontSizeMultiplier={1.2} style={[styles.label, { color: focused ? colors.text : colors.muted }]}>
                {slot.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.sm },
  bar: {
    flexDirection: 'row',
    height: 68,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(20,20,24,0.96)',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  slot: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center', gap: 2 },
  label: { fontFamily: fonts.bodyMedium, fontSize: 11, lineHeight: 14 },
  indicator: {
    position: 'absolute',
    top: 6,
    left: 0,
    width: 24,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.lime,
  },
  scanBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginTop: -28,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.bg,
    shadowColor: colors.lime,
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
});
