import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme, useThemedStyles } from '@/theme/themeContext';
import { layout, type ThemeColors } from '@/theme/tokens';

interface IconButtonProps {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  color?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function IconButton({
  icon,
  label,
  onPress,
  color,
  disabled = false,
  style,
}: IconButtonProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const iconColor = color ?? colors.textSecondary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <Ionicons
        name={icon}
        size={24}
        color={disabled ? colors.textMuted : iconColor}
        accessibilityElementsHidden
      />
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    base: {
      width: layout.minTouchTarget,
      height: layout.minTouchTarget,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 999,
    },
    pressed: {
      backgroundColor: colors.bgSubtle,
    },
  });
