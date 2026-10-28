import type { TextStyle } from 'react-native';

/** Paleta cruda. Los componentes usan los alias semánticos de `colors`. */
export const palette = {
  brand50: '#F0FDF4',
  brand100: '#DCFCE7',
  brand600: '#15803D',
  brand700: '#166534',
  brand800: '#14532D',
  neutral0: '#FFFFFF',
  neutral50: '#F8FAFC',
  neutral100: '#F1F5F9',
  neutral200: '#E2E8F0',
  neutral500: '#64748B',
  neutral600: '#475569',
  neutral900: '#0F172A',
  danger50: '#FEF2F2',
  danger600: '#B91C1C',
  warning600: '#B45309',
} as const;

export const colors = {
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
} as const;

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
