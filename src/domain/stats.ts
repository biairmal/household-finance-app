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

const lastMonths = (endMonth: string, months: number) => {
  const end = monthIndex(`${endMonth}-01`);
  return Array.from({ length: months }, (_, i) => monthKey(end - months + 1 + i));
};

/** Monthly spend in one category for the `months` months ending with `endMonth`. */
export function categoryTrend(txs: Transaction[], categoryId: string, endMonth: string, months = 12): { monthKey: string; amount: number }[] {
  const keys = lastMonths(endMonth, months);
  const sums = new Map(keys.map((k) => [k, 0]));
  for (const t of live(txs)) {
    const k = t.date.slice(0, 7);
    if (t.type === 'expense' && t.categoryId === categoryId && sums.has(k)) sums.set(k, sums.get(k)! + t.amount);
  }
  return keys.map((k) => ({ monthKey: k, amount: sums.get(k)! }));
}

export function incomeVsExpense(txs: Transaction[], endMonth: string, months = 12) {
  const rows = new Map(lastMonths(endMonth, months).map((k) => [k, { monthKey: k, income: 0, expense: 0, saved: 0, savingsRate: 0 }]));
  for (const t of live(txs)) {
    const r = rows.get(t.date.slice(0, 7));
    if (!r || t.type === 'transfer') continue;
    r[t.type] += t.amount;
  }
  return [...rows.values()].map((r) => ({ ...r, saved: r.income - r.expense, savingsRate: r.income > 0 ? (r.income - r.expense) / r.income : 0 }));
}

/** Biggest expense payees in a period (`prefix` is 'YYYY-MM' or 'YYYY'), grouped by normalised payee or note. */
export function topCounterparties(txs: Transaction[], prefix: string, limit = 5): { name: string; amount: number; count: number }[] {
  const groups = new Map<string, { name: string; amount: number; count: number }>();
  for (const t of live(txs)) {
    const name = (t.counterpartyName || t.note)?.trim().replace(/\s+/g, ' ');
    if (t.type !== 'expense' || !t.date.startsWith(prefix) || !name) continue;
    const key = name.toLowerCase();
    const g = groups.get(key) ?? { name, amount: 0, count: 0 };
    g.amount += t.amount;
    g.count += 1;
    groups.set(key, g);
  }
  return [...groups.values()].sort((a, b) => b.amount - a.amount).slice(0, limit);
}

export const budgetAdvice = (avg3: number, budget: number): 'too-low' | 'too-high' | 'ok' =>
  avg3 > budget * 1.1 ? 'too-low' : avg3 < budget * 0.7 ? 'too-high' : 'ok';
