import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import type { ShoppingItem } from '@/domain/item';
import { es } from '@/strings/es';
import { colors, radius, spacing } from '@/theme/tokens';

interface ShoppingItemRowProps {
  item: ShoppingItem;
  pending: boolean;
  onToggle(itemId: string): void;
}

/**
 * Fila de compra con checkbox de 28 dp dentro de un objetivo táctil de 56 dp.
 *
 * El texto tachado y la etiqueta "Comprado" acompañan al check para que el
 * estado no dependa solo del color; TalkBack lee el mismo estado.
 */
export const ShoppingItemRow = memo(function ShoppingItemRow({
  item,
  pending,
  onToggle,
}: ShoppingItemRowProps) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: item.isChecked, disabled: pending }}
      accessibilityLabel={es.shopping.itemLabel(item.name, item.isChecked)}
      accessibilityHint={es.shopping.toggleHint}
      disabled={pending}
      onPress={() => onToggle(item.id)}
      style={({ pressed }) => [
        styles.row,
        pressed && styles.pressed,
        pending && styles.pending,
      ]}
    >
      <View style={[styles.checkbox, item.isChecked && styles.checkboxChecked]}>
        {item.isChecked ? (
          <Ionicons
            name="checkmark"
            size={18}
            color={colors.onPrimary}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        ) : null}
      </View>

      <View style={styles.textArea}>
        <AppText
          variant="body"
          style={[styles.name, item.isChecked && styles.nameChecked]}
        >
          {item.name}
        </AppText>
        {item.isChecked ? (
          <AppText variant="caption" style={styles.tag}>
            {es.shopping.checkedTag}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pressed: {
    backgroundColor: colors.bgSubtle,
  },
  pending: {
    opacity: 0.6,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.controlBorder,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  checkboxChecked: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  textArea: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    color: colors.text,
  },
  nameChecked: {
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  tag: {
    color: colors.textSecondary,
    marginTop: 2,
  },
});
