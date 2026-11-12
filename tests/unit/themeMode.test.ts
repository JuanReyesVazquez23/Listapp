import { nextThemeMode, resolveThemeMode } from '@/theme/themeMode';

describe('modo de tema', () => {
  it('la preferencia guardada manda sobre el esquema del sistema', () => {
    expect(resolveThemeMode('dark', 'light')).toBe('dark');
    expect(resolveThemeMode('light', 'dark')).toBe('light');
  });

  it('sin preferencia sigue el esquema del sistema', () => {
    expect(resolveThemeMode(null, 'dark')).toBe('dark');
    expect(resolveThemeMode(null, 'light')).toBe('light');
    expect(resolveThemeMode(null, null)).toBe('light');
  });

  it('un valor desconocido se trata como ausencia de preferencia', () => {
    expect(resolveThemeMode('sepia', 'dark')).toBe('dark');
    expect(resolveThemeMode('', 'light')).toBe('light');
  });

  it('el toggle alterna entre los dos modos', () => {
    expect(nextThemeMode('light')).toBe('dark');
    expect(nextThemeMode('dark')).toBe('light');
  });
});
