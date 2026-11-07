import { Pressable, StyleSheet, View } from 'react-native';

import { haptic } from '@/services/haptics';
import { colors, fonts, radii, sizes, space } from '@/theme/tokens';

import { AppText } from './AppText';

interface Props {
  label: string;
  selected?: boolean;
  onPress: () => void;
  dot?: string;
}

export function Chip({ label, selected, onPress, dot }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Filtro ${label}`}
      accessibilityState={{ selected: !!selected }}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      hitSlop={4}
      style={[styles.chip, selected && styles.selected]}>
      {dot && <View style={[styles.dot, { backgroundColor: dot }]} />}
      <AppText style={[styles.text, selected && styles.textSel]}>{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: sizes.touch - 8,
    paddingHorizontal: space.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  selected: { backgroundColor: colors.text, borderColor: colors.text },
  text: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.text },
  textSel: { color: colors.bg },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
