import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { ThemeContext, type ThemeContextValue } from '@/theme/themeContext';
import { nextThemeMode, resolveThemeMode } from '@/theme/themeMode';
import { readStoredThemeMode, saveThemeMode } from '@/theme/themeStorage';
import { themes, type ThemeMode } from '@/theme/tokens';

/**
 * Proveedor del tema claro/oscuro.
 *
 * Si no hay preferencia guardada se sigue el esquema del sistema; en cuanto el
 * usuario usa el toggle, la elección se guarda y deja de depender del sistema.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [storedMode, setStoredMode] = useState<string | null>(readStoredThemeMode);
  const mode = resolveThemeMode(storedMode, systemScheme);

  const setMode = useCallback((next: ThemeMode) => {
    setStoredMode(next);
    void saveThemeMode(next);
  }, []);

  const toggle = useCallback(() => {
    setMode(nextThemeMode(mode));
  }, [mode, setMode]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      colors: themes[mode],
      isDark: mode === 'dark',
      setMode,
      toggle,
    }),
    [mode, setMode, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
