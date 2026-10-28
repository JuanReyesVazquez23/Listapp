import type { TextProps } from 'react-native';
import { Text } from 'react-native';

import { typography, type TypographyVariant } from '@/theme/tokens';

interface AppTextProps extends TextProps {
  variant?: TypographyVariant;
}

/** Texto con los estilos tipográficos del sistema de diseño. */
export function AppText({ variant = 'body', style, ...rest }: AppTextProps) {
  return <Text {...rest} style={[typography[variant], style]} />;
}
