import { StyleSheet, View } from 'react-native';

import { colors, radii, space } from '@/theme/tokens';

import { AppText } from './AppText';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';

interface Props {
  icon: IconName;
  title: string;
  message: string;
  cta?: { label: string; onPress: () => void; icon?: IconName };
  secondary?: { label: string; onPress: () => void };
  tone?: 'neutral' | 'error';
}

/** Estado vacío / error con mensaje humano y una acción clara. */
export function EmptyState({ icon, title, message, cta, secondary, tone = 'neutral' }: Props) {
  const accent = tone === 'error' ? colors.danger : colors.lime;
  return (
    <View style={styles.wrap} accessibilityRole="summary">
      <View style={[styles.badge, { borderColor: accent + '55', backgroundColor: accent + '14' }]}>
        <Icon name={icon} size={28} color={accent} />
      </View>
      <AppText variant="heading" center>
        {title}
      </AppText>
      <AppText variant="small" center style={styles.msg}>
        {message}
      </AppText>
      {cta && <Button label={cta.label} icon={cta.icon} onPress={cta.onPress} style={styles.cta} />}
      {secondary && <Button label={secondary.label} variant="ghost" onPress={secondary.onPress} style={styles.cta} />}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingHorizontal: space.md, paddingVertical: space.xl, gap: space.xs },
  badge: {
    width: 64,
    height: 64,
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.xs,
  },
  msg: { maxWidth: 300, marginBottom: space.xs },
  cta: { alignSelf: 'stretch', marginTop: space.xs },
});
