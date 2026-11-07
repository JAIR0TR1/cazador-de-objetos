import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { colors, springs } from '@/theme/tokens';

const AnimatedPath = Animated.createAnimatedComponent(Path);

function arcPath(cx: number, cy: number, r: number, a0: number, a1: number) {
  const p = (a: number) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const [x0, y0] = p(a0);
  const [x1, y1] = p(a1);
  return `M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}`;
}

function Segment({ d, filled, current, reduce }: { d: string; filled: boolean; current: boolean; reduce: boolean }) {
  const f = useSharedValue(filled ? 1 : 0);
  useEffect(() => {
    f.value = reduce ? (filled ? 1 : 0) : withSpring(filled ? 1 : 0, springs.bouncy);
  }, [filled, reduce, f]);
  const props = useAnimatedProps(() => ({
    strokeOpacity: 0.22 + f.value * 0.78,
    strokeWidth: 6 + f.value * 4,
  }));
  return <AnimatedPath d={d} stroke={filled ? colors.lime : current ? colors.text : '#FFFFFF'} strokeLinecap="round" fill="none" animatedProps={props} />;
}

/** Anillo de 8 segmentos que se llena al rodear el objeto + marcador de orientación. */
export function SegmentRing({ size, filled, currentSeg, yaw, reduce }: { size: number; filled: boolean[]; currentSeg: number; yaw: SharedValue<number>; reduce: boolean }) {
  const r = size / 2 - 10;
  const n = filled.length;
  const gap = 0.12;
  const paths = useMemo(
    () =>
      Array.from({ length: n }, (_, i) => {
        const a0 = (i / n) * Math.PI * 2 - Math.PI / 2 + gap;
        const a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2 - gap;
        return arcPath(size / 2, size / 2, r, a0, a1);
      }),
    [n, r, size],
  );
  const marker = useAnimatedStyle(() => ({ transform: [{ rotate: `${yaw.value}deg` }] }));

  return (
    <View style={{ width: size, height: size }} pointerEvents="none">
      <Svg width={size} height={size}>
        {paths.map((d, i) => (
          <Segment key={i} d={d} filled={filled[i]} current={i === currentSeg} reduce={reduce} />
        ))}
      </Svg>
      <Animated.View style={[StyleSheet.absoluteFill, marker]}>
        <View style={[styles.marker, { left: size / 2 - 5, top: -1 }]} />
      </Animated.View>
    </View>
  );
}

/** Retícula central con esquinas de visor. */
export function Reticle({ size }: { size: number }) {
  const c = 22;
  return (
    <View style={{ width: size, height: size }} pointerEvents="none">
      {[
        { top: 0, left: 0, borderTopWidth: 2, borderLeftWidth: 2 },
        { top: 0, right: 0, borderTopWidth: 2, borderRightWidth: 2 },
        { bottom: 0, left: 0, borderBottomWidth: 2, borderLeftWidth: 2 },
        { bottom: 0, right: 0, borderBottomWidth: 2, borderRightWidth: 2 },
      ].map((s, i) => (
        <View key={i} style={[styles.corner, { width: c, height: c }, s]} />
      ))}
      <View style={styles.centerDot} />
      <View style={[styles.cross, { width: 1, height: 18, left: size / 2 - 0.5, top: size / 2 - 9 }]} />
      <View style={[styles.cross, { height: 1, width: 18, top: size / 2 - 0.5, left: size / 2 - 9 }]} />
    </View>
  );
}

/** Línea de escaneo que recorre la retícula de arriba a abajo. */
export function ScanLine({ height, reduce }: { height: number; reduce: boolean }) {
  const y = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    y.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [reduce, y]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value * (height - 40) }] }));
  if (reduce) return null;
  return (
    <Animated.View style={[styles.scanLine, style]} pointerEvents="none">
      <LinearGradient colors={['transparent', 'rgba(198,255,61,0.28)']} style={{ height: 38 }} />
      <View style={{ height: 2, backgroundColor: colors.lime }} />
    </Animated.View>
  );
}

function TrackDot({ x, y, delay, reduce }: { x: number; y: number; delay: number; reduce: boolean }) {
  const o = useSharedValue(reduce ? 0.8 : 0);
  useEffect(() => {
    if (reduce) return;
    o.value = withDelay(delay, withRepeat(withSequence(withTiming(1, { duration: 500 }), withTiming(0.15, { duration: 900 })), -1, false));
  }, [delay, reduce, o]);
  const s = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ scale: 0.6 + o.value * 0.4 }] }));
  return (
    <Animated.View style={[styles.trackDot, { left: x, top: y }, s]}>
      <View style={styles.trackH} />
      <View style={styles.trackV} />
    </Animated.View>
  );
}

/** Puntos de "tracking" sobre la imagen; se regeneran en cada captura. */
export function TrackingPoints({ size, seed, reduce }: { size: number; seed: number; reduce: boolean }) {
  const pts = useMemo(() => {
    const rnd = (i: number) => {
      const v = Math.sin((i + 1) * 12.9898 + seed * 78.233) * 43758.5453;
      return v - Math.floor(v);
    };
    return Array.from({ length: 14 }, (_, i) => ({ x: 20 + rnd(i) * (size - 40), y: 20 + rnd(i + 50) * (size - 40), delay: Math.floor(rnd(i + 99) * 1200) }));
  }, [seed, size]);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pts.map((p, i) => (
        <TrackDot key={`${seed}-${i}`} {...p} reduce={reduce} />
      ))}
    </View>
  );
}

/** Destello suave al tomar cada foto. */
export function ShutterFlash({ tick, reduce }: { tick: number; reduce: boolean }) {
  const o = useSharedValue(0);
  useEffect(() => {
    if (!tick) return;
    o.value = withSequence(withTiming(reduce ? 0.2 : 0.55, { duration: 60 }), withTiming(0, { duration: 320 }));
  }, [tick, reduce, o]);
  const s = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#fff' }, s]} />;
}

const styles = StyleSheet.create({
  marker: { position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: colors.text, borderWidth: 2, borderColor: colors.bg },
  corner: { position: 'absolute', borderColor: colors.lime, borderRadius: 4 },
  centerDot: { position: 'absolute', left: '50%', top: '50%', width: 6, height: 6, marginLeft: -3, marginTop: -3, borderRadius: 3, backgroundColor: colors.lime },
  cross: { position: 'absolute', backgroundColor: 'rgba(198,255,61,0.6)' },
  scanLine: { position: 'absolute', left: 0, right: 0, top: 0 },
  trackDot: { position: 'absolute', width: 10, height: 10, marginLeft: -5, marginTop: -5 },
  trackH: { position: 'absolute', top: 4.5, left: 0, width: 10, height: 1, backgroundColor: colors.lime },
  trackV: { position: 'absolute', left: 4.5, top: 0, width: 1, height: 10, backgroundColor: colors.lime },
});
