import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Skeleton } from '@/components/Skeleton';
import { signOut, useAuth } from '@/features/auth/authStore';
import { addCreature, useCollection, wipeAllData } from '@/features/collection/collectionStore';
import { buildDemoCreatures } from '@/features/creatures/demo';
import { computeAchievements } from '@/features/profile/achievements';
import { resetOnboarding } from '@/features/profile/onboarding';
import { updateSettings, useSettings } from '@/features/profile/settings';
import { API_URL, isApiConfigured } from '@/services/api/client';
import { haptic } from '@/services/haptics';
import { fetchProfileStats, type ProfileStats } from '@/services/supabase/creatures';
import { colors, fonts, radii, RARITIES, rarityColors, space, TYPES, typeColors } from '@/theme/tokens';
import type { Rarity } from '@/types';

const RANK: Record<Rarity, number> = { Común: 0, Rara: 1, Épica: 2, Legendaria: 3 };

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
  const auth = useAuth();
  const settings = useSettings();
  const achievements = computeAchievements(col.items);
  const maxType = Math.max(1, ...TYPES.map((t) => col.byType[t] ?? 0));
  const signedIn = auth.mode === 'user';

  // Estadísticas del perfil desde la base de datos; sin red se usan las de la caché local.
  const [db, setDb] = useState<{ status: 'idle' | 'loading' | 'ok' | 'error'; data: ProfileStats | null }>({ status: 'idle', data: null });
  const loadStats = useCallback(async () => {
    if (!auth.userId) return;
    setDb((d) => ({ ...d, status: 'loading' }));
    try {
      setDb({ status: 'ok', data: await fetchProfileStats(auth.userId) });
    } catch {
      setDb((d) => ({ ...d, status: 'error' }));
    }
  }, [auth.userId]);
  // Se recalcula cuando cambia lo sincronizado (p. ej. al terminar una subida pendiente).
  const syncedCount = col.items.filter((c) => c.syncStatus === 'synced').length;
  useEffect(() => {
    if (signedIn) void loadStats();
  }, [signedIn, loadStats, syncedCount]);

  const localRarest = col.items.reduce<{ name: string; rarity: Rarity } | null>((best, c) => {
    const r = c.analysis.criatura.rareza;
    return !best || RANK[r] > RANK[best.rarity] ? { name: c.analysis.criatura.nombre, rarity: r } : best;
  }, null);
  const stats: ProfileStats = signedIn && db.data ? db.data : { username: auth.username, total: col.items.length, byRarity: col.byRarity, rarest: localRarest };
  const fromCache = signedIn && db.status === 'error';
  const statsLoading = signedIn && db.status === 'loading' && !db.data;

  const confirmSignOut = () => {
    haptic.warning();
    const pendingMsg = col.pending > 0 ? `\n\nOjo: hay ${col.pending} cambio(s) sin sincronizar que se perderán.` : '';
    Alert.alert('¿Cerrar sesión?', `Tu colección seguirá guardada en la nube. Se borrará la copia de este teléfono.${pendingMsg}`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          haptic.success();
          router.replace('/welcome');
        },
      },
    ]);
  };

  const wipe = () => {
    haptic.warning();
    Alert.alert(
      '¿Borrar los datos de este teléfono?',
      signedIn
        ? 'Se cerrará tu sesión y se borrará la copia local de tu colección y tus ajustes. Lo que ya está en la nube no se borra.'
        : 'Se eliminará tu colección completa, fotos, modelos 3D y ajustes. No se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar',
          style: 'destructive',
          onPress: async () => {
            if (signedIn) await signOut();
            await wipeAllData();
            resetOnboarding();
            router.replace('/onboarding');
          },
        },
      ],
    );
  };

  const loadDemo = async () => {
    const demos = await buildDemoCreatures();
    demos.reverse().forEach(addCreature);
    haptic.success();
    Alert.alert('Criaturas demo añadidas', 'Se añadieron 3 criaturas de ejemplo, marcadas como DEMO. Se guardan solo en este teléfono.');
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingTop: insets.top + space.sm, paddingBottom: 140, paddingHorizontal: space.md, gap: space.sm }}>
      <AppText variant="title" accessibilityRole="header">
        Perfil
      </AppText>

      {signedIn ? (
        <View style={[styles.panel, styles.account]}>
          <View style={styles.avatar} accessible={false}>
            <AppText style={styles.avatarText}>{(stats.username ?? auth.email ?? '?').slice(0, 1).toUpperCase()}</AppText>
          </View>
          <View style={{ flex: 1 }}>
            {statsLoading ? (
              <Skeleton style={{ height: 22, width: 140 }} />
            ) : (
              <AppText variant="heading" numberOfLines={1}>
                @{stats.username ?? 'cazador'}
              </AppText>
            )}
            <AppText variant="small" numberOfLines={1}>
              {auth.email}
            </AppText>
          </View>
          <View style={styles.cloudBadge} accessible accessibilityLabel={col.pending ? 'Hay cambios pendientes de sincronizar' : 'Colección sincronizada'}>
            <Icon name={col.pending ? 'cloud-off' : 'cloud'} size={18} color={col.pending ? colors.muted : colors.lime} />
          </View>
        </View>
      ) : (
        <View style={styles.panel}>
          <View style={styles.guestRow}>
            <Icon name="cloud-off" size={22} color={colors.muted} />
            <View style={{ flex: 1 }}>
              <AppText variant="bodyStrong">Modo invitado</AppText>
              <AppText variant="small">Tu colección solo vive en este teléfono. Crea una cuenta para guardarla en la nube.</AppText>
            </View>
          </View>
          <View style={[styles.row, { marginTop: space.sm }]}>
            <Button label="Crear cuenta" compact style={{ flex: 1 }} onPress={() => router.push('/sign-up')} />
            <Button label="Iniciar sesión" compact variant="secondary" style={{ flex: 1 }} onPress={() => router.push('/sign-in')} />
          </View>
        </View>
      )}

      {fromCache && (
        <View style={styles.note} accessibilityRole="alert">
          <Icon name="cloud-off" size={16} color={colors.muted} />
          <AppText variant="small" style={{ flex: 1 }}>
            Sin conexión: mostrando los datos guardados en este teléfono.
          </AppText>
          <AppText variant="small" color={colors.lime} onPress={loadStats} accessibilityRole="button" suppressHighlighting style={styles.retry}>
            Reintentar
          </AppText>
        </View>
      )}

      <View style={styles.statsRow}>
        <View style={styles.statBox} accessible accessibilityLabel={`${stats.total} criaturas en total`}>
          {statsLoading ? <ActivityIndicator color={colors.muted} style={styles.bigLoader} /> : <AppText style={styles.big}>{stats.total}</AppText>}
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

      {stats.rarest && (
        <View
          style={[styles.panel, styles.rarest, { borderColor: rarityColors[stats.rarest.rarity].solid + '66' }]}
          accessible
          accessibilityLabel={`Tu criatura más rara: ${stats.rarest.name}, ${stats.rarest.rarity}`}>
          <View style={[styles.rarestIcon, { backgroundColor: rarityColors[stats.rarest.rarity].glow, borderColor: rarityColors[stats.rarest.rarity].solid }]}>
            <Icon name="sparkle" size={20} color={rarityColors[stats.rarest.rarity].solid} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="label">La más rara</AppText>
            <AppText variant="heading" numberOfLines={1}>
              {stats.rarest.name}
            </AppText>
          </View>
          <AppText variant="label" color={rarityColors[stats.rarest.rarity].solid}>
            {stats.rarest.rarity}
          </AppText>
        </View>
      )}

      <View style={styles.panel}>
        <AppText variant="label" style={styles.panelLabel}>
          Por rareza
        </AppText>
        <View style={styles.rarityGrid}>
          {RARITIES.map((r) => (
            <View key={r} style={[styles.rarityCell, { borderColor: rarityColors[r].solid + '55' }]} accessible accessibilityLabel={`${stats.byRarity[r]} ${r}`}>
              <AppText style={[styles.mid, { color: rarityColors[r].solid }]}>{stats.byRarity[r]}</AppText>
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
          <Button label="Borrar datos de este teléfono" icon="trash" variant="danger" onPress={wipe} />
        </View>
      </View>

      {signedIn && <Button label="Cerrar sesión" icon="logout" variant="ghost" onPress={confirmSignOut} accessibilityHint="Te pedirá confirmación" />}

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
  bigLoader: { height: 36, alignSelf: 'flex-start' },
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
  row: { flexDirection: 'row', gap: space.xs },
  account: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.display, fontSize: 24, lineHeight: 28, color: colors.onLime },
  cloudBadge: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceRaised },
  guestRow: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    minHeight: 44,
    paddingHorizontal: space.sm,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  retry: { paddingVertical: 12 },
  rarest: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  rarestIcon: { width: 44, height: 44, borderRadius: radii.sm, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
