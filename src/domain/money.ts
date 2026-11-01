/** Moneda única de la app; el símbolo visible solo se compone al formatear. */
export const CURRENCY = 'DOP' as const;

export const MONEY_LIMITS = { maxUnitPriceCents: 9_999_999 } as const;

export type AmountParseFailure = 'required' | 'invalid' | 'too_large';

export type AmountParseResult =
  | { ok: true; value: number }
  | { ok: false; reason: AmountParseFailure };

const PREFIX_PATTERN = /^(?:RD\$|\$)/i;

// Sin separador de miles: el campo editable nunca los precarga y el parser
// no los adivina. Un único separador decimal, con coma o punto.
const AMOUNT_PATTERN = /^(\d+)(?:[.,](\d{1,2}))?$/;

/**
 * Convierte el texto de un campo de precio a céntimos.
 *
 * Acepta un prefijo opcional `RD$` o `$` y un único separador decimal. No
 * acepta signos, letras, separadores de miles ni más de dos decimales: el
 * valor tiene que ser mayor que cero y no superar el máximo del modelo.
 */
export function parseAmountToCents(raw: string): AmountParseResult {
  const value = raw.trim().replace(PREFIX_PATTERN, '').trim();
  if (value.length === 0) {
    return { ok: false, reason: 'required' };
  }

  const match = AMOUNT_PATTERN.exec(value);
  if (!match) {
    return { ok: false, reason: 'invalid' };
  }

  const [, whole, fraction = ''] = match;
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));

  if (cents <= 0) {
    return { ok: false, reason: 'invalid' };
  }
  if (cents > MONEY_LIMITS.maxUnitPriceCents) {
    return { ok: false, reason: 'too_large' };
  }
  return { ok: true, value: cents };
}

/**
 * Formatea céntimos para mostrarlos: `RD$1,234.56`.
 *
 * La agrupación de miles es manual para no depender de `Intl`, que puede
 * cambiar entre Node y Android y haría los tests dependientes del ICU.
 */
export function formatCents(cents: number): string {
  const whole = Math.trunc(cents / 100);
  const fraction = String(cents % 100).padStart(2, '0');
  return `RD$${groupThousands(whole)}.${fraction}`;
}

/** Formatea céntimos para precargar un campo editable, sin separador de miles. */
export function formatCentsForInput(cents: number): string {
  const whole = Math.trunc(cents / 100);
  const fraction = String(cents % 100).padStart(2, '0');
  return `${whole}.${fraction}`;
}

/**
 * Calcula el subtotal de una línea en céntimos con un único redondeo.
 *
 * La cantidad va en milésimas y el precio en céntimos por unidad. Se suma
 * medio milésimo antes de truncar para redondear el empate hacia arriba; la
 * fórmula coincide con la restricción del modelo de datos.
 */
export function lineSubtotalCents(quantityMilli: number, unitPriceCents: number): number {
  return Math.floor((quantityMilli * unitPriceCents + 500) / 1000);
}

function groupThousands(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
