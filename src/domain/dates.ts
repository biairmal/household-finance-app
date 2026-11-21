// All maths on Y/M/D integers parsed from 'YYYY-MM-DD'; Date.UTC is used only as a day counter.

const parse = (d: string): [number, number, number] => {
  const [y, m, day] = d.split('-').map(Number);
  return [y, m, day];
};

const pad = (n: number, w = 2) => String(n).padStart(w, '0');

/** Months since year 0; differences give calendar months between two dates. */
export const monthIndex = (d: string): number => {
  const [y, m] = parse(d);
  return y * 12 + (m - 1);
};

/** 'YYYY-MM' for a monthIndex. */
export const monthKey = (index: number): string => `${pad(Math.floor(index / 12), 4)}-${pad((index % 12) + 1)}`;

const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** b − a in days. */
export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = parse(a);
  const [by, bm, bd] = parse(b);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
}

/** Adds n months, clamping the day to the target month's end (31 Jan + 3 → 30 Apr). */
export function addMonthsClamped(date: string, n: number): string {
  const [, , d] = parse(date);
  const index = monthIndex(date) + n;
  const y = Math.floor(index / 12);
  const m = (index % 12) + 1;
  return `${pad(y, 4)}-${pad(m)}-${pad(Math.min(d, daysInMonth(y, m)))}`;
}

/** Calendar months from today's month to the due month, at least 1. */
export const monthsRemaining = (today: string, due: string): number => Math.max(1, monthIndex(due) - monthIndex(today));

export const roundUp1000 = (n: number): number => Math.ceil(n / 1000) * 1000;

const JAKARTA_OFFSET_MS = 7 * 3600000; // UTC+7, no DST

export const todayJakarta = (nowMs: number = Date.now()): string => new Date(nowMs + JAKARTA_OFFSET_MS).toISOString().slice(0, 10);

export const monthOf = (date: string): string => date.slice(0, 7);

export const addMonthsToKey = (key: string, n: number): string => monthKey(monthIndex(`${key}-01`) + n);

export const daysInMonthKey = (key: string): number => {
  const [y, m] = parse(`${key}-01`);
  return daysInMonth(y, m);
};
