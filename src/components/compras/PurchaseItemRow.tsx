import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import type { ShoppingItem } from '@/domain/item';
import { es } from '@/strings/es';
import { itemDetailText } from '@/lib/itemDetailText';
import { useTheme, useThemedStyles } from '@/theme/themeContext';
import { layout, spacing, type ThemeColors } from '@/theme/tokens';

interface PurchaseItemRowProps {
  item: ShoppingItem;
}

/**
 * Artículo de una compra cerrada.
 *
 * Es solo lectura: el historial es inmutable, así que la fila no tiene rol de
 * control ni acción. La etiqueta "Comprado" acompaña al check para que el
 * estado no dependa solo del color.
 */
export function PurchaseItemRow({ item }: PurchaseItemRowProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const detailText = itemDetailText(item.detail);

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={
        detailText
          ? es.purchase.itemDetailLabel(item.name, item.isChecked, detailText)
          : es.purchase.itemLabel(item.name, item.isChecked)
      }
      style={styles.row}
    >
      <Ionicons
        name={item.isChecked ? 'checkmark-circle' : 'ellipse-outline'}
        size={22}
        color={item.isChecked ? colors.primary : colors.textMuted}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <View style={styles.textArea}>
        <AppText
          variant="body"
          style={[styles.name, !item.isChecked && styles.nameUnchecked]}
        >
          {item.name}
        </AppText>
        {detailText ? (
          <AppText variant="caption" style={styles.detail}>
            {detailText}
          </AppText>
        ) : null}
        {item.isChecked ? (
          <AppText variant="caption" style={styles.tag}>
            {es.shopping.checkedTag}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    row: {
      minHeight: layout.minTouchTarget,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[3],
      paddingVertical: spacing[2],
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    textArea: {
      flex: 1,
    },
    name: {
      color: colors.text,
    },
    nameUnchecked: {
      color: colors.textMuted,
    },
    tag: {
      color: colors.textSecondary,
      marginTop: spacing[1],
    },
    detail: {
      color: colors.textSecondary,
      marginTop: spacing[1],
    },
  });
