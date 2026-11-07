import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Icon } from '@/components/Icon';
import { removeCreature, useCollection } from '@/features/collection/collectionStore';
import { CreatureCard } from '@/features/creatures/CreatureCard';
import { ObjectViewer } from '@/features/creatures/ObjectViewer';
import { shareCreature, shareModelFile } from '@/features/creatures/share';
import { sessionStore, useSession } from '@/features/scanner/session';
import { haptic } from '@/services/haptics';
import { colors, radii, space, typeColors } from '@/theme/tokens';

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow} accessible accessibilityLabel={`${label}: ${value}`}>
      <AppText variant="label">{label}</AppText>
      <AppText variant="bodyStrong" style={{ flex: 1, textAlign: 'right' }}>
        {value}
      </AppText>
    </View>
  );
}

export default function CreatureDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const col = useCollection();
  const session = useSession();
  const creature = col.items.find((c) => c.id === id);

  const back = (
    <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={() => (router.canGoBack() ? router.back() : router.replace('/collection'))} style={styles.back} hitSlop={8}>
      <Icon name="chevron-left" size={22} />
    </Pressable>
  );

  if (!creature) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + space.sm, paddingHorizontal: space.md }]}>
        {back}
        <EmptyState icon="search" title="Criatura no encontrada" message="Puede que la hayas eliminado." cta={{ label: 'Ir a la colección', onPress: () => router.replace('/collection') }} />
      </View>
    );
  }

  const a = creature.analysis;
  // Si el 3D de esta criatura aún se genera en esta sesión, mostramos el progreso en vivo.
  const live = sessionStore.get().id === creature.id && creature.modelStatus === 'pending' ? session.model.progress : 0;

  const confirmDelete = () => {
    haptic.warning();
    Alert.alert(`¿Eliminar a ${a.criatura.nombre}?`, 'Se borrarán sus fotos y su modelo 3D de este teléfono. No se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          removeCreature(creature.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + space.sm, paddingBottom: insets.bottom + space.xl, paddingHorizontal: space.md, gap: space.sm }}>
        <View style={styles.topRow}>
          {back}
          <AppText variant="label">{new Date(creature.createdAt).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}</AppText>
        </View>

        <ObjectViewer
          glbUri={creature.glbUri}
          modelStatus={creature.modelStatus}
          progress={live}
          photos={creature.photos}
          accent={typeColors[a.criatura.tipo]}
          objectName={a.objeto}
          height={340}
        />

        <CreatureCard analysis={a} isDemo={creature.isDemo} />

        <View style={styles.panel}>
          <AppText variant="label" style={{ marginBottom: space.xs }}>
            Datos del objeto
          </AppText>
          <InfoRow label="Objeto" value={a.objeto} />
          <InfoRow label="Categoría" value={a.categoria} />
          <InfoRow label="Material" value={a.material} />
          <InfoRow label="Tamaño" value={a.tamanoEstimado} />
          <InfoRow label="Colores" value={a.colores.join(', ')} />
          <InfoRow label="Confianza IA" value={`${Math.round(a.confianza * 100)}%`} />
          <InfoRow label="Modelo 3D" value={creature.modelStatus === 'ready' ? 'Generado' : creature.modelStatus === 'pending' ? 'Generando…' : 'Vista 360° de fotos'} />
        </View>

        <View style={styles.row}>
          <Button label="Compartir" icon="share" variant="secondary" style={{ flex: 1 }} onPress={() => shareCreature(creature)} />
          {creature.glbUri && creature.modelStatus === 'ready' && (
            <Button
              label="Exportar .glb"
              icon="cube"
              variant="secondary"
              style={{ flex: 1 }}
              onPress={async () => {
                const ok = await shareModelFile(creature.glbUri!).catch(() => false);
                if (!ok) Alert.alert('No disponible', 'Este dispositivo no permite compartir archivos.');
              }}
            />
          )}
        </View>
        <Button label="Eliminar criatura" icon="trash" variant="danger" onPress={confirmDelete} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  panel: { backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, padding: space.sm },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 36, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  row: { flexDirection: 'row', gap: space.xs },
});
