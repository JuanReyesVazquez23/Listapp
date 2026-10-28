export const NAME_LIMITS = {
  list: 80,
  item: 100,
  supermarket: 80,
} as const;

export type ValidationFailure = 'required' | 'too_long';

export type ValidationResult =
  | { ok: true; value: string }
  | { ok: false; reason: ValidationFailure };

/** `trim` de JavaScript; conserva mayúsculas y acentos. */
export function normalizeName(raw: string): string {
  return raw.trim();
}

/**
 * SQLite `length()` cuenta puntos de código, no unidades UTF-16.
 * Contamos igual para que la validación y el CHECK coincidan con emojis.
 */
export function countCharacters(value: string): number {
  return Array.from(value).length;
}

function validateName(raw: string, max: number): ValidationResult {
  const value = normalizeName(raw);
  if (value.length === 0) {
    return { ok: false, reason: 'required' };
  }
  if (countCharacters(value) > max) {
    return { ok: false, reason: 'too_long' };
  }
  return { ok: true, value };
}

export function validateListName(raw: string): ValidationResult {
  return validateName(raw, NAME_LIMITS.list);
}

export function validateItemName(raw: string): ValidationResult {
  return validateName(raw, NAME_LIMITS.item);
}

export function validateSupermarketName(raw: string): ValidationResult {
  return validateName(raw, NAME_LIMITS.supermarket);
}
