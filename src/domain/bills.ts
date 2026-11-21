import { addMonthsClamped, daysBetween, monthIndex, monthsRemaining, roundUp1000 } from './dates';
import { Bill } from './types';

export { addMonthsClamped, daysBetween, monthsRemaining, roundUp1000 } from './dates';

export function billPlan(
  bill: Bill,
  funded: number,
  today: string,
): { monthly: number; behindBy: number; overdue: boolean; daysOverdue: number; daysUntilDue: number } {
  const remaining = Math.max(0, bill.amount - funded);
  const untilDue = daysBetween(today, bill.dueDate);
  const overdue = untilDue < 0 && funded < bill.amount;

  // On-schedule pace from creation, and how far funding trails it (months counted inclusive of today's).
  const base = roundUp1000(bill.amount / monthsRemaining(bill.createdAt, bill.dueDate));
  const monthsElapsed = Math.max(1, monthIndex(today) - monthIndex(bill.createdAt) + 1);
  const behindBy = Math.min(remaining, Math.max(0, base * monthsElapsed - funded));

  return {
    monthly: overdue ? remaining : roundUp1000(remaining / monthsRemaining(today, bill.dueDate)),
    behindBy,
    overdue,
    daysOverdue: overdue ? -untilDue : 0,
    daysUntilDue: Math.max(0, untilDue),
  };
}

// shortcut: steps from dueDate's own day, so a 31st bill drifts to the 30th after a short month; store an anchor day if that matters.
export function nextDueDate(bill: Bill): string | null {
  const r = bill.recurrence;
  if (r.kind === 'once') return null;
  const months = r.kind === 'monthly' ? 1 : r.kind === 'yearly' ? 12 : r.n;
  return addMonthsClamped(bill.dueDate, months);
}
