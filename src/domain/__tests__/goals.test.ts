import { expect, test } from '@jest/globals';
import { affordableMonthly, averageMonthlyIncome, goalPlan } from '../goals';
import { Goal } from '../types';
import { t } from '../__fixtures__/tx';

const bali: Goal = { id: 'bali', name: 'Bali', target: 15000000, targetDate: '2027-06-30', funding: { kind: 'pocket', pocketId: 'bali' } };

test('Bali plan and gap (spec example)', () => {
  const affordable = affordableMonthly({ avgIncome: 15000000, monthlyBudgets: 9000000, billSetAsides: 4400000, otherGoals: 500000 });
  expect(affordable).toBe(1100000);
  expect(goalPlan(bali, 4500000, '2026-11-20', affordable)).toEqual({ required: 1500000, affordable: 1100000, gap: 400000 });
});

test('affordable is floored at 0', () => {
  expect(affordableMonthly({ avgIncome: 5000000, monthlyBudgets: 9000000, billSetAsides: 0, otherGoals: 0 })).toBe(0);
});

test('goal without a date', () => {
  expect(goalPlan({ ...bali, targetDate: undefined }, 0, '2026-11-20', 1000)).toEqual({ required: null, affordable: 1000, gap: 0 });
});

test('fully funded goal needs nothing', () => {
  expect(goalPlan(bali, 16000000, '2026-11-20', 0)).toMatchObject({ required: 0, gap: 0 });
});

test('averageMonthlyIncome excludes the incomplete month', () => {
  const salary = (date: string) => t({ type: 'income', amount: 12000000, date });
  const txs = [
    salary('2026-08-25'), salary('2026-09-25'), salary('2026-10-25'), salary('2026-11-15'),
    salary('2026-07-25'),
    t({ type: 'income', amount: 5000000, date: '2026-10-01', deletedAt: '2026-10-02' }),
    t({ type: 'transfer', amount: 5000000, date: '2026-10-01', toAccountId: 'jago' }),
  ];
  expect(averageMonthlyIncome(txs, '2026-11-20')).toBe(12000000);
  expect(averageMonthlyIncome([salary('2026-12-25')], '2027-01-05', 1)).toBe(12000000);
});
