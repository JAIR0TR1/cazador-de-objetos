import { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { colors, fonts, radii, sizes, space } from '@/theme/tokens';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

interface Props extends Omit<TextInputProps, 'style'> {
  label: string;
  icon?: IconName;
  /** Mensaje de error en línea (se muestra debajo y lo anuncia el lector de pantalla). */
  error?: string | null;
  hint?: string;
  /** Campo de contraseña con botón mostrar/ocultar. */
  secureToggle?: boolean;
}

/** Campo de formulario: etiqueta visible, borde de foco lima, error en línea y área táctil ≥ 48 pt. */
export const TextField = forwardRef<TextInput, Props>(function TextField({ label, icon, error, hint, secureToggle, onFocus, onBlur, ...rest }, ref) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const borderColor = error ? colors.danger : focused ? colors.lime : colors.borderStrong;

  return (
    <View style={styles.wrap}>
      <AppText variant="small" color={colors.text} style={styles.label} nativeID={`${label}-label`}>
        {label}
      </AppText>
      <View style={[styles.box, { borderColor }]}>
        {icon && <Icon name={icon} size={20} color={focused ? colors.lime : colors.muted} />}
        <TextInput
          ref={ref}
          {...rest}
          accessibilityLabel={label}
          accessibilityLabelledBy={`${label}-label`}
          accessibilityHint={error ?? hint}
          secureTextEntry={secureToggle ? hidden : rest.secureTextEntry}
          placeholderTextColor={colors.muted}
          selectionColor={colors.lime}
          cursorColor={colors.lime}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={styles.input}
        />
        {secureToggle && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Mostrar contraseña' : 'Ocultar contraseña'}
            onPress={() => setHidden((h) => !h)}
            hitSlop={8}
            style={styles.eye}>
            <Icon name={hidden ? 'eye' : 'eye-off'} size={20} color={colors.muted} />
          </Pressable>
        )}
      </View>
      {error ? (
        <View style={styles.msgRow} accessibilityLiveRegion="polite">
          <Icon name="alert" size={14} color={colors.danger} />
          <AppText variant="small" color={colors.danger} style={{ flex: 1 }}>
            {error}
          </AppText>
        </View>
      ) : hint ? (
        <AppText variant="small" style={styles.hint}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontFamily: fonts.bodyMedium },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    minHeight: sizes.button,
    borderWidth: 1,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    paddingLeft: space.sm,
  },
  input: { flex: 1, color: colors.text, fontFamily: fonts.body, fontSize: 16, paddingVertical: 12, paddingRight: space.sm },
  eye: { width: sizes.touch, height: sizes.touch, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  hint: { fontSize: 13, lineHeight: 18 },
});
