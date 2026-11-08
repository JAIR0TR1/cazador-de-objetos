import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { useReducedMotionPref } from '@/features/profile/settings';
import { colors, radii, space } from '@/theme/tokens';

import { PointCloud } from './PointCloud';

interface Props {
  photos: string[];
  accent?: string;
  label: string;
}

/**
 * Fallback sin GLB: "visor 360°" con las fotos capturadas. Arrastrar horizontalmente cambia
 * de ángulo; además gira solo despacio. Encima, una capa de nube de puntos animada.
 */
export function PhotoSpinViewer({ photos, accent = colors.lime, label }: Props) {
  const reduce = useReducedMotionPref();
  const [index, setIndex] = useState(0);
  const [size, setSize] = useState(0);
  const dragging = useRef(false);
  const startIndex = useRef(0);
  const n = photos.length;

  useEffect(() => {
    if (reduce || n < 2) return;
    const t = setInterval(() => {
      if (!dragging.current) setIndex((i) => (i + 1) % n);
    }, 900);
    return () => clearInterval(t);
  }, [reduce, n]);

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderGrant: () => {
        dragging.current = true;
        setIndex((i) => {
          startIndex.current = i;
          return i;
        });
      },
      onPanResponderMove: (_, g) => {
        if (!n) return;
        const step = Math.round(-g.dx / 36);
        setIndex(((startIndex.current + step) % n + n) % n);
      },
      onPanResponderRelease: () => {
        dragging.current = false;
      },
      onPanResponderTerminate: () => {
        dragging.current = false;
      },
    }),
  ).current;

  return (
    <View
      style={styles.wrap}
      onLayout={(e) => setSize(Math.min(e.nativeEvent.layout.width, e.nativeEvent.layout.height))}
      accessible
      accessibilityLabel={label}
      accessibilityHint={n > 1 ? 'Arrastra a los lados para ver otros ángulos' : undefined}
      accessibilityValue={n ? { text: `Ángulo ${index + 1} de ${n}` } : undefined}
      {...pan.panHandlers}>
      {n > 0 ? (
        photos.map((uri, i) => (
          <Image
            key={uri}
            source={{ uri }}
            style={[StyleSheet.absoluteFill, { opacity: i === index ? 1 : 0 }]}
            contentFit="cover"
            transition={0}
          />
        ))
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.surface }]} />
      )}
      <View style={styles.scrim} pointerEvents="none" />
      {size > 0 && (
        <View style={styles.cloud} pointerEvents="none">
          <PointCloud size={size * 0.8} color={accent} opacity={n ? 0.55 : 1} />
        </View>
      )}
      <View style={styles.hud} pointerEvents="none">
        <Icon name="rotate" size={14} color={colors.text} />
        <AppText variant="label" color={colors.text}>
          {n ? `360° · ${index + 1}/${n}` : 'Vista previa'}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, borderRadius: radii.md, overflow: 'hidden', backgroundColor: colors.surface },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,10,12,0.25)' },
  cloud: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  hud: {
    position: 'absolute',
    left: space.sm,
    bottom: space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.scrim,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
});
