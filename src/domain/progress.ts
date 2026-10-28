export interface Progress {
  total: number;
  checked: number;
  percentage: number;
  label: string;
}

export function progressLabel(total: number, checked: number): string {
  return `${checked} de ${total}`;
}

export function progressPercentage(total: number, checked: number): number {
  if (total <= 0) {
    return 0;
  }
  return Math.round((checked / total) * 100);
}

/** Construye el progreso a partir de dos contadores ya calculados. */
export function progressFromCounts(total: number, checked: number): Progress {
  return {
    total,
    checked,
    percentage: progressPercentage(total, checked),
    label: progressLabel(total, checked),
  };
}

export function computeProgress(
  items: readonly { isChecked: boolean }[],
): Progress {
  const total = items.length;
  const checked = items.reduce((count, item) => count + (item.isChecked ? 1 : 0), 0);
  return progressFromCounts(total, checked);
}
