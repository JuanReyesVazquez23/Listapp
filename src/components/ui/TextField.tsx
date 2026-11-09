import { forwardRef, useState } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputInstance,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { colors, radius, spacing, typography } from '@/theme/tokens';

interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string | null;
  containerStyle?: StyleProp<ViewStyle>;
}

/**
 * `forwardRef` apunta al `TextInput` real. El detalle de una línea lo usa para
 * medir el campo enfocado y desplazarlo por encima del teclado.
 */
export const TextField = forwardRef<TextInputInstance, TextFieldProps>(function TextField(
  { label, error, containerStyle, style, onFocus, onBlur, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={containerStyle}>
      <AppText variant="label" style={styles.label}>
        {label}
      </AppText>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.primary}
        {...rest}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[
          styles.input,
          focused && styles.inputFocused,
          error ? styles.inputError : null,
          style,
        ]}
      />
      {error ? (
        <AppText variant="caption" style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  label: {
    color: colors.textSecondary,
    marginBottom: spacing[1],
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.controlBorder,
    borderRadius: radius.sm,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    color: colors.text,
    backgroundColor: colors.surface,
    ...typography.body,
  },
  inputFocused: {
    borderColor: colors.focus,
    borderWidth: 2,
  },
  inputError: {
    borderColor: colors.danger,
  },
  error: {
    color: colors.danger,
    marginTop: spacing[1],
  },
});
