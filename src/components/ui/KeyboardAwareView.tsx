import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, type StyleProp, type ViewStyle } from 'react-native';
import { useHeaderHeight } from 'expo-router/react-navigation';

interface KeyboardAwareViewProps {
  style?: StyleProp<ViewStyle>;
}

/**
 * Contenedor que deja libre el área del teclado.
 *
 * `KeyboardAvoidingView` calcula el solape con la parte inferior de su propio
 * frame, pero el header nativo queda fuera de ese frame: sin descontarlo, el
 * padding se queda corto por la altura del header y el campo inferior sigue
 * tapado. `useHeaderHeight` devuelve esa altura exacta, incluida la barra de
 * estado.
 */
export function KeyboardAwareView({
  children,
  style,
}: PropsWithChildren<KeyboardAwareViewProps>) {
  const headerHeight = useHeaderHeight();

  return (
    <KeyboardAvoidingView
      style={style}
      behavior="padding"
      keyboardVerticalOffset={headerHeight}
    >
      {children}
    </KeyboardAvoidingView>
  );
}
