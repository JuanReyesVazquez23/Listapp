import { CATALOG_LIMITS, buildCatalogQuery } from '@/domain/catalog';

describe('buildCatalogQuery', () => {
  it('normaliza un nombre válido a minúsculas y espacios simples', () => {
    expect(buildCatalogQuery('  Leche   Entera  ')).toEqual({
      ok: true,
      query: 'leche entera',
    });
  });

  it('conserva acentos y compone en NFC', () => {
    expect(buildCatalogQuery('Azúcar')).toEqual({ ok: true, query: 'azúcar' });
  });

  it('rechaza menos de dos caracteres', () => {
    expect(buildCatalogQuery('a')).toEqual({ ok: false, reason: 'too_short' });
    expect(buildCatalogQuery('   ')).toEqual({ ok: false, reason: 'too_short' });
  });

  it('rechaza más de 40 caracteres', () => {
    expect(buildCatalogQuery('a'.repeat(CATALOG_LIMITS.maxQueryLength))).toEqual({
      ok: true,
      query: 'a'.repeat(CATALOG_LIMITS.maxQueryLength),
    });
    expect(buildCatalogQuery('a'.repeat(CATALOG_LIMITS.maxQueryLength + 1))).toEqual({
      ok: false,
      reason: 'too_long',
    });
  });

  it('rechaza más de cinco palabras', () => {
    expect(buildCatalogQuery('uno dos tres cuatro cinco')).toEqual({
      ok: true,
      query: 'uno dos tres cuatro cinco',
    });
    expect(buildCatalogQuery('uno dos tres cuatro cinco seis')).toEqual({
      ok: false,
      reason: 'too_many_words',
    });
  });

  it('sanea paréntesis en vez de rechazarlos', () => {
    expect(buildCatalogQuery('leche (entera)')).toEqual({
      ok: true,
      query: 'leche entera',
    });
  });

  it('sanea el signo de porcentaje y descarta el número', () => {
    expect(buildCatalogQuery('100% leche')).toEqual({
      ok: true,
      query: 'leches',
    });
  });

  it('elimina una cantidad inicial con su unidad y conector', () => {
    expect(buildCatalogQuery('2 kg de patatas')).toEqual({
      ok: true,
      query: 'patatas',
    });
    expect(buildCatalogQuery('1 litro de leche')).toEqual({
      ok: true,
      query: 'leche',
    });
  });

  it('pluraliza el sustantivo que sigue a una cantidad', () => {
    expect(buildCatalogQuery('1 sardina')).toEqual({
      ok: true,
      query: 'sardinas',
    });
    expect(buildCatalogQuery('3 pan')).toEqual({ ok: true, query: 'panes' });
    expect(buildCatalogQuery('2 arroz')).toEqual({ ok: true, query: 'arroces' });
    expect(buildCatalogQuery('1 de sardina')).toEqual({
      ok: true,
      query: 'sardinas',
    });
  });

  it('descarta números sueltos que no son una cantidad inicial', () => {
    expect(buildCatalogQuery('leche 2')).toEqual({ ok: true, query: 'leche' });
  });

  it('no elimina números pegados a letras', () => {
    expect(buildCatalogQuery('7up')).toEqual({ ok: true, query: '7up' });
  });

  it('rechaza consultas sin términos significativos', () => {
    expect(buildCatalogQuery('123 456')).toEqual({ ok: false, reason: 'no_terms' });
    expect(buildCatalogQuery('de la')).toEqual({ ok: false, reason: 'no_terms' });
    expect(buildCatalogQuery('kg 2 lb')).toEqual({ ok: false, reason: 'no_terms' });
  });

  it('rechaza caracteres de control como defensa', () => {
    expect(buildCatalogQuery('leche\u0000entera')).toEqual({
      ok: false,
      reason: 'invalid_chars',
    });
  });
});
