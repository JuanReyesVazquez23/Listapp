import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import type { ListStatus } from '@/domain/list';
import { es } from '@/strings/es';
import { colors, radius, spacing } from '@/theme/tokens';

interface StatusBadgeProps {
  status: ListStatus;
}

/** Etiqueta de estado de la lista; el color solo refuerza, nunca sustituye al texto. */
export function StatusBadge({ status }: StatusBadgeProps) {
  const isShopping = status === 'shopping';

  return (
    <View style={[styles.badge, isShopping ? styles.shopping : styles.neutral]}>
      <AppText
        variant="caption"
        style={[styles.label, isShopping ? styles.shoppingLabel : styles.neutralLabel]}
      >
        {es.status[status]}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
  },
  shopping: {
    backgroundColor: colors.primarySoft,
  },
  neutral: {
    backgroundColor: colors.bgSubtle,
  },
  label: {
    fontWeight: '600',
  },
  shoppingLabel: {
    color: colors.primaryText,
  },
  neutralLabel: {
    color: colors.textSecondary,
  },
});
