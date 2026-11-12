import { useMemo } from 'react';
import { SectionList, StyleSheet, View } from 'react-native';

import { PurchaseRow } from '@/components/compras/PurchaseRow';
import { AppText } from '@/components/ui/AppText';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatMonthGroup, monthKey } from '@/domain/dates';
import type { ListSummary } from '@/domain/list';
import { es } from '@/strings/es';
import { useThemedStyles } from '@/theme/themeContext';
import { spacing, type ThemeColors } from '@/theme/tokens';

interface HistoryListProps {
  purchases: ListSummary[];
  onOpenPurchase(listId: string): void;
  onGoToLists(): void;
}

interface HistorySection {
  key: string;
  title: string;
  data: ListSummary[];
}

/**
 * Historial agrupado por mes.
 *
 * La consulta llega ordenada por `completed_at_utc`; el grupo se calcula con
 * la fecha local, que puede no ser monótona respecto de UTC tras un cambio de
 * zona horaria o de reloj. Por eso se agrupa con un `Map` y se ordenan las
 * secciones por mes descendente: un mes nunca aparece dos veces y el orden de
 * las filas dentro de cada mes se conserva.
 */
function groupByMonth(purchases: ListSummary[]): HistorySection[] {
  const byMonth = new Map<string, HistorySection>();

  for (const purchase of purchases) {
    const localDate = purchase.completedLocalDate ?? '';
    const key = monthKey(localDate);
    const section = byMonth.get(key);

    if (section) {
      section.data.push(purchase);
      continue;
    }

    byMonth.set(key, { key, title: formatMonthGroup(localDate), data: [purchase] });
  }

  return [...byMonth.values()].sort((left, right) => {
    if (left.key === right.key) {
      return 0;
    }
    return left.key < right.key ? 1 : -1;
  });
}

export function HistoryList({
  purchases,
  onOpenPurchase,
  onGoToLists,
}: HistoryListProps) {
  const styles = useThemedStyles(createStyles);
  const sections = useMemo(() => groupByMonth(purchases), [purchases]);

  if (purchases.length === 0) {
    return (
      <View style={styles.empty}>
        <EmptyState
          icon="time-outline"
          title={es.history.emptyTitle}
          description={es.history.emptyBody}
          actionLabel={es.history.emptyAction}
          onAction={onGoToLists}
        />
      </View>
    );
  }

  return (
    <SectionList
      sections={sections}
      keyExtractor={(purchase) => purchase.id}
      renderItem={({ item }) => (
        <PurchaseRow purchase={item} onPress={onOpenPurchase} />
      )}
      renderSectionHeader={({ section }) => (
        <AppText variant="label" accessibilityRole="header" style={styles.sectionTitle}>
          {section.title}
        </AppText>
      )}
      contentContainerStyle={styles.content}
      stickySectionHeadersEnabled={false}
      showsVerticalScrollIndicator={false}
    />
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    content: {
      paddingBottom: spacing[8],
    },
    sectionTitle: {
      color: colors.textSecondary,
      backgroundColor: colors.bg,
      paddingTop: spacing[4],
      paddingBottom: spacing[1],
    },
    empty: {
      flex: 1,
      justifyContent: 'center',
      paddingVertical: spacing[6],
    },
  });
