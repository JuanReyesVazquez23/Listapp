import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/ui/AppText';
import { validateItemName } from '@/domain/validation';
import { toUserMessage } from '@/lib/errorMessages';
import { itemNameErrorMessage } from '@/lib/validationMessages';
import { es } from '@/strings/es';
import { colors, radius, spacing, typography } from '@/theme/tokens';

interface AddItemBarProps {
  /** Recibe el nombre ya validado. Si falla, el mensaje se muestra aquí. */
  onAdd(name: string): Promise<void>;
  bottomInset?: number;
  autoFocus?: boolean;
}

/**
 * Campo fijo para añadir artículos, compartido por el detalle y la compra.
 *
 * La validación local evita una escritura inútil; el caso de uso vuelve a
 * validar porque es la frontera real de los datos.
 */
export function AddItemBar({ onAdd, bottomInset = 0, autoFocus = false }: AddItemBarProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const submit = async () => {
    const validation = validateItemName(name);
    if (!validation.ok) {
      setError(itemNameErrorMessage(validation.reason));
      return;
    }

    setAdding(true);
    setError(null);
    try {
      await onAdd(validation.value);
      setName('');
    } catch (addError) {
      setError(toUserMessage(addError));
    } finally {
      setAdding(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: Math.max(bottomInset, spacing[2]) },
      ]}
    >
      <AppText variant="label" style={styles.label}>
        {es.detail.addItemLabel}
      </AppText>
      <View style={styles.row}>
        <TextInput
          accessibilityLabel={es.detail.addItemLabel}
          placeholder={es.detail.addItemPlaceholder}
          placeholderTextColor={colors.textMuted}
          value={name}
          onChangeText={(value) => {
            setName(value);
            setError(null);
          }}
          onSubmitEditing={() => {
            void submit();
          }}
          returnKeyType="done"
          selectionColor={colors.primary}
          editable={!adding}
          autoFocus={autoFocus}
          style={[styles.input, error ? styles.inputError : null]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={es.detail.add}
          accessibilityState={{ disabled: adding }}
          disabled={adding}
          onPress={() => {
            void submit();
          }}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
            adding && styles.buttonDisabled,
          ]}
        >
          <Ionicons name="add" size={28} color={colors.onPrimary} />
        </Pressable>
      </View>
      {error ? (
        <AppText variant="caption" style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    backgroundColor: colors.surface,
  },
  label: {
    color: colors.textSecondary,
    marginBottom: spacing[1],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  input: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.controlBorder,
    borderRadius: radius.sm,
    paddingHorizontal: spacing[3],
    color: colors.text,
    ...typography.body,
  },
  inputError: {
    borderColor: colors.danger,
  },
  button: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    backgroundColor: colors.primaryPressed,
  },
  buttonDisabled: {
    backgroundColor: colors.disabledBg,
  },
  error: {
    color: colors.danger,
    marginTop: spacing[1],
  },
});
