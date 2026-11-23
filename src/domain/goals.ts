import { monthIndex, monthKey, monthsRemaining, roundUp1000 } from './dates';
import { Goal, Transaction, live } from './types';

/** Average over the last `months` complete calendar months (today's month is excluded). */
export function averageMonthlyIncome(txs: Transaction[], today: string, months = 3): number {
  const current = monthIndex(today);
  const keys = new Set(Array.from({ length: months }, (_, i) => monthKey(current - 1 - i)));
  const total = live(txs)
    .filter((t) => t.type === 'income' && keys.has(t.date.slice(0, 7)))
    .reduce((s, t) => s + t.amount, 0);
  return Math.round(total / months);
}

export const affordableMonthly = (input: { avgIncome: number; monthlyBudgets: number; billSetAsides: number; otherGoals: number }): number =>
  Math.max(0, input.avgIncome - input.monthlyBudgets - input.billSetAsides - input.otherGoals);

export function goalPlan(goal: Goal, funded: number, today: string, affordable: number): { required: number | null; affordable: number; gap: number } {
  if (!goal.targetDate) return { required: null, affordable, gap: 0 };
  const required = roundUp1000(Math.max(0, goal.target - funded) / monthsRemaining(today, goal.targetDate));
  return { required, affordable, gap: Math.max(0, required - affordable) };
}
