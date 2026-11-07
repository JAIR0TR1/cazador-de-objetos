import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, FadeIn, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Icon } from '@/components/Icon';
import { PointCloud } from '@/features/creatures/PointCloud';
import { useReducedMotionPref } from '@/features/profile/settings';
import { ScanLine } from '@/features/scanner/ScannerHUD';
import { applyDemoToSession, runPipeline, sessionStore, useSession } from '@/features/scanner/session';
import { haptic } from '@/services/haptics';
import { colors, fonts, radii, space } from '@/theme/tokens';

/** Tiempo máximo que esperamos al 3D tras terminar el análisis; luego sigue en segundo plano. */
const EXTRA_WAIT_3D_MS = 25000;

type StepState = 'waiting' | 'active' | 'done' | 'skipped';

function Step({ n, label, state, detail }: { n: number; label: string; state: StepState; detail?: string }) {
  const color = state === 'done' ? colors.lime : state === 'active' ? colors.text : colors.muted;
  return (
    <View style={styles.step} accessible accessibilityLabel={`Paso ${n}: ${label}. ${state === 'done' ? 'Completado' : state === 'active' ? 'En curso' : state === 'skipped' ? 'Continúa en segundo plano' : 'Pendiente'}`}>
      <View style={[styles.stepIcon, { borderColor: color, backgroundColor: state === 'done' ? colors.limeDim : 'transparent' }]}>
        {state === 'done' ? <Icon name="check" size={16} color={colors.lime} strokeWidth={2.4} /> : <AppText style={[styles.stepNum, { color }]}>{n}</AppText>}
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="bodyStrong" color={state === 'waiting' ? colors.muted : colors.text}>
          {label}
        </AppText>
        {detail ? <AppText variant="small">{detail}</AppText> : null}
      </View>
      {state === 'active' && <View style={styles.activeDot} />}
    </View>
  );
}

export default function Processing() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reduce = useReducedMotionPref();
  const s = useSession();
  const assemble = useSharedValue(0);
  const [creating, setCreating] = useState(false);
  const analysisDoneAt = useRef<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const navigated = useRef(false);
  const size = Math.min(width - 64, 280);

  // Arranque
  useEffect(() => {
    if (!sessionStore.get().photos.length) {
      router.replace('/');
      return;
    }
    if (sessionStore.get().analysisStatus === 'idle') void runPipeline();
  }, []);

  // Reloj para el tiempo de espera del 3D
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // La nube se arma según el avance real
  useEffect(() => {
    const target = s.analysisStatus === 'done' ? (s.model.status === 'pending' ? 0.75 + (s.model.progress / 100) * 0.25 : 1) : 0.15 + Math.min(0.45, s.model.progress / 200);
    assemble.value = reduce ? target : withTiming(target, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [s.analysisStatus, s.model.status, s.model.progress, reduce, assemble]);

  useEffect(() => {
    if (s.analysisStatus === 'done' && analysisDoneAt.current === null) {
      analysisDoneAt.current = Date.now();
      setCreating(true);
      haptic.light();
    }
    if (s.analysisStatus === 'error') haptic.error();
  }, [s.analysisStatus]);

  const goResult = () => {
    if (navigated.current) return;
    navigated.current = true;
    router.replace('/result');
  };

  // Navegar al resultado cuando: análisis listo y (3D listo/fallido o se agotó la espera)
  const modelSettled = s.model.status === 'ready' || s.model.status === 'failed' || s.model.status === 'none';
  const waitedLong = analysisDoneAt.current !== null && now - analysisDoneAt.current > EXTRA_WAIT_3D_MS;
  useEffect(() => {
    if (s.analysisStatus !== 'done') return;
    if (modelSettled || waitedLong) {
      const t = setTimeout(goResult, 1100); // deja ver el paso "Creando criatura"
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.analysisStatus, modelSettled, waitedLong]);

  if (s.analysisStatus === 'error' && s.error) {
    const notObject = s.error.kind === 'not_object';
    return (
      <View style={[styles.root, { paddingTop: insets.top + space.xl, justifyContent: 'center' }]}>
        <EmptyState
          tone="error"
          icon={notObject ? 'search' : 'refresh'}
          title={notObject ? 'No logramos ver un objeto claro' : 'No pudimos analizar el objeto'}
          message={s.error.message}
          cta={notObject ? { label: 'Volver a escanear', icon: 'scan', onPress: () => router.replace('/scan') } : { label: 'Reintentar', icon: 'refresh', onPress: () => void runPipeline() }}
          secondary={{
            label: 'Usar modo demo',
            onPress: async () => {
              await applyDemoToSession();
              goResult();
            },
          }}
        />
        {!notObject && <Button label="Volver a escanear" variant="ghost" onPress={() => router.replace('/scan')} style={{ marginHorizontal: space.md }} />}
      </View>
    );
  }

  const analysisState: StepState = s.analysisStatus === 'done' ? 'done' : 'active';
  const modelState: StepState =
    s.model.status === 'ready' ? 'done' : s.model.status === 'failed' ? 'skipped' : waitedLong ? 'skipped' : s.model.status === 'pending' ? 'active' : 'waiting';
  const modelDetail =
    s.model.status === 'failed'
      ? 'Usaremos la vista 360° de tus fotos'
      : s.model.status === 'pending'
        ? `${s.model.progress}% · puede tardar hasta 2 min`
        : undefined;

  return (
    <View style={[styles.root, { paddingTop: insets.top + space.md, paddingBottom: insets.bottom + space.md }]}>
      <AppText variant="label" color={colors.lime} center>
        Reconstruyendo
      </AppText>
      <AppText variant="title" center accessibilityRole="header" style={{ marginTop: space.xs }}>
        Dando vida a tu objeto
      </AppText>

      <View style={styles.stage}>
        <View style={[styles.cloudBox, { width: size, height: size }]}>
          <PointCloud size={size} assemble={assemble} count={72} />
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <ScanLine height={size} reduce={reduce} />
          </View>
        </View>
        <AppText variant="label" style={{ marginTop: space.sm }}>
          {s.photos.length} ángulos capturados
        </AppText>
      </View>

      <View style={styles.steps}>
        <Step n={1} label="Analizando con IA" state={analysisState} detail={s.analysis ? `Es: ${s.analysis.objeto}` : 'Identificando objeto, material y colores'} />
        <Step n={2} label="Reconstruyendo modelo 3D" state={modelState} detail={modelDetail} />
        <Step n={3} label="Creando criatura" state={creating ? (navigated.current ? 'done' : 'active') : 'waiting'} detail={s.analysis ? s.analysis.criatura.nombre : undefined} />
      </View>

      {s.analysisStatus === 'done' && s.model.status === 'pending' && (
        <Animated.View entering={reduce ? undefined : FadeIn}>
          <Button label="Ver criatura ahora" variant="secondary" onPress={goResult} accessibilityHint="El modelo 3D seguirá cargando en segundo plano" />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: space.md },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cloudBox: { overflow: 'hidden', borderRadius: radii.lg },
  steps: { backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, padding: space.sm, gap: space.sm, marginBottom: space.sm },
  step: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 44 },
  stepIcon: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  stepNum: { fontFamily: fonts.monoBold, fontSize: 13 },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.lime },
});
