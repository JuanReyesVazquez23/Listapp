import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import type { ShoppingItem } from '@/domain/item';
import { es } from '@/strings/es';
import { itemDetailText } from '@/lib/itemDetailText';
import { useTheme, useThemedStyles } from '@/theme/themeContext';
import { radius, spacing, type ThemeColors } from '@/theme/tokens';

interface ShoppingItemRowProps {
  item: ShoppingItem;
  pending: boolean;
  onToggle(itemId: string): void;
  /** En modo catálogo la fila abre el detalle en vez de marcar directamente. */
  catalogMode?: boolean;
  onOpenDetail?(itemId: string): void;
}

/**
 * Fila de compra con checkbox de 28 dp dentro de un objetivo táctil de 56 dp.
 *
 * El texto tachado y la etiqueta "Comprado" acompañan al check para que el
 * estado no dependa solo del color; TalkBack lee el mismo estado. En modo
 * catálogo la fila abre el detalle: marcar exige elegir marca y precio, y la
 * compra normal conserva el toque directo de siempre.
 */
export const ShoppingItemRow = memo(function ShoppingItemRow({
  item,
  pending,
  onToggle,
  catalogMode = false,
  onOpenDetail,
}: ShoppingItemRowProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const opensDetail = catalogMode && onOpenDetail !== undefined;
  const detail = item.detail;
  const detailText = itemDetailText(detail);

  return (
    <Pressable
      accessibilityRole={opensDetail ? 'button' : 'checkbox'}
      accessibilityState={{ checked: item.isChecked, disabled: pending }}
      accessibilityLabel={
        opensDetail
          ? es.itemDetail.openLabel(item.name, detail !== null)
          : es.shopping.itemLabel(item.name, item.isChecked)
      }
      accessibilityHint={
        opensDetail ? es.itemDetail.openHint : es.shopping.toggleHint
      }
      disabled={pending}
      onPress={() =>
        opensDetail ? onOpenDetail(item.id) : onToggle(item.id)
      }
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
        {detailText ? (
          <AppText variant="caption" style={styles.detail} numberOfLines={1}>
            {detailText}
          </AppText>
        ) : null}
        {item.isChecked ? (
          <AppText variant="caption" style={styles.tag}>
            {es.shopping.checkedTag}
          </AppText>
        ) : null}
      </View>

      {opensDetail ? (
        <Ionicons
          name="chevron-forward"
          size={20}
          color={colors.textMuted}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      ) : null}
    </Pressable>
  );
});

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
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
    detail: {
      color: colors.textSecondary,
      marginTop: 2,
    },
  });
