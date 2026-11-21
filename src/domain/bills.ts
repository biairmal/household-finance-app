import { addMonthsClamped, daysBetween, monthIndex, monthsRemaining, roundUp1000 } from './dates';
import { Bill } from './types';

export { addMonthsClamped, daysBetween, monthsRemaining, roundUp1000 } from './dates';

const cycleMonths = (bill: Bill): number | null => {
  const r = bill.recurrence;
  return r.kind === 'once' ? null : r.kind === 'monthly' ? 1 : r.kind === 'yearly' ? 12 : r.n;
};

export function billPlan(
  bill: Bill,
  funded: number,
  today: string,
): { monthly: number; behindBy: number; overdue: boolean; daysOverdue: number; daysUntilDue: number } {
  const remaining = Math.max(0, bill.amount - funded);
  const untilDue = daysBetween(today, bill.dueDate);
  // Overdue means unpaid: paying advances dueDate (or sets paidAt for a one-off), whatever the funding.
  const overdue = untilDue < 0 && !bill.paidAt;

  // The pace starts at the later of creation and the current cycle's start, so a paid monthly bill starts fresh.
  const months = cycleMonths(bill);
  const cycleStart = months === null ? bill.createdAt : addMonthsClamped(bill.dueDate, -months);
  const start = cycleStart > bill.createdAt ? cycleStart : bill.createdAt;
  const base = roundUp1000(bill.amount / monthsRemaining(start, bill.dueDate));
  // Completed months only: this month's set-aside is "due this month", not "behind".
  const monthsElapsed = Math.max(0, monthIndex(today) - monthIndex(start));
  const behindBy = Math.min(remaining, Math.max(0, base * monthsElapsed - funded));

  return {
    monthly: roundUp1000(remaining / monthsRemaining(today, bill.dueDate)),
    behindBy,
    overdue,
    daysOverdue: overdue ? -untilDue : 0,
    daysUntilDue: Math.max(0, untilDue),
  };
}

// shortcut: steps from dueDate's own day, so a 31st bill drifts to the 30th after a short month; store an anchor day if that matters.
export function nextDueDate(bill: Bill): string | null {
  const months = cycleMonths(bill);
  return months === null ? null : addMonthsClamped(bill.dueDate, months);
}
