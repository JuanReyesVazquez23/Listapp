import {
  normalizeQuery,
  readTotalFromResources,
  singularQueryVariants,
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
    imageUrl?: string;
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
        images: [
          {
            imageUrl:
              options.imageUrl ??
              'https://gruporamos.vteximg.com.br/arquivos/ids/164483/pan.jpg',
          },
        ],
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

  it('pluraliza el sustantivo cuando va precedido de una cantidad', () => {
    expect(normalizeQuery('1 sardina')).toEqual({
      ok: true,
      query: 'sardinas',
      terms: ['sardinas'],
    });
    expect(normalizeQuery('3 pan')).toEqual({
      ok: true,
      query: 'panes',
      terms: ['panes'],
    });
    expect(normalizeQuery('2 arroz')).toEqual({
      ok: true,
      query: 'arroces',
      terms: ['arroces'],
    });
  });

  it('conserva las palabras significativas y descarta stopwords', () => {
    expect(normalizeQuery('Pan de molde')).toEqual({
      ok: true,
      query: 'pan de molde',
      terms: ['pan', 'molde'],
    });
  });

  it('descarta números sueltos aunque no sean la primera palabra', () => {
    expect(normalizeQuery('100% leche')).toEqual({
      ok: true,
      query: 'leches',
      terms: ['leches'],
    });
    expect(normalizeQuery('leche 2')).toEqual({
      ok: true,
      query: 'leche',
      terms: ['leche'],
    });
  });

  it('rechaza consultas vacías, de una letra o solo unidades', () => {
    expect(normalizeQuery('')).toMatchObject({ ok: false, reason: 'too_short' });
    expect(normalizeQuery('a')).toMatchObject({ ok: false, reason: 'too_short' });
    expect(normalizeQuery('2 kg')).toMatchObject({ ok: false, reason: 'too_short' });
    expect(normalizeQuery('123 456')).toMatchObject({
      ok: false,
      reason: 'no_terms',
    });
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

  it('pliega tildes y diéresis sin cambiar el significado', () => {
    expect(normalizeQuery('Plátanos')).toEqual({
      ok: true,
      query: 'platanos',
      terms: ['platanos'],
    });
    expect(normalizeQuery('Azúcar')).toEqual({
      ok: true,
      query: 'azucar',
      terms: ['azucar'],
    });
    expect(normalizeQuery('Piña')).toEqual({
      ok: true,
      query: 'pina',
      terms: ['pina'],
    });
  });
});

describe('singularQueryVariants', () => {
  it('genera el singular de un plural que VTEX no reconoce', () => {
    expect(singularQueryVariants('platanos')).toEqual(['platano']);
    expect(singularQueryVariants('huevos')).toEqual(['huevo']);
  });

  it('prueba tanto quitar la `s` como deshacer `-es`', () => {
    expect(singularQueryVariants('panes')).toEqual(['pane', 'pan']);
    expect(singularQueryVariants('arroces')).toEqual(['arroce', 'arroz']);
  });

  it('no genera variantes para palabras que no acaban en `s`', () => {
    expect(singularQueryVariants('arroz')).toEqual([]);
    expect(singularQueryVariants('pan de molde')).toEqual([]);
  });

  it('singulariza cada palabra de una consulta compuesta', () => {
    expect(singularQueryVariants('platanos maduros')).toEqual([
      'platano maduro',
    ]);
  });
});

describe('readTotalFromResources', () => {
  it('lee el total de la cabecera de VTEX', () => {
    expect(readTotalFromResources('0-49/297')).toBe(297);
    expect(readTotalFromResources('0-49/0')).toBe(0);
  });

  it('devuelve null si la cabecera falta o está rota', () => {
    expect(readTotalFromResources(null)).toBeNull();
    expect(readTotalFromResources('0-49')).toBeNull();
    expect(readTotalFromResources('muchos')).toBeNull();
  });
});

describe('toCatalogResults', () => {
  it('lee el campo VTEX correcto, convierte el precio y toma la imagen', () => {
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
        imageUrl:
          'https://gruporamos.vteximg.com.br/arquivos/ids/164483/pan.jpg',
      },
    ]);
  });

  it('deja la imagen en null si la URL no es HTTPS o falta', () => {
    const results = toCatalogResults(
      [
        product('1', 'Pan Blanco', { imageUrl: 'http://ejemplo.com/pan.jpg' }),
        product('2', 'Pan Integral', { imageUrl: 'no-es-una-url' }),
      ],
      ['pan'],
    );

    expect(results.map((entry) => entry.imageUrl)).toEqual([null, null]);
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

  it('acepta plurales y acentos en ambos sentidos', () => {
    const pans = toCatalogResults(
      [
        product('1', 'Panes Integrales'),
        product('2', 'Leche Entera', { categories: ['/Lácteos/Leche/'] }),
      ],
      ['pan'],
    );
    expect(pans.map((entry) => entry.productId)).toEqual(['1']);

    const sardines = toCatalogResults(
      [product('3', 'Sardina Criolla Lb', { categories: ['/Supermercado/Sardinas/'] })],
      ['sardinas'],
    );
    expect(sardines.map((entry) => entry.productId)).toEqual(['3']);

    const plantains = toCatalogResults(
      [
        product('4', 'Plátano Hartón', {
          categories: ['/Supermercado/Frutas y Verduras/Plátanos/'],
        }),
        product('5', 'Platanos Maduros', {
          categories: ['/Supermercado/Frutas y Verduras/Plátanos/'],
        }),
      ],
      ['platano'],
    );
    expect(plantains.map((entry) => entry.productId).sort()).toEqual(['4', '5']);
  });

  it('un término con tilde encuentra nombres sin tilde y al revés', () => {
    const withAccent = toCatalogResults(
      [product('1', 'Platano Harton', { categories: ['/Frutas/Platanos/'] })],
      ['plátano'],
    );
    expect(withAccent.map((entry) => entry.productId)).toEqual(['1']);

    const withoutAccent = toCatalogResults(
      [product('2', 'Plátano Hartón', { categories: ['/Frutas/Plátanos/'] })],
      ['platano'],
    );
    expect(withoutAccent.map((entry) => entry.productId)).toEqual(['2']);
  });

  it('prioriza la categoría de la familia y descarta otros usos del término', () => {
    const results = toCatalogResults(
      [
        product('1', 'Chocolate Con Leche', {
          categories: ['/Supermercado/Galletas y Dulces/Chocolates/'],
        }),
        product('2', 'Leche Entera', {
          categories: ['/Supermercado/Lácteos y Huevos/Leche Líquida/'],
        }),
        product('3', 'Pan De Leche', {
          categories: ['/Supermercado/Panadería y Repostería/Pan del día/'],
        }),
      ],
      ['leche'],
    );

    expect(results.map((entry) => entry.productId)).toEqual(['2']);
  });

  it('vuelve al nombre si ninguna categoría nombra la familia', () => {
    const results = toCatalogResults(
      [product('1', 'Leche Entera', { categories: ['/Supermercado/'] })],
      ['leche'],
    );

    expect(results.map((entry) => entry.productId)).toEqual(['1']);
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

  it('devuelve todos los resultados de la familia, sin corte artificial', () => {
    const catalog = Array.from({ length: 20 }, (_, index) =>
      product(String(index), `Pan número ${index}`),
    );

    const results = toCatalogResults(catalog, ['pan']);
    expect(results).toHaveLength(20);
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
