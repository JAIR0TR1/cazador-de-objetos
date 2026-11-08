import { router } from 'expo-router';
import { type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, space } from '@/theme/tokens';

import { AppText } from './AppText';
import { Icon } from './Icon';

interface Props {
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  onBack?: () => void;
}

/** Contenedor de formularios: safe areas, teclado que no tapa campos y scroll con taps persistentes. */
export function FormScreen({ eyebrow, title, subtitle, children, footer, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const back = onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/welcome')));
  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + space.sm, paddingBottom: insets.bottom + space.md, paddingHorizontal: space.md }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={back} hitSlop={8} style={styles.back}>
          <Icon name="chevron-left" size={22} />
        </Pressable>
        <AppText variant="label" color={colors.lime} style={{ marginTop: space.md }}>
          {eyebrow}
        </AppText>
        <AppText variant="title" accessibilityRole="header" style={{ marginTop: space.xs }}>
          {title}
        </AppText>
        {subtitle && (
          <AppText variant="body" color={colors.muted} style={{ marginTop: space.xs }}>
            {subtitle}
          </AppText>
        )}
        <View style={styles.body}>{children}</View>
        <View style={{ flex: 1 }} />
        {footer}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function FormBanner({ tone, message }: { tone: 'error' | 'success'; message: string }) {
  const c = tone === 'error' ? colors.danger : colors.lime;
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      style={[styles.banner, { borderColor: c + '66', backgroundColor: tone === 'error' ? colors.dangerDim : colors.limeDim }]}>
      <Icon name={tone === 'error' ? 'alert' : 'check'} size={18} color={c} />
      <AppText variant="small" color={colors.text} style={{ flex: 1 }}>
        {message}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { marginTop: space.lg, gap: space.sm },
  banner: { flexDirection: 'row', alignItems: 'flex-start', gap: space.xs, padding: space.sm, borderRadius: 12, borderWidth: 1 },
});
