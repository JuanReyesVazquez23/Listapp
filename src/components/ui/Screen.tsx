import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, layout } from '@/theme/tokens';

interface ScreenProps {
  style?: StyleProp<ViewStyle>;
}

/** Contenedor base: fondo blanco y margen horizontal de 16. */
export function Screen({ children, style }: PropsWithChildren<ScreenProps>) {
  return <View style={[styles.root, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: layout.screenPadding,
  },
});
