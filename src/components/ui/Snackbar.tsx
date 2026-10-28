import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { colors, radius, spacing } from '@/theme/tokens';

interface SnackbarProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss: () => void;
  dismissLabel: string;
  bottom: number;
}

export function Snackbar({
  message,
  actionLabel,
  onAction,
  onDismiss,
  dismissLabel,
  bottom,
}: SnackbarProps) {
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[styles.root, { bottom }]}
    >
      <AppText variant="body" style={styles.message} numberOfLines={3}>
        {message}
      </AppText>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          onPress={onAction}
          hitSlop={8}
          style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
        >
          <AppText variant="button" style={styles.actionLabel}>
            {actionLabel}
          </AppText>
        </Pressable>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={dismissLabel}
        onPress={onDismiss}
        hitSlop={8}
        style={({ pressed }) => [styles.close, pressed && styles.actionPressed]}
      >
        <Ionicons name="close" size={20} color={colors.onPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: spacing[4],
    right: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.text,
    borderRadius: radius.md,
    paddingVertical: spacing[3],
    paddingLeft: spacing[4],
    paddingRight: spacing[2],
    elevation: 4,
  },
  message: {
    flex: 1,
    color: colors.onPrimary,
  },
  action: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing[2],
    borderRadius: radius.sm,
  },
  actionPressed: {
    backgroundColor: colors.primaryPressed,
  },
  actionLabel: {
    color: colors.primarySoft,
  },
  close: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
});
