import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

import { es } from '@/strings/es';
import { useTheme, useThemedStyles } from '@/theme/themeContext';
import { layout, type ThemeColors } from '@/theme/tokens';

/**
 * Alterna entre tema claro y oscuro.
 *
 * El icono muestra el destino (luna cuando hay que oscurecer, sol cuando hay
 * que aclarar) y el estado accesible expone el modo actual como un interruptor.
 */
export function ThemeToggleButton() {
  const { isDark, colors, toggle } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={isDark ? es.theme.toLight : es.theme.toDark}
      accessibilityState={{ checked: isDark }}
      hitSlop={4}
      onPress={toggle}
      style={({ pressed }) => [styles.base, pressed && styles.pressed]}
    >
      <Ionicons
        name={isDark ? 'sunny-outline' : 'moon-outline'}
        size={24}
        color={colors.textSecondary}
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
