import Storage from 'expo-sqlite/kv-store';

import type { ThemeMode } from '@/theme/tokens';

const THEME_KEY = 'listapp.theme-mode';

/**
 * La preferencia de tema vive en el almacén clave-valor de SQLite que ya
 * incluye `expo-sqlite`; no añade una dependencia ni espera una lectura.
 */
export function readStoredThemeMode(): string | null {
  try {
    return Storage.getItemSync(THEME_KEY);
  } catch {
    return null;
  }
}

export async function saveThemeMode(mode: ThemeMode): Promise<void> {
  try {
    await Storage.setItemAsync(THEME_KEY, mode);
  } catch {
    // Si falla la escritura, el tema sigue activo durante esta sesión.
  }
}
