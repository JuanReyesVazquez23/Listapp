import {
  formatHistoryRow,
  formatMonthGroup,
  formatPurchaseDetail,
  formatShortDate,
  monthKey,
  pad2,
  parseLocalDate,
  parseLocalTime,
  toLocalDateString,
  toLocalTimeString,
} from '@/domain/dates';

describe('fechas en español', () => {
  it('formatea la fila del historial', () => {
    expect(formatHistoryRow('2026-10-27', '18:42')).toBe('27 oct 2026 · 18:42');
  });

  it('formatea el detalle con día de la semana', () => {
    expect(formatPurchaseDetail('2026-10-27', '18:42')).toBe(
      'martes, 27 de octubre de 2026, 18:42',
    );
  });

  it('formatea el grupo por mes', () => {
    expect(formatMonthGroup('2026-10-27')).toBe('octubre 2026');
  });

  it('formatea una fecha corta', () => {
    expect(formatShortDate('2026-01-05')).toBe('05 ene 2026');
  });

  it('genera la clave de mes', () => {
    expect(monthKey('2026-10-27')).toBe('2026-10');
    expect(monthKey('2026-01-01')).toBe('2026-01');
  });

  it('valida fechas reales, incluido el año bisiesto', () => {
    expect(parseLocalDate('2024-02-29')).toEqual({ year: 2024, month: 2, day: 29 });
    expect(parseLocalDate('2026-02-29')).toBeNull();
    expect(parseLocalDate('2026-13-01')).toBeNull();
    expect(parseLocalDate('2026-1-1')).toBeNull();
  });

  it('valida horas de 00:00 a 23:59', () => {
    expect(parseLocalTime('00:00')).toEqual({ hours: 0, minutes: 0 });
    expect(parseLocalTime('23:59')).toEqual({ hours: 23, minutes: 59 });
    expect(parseLocalTime('24:00')).toBeNull();
    expect(parseLocalTime('18:60')).toBeNull();
  });

  it('devuelve cadena vacía con datos inválidos', () => {
    expect(formatHistoryRow('no-es-fecha', '18:42')).toBe('');
    expect(formatMonthGroup('2026-99-99')).toBe('');
  });

  it('captura componentes locales sin segundos', () => {
    const date = new Date(2026, 9, 27, 18, 42, 33);
    expect(toLocalDateString(date)).toBe('2026-10-27');
    expect(toLocalTimeString(date)).toBe('18:42');
  });

  it('rellena a dos dígitos', () => {
    expect(pad2(0)).toBe('00');
    expect(pad2(9)).toBe('09');
    expect(pad2(10)).toBe('10');
  });
});
