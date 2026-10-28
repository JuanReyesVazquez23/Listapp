import {
  computeProgress,
  progressFromCounts,
  progressLabel,
  progressPercentage,
} from '@/domain/progress';

describe('progreso', () => {
  it('calcula total, marcados, porcentaje y etiqueta', () => {
    const items = [
      { isChecked: true },
      { isChecked: false },
      { isChecked: true },
      { isChecked: true },
    ];
    expect(computeProgress(items)).toEqual({
      total: 4,
      checked: 3,
      percentage: 75,
      label: '3 de 4',
    });
  });

  it('construye el progreso desde contadores ya calculados', () => {
    expect(progressFromCounts(10, 8)).toEqual({
      total: 10,
      checked: 8,
      percentage: 80,
      label: '8 de 10',
    });
  });

  it('devuelve 0 % con lista vacía', () => {
    expect(computeProgress([])).toEqual({
      total: 0,
      checked: 0,
      percentage: 0,
      label: '0 de 0',
    });
  });

  it('redondea el porcentaje al entero más cercano', () => {
    expect(progressPercentage(3, 2)).toBe(67);
    expect(progressLabel(12, 7)).toBe('7 de 12');
  });
});
