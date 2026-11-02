import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { CatalogChip, PurchaseTotalRow } from '@/components/compras/PurchaseTotalRow';
import { formatHistoryRow } from '@/domain/dates';
import type { ListSummary } from '@/domain/list';
import { formatCents } from '@/domain/money';
import { es } from '@/strings/es';
import { colors, layout, spacing } from '@/theme/tokens';

interface PurchaseRowProps {
  purchase: ListSummary;
  onPress(listId: string): void;
}

/** Fila del historial: fecha, supermercado y progreso en una sola línea táctil. */
export function PurchaseRow({ purchase, onPress }: PurchaseRowProps) {
  const dateLabel = formatHistoryRow(
    purchase.completedLocalDate ?? '',
    purchase.completedLocalTime ?? '',
  );
  const supermarket = purchase.supermarketName ?? '';
  const progressLabel = es.purchase.progress(purchase.checkedCount, purchase.itemCount);
  const catalogMode = purchase.shoppingMode === 'catalog';
  const totalLabel = !catalogMode
    ? undefined
    : purchase.totalCents === null
      ? es.total.noPrices
      : formatCents(purchase.totalCents);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={es.purchase.rowLabel(
        dateLabel,
        supermarket,
        progressLabel,
        totalLabel,
      )}
      onPress={() => onPress(purchase.id)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.content}>
        <AppText variant="label" style={styles.date}>
          {dateLabel}
        </AppText>
        <AppText variant="bodyStrong" style={styles.supermarket} numberOfLines={1}>
          {supermarket}
        </AppText>
        <AppText variant="caption" style={styles.progress}>
          {progressLabel}
        </AppText>
        {catalogMode ? (
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={styles.catalog}
          >
            <CatalogChip />
            <PurchaseTotalRow
              totalCents={purchase.totalCents}
              unpricedCount={purchase.unpricedCheckedCount}
            />
          </View>
        ) : null}
      </View>
      <Ionicons
        name="chevron-forward"
        size={20}
        color={colors.textMuted}
        accessibilityElementsHidden
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: layout.itemRowMinHeight,
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
  content: {
    flex: 1,
    gap: spacing[1],
  },
  date: {
    color: colors.textMuted,
  },
  supermarket: {
    color: colors.text,
  },
  progress: {
    color: colors.textSecondary,
  },
  catalog: {
    marginTop: spacing[1],
    gap: spacing[1],
  },
});
