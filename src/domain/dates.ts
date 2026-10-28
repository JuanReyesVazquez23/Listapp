const MONTHS_SHORT = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
] as const;

const MONTHS_LONG = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const;

const WEEKDAYS = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
] as const;

export interface LocalDateParts {
  year: number;
  month: number;
  day: number;
}

export interface LocalTimeParts {
  hours: number;
  minutes: number;
}

export function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

export function toLocalDateString(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function toLocalTimeString(date: Date): string {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function parseLocalDate(value: string): LocalDateParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

export function parseLocalTime(value: string): LocalTimeParts | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) {
    return null;
  }
  return { hours: Number(match[1]), minutes: Number(match[2]) };
}

/** "27 oct 2026" */
export function formatShortDate(localDate: string): string {
  const date = parseLocalDate(localDate);
  if (!date) {
    return '';
  }
  return `${pad2(date.day)} ${MONTHS_SHORT[date.month - 1]} ${date.year}`;
}

/** "27 oct 2026 · 18:42" */
export function formatHistoryRow(localDate: string, localTime: string): string {
  const date = parseLocalDate(localDate);
  const time = parseLocalTime(localTime);
  if (!date) {
    return '';
  }
  const base = formatShortDate(localDate);
  return time ? `${base} · ${localTime}` : base;
}

/** "martes, 27 de octubre de 2026, 18:42" */
export function formatPurchaseDetail(localDate: string, localTime: string): string {
  const date = parseLocalDate(localDate);
  const time = parseLocalTime(localTime);
  if (!date) {
    return '';
  }

  const weekday = WEEKDAYS[weekdayIndex(date)];
  const base = `${weekday}, ${date.day} de ${MONTHS_LONG[date.month - 1]} de ${date.year}`;
  return time ? `${base}, ${localTime}` : base;
}

/** "octubre 2026" */
export function formatMonthGroup(localDate: string): string {
  const date = parseLocalDate(localDate);
  if (!date) {
    return '';
  }
  return `${MONTHS_LONG[date.month - 1]} ${date.year}`;
}

/** Clave estable para agrupar por mes: "2026-10". */
export function monthKey(localDate: string): string {
  const date = parseLocalDate(localDate);
  if (!date) {
    return '';
  }
  return `${date.year}-${pad2(date.month)}`;
}

function weekdayIndex(date: LocalDateParts): number {
  return new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay();
}
