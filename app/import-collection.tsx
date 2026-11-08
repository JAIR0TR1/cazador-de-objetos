import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { FormBanner } from '@/components/FormScreen';
import { Icon } from '@/components/Icon';
import { guestItemsToImport } from '@/features/auth/authStore';
import { importGuestCollection } from '@/features/sync/sync';
import { haptic } from '@/services/haptics';
import { colors, fonts, radii, RARITIES, rarityColors, space } from '@/theme/tokens';
import type { Creature } from '@/types';

/** Tras crear cuenta o iniciar sesión: ofrece subir lo capturado como invitado. */
export default function ImportCollection() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<Creature[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    guestItemsToImport().then(setItems);
  }, []);

  const upload = async () => {
    setLoading(true);
    setError(null);
    try {
      await importGuestCollection();
      haptic.success();
      router.replace('/collection');
    } catch {
      haptic.error();
      setError('No pudimos subirlas ahora. Quedaron en tu colección y se subirán solas cuando haya conexión.');
    } finally {
      setLoading(false);
    }
  };

  const n = items?.length ?? 0;
  const count = (r: (typeof RARITIES)[number]) => items?.filter((c) => c.analysis.criatura.rareza === r).length ?? 0;

  return (
    <View style={[styles.root, { paddingTop: insets.top + space.xl, paddingBottom: insets.bottom + space.md }]}>
      <View style={styles.icon}>
        <Icon name="upload" size={36} color={colors.lime} />
      </View>
      <AppText variant="label" color={colors.lime} style={{ marginTop: space.lg }}>
        Colección de invitado
      </AppText>
      <AppText variant="title" accessibilityRole="header" style={{ marginTop: space.xs }}>
        {n === 1 ? 'Tienes 1 criatura en este teléfono' : `Tienes ${n} criaturas en este teléfono`}
      </AppText>
      <AppText variant="body" color={colors.muted} style={{ marginTop: space.sm }}>
        Súbelas a tu cuenta para no perderlas. Las fotos se guardan en privado: solo tú puedes verlas.
      </AppText>

      <View style={styles.row} accessible accessibilityLabel={RARITIES.map((r) => `${count(r)} ${r}`).join(', ')}>
        {RARITIES.map((r) => (
          <View key={r} style={[styles.cell, { borderColor: rarityColors[r].solid + '55' }]}>
            <AppText style={[styles.num, { color: rarityColors[r].solid }]}>{count(r)}</AppText>
            <AppText variant="label">{r}</AppText>
          </View>
        ))}
      </View>

      <View style={{ flex: 1 }} />
      {error && <FormBanner tone="error" message={error} />}
      <View style={{ gap: space.xs, marginTop: space.sm }}>
        <Button label="Subir mi colección" icon="upload" onPress={upload} loading={loading} disabled={loading || !n} />
        <Button label="Ahora no" variant="ghost" onPress={() => router.replace('/')} disabled={loading} accessibilityHint="Seguirán guardadas en modo invitado en este teléfono" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: space.md },
  icon: { width: 80, height: 80, borderRadius: radii.lg, backgroundColor: colors.limeDim, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', gap: space.xs, marginTop: space.lg },
  cell: { flex: 1, borderWidth: 1, borderRadius: radii.sm, paddingVertical: space.sm, alignItems: 'center', gap: 2 },
  num: { fontFamily: fonts.display, fontSize: 24, lineHeight: 28 },
});
