const MINUS = '−';

// Hand-rolled grouping: Hermes on Android ships incomplete Intl locale data.
const group = (n: number) => String(Math.abs(Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const sign = (n: number) => (Math.round(n) < 0 ? MINUS : '');

export const formatAmount = (n: number): string => sign(n) + group(n);

export const formatIDR = (n: number): string => `${sign(n)}Rp ${group(n)}`;

export function formatCompact(n: number): string {
  const a = Math.abs(n);
  const one = (v: number, unit: string) => sign(n) + String(Math.round(v * 10) / 10).replace('.', ',') + unit;
  if (a >= 1e9) return one(a / 1e9, 'M');
  if (a >= 1e6) return one(a / 1e6, 'jt');
  if (a >= 1e3) return one(a / 1e3, 'rb');
  return sign(n) + String(Math.round(a));
}
