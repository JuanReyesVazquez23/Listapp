import {
  formatCents,
  formatCentsForInput,
  lineSubtotalCents,
  parseAmountToCents,
} from '@/domain/money';

describe('formato de dinero', () => {
  it('formatea céntimos con separador de miles y dos decimales', () => {
    expect(formatCents(0)).toBe('RD$0.00');
    expect(formatCents(1)).toBe('RD$0.01');
    expect(formatCents(123456)).toBe('RD$1,234.56');
    expect(formatCents(9_999_999)).toBe('RD$99,999.99');
  });

  it('formatea para editar sin separador de miles', () => {
    expect(formatCentsForInput(1)).toBe('0.01');
    expect(formatCentsForInput(123456)).toBe('1234.56');
    expect(formatCentsForInput(9_999_999)).toBe('99999.99');
  });
});

describe('parseAmountToCents', () => {
  it('exige un importe', () => {
    expect(parseAmountToCents('')).toEqual({ ok: false, reason: 'required' });
    expect(parseAmountToCents('   ')).toEqual({ ok: false, reason: 'required' });
  });

  it('rechaza texto, signos, separador de miles y más de dos decimales', () => {
    expect(parseAmountToCents('abc')).toEqual({ ok: false, reason: 'invalid' });
    expect(parseAmountToCents('-1')).toEqual({ ok: false, reason: 'invalid' });
    expect(parseAmountToCents('1.234')).toEqual({ ok: false, reason: 'invalid' });
    expect(parseAmountToCents('1,234.56')).toEqual({ ok: false, reason: 'invalid' });
  });

  it('rechaza el cero, porque un precio válido es mayor que cero', () => {
    expect(parseAmountToCents('0')).toEqual({ ok: false, reason: 'invalid' });
    expect(parseAmountToCents('0.00')).toEqual({ ok: false, reason: 'invalid' });
  });

  it('acepta prefijo de moneda y coma decimal', () => {
    expect(parseAmountToCents('RD$1234.56')).toEqual({ ok: true, value: 123456 });
    expect(parseAmountToCents('1234,56')).toEqual({ ok: true, value: 123456 });
    expect(parseAmountToCents('$1234.56')).toEqual({ ok: true, value: 123456 });
  });

  it('aplica el máximo de precio unitario', () => {
    expect(parseAmountToCents('99999.99')).toEqual({ ok: true, value: 9_999_999 });
    expect(parseAmountToCents('100000')).toEqual({ ok: false, reason: 'too_large' });
  });

  it('hace ida y vuelta con el formato editable', () => {
    for (const cents of [1, 99, 100, 123_456, 9_999_999]) {
      expect(parseAmountToCents(formatCentsForInput(cents))).toEqual({
        ok: true,
        value: cents,
      });
    }
  });
});

describe('lineSubtotalCents', () => {
  it('redondea una sola vez, con el empate hacia arriba', () => {
    expect(lineSubtotalCents(1500, 117)).toBe(176);
    expect(lineSubtotalCents(1000, 25000)).toBe(25000);
    expect(lineSubtotalCents(2500, 17500)).toBe(43750);
    expect(lineSubtotalCents(1, 1)).toBe(0);
    expect(lineSubtotalCents(999_999, 9_999_999)).toBe(9_999_989_000);
  });
});
