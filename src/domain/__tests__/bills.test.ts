import { expect, test } from '@jest/globals';
import { addMonthsClamped, billPlan, daysBetween, monthsRemaining, nextDueDate, roundUp1000 } from '../bills';
import { Bill } from '../types';

const b: Bill = {
  id: 'b', name: 'Bill', amount: 100000, dueDate: '2026-12-01', recurrence: { kind: 'monthly' },
  funding: { kind: 'account', accountId: 'bca' }, reminderOffsetsDays: [3], createdAt: '2026-11-01',
};
const vehicle: Bill = { ...b, name: 'Vehicle tax', recurrence: { kind: 'yearly' }, funding: { kind: 'pocket', pocketId: 'vehicle' } };
const pln: Bill = { ...b, name: 'PLN' };

test('monthsRemaining', () => {
  expect(monthsRemaining('2026-11-20', '2027-05-15')).toBe(6);
  expect(monthsRemaining('2026-11-20', '2026-11-28')).toBe(1);
  expect(monthsRemaining('2026-11-20', '2026-11-18')).toBe(1);
  expect(monthsRemaining('2026-11-20', '2025-01-01')).toBe(1);
});

test('date helpers', () => {
  expect(daysBetween('2026-11-18', '2026-11-20')).toBe(2);
  expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1);
  expect(addMonthsClamped('2027-01-31', 1)).toBe('2027-02-28');
  expect(addMonthsClamped('2028-02-29', 12)).toBe('2029-02-28');
  expect(addMonthsClamped('2026-11-15', 2)).toBe('2027-01-15');
  expect(roundUp1000(466666.67)).toBe(467000);
  expect(roundUp1000(400000)).toBe(400000);
});

test('vehicle tax plan (spec example)', () => {
  const p = billPlan({ ...vehicle, amount: 3600000, dueDate: '2027-05-15', createdAt: '2026-08-10' }, 1200000, '2026-11-20');
  expect(p.monthly).toBe(400000);
  expect(p.overdue).toBe(false);
  expect(p.daysUntilDue).toBe(176);
});

test('behind schedule raises the monthly amount and reports the gap', () => {
  const p = billPlan({ ...vehicle, amount: 3600000, dueDate: '2027-05-15', createdAt: '2026-08-10' }, 800000, '2026-11-20');
  expect(p.behindBy).toBe(800000); // base 400.000 × 4 months (Aug–Nov) − 800.000
  expect(p.monthly).toBe(467000); // roundUp1000(2.800.000 / 6)
});

test('due this month: no divide by zero, no negatives', () => {
  const p = billPlan({ ...pln, amount: 650000, dueDate: '2026-11-28', createdAt: '2026-11-01' }, 700000, '2026-11-20');
  expect(p).toMatchObject({ monthly: 0, behindBy: 0, overdue: false, daysUntilDue: 8 });
});

test('overdue PLN', () => {
  const p = billPlan({ ...pln, amount: 650000, dueDate: '2026-11-18', createdAt: '2026-10-01' }, 0, '2026-11-20');
  expect(p).toMatchObject({ overdue: true, daysOverdue: 2, monthly: 650000, daysUntilDue: 0, behindBy: 650000 });
});

test('past due but fully funded is not overdue', () => {
  expect(billPlan({ ...pln, amount: 650000, dueDate: '2026-11-18' }, 650000, '2026-11-20').overdue).toBe(false);
});

test('next due dates', () => {
  expect(nextDueDate({ ...b, dueDate: '2027-05-15', recurrence: { kind: 'yearly' } })).toBe('2028-05-15');
  expect(nextDueDate({ ...b, dueDate: '2026-12-01', recurrence: { kind: 'monthly' } })).toBe('2027-01-01');
  expect(nextDueDate({ ...b, dueDate: '2026-01-31', recurrence: { kind: 'everyNMonths', n: 3 } })).toBe('2026-04-30');
  expect(nextDueDate({ ...b, recurrence: { kind: 'once' } })).toBeNull();
});
