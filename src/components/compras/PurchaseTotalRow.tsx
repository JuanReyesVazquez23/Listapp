import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { formatCents } from '@/domain/money';
import { es } from '@/strings/es';
import { colors, radius, spacing } from '@/theme/tokens';

interface PurchaseTotalRowProps {
  totalCents: number | null;
  unpricedCount: number;
}

/**
 * Total de una compra con catálogo.
 *
 * `totalCents = null` significa que ninguna línea marcada tiene precio: se
 * muestra "Aún no hay precios" en vez de un RD$0.00 falso. Cuando conviven
 * líneas con y sin precio, el total es parcial y se dice cuántas faltan.
 */
export function PurchaseTotalRow({
  totalCents,
  unpricedCount,
}: PurchaseTotalRowProps) {
  if (totalCents === null && unpricedCount === 0) {
    return null;
  }

  const isPartial = totalCents !== null && unpricedCount > 0;
  const label =
    totalCents === null
      ? es.total.noPrices
      : isPartial
        ? es.total.partial(formatCents(totalCents))
        : es.total.exact(formatCents(totalCents));
  const detail =
    unpricedCount > 0 ? es.total.unpriced(unpricedCount) : null;

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={detail ? `${label}. ${detail}` : label}
      style={styles.row}
    >
      <AppText variant="bodyStrong" style={styles.label}>
        {label}
      </AppText>
      {detail ? (
        <AppText variant="caption" style={styles.detail}>
          {detail}
        </AppText>
      ) : null}
      {isPartial ? (
        <AppText variant="caption" style={styles.detail}>
          {es.total.partialHint}
        </AppText>
      ) : null}
    </View>
  );
}

/** Marca discreta del modo catálogo; la compra normal no la muestra (D-51). */
export function CatalogChip() {
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={es.total.catalogChip}
      style={styles.chip}
    >
      <AppText variant="caption" style={styles.chipLabel}>
        {es.total.catalogChip}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 2,
    paddingVertical: spacing[2],
  },
  label: {
    color: colors.text,
  },
  detail: {
    color: colors.textSecondary,
  },
  chip: {
    alignSelf: 'flex-start',
    paddingVertical: 2,
    paddingHorizontal: spacing[2],
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  chipLabel: {
    color: colors.primaryText,
  },
});
