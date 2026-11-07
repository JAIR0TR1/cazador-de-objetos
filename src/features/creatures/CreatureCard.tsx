import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { colors, radii, rarityColors, space, typeColors } from '@/theme/tokens';
import type { AnalysisResult } from '@/types';

import { RarityBadge, StatsBlock, TypeBadge } from './badges';

/** Tarjeta completa de criatura: identidad, stats, habilidad e historia. */
export function CreatureCard({ analysis, isDemo }: { analysis: AnalysisResult; isDemo?: boolean }) {
  const c = analysis.criatura;
  const r = rarityColors[c.rareza];
  const accent = typeColors[c.tipo];
  return (
    <View style={[styles.card, { borderColor: r.solid + '55' }]}>
      <LinearGradient colors={[r.glow, 'transparent']} style={styles.glow} pointerEvents="none" />
      <View style={styles.headerRow}>
        <RarityBadge rarity={c.rareza} />
        <TypeBadge type={c.tipo} />
        {isDemo && (
          <View style={styles.demo} accessibilityLabel="Criatura de demostración">
            <AppText variant="label" color={colors.bg}>
              Demo
            </AppText>
          </View>
        )}
      </View>
      <AppText variant="display" accessibilityRole="header" style={{ marginTop: space.sm }}>
        {c.nombre}
      </AppText>
      <AppText variant="small">{c.especie}</AppText>

      <View style={styles.palette} accessible accessibilityLabel="Paleta de colores de la criatura">
        {c.paleta.slice(0, 3).map((hex, i) => (
          <View key={`${hex}-${i}`} style={[styles.swatch, { backgroundColor: hex }]} />
        ))}
        <AppText variant="label" style={{ marginLeft: space.xs }}>
          Nace de: {analysis.objeto}
        </AppText>
      </View>

      <View style={styles.section}>
        <StatsBlock stats={c.stats} color={accent} />
      </View>

      <View style={[styles.ability, { borderColor: accent + '40', backgroundColor: accent + '10' }]}>
        <Icon name="bolt" size={18} color={accent} />
        <View style={{ flex: 1 }}>
          <AppText variant="label" color={accent}>
            Habilidad
          </AppText>
          <AppText variant="bodyStrong">{c.habilidad}</AppText>
        </View>
      </View>

      <AppText variant="body" style={styles.story}>
        {c.historia}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: space.md,
    overflow: 'hidden',
  },
  glow: { position: 'absolute', left: 0, right: 0, top: 0, height: 180 },
  headerRow: { flexDirection: 'row', gap: space.xs, alignItems: 'center', flexWrap: 'wrap' },
  demo: { backgroundColor: colors.lime, borderRadius: radii.pill, paddingHorizontal: 8, height: 22, justifyContent: 'center' },
  palette: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: space.sm },
  swatch: { width: 18, height: 18, borderRadius: 6, borderWidth: 1, borderColor: colors.borderStrong },
  section: { marginTop: space.md },
  ability: { flexDirection: 'row', gap: space.sm, padding: space.sm, borderRadius: radii.sm, borderWidth: 1, marginTop: space.md, alignItems: 'flex-start' },
  story: { marginTop: space.md, color: colors.muted },
});
