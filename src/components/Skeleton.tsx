import { useEffect } from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { useReducedMotionPref } from '@/features/profile/settings';
import { colors, radii } from '@/theme/tokens';

/** Placeholder de carga con pulso de opacidad. */
export function Skeleton({ style, radius = radii.sm }: { style?: StyleProp<ViewStyle>; radius?: number }) {
  const reduce = useReducedMotionPref();
  const o = useSharedValue(0.5);
  useEffect(() => {
    if (!reduce) o.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
  }, [reduce, o]);
  const anim = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View
      accessibilityLabel="Cargando"
      style={[{ backgroundColor: colors.surfaceRaised, borderRadius: radius }, anim, style]}
    />
  );
}
