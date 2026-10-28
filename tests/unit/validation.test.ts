import {
  NAME_LIMITS,
  countCharacters,
  normalizeName,
  validateItemName,
  validateListName,
  validateSupermarketName,
} from '@/domain/validation';

describe('validación de nombres', () => {
  it('recorta espacios y conserva el resto del texto', () => {
    expect(normalizeName('  Compra semanal  ')).toBe('Compra semanal');
    expect(validateListName('  Compra semanal  ')).toEqual({
      ok: true,
      value: 'Compra semanal',
    });
  });

  it('rechaza cadenas vacías o solo espacios', () => {
    expect(validateListName('')).toEqual({ ok: false, reason: 'required' });
    expect(validateListName('   \t\n  ')).toEqual({ ok: false, reason: 'required' });
    expect(validateItemName('   ')).toEqual({ ok: false, reason: 'required' });
  });

  it('acepta el máximo de caracteres y rechaza uno más', () => {
    expect(validateListName('a'.repeat(NAME_LIMITS.list)).ok).toBe(true);
    expect(validateListName('a'.repeat(NAME_LIMITS.list + 1))).toEqual({
      ok: false,
      reason: 'too_long',
    });

    expect(validateItemName('a'.repeat(NAME_LIMITS.item)).ok).toBe(true);
    expect(validateItemName('a'.repeat(NAME_LIMITS.item + 1))).toEqual({
      ok: false,
      reason: 'too_long',
    });

    expect(validateSupermarketName('a'.repeat(NAME_LIMITS.supermarket)).ok).toBe(true);
    expect(validateSupermarketName('a'.repeat(NAME_LIMITS.supermarket + 1))).toEqual({
      ok: false,
      reason: 'too_long',
    });
  });

  it('cuenta puntos de código como SQLite length()', () => {
    const emoji = '🛒';
    expect(countCharacters(emoji)).toBe(1);
    expect(validateItemName(emoji.repeat(NAME_LIMITS.item)).ok).toBe(true);
    expect(validateItemName(emoji.repeat(NAME_LIMITS.item + 1))).toEqual({
      ok: false,
      reason: 'too_long',
    });
  });

  it('conserva acentos y mayúsculas', () => {
    expect(validateListName('  Compra de Navidad  ')).toEqual({
      ok: true,
      value: 'Compra de Navidad',
    });
  });
});
