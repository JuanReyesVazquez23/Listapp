/**
 * Medida y precio por medida de una presentación del catálogo.
 *
 * VTEX no devuelve una medida estructurada: el tamaño del paquete vive en el
 * nombre o en la presentación (`125 Gr`, `20 Lb`, `2 L`, `6 Uds`). Estas
 * funciones lo interpretan para que el usuario pueda comparar presentaciones
 * sin hacer la regla de tres a mano.
 *
 * La cantidad se guarda en milésimas de la unidad base: gramos para peso,
 * mililitros para volumen y unidades para conteo. Así se evitan decimales en
 * el cálculo y el redondeo ocurre una sola vez al mostrar el precio.
 */

export type MeasureKind = 'weight' | 'volume' | 'count';
export type MeasureUnitKey = 'pound' | 'liter' | 'unit';

export interface ProductMeasure {
  kind: MeasureKind;
  /** Gramos, mililitros o unidades, siempre multiplicados por 1000. */
  quantityMilli: number;
}

export interface CatalogMeasureInfo {
  measure: ProductMeasure;
  unit: MeasureUnitKey;
  pricePerMeasureCents: number;
}

const WEIGHT_FACTORS: Record<string, number> = {
  kilogramos: 1000,
  kilogramo: 1000,
  kilos: 1000,
  kilo: 1000,
  kgs: 1000,
  kg: 1000,
  gramos: 1,
  gramo: 1,
  grs: 1,
  gr: 1,
  g: 1,
  libras: 453.59237,
  libra: 453.59237,
  lbs: 453.59237,
  lb: 453.59237,
  onzas: 28.349523125,
  onza: 28.349523125,
  oz: 28.349523125,
};

const VOLUME_FACTORS: Record<string, number> = {
  mililitros: 1,
  mililitro: 1,
  ml: 1,
  litros: 1000,
  litro: 1000,
  lts: 1000,
  lt: 1000,
  galones: 3785.411784,
  galon: 3785.411784,
  gal: 3785.411784,
  l: 1000,
};

const COUNT_FACTORS: Record<string, number> = {
  unidad: 1,
  unidades: 1,
  und: 1,
  unds: 1,
  ud: 1,
  uds: 1,
  pieza: 1,
  piezas: 1,
  pcs: 1,
  pc: 1,
  u: 1,
};

// Los patrones van de la unidad más larga a la más corta para que `kg` no se
// lea como `g` ni `lt` como `l`. El `\b` final exige una unidad completa.
const WEIGHT_PATTERN =
  /(\d+(?:[.,]\d+)?)\s*(kilogramos?|kilos?|kgs?|gramos?|grs?|libras?|lbs?|onzas?|oz|g)\b/gu;
const VOLUME_PATTERN =
  /(\d+(?:[.,]\d+)?)\s*(mililitros?|litros?|lts?|lt|galones?|gal|ml|l)\b/gu;
const COUNT_PATTERN =
  /(\d+(?:[.,]\d+)?)\s*(unidad(?:es)?|unds?|uds?|piezas?|pcs?|pc|u)\b/gu;

interface MeasureCandidate {
  index: number;
  measure: ProductMeasure;
}

/**
 * Interpreta el tamaño de paquete que aparece en el texto del producto.
 *
 * Se elige la última medida encontrada porque el tamaño suele ir al final del
 * nombre (`Sardinas Aceite Zerca 125 Gr`). Si no hay una medida reconocible,
 * se devuelve `null` y la app no inventa un precio por medida.
 */
export function parseProductMeasure(text: string): ProductMeasure | null {
  if (text.trim().length === 0) {
    return null;
  }

  const normalized = normalizeMeasureText(text);
  const candidates = [
    ...collectCandidates(normalized, WEIGHT_PATTERN, 'weight', WEIGHT_FACTORS),
    ...collectCandidates(normalized, VOLUME_PATTERN, 'volume', VOLUME_FACTORS),
    ...collectCandidates(normalized, COUNT_PATTERN, 'count', COUNT_FACTORS),
  ];

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((left, right) => right.index - left.index);
  return candidates[0].measure;
}

/**
 * Calcula el precio por libra, litro o unidad.
 *
 * El resultado se redondea a céntimos. Si el precio por medida quedaría en 0,
 * se devuelve `null` para no mostrar una falsa ganga.
 */
export function computePricePerMeasure(
  priceCents: number,
  measure: ProductMeasure,
): number | null {
  if (
    !Number.isInteger(priceCents) ||
    priceCents <= 0 ||
    !Number.isInteger(measure.quantityMilli) ||
    measure.quantityMilli <= 0
  ) {
    return null;
  }

  let numerator: number;
  let denominator: number;

  switch (measure.kind) {
    case 'weight':
      // 45359237/100000 gramos por libra; la cantidad está en milésimas.
      numerator = priceCents * 45_359_237;
      denominator = measure.quantityMilli * 100;
      break;
    case 'volume':
      numerator = priceCents * 1_000_000;
      denominator = measure.quantityMilli;
      break;
    case 'count':
      numerator = priceCents * 1000;
      denominator = measure.quantityMilli;
      break;
  }

  const result = Math.round(numerator / denominator);
  return result > 0 ? result : null;
}

export function measureUnitKey(kind: MeasureKind): MeasureUnitKey {
  switch (kind) {
    case 'weight':
      return 'pound';
    case 'volume':
      return 'liter';
    case 'count':
      return 'unit';
  }
}

/**
 * Reúne la medida y el precio por medida de un producto del catálogo.
 * Devuelve `null` si el nombre no declara un tamaño comparable.
 */
export function getCatalogMeasure(product: {
  name: string;
  presentation: string | null;
  priceCents: number;
}): CatalogMeasureInfo | null {
  const measure = parseProductMeasure(
    `${product.name} ${product.presentation ?? ''}`,
  );
  if (measure === null) {
    return null;
  }

  const pricePerMeasureCents = computePricePerMeasure(
    product.priceCents,
    measure,
  );
  if (pricePerMeasureCents === null) {
    return null;
  }

  return {
    measure,
    unit: measureUnitKey(measure.kind),
    pricePerMeasureCents,
  };
}

function collectCandidates(
  text: string,
  pattern: RegExp,
  kind: MeasureKind,
  factors: Record<string, number>,
): MeasureCandidate[] {
  const candidates: MeasureCandidate[] = [];

  for (const match of text.matchAll(pattern)) {
    const rawValue = match[1];
    const unit = match[2];
    const factor = factors[unit];
    if (factor === undefined) {
      continue;
    }

    const value = Number(rawValue.replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0 || value > 1_000_000) {
      continue;
    }

    const quantityMilli = Math.round(value * factor * 1000);
    if (quantityMilli <= 0) {
      continue;
    }

    candidates.push({
      index: match.index ?? 0,
      measure: { kind, quantityMilli },
    });
  }

  return candidates;
}

function normalizeMeasureText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}
