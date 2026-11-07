import type { CatalogProduct } from '@/domain/catalog';
import {
  buildCatalogEntries,
  collectCatalogBrands,
  filterCatalogEntries,
  sortCatalogEntries,
  type CatalogEntry,
} from '@/domain/catalogResults';

function product(
  productId: string,
  name: string,
  options: Partial<CatalogProduct> = {},
): CatalogProduct {
  return {
    productId,
    name,
    brand: 'Marca',
    presentation: null,
    priceCents: 10_000,
    imageUrl: null,
    ...options,
  };
}

function entry(
  productId: string,
  name: string,
  options: Partial<CatalogProduct> = {},
): CatalogEntry {
  return {
    product: product(productId, name, options),
    measure: null,
  };
}

describe('buildCatalogEntries', () => {
  it('calcula la medida una sola vez por producto', () => {
    const entries = buildCatalogEntries([
      product('1', 'Leche Entera 2 L', { priceCents: 25_000 }),
      product('2', 'Pan Blanco'),
    ]);

    expect(entries[0].measure).toEqual({
      measure: { kind: 'volume', quantityMilli: 2_000_000 },
      unit: 'liter',
      pricePerMeasureCents: 12_500,
    });
    expect(entries[1].measure).toBeNull();
  });
});

describe('collectCatalogBrands', () => {
  it('ordena por frecuencia y luego por nombre', () => {
    const brands = collectCatalogBrands([
      entry('1', 'Pan A', { brand: 'Bimbo' }),
      entry('2', 'Pan B', { brand: 'Zerca' }),
      entry('3', 'Pan C', { brand: 'Bimbo' }),
      entry('4', 'Pan D', { brand: 'Ala' }),
      entry('5', 'Pan E', { brand: null }),
    ]);

    expect(brands).toEqual(['Bimbo', 'Ala', 'Zerca']);
  });
});

describe('filterCatalogEntries', () => {
  const entries = [
    entry('1', 'Pan Blanco', {
      brand: 'Bimbo',
      presentation: 'Pan Blanco Grande 500 g',
    }),
    entry('2', 'Pan Integral', {
      brand: 'Zerca',
      presentation: 'Pan Integral 1 Lb',
    }),
    entry('3', 'Leche Entera', { brand: 'Rica', presentation: 'Leche 1 L' }),
  ];

  it('filtra por texto sin distinguir mayúsculas ni acentos', () => {
    expect(
      filterCatalogEntries(entries, { text: 'PAN', brand: null }).map(
        (item) => item.product.productId,
      ),
    ).toEqual(['1', '2']);
    expect(
      filterCatalogEntries(entries, { text: 'integral', brand: null }).map(
        (item) => item.product.productId,
      ),
    ).toEqual(['2']);
    expect(
      filterCatalogEntries(entries, { text: 'entera', brand: null }).map(
        (item) => item.product.productId,
      ),
    ).toEqual(['3']);
  });

  it('combina el texto con el filtro de marca', () => {
    expect(
      filterCatalogEntries(entries, { text: 'pan', brand: 'Zerca' }).map(
        (item) => item.product.productId,
      ),
    ).toEqual(['2']);
  });

  it('devuelve todo cuando no hay filtros', () => {
    expect(
      filterCatalogEntries(entries, { text: '  ', brand: null }),
    ).toHaveLength(3);
  });
});

describe('sortCatalogEntries', () => {
  const entries = [
    entry('1', 'Leche 2 L', { priceCents: 25_000 }),
    entry('2', 'Pan 500 g', { priceCents: 17_525 }),
    entry('3', 'Sin medida', { priceCents: 5_000 }),
    entry('4', 'Huevos 30 uds', { priceCents: 12_000 }),
  ];
  const withMeasures = buildCatalogEntries(
    entries.map((item) => item.product),
  );

  it('conserva el orden de relevancia', () => {
    expect(
      sortCatalogEntries(withMeasures, 'relevance').map(
        (item) => item.product.productId,
      ),
    ).toEqual(['1', '2', '3', '4']);
  });

  it('ordena por precio ascendente y descendente', () => {
    expect(
      sortCatalogEntries(withMeasures, 'price_asc').map(
        (item) => item.product.productId,
      ),
    ).toEqual(['3', '4', '2', '1']);
    expect(
      sortCatalogEntries(withMeasures, 'price_desc').map(
        (item) => item.product.productId,
      ),
    ).toEqual(['1', '2', '4', '3']);
  });

  it('agrupa por unidad y deja al final las presentaciones sin medida', () => {
    const sorted = sortCatalogEntries(withMeasures, 'measure_asc');

    expect(sorted.map((item) => item.product.productId)).toEqual([
      '2',
      '1',
      '4',
      '3',
    ]);
  });
});
