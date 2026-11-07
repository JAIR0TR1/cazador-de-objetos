import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { useReducedMotionPref } from '@/features/profile/settings';
import { colors } from '@/theme/tokens';

interface Props {
  size: number;
  /** 0 = puntos dispersos, 1 = forma ensamblada. Si se omite, se arma sola. */
  assemble?: SharedValue<number>;
  color?: string;
  count?: number;
  opacity?: number;
}

/** Puntos sobre una esfera achatada (forma de "objeto") con posición de dispersión aleatoria. */
function makePoints(n: number) {
  const pts = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const th = golden * i;
    const bulge = 0.75 + 0.25 * Math.cos(y * 2.2); // silueta tipo jarrón
    pts.push({
      x: Math.cos(th) * r * bulge,
      y: y * 0.95,
      z: Math.sin(th) * r * bulge,
      sx: (Math.sin(i * 12.9898) * 43758.5453) % 1,
      sy: (Math.sin(i * 78.233) * 12345.678) % 1,
      s: 2 + ((i * 7) % 3),
    });
  }
  return pts;
}

function Dot({ p, size, rot, asm, color }: { p: ReturnType<typeof makePoints>[number]; size: number; rot: SharedValue<number>; asm: SharedValue<number>; color: string }) {
  const style = useAnimatedStyle(() => {
    const c = Math.cos(rot.value);
    const s = Math.sin(rot.value);
    const x = p.x * c - p.z * s;
    const z = p.x * s + p.z * c;
    const half = size / 2;
    const tx = (x * 0.42 * size) * asm.value + p.sx * size * 0.9 * (1 - asm.value);
    const ty = (p.y * 0.42 * size) * asm.value + p.sy * size * 0.9 * (1 - asm.value);
    const depth = (z + 1) / 2; // 0 atrás – 1 adelante
    return {
      opacity: 0.25 + depth * 0.75,
      transform: [{ translateX: half + tx }, { translateY: half + ty }, { scale: 0.6 + depth * 0.7 }],
    };
  });
  return <Animated.View style={[styles.dot, { width: p.s, height: p.s, borderRadius: p.s, backgroundColor: color }, style]} />;
}

/** Nube de puntos que gira y se "arma" (efecto de reconstrucción 3D). Solo transform/opacity. */
export function PointCloud({ size, assemble, color = colors.lime, count = 56, opacity = 1 }: Props) {
  const reduce = useReducedMotionPref();
  const points = useMemo(() => makePoints(count), [count]);
  const rot = useSharedValue(0);
  const own = useSharedValue(reduce ? 1 : 0);
  const asm = assemble ?? own;

  useEffect(() => {
    if (reduce) return;
    rot.value = withRepeat(withTiming(Math.PI * 2, { duration: 9000, easing: Easing.linear }), -1, false);
    if (!assemble) own.value = withTiming(1, { duration: 1800, easing: Easing.out(Easing.cubic) });
  }, [reduce, rot, own, assemble]);

  return (
    <View style={{ width: size, height: size, opacity }} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {points.map((p, i) => (
        <Dot key={i} p={p} size={size} rot={rot} asm={asm} color={color} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  dot: { position: 'absolute', left: 0, top: 0 },
});
