import { router } from 'expo-router';
import { Alert, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { addCreature, useCollection, wipeAllData } from '@/features/collection/collectionStore';
import { buildDemoCreatures } from '@/features/creatures/demo';
import { computeAchievements } from '@/features/profile/achievements';
import { resetOnboarding } from '@/features/profile/onboarding';
import { updateSettings, useSettings } from '@/features/profile/settings';
import { API_URL, isApiConfigured } from '@/services/api/client';
import { haptic } from '@/services/haptics';
import { colors, fonts, radii, RARITIES, rarityColors, space, TYPES, typeColors } from '@/theme/tokens';

function SettingRow({ label, hint, value, onChange }: { label: string; hint: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.settingRow}>
      <View style={{ flex: 1 }}>
        <AppText variant="bodyStrong">{label}</AppText>
        <AppText variant="small">{hint}</AppText>
      </View>
      <Switch
        value={value}
        onValueChange={(v) => {
          haptic.tap();
          onChange(v);
        }}
        trackColor={{ false: colors.surfaceRaised, true: colors.lime }}
        thumbColor={value ? colors.bg : colors.muted}
        accessibilityLabel={label}
        accessibilityHint={hint}
      />
    </View>
  );
}

export default function Profile() {
  const insets = useSafeAreaInsets();
  const col = useCollection();
  const settings = useSettings();
  const achievements = computeAchievements(col.items);
  const maxType = Math.max(1, ...TYPES.map((t) => col.byType[t] ?? 0));

  const wipe = () => {
    haptic.warning();
    Alert.alert('¿Borrar todos los datos?', 'Se eliminará tu colección completa, fotos, modelos 3D y ajustes. No se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar todo',
        style: 'destructive',
        onPress: async () => {
          await wipeAllData();
          resetOnboarding();
          router.replace('/onboarding');
        },
      },
    ]);
  };

  const loadDemo = async () => {
    const demos = await buildDemoCreatures();
    demos.reverse().forEach(addCreature);
    haptic.success();
    Alert.alert('Criaturas demo añadidas', 'Se añadieron 3 criaturas de ejemplo, marcadas como DEMO.');
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingTop: insets.top + space.sm, paddingBottom: 140, paddingHorizontal: space.md, gap: space.sm }}>
      <AppText variant="title" accessibilityRole="header">
        Perfil
      </AppText>

      <View style={styles.statsRow}>
        <View style={styles.statBox} accessible accessibilityLabel={`${col.items.length} criaturas en total`}>
          <AppText style={styles.big}>{col.items.length}</AppText>
          <AppText variant="label">Total</AppText>
        </View>
        <View style={styles.statBox} accessible accessibilityLabel={`Racha de ${col.streak} días`}>
          <AppText style={styles.big}>{col.streak}</AppText>
          <AppText variant="label">Racha (días)</AppText>
        </View>
        <View style={styles.statBox} accessible accessibilityLabel={`${Object.keys(col.byType).length} tipos`}>
          <AppText style={styles.big}>{Object.keys(col.byType).length}</AppText>
          <AppText variant="label">Tipos</AppText>
        </View>
      </View>

      <View style={styles.panel}>
        <AppText variant="label" style={styles.panelLabel}>
          Por rareza
        </AppText>
        <View style={styles.rarityGrid}>
          {RARITIES.map((r) => (
            <View key={r} style={[styles.rarityCell, { borderColor: rarityColors[r].solid + '55' }]} accessible accessibilityLabel={`${col.byRarity[r]} ${r}`}>
              <AppText style={[styles.mid, { color: rarityColors[r].solid }]}>{col.byRarity[r]}</AppText>
              <AppText variant="small">{r}</AppText>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.panel}>
        <AppText variant="label" style={styles.panelLabel}>
          Por tipo
        </AppText>
        {TYPES.map((t) => {
          const n = col.byType[t] ?? 0;
          return (
            <View key={t} style={styles.typeRow} accessible accessibilityLabel={`${t}: ${n}`}>
              <AppText variant="small" color={colors.text} style={{ width: 92 }}>
                {t}
              </AppText>
              <View style={styles.track}>
                <View style={{ width: `${(n / maxType) * 100}%`, height: '100%', backgroundColor: typeColors[t], borderRadius: 4 }} />
              </View>
              <AppText style={styles.num}>{n}</AppText>
            </View>
          );
        })}
      </View>

      <View style={styles.panel}>
        <AppText variant="label" style={styles.panelLabel}>
          Logros
        </AppText>
        {achievements.map((a) => (
          <View key={a.id} style={styles.achRow} accessible accessibilityLabel={`${a.titulo}. ${a.descripcion} ${a.logrado ? 'Conseguido' : `Progreso ${Math.round(a.progreso * 100)} por ciento`}`}>
            <View style={[styles.achIcon, a.logrado ? { backgroundColor: colors.limeDim, borderColor: colors.lime } : null]}>
              <Icon name={a.logrado ? 'sparkle' : 'lock'} size={20} color={a.logrado ? colors.lime : colors.muted} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <AppText variant="bodyStrong" color={a.logrado ? colors.text : colors.muted}>
                {a.titulo}
              </AppText>
              <AppText variant="small">{a.descripcion}</AppText>
              {!a.logrado && (
                <View style={[styles.track, { height: 4 }]}>
                  <View style={{ width: `${a.progreso * 100}%`, height: '100%', backgroundColor: colors.lime, borderRadius: 2 }} />
                </View>
              )}
            </View>
          </View>
        ))}
      </View>

      <View style={styles.panel}>
        <AppText variant="label" style={styles.panelLabel}>
          Ajustes
        </AppText>
        <SettingRow label="Reducir animaciones" hint="Menos movimiento en toda la app" value={settings.reduceMotion} onChange={(v) => updateSettings({ reduceMotion: v })} />
        <SettingRow label="Vibración (haptics)" hint="Respuesta táctil en capturas y acciones" value={settings.haptics} onChange={(v) => updateSettings({ haptics: v })} />
        <View style={{ gap: space.xs, marginTop: space.sm }}>
          <Button label="Añadir criaturas demo" icon="sparkle" variant="secondary" onPress={loadDemo} accessibilityHint="Agrega 3 criaturas de ejemplo para presentar la app" />
          <Button label="Ver introducción otra vez" variant="ghost" onPress={() => { resetOnboarding(); router.replace('/onboarding'); }} />
          <Button label="Borrar todos los datos" icon="trash" variant="danger" onPress={wipe} />
        </View>
      </View>

      <AppText variant="label" center style={{ marginTop: space.sm }}>
        Servidor: {isApiConfigured() ? API_URL.replace(/^https?:\/\//, '') : 'no configurado (modo demo)'}
      </AppText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  statsRow: { flexDirection: 'row', gap: space.xs },
  statBox: { flex: 1, backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, padding: space.sm, gap: 2 },
  big: { fontFamily: fonts.display, fontSize: 32, lineHeight: 36, color: colors.text },
  mid: { fontFamily: fonts.display, fontSize: 24, lineHeight: 28 },
  panel: { backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, padding: space.sm },
  panelLabel: { marginBottom: space.xs },
  rarityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  rarityCell: { flexBasis: '47%', flexGrow: 1, borderWidth: 1, borderRadius: radii.sm, padding: space.sm },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs, minHeight: 28 },
  track: { flex: 1, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  num: { fontFamily: fonts.monoBold, fontSize: 13, color: colors.text, width: 24, textAlign: 'right' },
  achRow: { flexDirection: 'row', gap: space.sm, paddingVertical: space.xs, alignItems: 'center' },
  achIcon: { width: 44, height: 44, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 56 },
});
