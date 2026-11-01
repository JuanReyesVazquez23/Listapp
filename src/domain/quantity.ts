import type { AmountParseResult } from '@/domain/money';

export const QUANTITY_UNITS = ['unit', 'pound', 'kilogram', 'liter'] as const;

export type QuantityUnit = (typeof QUANTITY_UNITS)[number];

/**
 * La cantidad se guarda en milésimas: `1.5` kg son 1500.
 * El máximo son 999 999 milésimas, el mismo que acepta el modelo de datos.
 */
export const QUANTITY_LIMITS = { maxMilli: 999_999 } as const;

export function isQuantityUnit(value: string): value is QuantityUnit {
  return QUANTITY_UNITS.some((unit) => unit === value);
}

const QUANTITY_PATTERN = /^(\d+)(?:[.,](\d{1,3}))?$/;

/**
 * Convierte el texto de un campo de cantidad a milésimas.
 *
 * Acepta coma o punto como separador decimal y hasta tres decimales. No
 * acepta unidades ni signos: la unidad se elige en un control aparte.
 */
export function parseQuantityToMilli(raw: string): AmountParseResult {
  const value = raw.trim();
  if (value.length === 0) {
    return { ok: false, reason: 'required' };
  }

  const match = QUANTITY_PATTERN.exec(value);
  if (!match) {
    return { ok: false, reason: 'invalid' };
  }

  const [, whole, fraction = ''] = match;
  const milli = Number(whole) * 1000 + Number(fraction.padEnd(3, '0'));

  if (milli <= 0) {
    return { ok: false, reason: 'invalid' };
  }
  if (milli > QUANTITY_LIMITS.maxMilli) {
    return { ok: false, reason: 'too_large' };
  }
  return { ok: true, value: milli };
}

/**
 * Formatea milésimas como número editable: `1500` → `1.5`, `1` → `0.001`.
 *
 * Usa punto decimal y quita los ceros sobrantes; el mismo texto vuelve a
 * entrar en `parseQuantityToMilli`.
 */
export function formatQuantityNumber(quantityMilli: number): string {
  const whole = Math.trunc(quantityMilli / 1000);
  const fraction = String(quantityMilli % 1000)
    .padStart(3, '0')
    .replace(/0+$/, '');
  return fraction.length > 0 ? `${whole}.${fraction}` : String(whole);
}
