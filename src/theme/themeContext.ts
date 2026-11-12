import { createContext, useContext, useMemo } from 'react';

import { lightColors, type ThemeColors, type ThemeMode } from '@/theme/tokens';

export interface ThemeContextValue {
  mode: ThemeMode;
  colors: ThemeColors;
  isDark: boolean;
  setMode(mode: ThemeMode): void;
  toggle(): void;
}

/**
 * Fallback para renderizados sin provider (pruebas de componentes aislados).
 * La app real siempre monta `ThemeProvider` en la raíz.
 */
const fallbackTheme: ThemeContextValue = {
  mode: 'light',
  colors: lightColors,
  isDark: false,
  setMode: () => {},
  toggle: () => {},
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext) ?? fallbackTheme;
}

type StyleFactory = (colors: ThemeColors) => unknown;

/**
 * Los estilos se construyen por tema y se comparten entre instancias.
 *
 * `StyleSheet.create` devuelve objetos inmutables, así que no hace falta crear
 * uno nuevo por cada fila de una lista: la fábrica y el tema identifican el
 * resultado. Los colores del tema son constantes de módulo y sirven de clave.
 */
const styleCache = new WeakMap<StyleFactory, WeakMap<ThemeColors, unknown>>();

export function useThemedStyles<T>(factory: (colors: ThemeColors) => T): T {
  const { colors } = useTheme();

  return useMemo(() => {
    const key = factory as StyleFactory;
    let byTheme = styleCache.get(key);
    if (!byTheme) {
      byTheme = new WeakMap<ThemeColors, unknown>();
      styleCache.set(key, byTheme);
    }

    const cached = byTheme.get(colors) as T | undefined;
    if (cached !== undefined) {
      return cached;
    }

    const created = factory(colors);
    byTheme.set(colors, created);
    return created;
  }, [colors, factory]);
}
