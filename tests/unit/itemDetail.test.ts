import {
  ITEM_DETAIL_LIMITS,
  itemDetailFromInput,
  validateItemDetail,
  type ItemDetailDraft,
} from '@/domain/item';

const validDraft: ItemDetailDraft = {
  brand: '',
  quantity: '1.5',
  unit: 'kilogram',
  unitPrice: '175.00',
};

describe('validateItemDetail', () => {
  it('acepta un borrador válido y normaliza los opcionales', () => {
    expect(validateItemDetail(validDraft)).toEqual({
      ok: true,
      value: {
        brand: null,
        quantityMilli: 1500,
        unit: 'kilogram',
        unitPriceCents: 17500,
        catalogProductId: null,
      },
    });
  });

  it('recorta la marca y descarta la vacía', () => {
    expect(validateItemDetail({ ...validDraft, brand: '  Wala  ' })).toEqual({
      ok: true,
      value: {
        brand: 'Wala',
        quantityMilli: 1500,
        unit: 'kilogram',
        unitPriceCents: 17500,
        catalogProductId: null,
      },
    });
  });

  it('acepta una marca de 60 caracteres y rechaza 61', () => {
    expect(
      validateItemDetail({ ...validDraft, brand: 'a'.repeat(ITEM_DETAIL_LIMITS.brand) }).ok,
    ).toBe(true);

    expect(
      validateItemDetail({
        ...validDraft,
        brand: 'a'.repeat(ITEM_DETAIL_LIMITS.brand + 1),
      }),
    ).toEqual({ ok: false, failures: [{ field: 'brand', reason: 'too_long' }] });
  });

  it('rechaza una cantidad y un precio inválidos a la vez', () => {
    expect(
      validateItemDetail({ ...validDraft, quantity: '0', unitPrice: 'abc' }),
    ).toEqual({
      ok: false,
      failures: [
        { field: 'quantity', reason: 'invalid' },
        { field: 'price', reason: 'invalid' },
      ],
    });
  });

  it('rechaza una cantidad cero y un precio por encima del máximo', () => {
    expect(
      validateItemDetail({ ...validDraft, quantity: '0.000', unitPrice: '100000' }),
    ).toEqual({
      ok: false,
      failures: [
        { field: 'quantity', reason: 'invalid' },
        { field: 'price', reason: 'too_large' },
      ],
    });
  });

  it('rechaza una unidad desconocida', () => {
    const draft: ItemDetailDraft = { ...validDraft };
    // Simula una unidad que llega sin validar desde un borrador antiguo: la UI
    // solo ofrece las cuatro unidades conocidas, pero el validador es frontera.
    Object.assign(draft, { unit: 'oz' });

    expect(validateItemDetail(draft)).toEqual({
      ok: false,
      failures: [{ field: 'unit', reason: 'required' }],
    });
  });

  it('acepta un identificador de catálogo de 40 caracteres y rechaza 41', () => {
    const productId = 'p'.repeat(ITEM_DETAIL_LIMITS.catalogProductId);
    expect(validateItemDetail(validDraft, productId)).toEqual({
      ok: true,
      value: {
        brand: null,
        quantityMilli: 1500,
        unit: 'kilogram',
        unitPriceCents: 17500,
        catalogProductId: productId,
      },
    });

    expect(validateItemDetail(validDraft, productId + 'p')).toEqual({
      ok: false,
      failures: [{ field: 'catalogProductId', reason: 'too_long' }],
    });
  });
});

describe('itemDetailFromInput', () => {
  it('calcula el subtotal de la línea con un único redondeo', () => {
    expect(
      itemDetailFromInput({
        brand: 'Wala',
        quantityMilli: 1500,
        unit: 'kilogram',
        unitPriceCents: 117,
        catalogProductId: 'sku-1',
      }),
    ).toEqual({
      brand: 'Wala',
      quantityMilli: 1500,
      unit: 'kilogram',
      unitPriceCents: 117,
      lineSubtotalCents: 176,
      catalogProductId: 'sku-1',
    });
  });
});
