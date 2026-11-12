import type { TextStyle } from 'react-native';

/** Paleta cruda. Los componentes usan los alias semánticos de `ThemeColors`. */
export const palette = {
  brand50: '#F0FDF4',
  brand100: '#DCFCE7',
  brand300: '#86EFAC',
  brand400: '#4ADE80',
  brand500: '#22C55E',
  brand600: '#15803D',
  brand700: '#166534',
  brand800: '#14532D',
  brand950: '#052E16',
  neutral0: '#FFFFFF',
  neutral50: '#F8FAFC',
  neutral100: '#F1F5F9',
  neutral200: '#E2E8F0',
  neutral300: '#CBD5E1',
  neutral400: '#94A3B8',
  neutral500: '#64748B',
  neutral600: '#475569',
  neutral700: '#334155',
  neutral800: '#1E293B',
  neutral900: '#0F172A',
  neutral950: '#0B1220',
  danger50: '#FEF2F2',
  danger600: '#B91C1C',
  danger400: '#F87171',
  danger950: '#3B1717',
  warning600: '#B45309',
  warning400: '#FBBF24',
} as const;

export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
  bg: string;
  bgSubtle: string;
  surface: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  controlBorder: string;
  primary: string;
  primaryPressed: string;
  primarySoft: string;
  primaryText: string;
  onPrimary: string;
  focus: string;
  danger: string;
  dangerSoft: string;
  warning: string;
  disabledBg: string;
  disabledText: string;
  overlay: string;
}

export const lightColors: ThemeColors = {
  bg: palette.neutral0,
  bgSubtle: palette.brand50,
  surface: palette.neutral0,
  text: palette.neutral900,
  textSecondary: palette.neutral600,
  textMuted: palette.neutral500,
  border: palette.neutral200,
  controlBorder: palette.neutral500,
  primary: palette.brand600,
  primaryPressed: palette.brand700,
  primarySoft: palette.brand100,
  primaryText: palette.brand800,
  onPrimary: palette.neutral0,
  focus: palette.brand600,
  danger: palette.danger600,
  dangerSoft: palette.danger50,
  warning: palette.warning600,
  disabledBg: palette.neutral200,
  disabledText: palette.neutral600,
  overlay: 'rgba(15, 23, 42, 0.4)',
};

/**
 * Tema oscuro con la misma semántica que el claro.
 *
 * El verde primario se aclara para mantener contraste sobre fondos oscuros y
 * el texto que va encima pasa a ser oscuro. Las superficies no son negras
 * puras: los bordes y las tarjetas necesitan separarse del fondo.
 */
export const darkColors: ThemeColors = {
  bg: palette.neutral950,
  bgSubtle: '#132A1E',
  surface: '#111C2E',
  text: '#E6EDF7',
  textSecondary: '#A9B8CC',
  textMuted: '#8B9CB3',
  border: '#263548',
  controlBorder: '#5F7590',
  primary: palette.brand400,
  primaryPressed: palette.brand500,
  primarySoft: '#15351F',
  primaryText: palette.brand300,
  onPrimary: palette.brand950,
  focus: palette.brand400,
  danger: palette.danger400,
  dangerSoft: palette.danger950,
  warning: palette.warning400,
  disabledBg: '#1B2637',
  disabledText: palette.neutral400,
  overlay: 'rgba(0, 0, 0, 0.65)',
};

/** Compatibilidad con código antiguo; los componentes deben usar `useTheme`. */
export const colors = lightColors;

export const themes: Record<ThemeMode, ThemeColors> = {
  light: lightColors,
  dark: darkColors,
};

export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const layout = {
  screenPadding: spacing[4],
  minTouchTarget: 48,
  itemRowMinHeight: 56,
  controlBorderWidth: 1,
  focusBorderWidth: 2,
} as const;

export const typography = {
  display: { fontSize: 32, lineHeight: 38, fontWeight: '700' },
  h1: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
  h2: { fontSize: 22, lineHeight: 28, fontWeight: '600' },
  title: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  bodyStrong: { fontSize: 16, lineHeight: 24, fontWeight: '600' },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' },
  button: { fontSize: 16, lineHeight: 20, fontWeight: '600' },
} as const satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;
