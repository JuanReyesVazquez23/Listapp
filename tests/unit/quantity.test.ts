import {
  QUANTITY_UNITS,
  formatQuantityNumber,
  isQuantityUnit,
  parseQuantityToMilli,
} from '@/domain/quantity';

describe('unidades de cantidad', () => {
  it('reconoce las cuatro unidades del modelo', () => {
    expect(QUANTITY_UNITS).toEqual(['unit', 'pound', 'kilogram', 'liter']);
    expect(isQuantityUnit('unit')).toBe(true);
    expect(isQuantityUnit('pound')).toBe(true);
    expect(isQuantityUnit('kilogram')).toBe(true);
    expect(isQuantityUnit('liter')).toBe(true);
    expect(isQuantityUnit('oz')).toBe(false);
    expect(isQuantityUnit('')).toBe(false);
  });
});

describe('parseQuantityToMilli', () => {
  it('exige una cantidad', () => {
    expect(parseQuantityToMilli('')).toEqual({ ok: false, reason: 'required' });
    expect(parseQuantityToMilli('   ')).toEqual({ ok: false, reason: 'required' });
  });

  it('rechaza cero', () => {
    expect(parseQuantityToMilli('0')).toEqual({ ok: false, reason: 'invalid' });
    expect(parseQuantityToMilli('0.000')).toEqual({ ok: false, reason: 'invalid' });
  });

  it('acepta coma o punto con hasta tres decimales', () => {
    expect(parseQuantityToMilli('1.234')).toEqual({ ok: true, value: 1234 });
    expect(parseQuantityToMilli('1,5')).toEqual({ ok: true, value: 1500 });
    expect(parseQuantityToMilli('999.999')).toEqual({ ok: true, value: 999_999 });
  });

  it('rechaza más de tres decimales', () => {
    expect(parseQuantityToMilli('1.2345')).toEqual({ ok: false, reason: 'invalid' });
  });

  it('aplica el máximo de milésimas', () => {
    expect(parseQuantityToMilli('1000')).toEqual({ ok: false, reason: 'too_large' });
  });
});

describe('formatQuantityNumber', () => {
  it('quita ceros sobrantes y usa punto decimal', () => {
    expect(formatQuantityNumber(1)).toBe('0.001');
    expect(formatQuantityNumber(1000)).toBe('1');
    expect(formatQuantityNumber(1500)).toBe('1.5');
    expect(formatQuantityNumber(123456)).toBe('123.456');
  });

  it('hace ida y vuelta con el parser', () => {
    for (const milli of [1, 10, 100, 500, 1000, 1500, 123_456, 999_999]) {
      expect(parseQuantityToMilli(formatQuantityNumber(milli))).toEqual({
        ok: true,
        value: milli,
      });
    }
  });
});
