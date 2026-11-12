import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useThemedStyles } from '@/theme/themeContext';
import { layout, type ThemeColors } from '@/theme/tokens';

interface ScreenProps {
  style?: StyleProp<ViewStyle>;
}

/** Contenedor base: fondo del tema y margen horizontal de 16. */
export function Screen({ children, style }: PropsWithChildren<ScreenProps>) {
  const styles = useThemedStyles(createStyles);

  return <View style={[styles.root, style]}>{children}</View>;
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.bg,
      paddingHorizontal: layout.screenPadding,
    },
  });
