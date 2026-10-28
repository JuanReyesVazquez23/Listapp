import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { colors, radius, spacing } from '@/theme/tokens';

interface ListCardProps {
  name: string;
  metadata: string;
  onPress: () => void;
}

export function ListCard({ name, metadata, onPress }: ListCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${metadata}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.content}>
        <AppText variant="title" style={styles.name} numberOfLines={2}>
          {name}
        </AppText>
        <AppText variant="caption" style={styles.metadata} numberOfLines={2}>
          {metadata}
        </AppText>
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
  pressed: {
    backgroundColor: colors.bgSubtle,
  },
  content: {
    flex: 1,
    gap: spacing[1],
  },
  name: {
    color: colors.text,
  },
  metadata: {
    color: colors.textMuted,
  },
});
