import { StyleSheet, Text, type TextProps } from 'react-native';

import { colors, fonts } from '@/theme/tokens';

export type TextVariant = 'display' | 'title' | 'heading' | 'body' | 'bodyStrong' | 'small' | 'mono' | 'label';

interface Props extends TextProps {
  variant?: TextVariant;
  color?: string;
  center?: boolean;
}

/** Texto tipográfico del sistema. Respeta el tamaño de texto del sistema (con tope para no romper el layout). */
export function AppText({ variant = 'body', color, center, style, maxFontSizeMultiplier, ...rest }: Props) {
  return (
    <Text
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? (variant === 'display' || variant === 'label' ? 1.3 : 1.6)}
      style={[styles[variant], color ? { color } : null, center && styles.center, style]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  display: { fontFamily: fonts.display, fontSize: 40, lineHeight: 44, letterSpacing: -1.2, color: colors.text },
  title: { fontFamily: fonts.title, fontSize: 28, lineHeight: 32, letterSpacing: -0.6, color: colors.text },
  heading: { fontFamily: fonts.heading, fontSize: 20, lineHeight: 24, letterSpacing: -0.2, color: colors.text },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24, color: colors.text },
  bodyStrong: { fontFamily: fonts.bodySemi, fontSize: 16, lineHeight: 24, color: colors.text },
  small: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.muted },
  mono: { fontFamily: fonts.mono, fontSize: 14, lineHeight: 18, color: colors.text },
  label: {
    fontFamily: fonts.mono,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  center: { textAlign: 'center' },
});
