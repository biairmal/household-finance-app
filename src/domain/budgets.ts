import { Budget, Transaction, live } from './types';

export function budgetUsage(
  budget: Budget,
  txs: Transaction[],
  monthKey: string,
): { spent: number; limit: number; ratio: number; status: 'ok' | 'warning' | 'over' } {
  const prefix = budget.period === 'yearly' ? monthKey.slice(0, 4) : monthKey;
  const spent = live(txs)
    .filter((t) => t.type === 'expense' && t.categoryId === budget.categoryId && t.date.startsWith(prefix))
    .reduce((s, t) => s + t.amount, 0);
  const limit = budget.amount;
  const ratio = limit > 0 ? spent / limit : spent > 0 ? Infinity : 0;
  const status = ratio > 1 ? 'over' : ratio >= 0.8 ? 'warning' : 'ok';
  return { spent, limit, ratio, status };
}
