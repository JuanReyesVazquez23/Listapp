import { countCharacters } from '@/domain/validation';

export const CATALOG_LIMITS = {
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
  imageUrl: string | null;
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

// Conectores que pueden separar una cantidad del sustantivo: `1 de sardina`.
const QUANTITY_CONNECTORS = new Set(['de', 'del']);

// Caracteres de control: llegan de un pegado raro o de un dato corrupto. La
// puntuación normal se sanea a espacio; esto es solo una defensa.
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

// Todo lo que no sea letra, número, espacio, punto o guion se convierte en
// espacio. Así los paréntesis, el `%` y los signos no provocan un rechazo.
const UNSAFE_CHARACTERS = /[^\p{L}\p{N} .-]+/gu;

// Un token puramente numérico es una cantidad, no una palabra de búsqueda:
// `1 sardina`, `2 kg de arroz` o `100% leche`. Los tokens mixtos como `7up`
// se conservan porque forman parte de un nombre.
const NUMBER_TOKEN = /^\d+(?:[.,]\d+)?$/;

/**
 * Normaliza y valida el texto que se enviará al catálogo.
 *
 * El cliente aplica las mismas reglas que el backend para no gastar una
 * petición en algo que va a rechazar: longitud, número de palabras y al menos
 * un término significativo. La consulta devuelta ya viene en minúsculas, sin
 * cantidades y con los espacios colapsados.
 *
 * Cuando una cantidad precede a un sustantivo (`1 sardina`), el sustantivo se
 * pluraliza: La Sirena devuelve mejores coincidencias con `sardinas` que con
 * `sardina`. Si la cantidad lleva unidad (`1 litro de leche`), la unidad se
 * descarta y el sustantivo queda igual.
 */
export function buildCatalogQuery(itemName: string): CatalogQueryResult {
  const composed =
    typeof itemName.normalize === 'function' ? itemName.normalize('NFC') : itemName;
  const lowered = composed.trim().toLowerCase();

  if (CONTROL_CHARACTERS.test(lowered)) {
    return { ok: false, reason: 'invalid_chars' };
  }

  const cleaned = lowered
    .replace(UNSAFE_CHARACTERS, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const query = removeQuantities(cleaned);

  if (query.length === 0) {
    // Un texto vacío o con letras que se quedó sin nada era una unidad suelta
    // (`2 kg`); un texto solo con números no aporta ningún término (`123 456`).
    return {
      ok: false,
      reason:
        cleaned.length === 0 || /\p{L}/u.test(cleaned) ? 'too_short' : 'no_terms',
    };
  }

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
 * Quita las cantidades y ajusta el sustantivo que las acompaña.
 *
 * El recorrido es por tokens para no confundir `7up` con una cantidad. Si el
 * número va seguido de una unidad, también se descartan la unidad y el
 * conector (`2 kg de arroz` → `arroz`). Si va seguido de un sustantivo, se
 * marca para pluralizarlo (`1 sardina` → `sardinas`).
 */
function removeQuantities(cleaned: string): string {
  if (cleaned.length === 0) {
    return '';
  }

  const tokens = cleaned.split(' ');
  const kept: string[] = [];
  let pluralizeNext = false;

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];

    if (!NUMBER_TOKEN.test(token)) {
      kept.push(pluralizeNext ? pluralizeSpanish(token) : token);
      pluralizeNext = false;
      continue;
    }

    const next = tokens[index + 1];
    if (next !== undefined && UNIT_WORDS.has(next)) {
      index += 1;
      if (
        tokens[index + 1] !== undefined &&
        QUANTITY_CONNECTORS.has(tokens[index + 1])
      ) {
        index += 1;
      }
      continue;
    }

    if (next !== undefined && QUANTITY_CONNECTORS.has(next)) {
      index += 1;
    }
    pluralizeNext = true;
  }

  return kept.join(' ');
}

/**
 * Plural español suficiente para buscar: vocal → `-s`, consonante → `-es`,
 * `z` → `-ces`, `-ión` → `-iones`. Un plural ya formado se deja intacto.
 */
function pluralizeSpanish(word: string): string {
  if (!/^\p{L}+$/u.test(word) || word.length < 2) {
    return word;
  }
  if (word.endsWith('s') && word.length > 3) {
    return word;
  }
  if (word.endsWith('z')) {
    return `${word.slice(0, -1)}ces`;
  }
  if (word.endsWith('ión')) {
    return `${word.slice(0, -3)}iones`;
  }
  if (/[aeiouáéíóú]$/u.test(word)) {
    return `${word}s`;
  }
  return `${stripAccents(word)}es`;
}

function stripAccents(text: string): string {
  return text.normalize('NFD').replace(/\p{M}+/gu, '');
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
