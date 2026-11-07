import {
  computePricePerMeasure,
  getCatalogMeasure,
  parseProductMeasure,
} from '@/domain/catalogMeasure';

describe('parseProductMeasure', () => {
  it('lee el peso en gramos, kilos y libras', () => {
    expect(parseProductMeasure('Sardinas Aceite Zerca 125 Gr')).toEqual({
      kind: 'weight',
      quantityMilli: 125_000,
    });
    expect(parseProductMeasure('Arroz Dos Pinos Saco 20 Lb')).toEqual({
      kind: 'weight',
      quantityMilli: Math.round(20 * 453.59237 * 1000),
    });
    expect(parseProductMeasure('Café 2 kg')).toEqual({
      kind: 'weight',
      quantityMilli: 2_000_000,
    });
  });

  it('no confunde `kg` con `g` ni `lt` con `l`', () => {
    expect(parseProductMeasure('Azúcar 1 kgs')).toEqual({
      kind: 'weight',
      quantityMilli: 1_000_000,
    });
    expect(parseProductMeasure('Aceite 3 lts')).toEqual({
      kind: 'volume',
      quantityMilli: 3_000_000,
    });
  });

  it('lee el volumen en litros y mililitros', () => {
    expect(parseProductMeasure('Leche Entera 2 L')).toEqual({
      kind: 'volume',
      quantityMilli: 2_000_000,
    });
    expect(parseProductMeasure('Refresco 1,5 litros')).toEqual({
      kind: 'volume',
      quantityMilli: 1_500_000,
    });
    expect(parseProductMeasure('Jugo 750 ml')).toEqual({
      kind: 'volume',
      quantityMilli: 750_000,
    });
  });

  it('lee el conteo de unidades', () => {
    expect(parseProductMeasure('Huevos 30 und')).toEqual({
      kind: 'count',
      quantityMilli: 30_000,
    });
    expect(parseProductMeasure('Croissants 6 Uds.')).toEqual({
      kind: 'count',
      quantityMilli: 6_000,
    });
  });

  it('se queda con la última medida del texto', () => {
    expect(parseProductMeasure('Sardinas 125 g Pack 6 uds')).toEqual({
      kind: 'count',
      quantityMilli: 6_000,
    });
  });

  it('devuelve null si no hay medida o el texto está vacío', () => {
    expect(parseProductMeasure('Pan Blanco')).toBeNull();
    expect(parseProductMeasure('   ')).toBeNull();
    expect(parseProductMeasure('Sardinas 0 g')).toBeNull();
  });
});

describe('computePricePerMeasure', () => {
  it('calcula el precio por libra', () => {
    expect(
      computePricePerMeasure(17_525, { kind: 'weight', quantityMilli: 500_000 }),
    ).toBe(15_898);
  });

  it('calcula el precio por litro', () => {
    expect(
      computePricePerMeasure(25_000, { kind: 'volume', quantityMilli: 2_000_000 }),
    ).toBe(12_500);
  });

  it('calcula el precio por unidad', () => {
    expect(
      computePricePerMeasure(12_000, { kind: 'count', quantityMilli: 6_000 }),
    ).toBe(2_000);
  });

  it('rechaza precios y cantidades no válidas', () => {
    expect(
      computePricePerMeasure(0, { kind: 'weight', quantityMilli: 500_000 }),
    ).toBeNull();
    expect(
      computePricePerMeasure(-100, { kind: 'weight', quantityMilli: 500_000 }),
    ).toBeNull();
    expect(
      computePricePerMeasure(100, { kind: 'weight', quantityMilli: 0 }),
    ).toBeNull();
  });
});

describe('getCatalogMeasure', () => {
  it('combina nombre y presentación para encontrar la medida', () => {
    const result = getCatalogMeasure({
      name: 'Leche Entera',
      presentation: 'Leche Entera 1 L',
      priceCents: 9_500,
    });

    expect(result).toEqual({
      measure: { kind: 'volume', quantityMilli: 1_000_000 },
      unit: 'liter',
      pricePerMeasureCents: 9_500,
    });
  });

  it('devuelve null si la presentación no declara tamaño', () => {
    expect(
      getCatalogMeasure({
        name: 'Pan Blanco',
        presentation: null,
        priceCents: 17_525,
      }),
    ).toBeNull();
  });
});
