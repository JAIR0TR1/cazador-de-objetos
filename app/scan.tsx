import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Icon } from '@/components/Icon';
import { useReducedMotionPref } from '@/features/profile/settings';
import { Reticle, ScanLine, SegmentRing, ShutterFlash, TrackingPoints } from '@/features/scanner/ScannerHUD';
import { startNewSession } from '@/features/scanner/session';
import { GUIDANCE_TEXT, MIN_PHOTOS, SEGMENTS, useScanner } from '@/features/scanner/useScanner';
import { haptic } from '@/services/haptics';
import { colors, fonts, radii, space } from '@/theme/tokens';

export default function ScanScreen() {
  const [perm, requestPerm] = useCameraPermissions();
  const insets = useSafeAreaInsets();

  if (!perm) return <View style={styles.black} />;

  if (!perm.granted) {
    return (
      <View style={[styles.black, { paddingTop: insets.top + space.md, paddingHorizontal: space.md, justifyContent: 'center' }]}>
        <EmptyState
          icon="camera"
          title="Necesitamos tu cámara"
          message="Para escanear el objeto tomamos fotos desde varios ángulos. Solo se usan para crear tu criatura."
          cta={
            perm.canAskAgain
              ? { label: 'Permitir cámara', icon: 'camera', onPress: () => requestPerm() }
              : { label: 'Abrir Ajustes', onPress: () => Linking.openSettings() }
          }
          secondary={{ label: 'Volver', onPress: () => router.back() }}
        />
      </View>
    );
  }

  return <Scanner />;
}

function Scanner() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotionPref();
  const cam = useRef<CameraView>(null);
  const [ready, setReady] = useState(false);
  const s = useScanner(cam, ready);
  const ringSize = Math.min(width - 48, 320);
  const reticleSize = ringSize - 72;
  const finishing = useRef(false);

  const finish = () => {
    if (finishing.current || s.count < MIN_PHOTOS) return;
    finishing.current = true;
    haptic.success();
    startNewSession(s.photos);
    router.replace('/processing');
  };

  // Al completar los 8 ángulos, pasa solo a procesar.
  useEffect(() => {
    if (!s.isComplete) return;
    const t = setTimeout(finish, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.isComplete]);

  return (
    <View style={styles.black}>
      <CameraView ref={cam} style={StyleSheet.absoluteFill} facing="back" animateShutter={false} onCameraReady={() => setReady(true)} accessibilityLabel="Vista de la cámara" />
      <View style={styles.vignette} pointerEvents="none" />
      <ShutterFlash tick={s.flashTick} reduce={reduce} />

      {/* Barra superior */}
      <View style={[styles.top, { paddingTop: insets.top + space.xs }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Cerrar escáner" onPress={() => router.back()} style={styles.iconBtn} hitSlop={8}>
          <Icon name="close" size={22} />
        </Pressable>
        <View style={styles.topCenter}>
          <AppText variant="label" color={colors.lime}>
            Escáner 360°
          </AppText>
          <AppText style={styles.counter} accessibilityLiveRegion="polite" accessibilityLabel={`${s.count} de ${SEGMENTS} ángulos capturados`}>
            {s.count}/{SEGMENTS} ÁNGULOS
          </AppText>
        </View>
        <View style={[styles.iconBtn, { opacity: s.gyro === 'on' ? 1 : 0.4 }]} accessible accessibilityLabel={s.gyro === 'on' ? 'Giroscopio activo' : 'Giroscopio no disponible'}>
          <Icon name="rotate" size={20} color={s.gyro === 'on' ? colors.lime : colors.muted} />
        </View>
      </View>

      {/* HUD central */}
      <View style={styles.center} pointerEvents="none">
        <View style={{ width: ringSize, height: ringSize, alignItems: 'center', justifyContent: 'center' }}>
          <View style={StyleSheet.absoluteFill}>
            <SegmentRing size={ringSize} filled={s.filled} currentSeg={s.currentSeg} yaw={s.yaw} reduce={reduce} />
          </View>
          <View style={{ width: reticleSize, height: reticleSize, overflow: 'hidden', borderRadius: radii.md }}>
            <Reticle size={reticleSize} />
            <ScanLine height={reticleSize} reduce={reduce} />
            <TrackingPoints size={reticleSize} seed={s.flashTick} reduce={reduce} />
          </View>
        </View>
        <Animated.View key={s.guidance} entering={reduce ? undefined : FadeInDown.duration(250)} style={styles.guide} accessibilityLiveRegion="polite">
          <AppText style={styles.guideText} accessibilityRole="text">
            {GUIDANCE_TEXT[s.guidance]}
          </AppText>
        </Animated.View>
      </View>

      {/* Controles */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + space.sm }]}>
        <View style={styles.thumbs} accessibilityLabel={`${s.count} fotos tomadas`}>
          {Array.from({ length: SEGMENTS }, (_, i) => {
            const p = s.photos[i];
            return (
              <View key={i} style={[styles.thumb, p && styles.thumbOn]}>
                {p && (
                  <Animated.View entering={reduce ? undefined : ZoomIn.springify()} style={StyleSheet.absoluteFill}>
                    <Image source={{ uri: p.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
                  </Animated.View>
                )}
              </View>
            );
          })}
        </View>
        <View style={styles.controls}>
          <View style={{ flex: 1 }}>
            <AppText variant="small" color={colors.text}>
              {s.canFinish ? 'Puedes terminar o seguir girando' : `Mínimo ${MIN_PHOTOS} ángulos`}
            </AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tomar foto manual"
            accessibilityHint="Úsalo si el giroscopio no detecta tu movimiento"
            disabled={!ready || s.isComplete}
            onPress={() => s.captureManual()}
            style={({ pressed }) => [styles.shutter, pressed && { transform: [{ scale: 0.92 }] }]}>
            <View style={styles.shutterInner} />
          </Pressable>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            {s.canFinish ? (
              <Animated.View entering={reduce ? undefined : FadeIn}>
                <Button label="Listo" icon="check" compact onPress={finish} accessibilityHint="Termina el escaneo y analiza el objeto" />
              </Animated.View>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  black: { flex: 1, backgroundColor: '#000' },
  vignette: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.18)' },
  top: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.sm },
  topCenter: { alignItems: 'center' },
  counter: { fontFamily: fonts.monoBold, fontSize: 16, letterSpacing: 1.5, color: colors.text, marginTop: 2 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.scrim, alignItems: 'center', justifyContent: 'center' },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  guide: { marginTop: space.md, backgroundColor: colors.scrim, paddingHorizontal: space.sm, paddingVertical: space.xs, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border },
  guideText: { fontFamily: fonts.mono, fontSize: 13, color: colors.text, textAlign: 'center' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.md, gap: space.sm },
  thumbs: { flexDirection: 'row', gap: 6, justifyContent: 'center' },
  thumb: { width: 30, height: 30, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', overflow: 'hidden', backgroundColor: colors.scrim },
  thumbOn: { borderColor: colors.lime },
  controls: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 84 },
  shutter: { width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: colors.text, alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: colors.lime },
});
