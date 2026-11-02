/**
 * Reglas puras del catálogo, separadas del handler HTTP.
 *
 * Aquí no se lee `process.env` ni se toca `fetch`: la consulta se valida con
 * las mismas reglas que el cliente y la respuesta cruda de VTEX se reduce a la
 * familia del artículo. Al ser funciones puras, las pruebas pueden cubrir el
 * filtro sin levantar un servidor.
 */

export const CATALOG_LIMITS = {
  maxResults: 8,
  minQueryLength: 2,
  maxQueryLength: 40,
  maxWords: 5,
  maxPriceCents: 9_999_999,
} as const;

export type CatalogQueryFailure =
  | 'too_short'
  | 'too_long'
  | 'too_many_words'
  | 'invalid_chars'
  | 'no_terms';

export type NormalizedQuery =
  | { ok: true; query: string; terms: string[] }
  | { ok: false; reason: CatalogQueryFailure };

export interface CatalogResult {
  productId: string;
  name: string;
  brand: string | null;
  presentation: string | null;
  priceCents: number;
}

const STOPWORDS = new Set([
  'de',
  'del',
  'la',
  'el',
  'los',
  'las',
  'con',
  'sin',
  'y',
  'para',
  'un',
  'una',
  'unos',
  'unas',
  'al',
  'a',
  'en',
  'por',
]);

const UNIT_WORDS = new Set([
  'kg',
  'kgs',
  'kilogramo',
  'kilogramos',
  'lb',
  'lbs',
  'libra',
  'libras',
  'l',
  'lt',
  'lts',
  'litro',
  'litros',
  'unidad',
  'unidades',
  'und',
  'uds',
  'u',
  'oz',
  'onza',
  'onzas',
]);

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;
const UNSAFE_CHARACTERS = /[^\p{L}\p{N} .-]+/gu;
const LEADING_QUANTITY =
  /^\d+(?:[.,]\d+)?\s*(?:kilogramos?|kgs?|libras?|lbs?|litros?|lts?|unidad(?:es)?|unds?|uds?|onzas?|oz|kg|lb|lt|l|u)\b\s*(?:de\s+|del\s+)?/u;

/**
 * Normaliza la consulta y extrae los términos que identifican la familia.
 *
 * El cliente ya envía el texto limpio, pero el backend no confía en él: un
 * tercero puede llamar al endpoint directamente. Se aplican los mismos
 * límites y se devuelven los términos significativos, que son los que filtran
 * la respuesta de VTEX.
 */
export function normalizeQuery(raw: string): NormalizedQuery {
  const composed =
    typeof raw.normalize === 'function' ? raw.normalize('NFC') : raw;
  const lowered = composed.trim().toLowerCase();

  if (CONTROL_CHARACTERS.test(lowered)) {
    return { ok: false, reason: 'invalid_chars' };
  }

  const query = lowered
    .replace(LEADING_QUANTITY, '')
    .replace(UNSAFE_CHARACTERS, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (query.length < CATALOG_LIMITS.minQueryLength) {
    return { ok: false, reason: 'too_short' };
  }
  if (query.length > CATALOG_LIMITS.maxQueryLength) {
    return { ok: false, reason: 'too_long' };
  }

  const words = query.split(' ');
  if (words.length > CATALOG_LIMITS.maxWords) {
    return { ok: false, reason: 'too_many_words' };
  }

  const terms = words.filter(isSignificantTerm);
  if (terms.length === 0) {
    return { ok: false, reason: 'no_terms' };
  }

  return { ok: true, query, terms };
}

function isSignificantTerm(term: string): boolean {
  if (term.length < 2 || /^\d+$/.test(term)) {
    return false;
  }
  return !STOPWORDS.has(term) && !UNIT_WORDS.has(term);
}

/**
 * Reduce la respuesta de VTEX a la familia de la consulta.
 *
 * VTEX busca en todo el catálogo y su `ft` puede devolver productos de otra
 * familia: `leche` trae chocolates con leche y `pan` trae panela. Por eso el
 * primer término significativo manda en dos niveles:
 *
 * 1. Si alguna categoría del resultado contiene ese término, solo se aceptan
 *    productos de esa categoría. Es la señal más fiable de familia.
 * 2. Si ninguna categoría lo contiene, se acepta el término como palabra del
 *    nombre o la marca, con plural y acentos.
 *
 * Los demás términos solo ordenan. Se elige la primera presentación con precio
 * positivo y se corta en `maxResults`, así el usuario nunca recibe el catálogo
 * completo.
 */
export function toCatalogResults(
  data: unknown,
  terms: readonly string[],
): CatalogResult[] {
  if (!Array.isArray(data) || terms.length === 0) {
    return [];
  }

  const primary = terms[0];
  const seen = new Set<string>();
  const candidates: Array<{
    result: CatalogResult;
    categoryMatch: boolean;
    haystack: string;
  }> = [];

  for (const raw of data) {
    const product = asRecord(raw);
    if (!product) {
      continue;
    }

    const productId = readId(product.productId);
    const name = readText(product.productName, 200);
    if (productId === null || name === null) {
      continue;
    }

    const brand = readText(product.brand, 80);
    const categoryHaystack = normalizeForMatch(readCategoryNames(product));
    const nameHaystack = normalizeForMatch(`${name} ${brand ?? ''}`);
    const categoryMatch = matchesTerm(categoryHaystack, primary);
    const nameMatch = matchesTerm(nameHaystack, primary);

    if (!categoryMatch && !nameMatch) {
      continue;
    }
    if (seen.has(productId)) {
      continue;
    }

    const offer = pickOffer(product);
    if (!offer) {
      continue;
    }

    seen.add(productId);
    candidates.push({
      result: {
        productId,
        name,
        brand,
        presentation: readPresentation(offer.itemName, name, brand),
        priceCents: offer.priceCents,
      },
      categoryMatch,
      haystack: `${nameHaystack} ${categoryHaystack}`,
    });
  }

  // Solo se restringe a categoría si la propia respuesta demuestra que existe
  // una categoría de la familia; si ninguna la nombra, el nombre sigue valiendo.
  const familyHasCategory = candidates.some((entry) => entry.categoryMatch);
  const scored = candidates
    .filter((entry) => !familyHasCategory || entry.categoryMatch)
    .map((entry) => ({
      result: entry.result,
      score: scoreMatch(entry.haystack, terms) + (entry.categoryMatch ? 1 : 0),
    }));

  scored.sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }
    return left.result.name.localeCompare(right.result.name, 'es');
  });

  return scored
    .slice(0, CATALOG_LIMITS.maxResults)
    .map((entry) => entry.result);
}

