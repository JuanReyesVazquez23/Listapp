import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import type { Progress } from '@/domain/progress';
import { es } from '@/strings/es';
import { colors, radius, spacing } from '@/theme/tokens';

interface ProgressBarProps {
  progress: Progress;
}

/**
 * Barra de progreso de la compra.
 *
 * El relleno usa `scaleX` en lugar de `width` para no provocar layout al
 * cambiar. El valor accesible se expone completo para que TalkBack anuncie
 * "7 de 12, 58 %".
 */
export function ProgressBar({ progress }: ProgressBarProps) {
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={es.shopping.title}
      accessibilityValue={{
        min: 0,
        max: progress.total,
        now: progress.checked,
        text: `${progress.label}, ${progress.percentage}%`,
      }}
      style={styles.container}
    >
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { transform: [{ scaleX: progress.percentage / 100 }] },
          ]}
        />
      </View>
      <View style={styles.labels}>
        <AppText variant="title" style={styles.count}>
          {progress.label}
        </AppText>
        <AppText variant="label" style={styles.percentage}>
          {progress.percentage}%
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[2],
  },
  track: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    width: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    transformOrigin: 'left',
  },
  labels: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  count: {
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  percentage: {
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
});
