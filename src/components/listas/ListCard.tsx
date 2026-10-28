import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { colors, radius, spacing } from '@/theme/tokens';

interface ListCardProps {
  name: string;
  metadata: string;
  onPress: () => void;
  badge?: string;
  trailingLabel?: string;
  highlighted?: boolean;
}

export function ListCard({
  name,
  metadata,
  onPress,
  badge,
  trailingLabel,
  highlighted = false,
}: ListCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[badge, name, metadata, trailingLabel]
        .filter(Boolean)
        .join(', ')}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        highlighted && styles.highlighted,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.content}>
        {badge ? (
          <View style={styles.badge}>
            <AppText variant="caption" style={styles.badgeLabel}>
              {badge}
            </AppText>
          </View>
        ) : null}
        <AppText variant="title" style={styles.name} numberOfLines={2}>
          {name}
        </AppText>
        <AppText variant="caption" style={styles.metadata} numberOfLines={2}>
          {metadata}
        </AppText>
      </View>

      {trailingLabel ? (
        <AppText variant="label" style={styles.trailing}>
          {trailingLabel}
        </AppText>
      ) : (
        <Ionicons
          name="chevron-forward"
          size={20}
          color={colors.textMuted}
          accessibilityElementsHidden
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: colors.surface,
    marginBottom: spacing[3],
  },
  highlighted: {
    borderColor: colors.primary,
    backgroundColor: colors.bgSubtle,
  },
  pressed: {
    backgroundColor: colors.primarySoft,
  },
  content: {
    flex: 1,
    gap: spacing[1],
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    backgroundColor: colors.primarySoft,
  },
  badgeLabel: {
    color: colors.primaryText,
    fontWeight: '600',
  },
  name: {
    color: colors.text,
  },
  metadata: {
    color: colors.textMuted,
  },
  trailing: {
    color: colors.primary,
    fontWeight: '600',
  },
});
