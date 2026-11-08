import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { colors, fonts, radii, rarityColors, space, springs, typeColors } from '@/theme/tokens';
import type { Creature } from '@/types';

const AP = Animated.createAnimatedComponent(Pressable);

/** Tarjeta compacta para grid/inicio, con brillo según rareza. */
export function CreatureThumb({ creature, onPress, wide }: { creature: Creature; onPress: () => void; wide?: boolean }) {
  const c = creature.analysis.criatura;
  const r = rarityColors[c.rareza];
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const photo = creature.photos[0];

  return (
    <AP
      accessibilityRole="button"
      accessibilityLabel={`${c.nombre}, ${c.rareza}, tipo ${c.tipo}${creature.isDemo ? ', demo' : ''}${creature.syncStatus === 'pending' ? ', pendiente de sincronizar' : ''}`}
      accessibilityHint="Abre el detalle de la criatura"
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.97, springs.snappy);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, springs.snappy);
      }}
      style={[
        styles.card,
        wide && styles.wide,
        { borderColor: r.solid + (c.rareza === 'Común' ? '33' : '88'), shadowColor: r.solid, shadowOpacity: c.rareza === 'Común' ? 0 : 0.45 },
        anim,
      ]}>
      <View style={[styles.media, wide && styles.mediaWide]}>
        {photo ? (
          <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
        ) : (
          <LinearGradient colors={[c.paleta[0] ?? colors.surfaceRaised, c.paleta[1] ?? colors.surface]} style={StyleSheet.absoluteFill} />
        )}
        <LinearGradient colors={['transparent', 'rgba(10,10,12,0.85)']} style={StyleSheet.absoluteFill} />
        {c.rareza !== 'Común' && <LinearGradient colors={[r.glow, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />}
        <View style={styles.tags}>
          <View style={[styles.rarityDot, { backgroundColor: r.solid }]} />
          <AppText style={styles.tagText} maxFontSizeMultiplier={1.2}>
            {c.rareza}
          </AppText>
          {creature.modelStatus === 'ready' && <Icon name="cube" size={13} color={colors.text} />}
          {creature.syncStatus === 'pending' && <Icon name="cloud-off" size={13} color={colors.muted} />}
          {creature.isDemo && (
            <AppText style={[styles.tagText, { color: colors.lime }]} maxFontSizeMultiplier={1.2}>
              · DEMO
            </AppText>
          )}
        </View>
      </View>
      <View style={styles.body}>
        <AppText variant="heading" numberOfLines={1}>
          {c.nombre}
        </AppText>
        <View style={styles.metaRow}>
          <View style={[styles.typeDot, { backgroundColor: typeColors[c.tipo] }]} />
          <AppText variant="small" numberOfLines={1} style={{ flex: 1 }}>
            {c.tipo} · {creature.analysis.objeto}
          </AppText>
        </View>
      </View>
    </AP>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    overflow: 'hidden',
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
  wide: { flex: 0 },
  media: { aspectRatio: 1, backgroundColor: colors.surfaceRaised },
  mediaWide: { aspectRatio: 16 / 9 },
  tags: { position: 'absolute', left: space.xs, bottom: space.xs, flexDirection: 'row', alignItems: 'center', gap: 5 },
  rarityDot: { width: 8, height: 8, borderRadius: 4 },
  tagText: { fontFamily: fonts.monoBold, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: colors.text },
  body: { padding: space.sm, gap: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  typeDot: { width: 6, height: 6, borderRadius: 3 },
});
