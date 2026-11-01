import { countCharacters } from '@/domain/validation';

export const CATALOG_LIMITS = {
  maxResults: 8,
  minQueryLength: 2,
  maxQueryLength: 40,
  maxWords: 5,
} as const;

export type CatalogQueryFailure =
  | 'too_short'
  | 'too_long'
  | 'too_many_words'
  | 'invalid_chars'
  | 'no_terms';

export type CatalogQueryResult =
  | { ok: true; query: string }
  | { ok: false; reason: CatalogQueryFailure };

export interface CatalogProduct {
  productId: string;
  name: string;
  brand: string | null;
  presentation: string | null;
  priceCents: number;
}

export type CatalogSearchOutcome =
  | { ok: true; products: CatalogProduct[] }
  | {
      ok: false;
      reason:
        | 'offline'
        | 'timeout'
        | 'unavailable'
        | 'invalid_response'
        | 'invalid_query'
        | 'cancelled';
    };

export interface CatalogClient {
  search(
    query: string,
    options?: { signal?: AbortSignal },
  ): Promise<CatalogSearchOutcome>;
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

// Caracteres de control: llegan de un pegado raro o de un dato corrupto. La
// puntuación normal se sanea a espacio; esto es solo una defensa.
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

// Todo lo que no sea letra, número, espacio, punto o guion se convierte en
// espacio. Así los paréntesis, el `%` y los signos no provocan un rechazo.
const UNSAFE_CHARACTERS = /[^\p{L}\p{N} .-]+/gu;

// Cantidad inicial con su unidad y el conector: `2 kg de patatas` → `patatas`.
// El número solo se descarta si va seguido de una unidad; `7up` se conserva.
const LEADING_QUANTITY =
  /^\d+(?:[.,]\d+)?\s*(?:kilogramos?|kgs?|libras?|lbs?|litros?|lts?|unidad(?:es)?|unds?|uds?|onzas?|oz|kg|lb|lt|l|u)\b\s*(?:de\s+|del\s+)?/u;

/**
 * Normaliza y valida el texto que se enviará al catálogo.
 *
 * El cliente aplica las mismas reglas que el backend para no gastar una
 * petición en algo que va a rechazar: longitud, número de palabras y al menos
 * un término significativo. La consulta devuelta ya viene en minúsculas, sin
 * el prefijo de cantidad y con los espacios colapsados.
 */
export function buildCatalogQuery(itemName: string): CatalogQueryResult {
  const composed =
    typeof itemName.normalize === 'function' ? itemName.normalize('NFC') : itemName;
  const lowered = composed.trim().toLowerCase();

  if (CONTROL_CHARACTERS.test(lowered)) {
    return { ok: false, reason: 'invalid_chars' };
  }

  const query = lowered
    .replace(LEADING_QUANTITY, '')
    .replace(UNSAFE_CHARACTERS, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const length = countCharacters(query);
  if (length < CATALOG_LIMITS.minQueryLength) {
    return { ok: false, reason: 'too_short' };
  }
  if (length > CATALOG_LIMITS.maxQueryLength) {
    return { ok: false, reason: 'too_long' };
  }

  const words = query.split(' ');
  if (words.length > CATALOG_LIMITS.maxWords) {
    return { ok: false, reason: 'too_many_words' };
  }

  if (!words.some(isSignificantTerm)) {
    return { ok: false, reason: 'no_terms' };
  }

  return { ok: true, query };
}

/**
 * Un término aporta a la búsqueda si no es una stopword, ni una unidad, ni un
 * número suelto, ni una letra sola. Los tokens mixtos como `7up` sí cuentan.
 */
function isSignificantTerm(term: string): boolean {
  if (term.length < 2 || /^\d+$/.test(term)) {
    return false;
  }
  return !STOPWORDS.has(term) && !UNIT_WORDS.has(term);
}
