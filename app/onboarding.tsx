import { useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useRef, useState, type ComponentRef } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { PointCloud } from '@/features/creatures/PointCloud';
import { getAuthMode } from '@/features/auth/authStore';
import { completeOnboarding } from '@/features/profile/onboarding';
import { useReducedMotionPref } from '@/features/profile/settings';
import { colors, radii, rarityColors, space } from '@/theme/tokens';

const PAGES = [
  {
    label: '01 · Qué es',
    title: 'Todo objeto esconde una criatura',
    body: 'Escanea cualquier cosa real —una taza, unos audífonos, una planta— y la IA la convierte en una criatura única con su propio modelo 3D.',
  },
  {
    label: '02 · Cómo escanear',
    title: 'Rodea el objeto despacio',
    body: 'Camina a su alrededor con el teléfono apuntándolo. El anillo se llena y tomamos una foto en cada ángulo: con 3 basta, con 8 es perfecto.',
  },
  {
    label: '03 · Colecciona',
    title: 'Común, Rara, Épica… o Legendaria',
    body: 'Mientras más inusual el objeto, más rara la criatura. Guárdalas, compáralas y completa tu colección.',
  },
];

function Illustration({ index, size }: { index: number; size: number }) {
  if (index === 0) return <PointCloud size={size} />;
  if (index === 1) {
    return (
      <View style={[styles.ringIllu, { width: size, height: size, borderRadius: size / 2 }]}>
        {Array.from({ length: 8 }, (_, i) => (
          <View
            key={i}
            style={[
              styles.ringSeg,
              {
                backgroundColor: i < 3 ? colors.lime : 'rgba(255,255,255,0.18)',
                transform: [{ rotate: `${i * 45}deg` }, { translateY: -size / 2 + 12 }],
              },
            ]}
          />
        ))}
        <Icon name="scan" size={56} color={colors.lime} strokeWidth={1.5} />
        <AppText variant="label" color={colors.lime} style={{ marginTop: space.xs }}>
          3/8 ángulos
        </AppText>
      </View>
    );
  }
  const rarities = ['Común', 'Rara', 'Épica', 'Legendaria'] as const;
  return (
    <View style={[styles.cards, { width: size, height: size }]}>
      {rarities.map((r, i) => (
        <View
          key={r}
          style={[
            styles.miniCard,
            {
              borderColor: rarityColors[r].solid,
              shadowColor: rarityColors[r].solid,
              transform: [{ rotate: `${(i - 1.5) * 9}deg` }, { translateX: (i - 1.5) * 34 }, { translateY: Math.abs(i - 1.5) * 10 }],
            },
          ]}>
          <View style={[styles.miniDot, { backgroundColor: rarityColors[r].solid }]} />
          <AppText variant="label" color={colors.text}>
            {r}
          </AppText>
        </View>
      ))}
    </View>
  );
}

export default function Onboarding() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotionPref();
  const [page, setPage] = useState(0);
  const [askCamera, setAskCamera] = useState(false);
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null);
  const [perm, requestPerm] = useCameraPermissions();
  const illu = Math.min(width - 96, 280);

  const finish = () => {
    completeOnboarding();
    router.replace(getAuthMode() === 'none' ? '/welcome' : '/');
  };

  const next = () => {
    if (page < PAGES.length - 1) {
      scroller.current?.scrollTo({ x: (page + 1) * width, animated: !reduce });
      setPage(page + 1);
    } else if (perm?.granted) {
      finish();
    } else {
      setAskCamera(true);
    }
  };

  if (askCamera) {
    return (
      <Animated.View entering={reduce ? undefined : FadeIn.duration(300)} style={[styles.root, { paddingTop: insets.top + space.xl, paddingBottom: insets.bottom + space.md }]}>
        <View style={styles.permIcon}>
          <Icon name="camera" size={40} color={colors.lime} />
        </View>
        <AppText variant="label" style={{ marginTop: space.lg }}>
          Antes de empezar
        </AppText>
        <AppText variant="title" accessibilityRole="header" style={{ marginTop: space.xs }}>
          Necesitamos tu cámara
        </AppText>
        <AppText variant="body" color={colors.muted} style={{ marginTop: space.sm }}>
          La usamos solo mientras escaneas. Las fotos se reducen y se envían a nuestro servidor para que la IA identifique el objeto. Si creas una cuenta, se guardan en privado en la nube; si no, solo en tu teléfono.
        </AppText>
        <AppText variant="small" style={{ marginTop: space.sm }}>
          También usaremos el giroscopio para saber cuánto has rodeado el objeto.
        </AppText>
        <View style={{ flex: 1 }} />
        <Button
          label="Permitir cámara"
          icon="camera"
          onPress={async () => {
            await requestPerm();
            finish();
          }}
        />
        <Button label="Ahora no" variant="ghost" onPress={finish} style={{ marginTop: space.xs }} accessibilityHint="Podrás dar el permiso al abrir el escáner" />
      </Animated.View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top + space.sm, paddingBottom: insets.bottom + space.md, paddingHorizontal: 0 }]}>
      <View style={[styles.topRow, { paddingHorizontal: space.md }]}>
        <AppText variant="label" color={colors.lime}>
          Cazador de Objetos
        </AppText>
        {page < PAGES.length - 1 && (
          <Button label="Saltar" variant="ghost" compact onPress={() => (perm?.granted ? finish() : setAskCamera(true))} />
        )}
      </View>
      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
        style={{ flex: 1 }}>
        {PAGES.map((p, i) => (
          <View key={p.label} style={[styles.page, { width }]} accessible accessibilityLabel={`${p.title}. ${p.body}`}>
            <View style={styles.illu}>
              <Illustration index={i} size={illu} />
            </View>
            <AppText variant="label" color={colors.lime}>
              {p.label}
            </AppText>
            <AppText variant="title" accessibilityRole="header" style={{ marginTop: space.xs }}>
              {p.title}
            </AppText>
            <AppText variant="body" color={colors.muted} style={{ marginTop: space.sm }}>
              {p.body}
            </AppText>
          </View>
        ))}
      </ScrollView>
      <View style={{ paddingHorizontal: space.md }}>
        <View style={styles.dots} accessibilityLabel={`Paso ${page + 1} de ${PAGES.length}`}>
          {PAGES.map((_, i) => (
            <View key={i} style={[styles.dot, i === page && styles.dotActive]} />
          ))}
        </View>
        <Button label={page < PAGES.length - 1 ? 'Siguiente' : 'Empezar a cazar'} onPress={next} icon={page === PAGES.length - 1 ? 'sparkle' : undefined} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: space.md },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 44 },
  page: { paddingHorizontal: space.md, justifyContent: 'flex-end', paddingBottom: space.lg },
  illu: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', gap: 6, justifyContent: 'center', marginBottom: space.md },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.borderStrong },
  dotActive: { width: 24, backgroundColor: colors.lime },
  ringIllu: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  ringSeg: { position: 'absolute', width: 34, height: 8, borderRadius: 4 },
  cards: { alignItems: 'center', justifyContent: 'center' },
  miniCard: {
    position: 'absolute',
    width: 110,
    height: 150,
    borderRadius: radii.md,
    borderWidth: 1.5,
    backgroundColor: colors.surface,
    padding: space.sm,
    justifyContent: 'flex-end',
    gap: 6,
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
  miniDot: { width: 10, height: 10, borderRadius: 5 },
  permIcon: { width: 80, height: 80, borderRadius: radii.lg, backgroundColor: colors.limeDim, alignItems: 'center', justifyContent: 'center' },
});