function pickOffer(
  product: Record<string, unknown>,
): { itemName: string | null; priceCents: number } | null {
  const items = Array.isArray(product.items) ? product.items : [];
  for (const rawItem of items) {
    const item = asRecord(rawItem);
    if (!item) {
      continue;
    }
    const sellers = Array.isArray(item.sellers) ? item.sellers : [];
    for (const rawSeller of sellers) {
      const seller = asRecord(rawSeller);
      if (!seller) {
        continue;
      }
      // VTEX escribe `commertialOffer` (con la errata histórica de la API).
      const offer = asRecord(seller.commertialOffer);
      if (!offer) {
        continue;
      }
      const price = toPositiveNumber(offer.Price);
      if (price === null) {
        continue;
      }
      const priceCents = Math.round(price * 100);
      if (
        priceCents < 1 ||
        priceCents > CATALOG_LIMITS.maxPriceCents
      ) {
        continue;
      }
      const itemName =
        readText(item.nameComplete, 200) ?? readText(item.name, 200);
      return { itemName, priceCents };
    }
  }
  return null;
}

function readPresentation(
  itemName: string | null,
  productName: string,
  brand: string | null,
): string | null {
  if (itemName === null) {
    return null;
  }
  const normalizedItem = normalizeForMatch(itemName);
  const normalizedProduct = normalizeForMatch(productName);
  if (normalizedItem === normalizedProduct) {
    return null;
  }
  if (brand !== null && normalizedItem === normalizeForMatch(`${brand} ${productName}`)) {
    return null;
  }
  return itemName;
}

function readCategoryNames(product: Record<string, unknown>): string {
  const categories = Array.isArray(product.categories) ? product.categories : [];
  return categories
    .filter((category): category is string => typeof category === 'string')
    .join(' ');
}

function scoreMatch(haystack: string, terms: readonly string[]): number {
  let score = 1;
  for (const term of terms.slice(1)) {
    if (matchesTerm(haystack, term)) {
      score += 1;
    }
  }
  return score;
}

/**
 * Compara por palabras completas, admitiendo el plural español.
 *
 * No se usa `includes`: con `pan` haría match con `panela`, que es otra
 * familia. Para términos de cuatro letras o más se admite un prefijo corto,
 * de modo que `yogur` encuentra `yogurt` sin abrir la puerta a `panela`.
 */
function matchesTerm(haystack: string, term: string): boolean {
  const words = haystack.split(' ').filter((word) => word.length > 0);
  return words.some((word) => {
    if (word === term || word === `${term}s` || word === `${term}es`) {
      return true;
    }
    return (
      term.length >= 4 &&
      word.startsWith(term) &&
      word.length <= term.length + 3
    );
  });
}

function normalizeForMatch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(UNSAFE_CHARACTERS, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function readId(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 && trimmed.length <= 40 ? trimmed : null;
  }
  return null;
}

function readText(value: unknown, max: number): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= max ? trimmed : null;
}

function toPositiveNumber(value: unknown): number | null {
  const number = typeof value === 'string' ? Number(value) : value;
  return typeof number === 'number' && Number.isFinite(number) && number > 0
    ? number
    : null;
}
