import { monthIndex, monthKey } from './dates';
import { Transaction, live } from './types';

const round1000 = (n: number) => Math.round(n / 1000) * 1000;

/** Average monthly spend in a category over the 3 and 12 complete months before `endMonth` ('YYYY-MM'). */
export function categoryAverages(txs: Transaction[], categoryId: string, endMonth: string): { avg3: number; avg12: number } {
  const end = monthIndex(`${endMonth}-01`);
  const byMonth = new Map<string, number>();
  for (const t of live(txs)) {
    if (t.type !== 'expense' || t.categoryId !== categoryId) continue;
    const k = t.date.slice(0, 7);
    byMonth.set(k, (byMonth.get(k) ?? 0) + t.amount);
  }
  const sum = (n: number) => Array.from({ length: n }, (_, i) => byMonth.get(monthKey(end - 1 - i)) ?? 0).reduce((a, b) => a + b, 0);
  return { avg3: round1000(sum(3) / 3), avg12: round1000(sum(12) / 12) };
}
