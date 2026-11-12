import type { ThemeMode } from '@/theme/tokens';

/**
 * Resuelve el modo activo a partir de la preferencia guardada y el sistema.
 *
 * La preferencia manda; si no existe, se sigue el esquema del dispositivo.
 * Cualquier valor desconocido se trata como ausencia de preferencia.
 */
export function resolveThemeMode(
  stored: string | null,
  system: 'light' | 'dark' | null | undefined,
): ThemeMode {
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }
  return system === 'dark' ? 'dark' : 'light';
}

/** Modo al que lleva el toggle desde el modo actual. */
export function nextThemeMode(mode: ThemeMode): ThemeMode {
  return mode === 'dark' ? 'light' : 'dark';
}
