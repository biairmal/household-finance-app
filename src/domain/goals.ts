import { daysInMonthKey, monthIndex, monthKey, monthsRemaining, roundUp1000 } from './dates';
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

/** Ways to close a gap: the first month-end that makes it affordable, or the target reachable by the date. */
export function goalOptions(goal: Goal, funded: number, today: string, affordable: number): { extendTo: string | null; lowerTargetTo: number | null } {
  const left = Math.max(0, goal.target - funded);
  let extendTo: string | null = null;
  // Same rounding as goalPlan, so the chosen date really closes the gap.
  const step = Math.floor(affordable / 1000) * 1000;
  if (step > 0) {
    const n = Math.max(1, Math.ceil(left / step));
    const key = monthKey(monthIndex(today) + n);
    extendTo = `${key}-${String(daysInMonthKey(key)).padStart(2, '0')}`;
  }
  const lowerTargetTo = goal.targetDate
    ? Math.floor((funded + affordable * monthsRemaining(today, goal.targetDate)) / 100000) * 100000
    : null;
  return { extendTo, lowerTargetTo };
}
