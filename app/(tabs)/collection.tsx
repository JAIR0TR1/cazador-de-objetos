import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Chip } from '@/components/Chip';
import { EmptyState } from '@/components/EmptyState';
import { Icon } from '@/components/Icon';
import { Skeleton } from '@/components/Skeleton';
import { useCollection } from '@/features/collection/collectionStore';
import { CreatureThumb } from '@/features/creatures/CreatureThumb';
import { colors, fonts, radii, RARITIES, rarityColors, space, TYPES, typeColors } from '@/theme/tokens';
import type { Creature, CreatureType, Rarity } from '@/types';

type Sort = 'recientes' | 'rareza' | 'poder' | 'nombre';
const SORTS: { id: Sort; label: string }[] = [
  { id: 'recientes', label: 'Recientes' },
  { id: 'rareza', label: 'Rareza' },
  { id: 'poder', label: 'Poder' },
  { id: 'nombre', label: 'A–Z' },
];
const rarityRank: Record<Rarity, number> = { Común: 0, Rara: 1, Épica: 2, Legendaria: 3 };
const power = (c: Creature) => Object.values(c.analysis.criatura.stats).reduce((a, b) => a + b, 0);

export default function Collection() {
  const insets = useSafeAreaInsets();
  const col = useCollection();
  const [q, setQ] = useState('');
  const [rarity, setRarity] = useState<Rarity | null>(null);
  const [type, setType] = useState<CreatureType | null>(null);
  const [sort, setSort] = useState<Sort>('recientes');

  const data = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = col.items.filter((c) => {
      const k = c.analysis.criatura;
      if (rarity && k.rareza !== rarity) return false;
      if (type && k.tipo !== type) return false;
      if (needle && !`${k.nombre} ${k.especie} ${c.analysis.objeto}`.toLowerCase().includes(needle)) return false;
      return true;
    });
    const sorted = [...list];
    if (sort === 'rareza') sorted.sort((a, b) => rarityRank[b.analysis.criatura.rareza] - rarityRank[a.analysis.criatura.rareza]);
    if (sort === 'poder') sorted.sort((a, b) => power(b) - power(a));
    if (sort === 'nombre') sorted.sort((a, b) => a.analysis.criatura.nombre.localeCompare(b.analysis.criatura.nombre, 'es'));
    return sorted;
  }, [col.items, q, rarity, type, sort]);

  const filtersOn = !!(q || rarity || type);
  const clear = () => {
    setQ('');
    setRarity(null);
    setType(null);
  };

  const header = (
    <View style={{ gap: space.sm, marginBottom: space.sm }}>
      <View style={styles.titleRow}>
        <AppText variant="title" accessibilityRole="header">
          Colección
        </AppText>
        <AppText style={styles.count}>{col.items.length}</AppText>
      </View>
      <View style={styles.search}>
        <Icon name="search" size={18} color={colors.muted} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Buscar criatura u objeto"
          placeholderTextColor={colors.muted}
          style={styles.input}
          accessibilityLabel="Buscar en la colección"
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {RARITIES.map((r) => (
          <Chip key={r} label={r} dot={rarityColors[r].solid} selected={rarity === r} onPress={() => setRarity(rarity === r ? null : r)} />
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {TYPES.map((t) => (
          <Chip key={t} label={t} dot={typeColors[t]} selected={type === t} onPress={() => setType(type === t ? null : t)} />
        ))}
      </ScrollView>
      <View style={styles.sortRow} accessibilityRole="radiogroup" accessibilityLabel="Ordenar por">
        <AppText variant="label">Orden</AppText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {SORTS.map((s) => (
            <Chip key={s.id} label={s.label} selected={sort === s.id} onPress={() => setSort(s.id)} />
          ))}
        </ScrollView>
      </View>
    </View>
  );

  if (!col.loaded) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + space.sm, paddingHorizontal: space.md, gap: space.sm }]}>
        <Skeleton style={{ height: 36, width: 160 }} />
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <Skeleton style={{ flex: 1, height: 220 }} radius={radii.md} />
          <Skeleton style={{ flex: 1, height: 220 }} radius={radii.md} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <FlatList
        data={data}
        keyExtractor={(c) => c.id}
        numColumns={2}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingTop: insets.top + space.sm, paddingBottom: 140, paddingHorizontal: space.md }}
        columnWrapperStyle={{ gap: space.sm }}
        ItemSeparatorComponent={() => <View style={{ height: space.sm }} />}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <View style={{ flex: 1, maxWidth: '50%' }}>
            <CreatureThumb creature={item} onPress={() => router.push({ pathname: '/creature/[id]', params: { id: item.id } })} />
          </View>
        )}
        ListEmptyComponent={
          col.items.length === 0 ? (
            <EmptyState
              icon="grid"
              title="Tu colección está vacía"
              message="Cada objeto que escanees se convierte en una criatura y aparecerá aquí, incluso sin conexión."
              cta={{ label: 'Escanear objeto', icon: 'scan', onPress: () => router.push('/scan') }}
            />
          ) : (
            <EmptyState icon="search" title="Sin resultados" message="Ninguna criatura coincide con esos filtros." cta={filtersOn ? { label: 'Limpiar filtros', onPress: clear } : undefined} />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.xs },
  count: { fontFamily: fonts.monoBold, fontSize: 16, color: colors.muted },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.sm,
    minHeight: 48,
  },
  input: { flex: 1, color: colors.text, fontFamily: fonts.body, fontSize: 16, paddingVertical: 10 },
  chips: { gap: space.xs, paddingRight: space.md },
  sortRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
