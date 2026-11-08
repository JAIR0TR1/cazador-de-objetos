import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useAuth } from '@/features/auth/authStore';
import { useCollection } from '@/features/collection/collectionStore';
import { CreatureCard } from '@/features/creatures/CreatureCard';
import { ObjectViewer } from '@/features/creatures/ObjectViewer';
import { shareCreature } from '@/features/creatures/share';
import { useReducedMotionPref } from '@/features/profile/settings';
import { saveSession, useSession } from '@/features/scanner/session';
import { haptic } from '@/services/haptics';
import { colors, fonts, radii, rarityColors, space, springs, typeColors } from '@/theme/tokens';

/** Destello de revelación con el color de la rareza (único efecto protagonista). */
function RevealFlash({ colorsPair, reduce }: { colorsPair: [string, string]; reduce: boolean }) {
  const o = useSharedValue(reduce ? 0 : 1);
  const sc = useSharedValue(0.6);
  useEffect(() => {
    if (reduce) return;
    o.value = withSequence(withTiming(1, { duration: 120 }), withDelay(250, withTiming(0, { duration: 900 })));
    sc.value = withSpring(1.4, springs.soft);
  }, [reduce, o, sc]);
  const st = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ scale: sc.value }] }));
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, st]}>
      <LinearGradient colors={[colorsPair[0], colorsPair[1], 'transparent']} start={{ x: 0.5, y: 0.2 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
    </Animated.View>
  );
}

export default function Result() {
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotionPref();
  const s = useSession();
  const [saving, setSaving] = useState(false);
  const auth = useAuth();
  const col = useCollection();
  const analysis = s.analysis;

  useEffect(() => {
    if (!analysis) {
      router.replace('/');
      return;
    }
    haptic.reveal(analysis.criatura.rareza);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!analysis) return <View style={styles.root} />;
  const c = analysis.criatura;
  const rc = rarityColors[c.rareza];
  const saved = !!s.savedId;
  const savedItem = saved ? col.items.find((x) => x.id === s.savedId) : undefined;
  const cloudNote =
    !saved || auth.mode !== 'user' || !savedItem
      ? null
      : savedItem.syncStatus === 'synced'
        ? { icon: 'cloud' as const, text: 'Guardada en tu cuenta.' }
        : savedItem.syncStatus === 'pending'
          ? { icon: 'cloud-off' as const, text: col.syncing ? 'Subiendo a tu cuenta…' : 'Guardada en el teléfono. Se subirá a tu cuenta al volver la conexión.' }
          : { icon: 'cloud-off' as const, text: 'Las criaturas demo se guardan solo en este teléfono.' };

  const onSave = async () => {
    setSaving(true);
    try {
      await saveSession();
      haptic.success();
    } catch {
      Alert.alert('No se pudo guardar', 'Revisa el espacio disponible en tu teléfono e intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const scanAnother = () => {
    if (saved) return router.replace('/scan');
    Alert.alert('¿Descartar a ' + c.nombre + '?', 'Si escaneas otro objeto sin guardar, esta criatura se perderá.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Descartar', style: 'destructive', onPress: () => router.replace('/scan') },
    ]);
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + space.sm, paddingBottom: insets.bottom + 180, paddingHorizontal: space.md }}>
        <View style={styles.topRow}>
          <AppText variant="label">¡Capturada!</AppText>
          <Button
            label="Cerrar"
            variant="ghost"
            compact
            onPress={() => {
              if (saved) return router.replace('/');
              Alert.alert('¿Salir sin guardar?', `${c.nombre} no se añadirá a tu colección.`, [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Salir', style: 'destructive', onPress: () => router.replace('/') },
              ]);
            }}
          />
        </View>

        {s.isDemo && (
          <View style={styles.demoBanner} accessibilityRole="alert">
            <AppText variant="label" color={colors.bg}>
              Modo demo · criatura de ejemplo
            </AppText>
          </View>
        )}

        <Animated.View entering={reduce ? undefined : ZoomIn.delay(300).springify().damping(14)}>
          <AppText style={[styles.rarityTitle, { color: rc.solid }]} maxFontSizeMultiplier={1.2} accessibilityRole="header">
            {c.rareza === 'Legendaria' ? '¡Legendaria!' : c.rareza === 'Épica' ? '¡Épica!' : c.rareza === 'Rara' ? 'Rara' : 'Común'}
          </AppText>
        </Animated.View>

        <Animated.View entering={reduce ? undefined : FadeInDown.delay(450).springify()}>
          <ObjectViewer
            glbUri={s.model.glbUri}
            modelStatus={s.model.status}
            progress={s.model.progress}
            photos={s.photos.map((p) => p.uri)}
            accent={typeColors[c.tipo]}
            objectName={analysis.objeto}
            height={300}
          />
        </Animated.View>

        <Animated.View entering={reduce ? undefined : FadeInDown.delay(600).springify()} style={{ marginTop: space.sm }}>
          <CreatureCard analysis={analysis} isDemo={s.isDemo} />
        </Animated.View>

        <View style={styles.objectInfo}>
          <AppText variant="label">Objeto detectado</AppText>
          <AppText variant="bodyStrong">
            {analysis.objeto} · {analysis.material}
          </AppText>
          <AppText variant="small">
            {analysis.categoria} · {analysis.tamanoEstimado} · confianza {Math.round(analysis.confianza * 100)}%
          </AppText>
        </View>
      </ScrollView>

      <View style={[styles.actions, { paddingBottom: insets.bottom + space.sm }]}>
        {cloudNote && (
          <View style={styles.cloudNote} accessibilityLiveRegion="polite">
            <Icon name={cloudNote.icon} size={16} color={cloudNote.icon === 'cloud' ? colors.lime : colors.muted} />
            <AppText variant="small" style={{ flex: 1 }}>
              {cloudNote.text}
            </AppText>
          </View>
        )}
        <Button label={saved ? 'Guardada en colección' : 'Guardar en colección'} icon={saved ? 'check' : 'grid'} onPress={saved ? () => router.replace('/collection') : onSave} loading={saving} accessibilityHint={saved ? 'Abre tu colección' : undefined} />
        <View style={styles.row}>
          <Button label="Escanear otro" variant="secondary" icon="scan" onPress={scanAnother} style={{ flex: 1 }} />
          <Button label="Compartir" variant="secondary" icon="share" onPress={() => shareCreature({ analysis, photos: s.photos.map((p) => p.uri) })} style={{ flex: 1 }} />
        </View>
      </View>

      <RevealFlash colorsPair={c.rareza === 'Legendaria' ? rc.gradient : [rc.solid, rc.glow]} reduce={reduce} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  demoBanner: { alignSelf: 'flex-start', backgroundColor: colors.lime, borderRadius: radii.pill, paddingHorizontal: 12, paddingVertical: 6, marginTop: space.xs },
  rarityTitle: { fontFamily: fonts.display, fontSize: 44, lineHeight: 50, letterSpacing: -1.5, marginVertical: space.sm },
  objectInfo: { marginTop: space.sm, padding: space.sm, borderRadius: radii.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 4 },
  actions: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space.md,
    paddingTop: space.sm,
    gap: space.xs,
    backgroundColor: 'rgba(10,10,12,0.94)',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  row: { flexDirection: 'row', gap: space.xs },
  cloudNote: { flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: 4 },
});
