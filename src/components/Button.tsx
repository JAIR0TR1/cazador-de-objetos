import { type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { useReducedMotionPref } from '@/features/profile/settings';
import { haptic } from '@/services/haptics';
import { colors, fonts, radii, sizes, space, springs } from '@/theme/tokens';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
  trailing?: ReactNode;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Botón de 52 pt con escala por spring al presionar y haptic ligero. */
export function Button({ label, onPress, variant = 'primary', icon, loading, disabled, accessibilityHint, style, compact, trailing }: Props) {
  const reduce = useReducedMotionPref();
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const v = variantStyles[variant];
  const isDisabled = disabled || loading;

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      disabled={isDisabled}
      onPressIn={() => {
        if (!reduce) scale.value = withSpring(0.96, springs.snappy);
      }}
      onPressOut={() => {
        if (!reduce) scale.value = withSpring(1, springs.snappy);
      }}
      onPress={() => {
        haptic.light();
        onPress();
      }}
      style={[styles.base, compact && styles.compact, { backgroundColor: v.bg, borderColor: v.border }, isDisabled && styles.disabled, anim, style]}>
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <View style={styles.row}>
          {icon && <Icon name={icon} size={20} color={v.fg} strokeWidth={2} />}
          {/* Hasta 2 líneas: con texto grande del sistema o pantallas de 360 pt la etiqueta no se corta. */}
          <AppText style={[styles.label, { color: v.fg }]} numberOfLines={2} maxFontSizeMultiplier={1.4}>
            {label}
          </AppText>
          {trailing}
        </View>
      )}
    </AnimatedPressable>
  );
}

const variantStyles: Record<Variant, { bg: string; fg: string; border: string }> = {
  primary: { bg: colors.lime, fg: colors.onLime, border: colors.lime },
  secondary: { bg: colors.surfaceRaised, fg: colors.text, border: colors.border },
  ghost: { bg: 'transparent', fg: colors.text, border: colors.borderStrong },
  danger: { bg: colors.dangerDim, fg: colors.danger, border: 'rgba(255,90,79,0.3)' },
};

const styles = StyleSheet.create({
  base: {
    minHeight: sizes.button,
    borderRadius: radii.sm + 4,
    borderWidth: 1,
    paddingHorizontal: space.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compact: { minHeight: sizes.touch, paddingHorizontal: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xs, maxWidth: '100%' },
  label: { fontFamily: fonts.bodySemi, fontSize: 16, lineHeight: 20, textAlign: 'center', flexShrink: 1 },
  disabled: { opacity: 0.45 },
});
