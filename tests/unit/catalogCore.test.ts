import {
  CATALOG_LIMITS,
  normalizeQuery,
  toCatalogResults,
} from '../../api/_catalogCore';

function product(
  productId: string,
  productName: string,
  options: {
    brand?: string;
    price?: number;
    itemName?: string;
    categories?: string[];
    offerKey?: 'commertialOffer' | 'commercialOffer';
  } = {},
) {
  const offerKey = options.offerKey ?? 'commertialOffer';
  return {
    productId,
    productName,
    brand: options.brand ?? 'Marca',
    categories: options.categories ?? ['/Supermercado/Pan/'],
    items: [
      {
        nameComplete: options.itemName ?? productName,
        sellers: [
          {
            [offerKey]: { Price: options.price ?? 120.5 },
          },
        ],
      },
    ],
  };
}

describe('normalizeQuery', () => {
  it('quita la cantidad inicial y devuelve los términos de familia', () => {
    expect(normalizeQuery('2 kg de Pan')).toEqual({
      ok: true,
      query: 'pan',
      terms: ['pan'],
    });
  });

  it('conserva las palabras significativas y descarta stopwords', () => {
    expect(normalizeQuery('Pan de molde')).toEqual({
      ok: true,
      query: 'pan de molde',
      terms: ['pan', 'molde'],
    });
  });

  it('rechaza consultas vacías, de una letra o solo unidades', () => {
    expect(normalizeQuery('')).toMatchObject({ ok: false, reason: 'too_short' });
    expect(normalizeQuery('a')).toMatchObject({ ok: false, reason: 'too_short' });
    expect(normalizeQuery('2 kg')).toMatchObject({ ok: false, reason: 'too_short' });
  });

  it('rechaza más de cinco palabras', () => {
    expect(normalizeQuery('pan blanco de molde grande familiar')).toMatchObject({
      ok: false,
      reason: 'too_many_words',
    });
  });

  it('rechaza caracteres de control', () => {
    expect(normalizeQuery('pan\u0000')).toMatchObject({
      ok: false,
      reason: 'invalid_chars',
    });
  });
});

describe('toCatalogResults', () => {
  it('lee el campo VTEX correcto y convierte el precio a céntimos', () => {
    const results = toCatalogResults(
      [product('1', 'Pan Blanco', { brand: 'Bimbo', price: 175.25 })],
      ['pan'],
    );

    expect(results).toEqual([
      {
        productId: '1',
        name: 'Pan Blanco',
        brand: 'Bimbo',
        presentation: null,
        priceCents: 17525,
      },
    ]);
  });

  it('ignora `commercialOffer`, la errata que no existe en VTEX', () => {
    const results = toCatalogResults(
      [product('1', 'Pan Blanco', { offerKey: 'commercialOffer' })],
      ['pan'],
    );

    expect(results).toEqual([]);
  });

  it('no confunde la familia: pan no devuelve panela', () => {
    const results = toCatalogResults(
      [
        product('1', 'Pan Blanco'),
        product('2', 'Panela Cuadrada', { categories: ['/Supermercado/Endulzantes/'] }),
        product('3', 'Pan de Molde Integral'),
      ],
      ['pan'],
    );

    expect(results.map((entry) => entry.name)).toEqual([
      'Pan Blanco',
      'Pan de Molde Integral',
    ]);
  });

  it('acepta plurales y acentos', () => {
    const results = toCatalogResults(
      [
        product('1', 'Panes Integrales'),
        product('2', 'Leche Entera', { categories: ['/Lácteos/Leche/'] }),
      ],
      ['pan'],
    );
    expect(results.map((entry) => entry.productId)).toEqual(['1']);

    const milk = toCatalogResults(
      [product('3', 'Leche Entera', { categories: ['/Lácteos/Leche/'] })],
      ['leche'],
    );
    expect(milk).toHaveLength(1);
  });

  it('ordena por coincidencia de términos sin salir de la familia', () => {
    const results = toCatalogResults(
      [
        product('1', 'Leche Deslactosada'),
        product('2', 'Leche Entera'),
        product('3', 'Leche Entera Grande'),
        product('4', 'Queso Entero'),
      ],
      ['leche', 'entera'],
    );

    expect(results.map((entry) => entry.productId)).toEqual(['2', '3', '1']);
    expect(results[results.length - 1].name).toBe('Leche Deslactosada');
  });

  it('corta en el máximo de resultados', () => {
    const catalog = Array.from({ length: 20 }, (_, index) =>
      product(String(index), `Pan número ${index}`),
    );

    const results = toCatalogResults(catalog, ['pan']);
    expect(results).toHaveLength(CATALOG_LIMITS.maxResults);
  });

  it('deduplica por producto y descarta precios no válidos', () => {
    const results = toCatalogResults(
      [
        product('1', 'Pan Blanco'),
        product('1', 'Pan Blanco duplicado'),
        product('2', 'Pan Integral', { price: 0 }),
        product('3', 'Pan de Agua', { price: 99_999_999 }),
      ],
      ['pan'],
    );

    expect(results.map((entry) => entry.productId)).toEqual(['1']);
  });

  it('incluye la presentación cuando difiere del nombre del producto', () => {
    const results = toCatalogResults(
      [
        product('1', 'Pan Blanco', {
          itemName: 'Pan Blanco Bimbo Grande 500 g',
        }),
      ],
      ['pan'],
    );

    expect(results[0].presentation).toBe('Pan Blanco Bimbo Grande 500 g');
  });

  it('devuelve vacío si la respuesta no es un arreglo', () => {
    expect(toCatalogResults({ products: [] }, ['pan'])).toEqual([]);
    expect(toCatalogResults(null, ['pan'])).toEqual([]);
  });
});
