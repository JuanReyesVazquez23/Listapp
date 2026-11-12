import type { TextProps } from 'react-native';
import { Text } from 'react-native';

import { useTheme } from '@/theme/themeContext';
import { typography, type TypographyVariant } from '@/theme/tokens';

interface AppTextProps extends TextProps {
  variant?: TypographyVariant;
}

/**
 * Texto con los estilos tipográficos del sistema de diseño.
 *
 * El color por defecto sale del tema activo; cualquier `style` explícito sigue
 * mandando, así que los textos secundarios y de error conservan su matiz.
 */
export function AppText({ variant = 'body', style, ...rest }: AppTextProps) {
  const { colors } = useTheme();

  return (
    <Text
      {...rest}
      style={[typography[variant], { color: colors.text }, style]}
    />
  );
}
