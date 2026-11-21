import { expect, test } from '@jest/globals';
import { budgetAdvice, categoryAverages, categoryTrend, incomeVsExpense, topCounterparties } from '../stats';
import { t } from '../__fixtures__/tx';

test('categoryAverages uses complete months before endMonth, rounded to Rp 1.000', () => {
  const txs = [
    t({ categoryId: 'eat', amount: 1200000, date: '2026-08-10' }),
    t({ categoryId: 'eat', amount: 1000000, date: '2026-09-10' }),
    t({ categoryId: 'eat', amount: 1400500, date: '2026-10-10' }),
    t({ categoryId: 'eat', amount: 9999999, date: '2026-11-10' }), // endMonth itself: excluded
    t({ categoryId: 'eat', amount: 500000, date: '2026-10-11', deletedAt: 'x' }),
    t({ categoryId: 'eat', amount: 500000, date: '2026-10-11', type: 'transfer', toAccountId: 'jago' }),
    t({ categoryId: 'other', amount: 500000, date: '2026-10-11' }),
  ];
  expect(categoryAverages(txs, 'eat', '2026-11')).toEqual({ avg3: 1200000, avg12: 300000 });
});

test('categoryTrend gives 12 months ending at endMonth, zero for an empty month', () => {
  const txs = [
    t({ categoryId: 'eat', amount: 100000, date: '2025-12-05' }),
    t({ categoryId: 'eat', amount: 300000, date: '2026-11-05' }),
    t({ categoryId: 'eat', amount: 200000, date: '2026-09-05' }),
    t({ categoryId: 'eat', amount: 50000, date: '2026-09-06', deletedAt: 'x' }),
    t({ categoryId: 'eat', amount: 70000, date: '2025-11-30' }), // 13 months back: outside
  ];
  const trend = categoryTrend(txs, 'eat', '2026-11');
  expect(trend).toHaveLength(12);
  expect(trend[0]).toEqual({ monthKey: '2025-12', amount: 100000 });
  expect(trend[9]).toEqual({ monthKey: '2026-09', amount: 200000 });
  expect(trend[10]).toEqual({ monthKey: '2026-10', amount: 0 });
  expect(trend[11]).toEqual({ monthKey: '2026-11', amount: 300000 });
});

test('incomeVsExpense: saved and savings rate per month; rate 0 without income; transfers never count', () => {
  const txs = [
    t({ type: 'income', amount: 10000000, date: '2026-10-01' }),
    t({ amount: 7500000, date: '2026-10-02' }),
    t({ amount: 400000, date: '2026-11-02' }),
    t({ type: 'transfer', amount: 999000, date: '2026-11-03', toAccountId: 'jago' }),
  ];
  const rows = incomeVsExpense(txs, '2026-11', 2);
  expect(rows).toEqual([
    { monthKey: '2026-10', income: 10000000, expense: 7500000, saved: 2500000, savingsRate: 0.25 },
    { monthKey: '2026-11', income: 0, expense: 400000, saved: -400000, savingsRate: 0 },
  ]);
});

test('topCounterparties ranks expenses by amount, grouping names case- and space-insensitively', () => {
  const txs = [
    t({ counterpartyName: 'Indomaret Kemang', amount: 86500, date: '2026-11-18' }),
    t({ counterpartyName: 'indomaret  kemang ', amount: 50000, date: '2026-11-10' }),
    t({ counterpartyName: 'Pertamina', amount: 120000, date: '2026-11-11' }),
    t({ note: 'Grab ride', amount: 24000, date: '2026-11-20' }),
    t({ counterpartyName: 'Big Shop', amount: 900000, date: '2026-11-12', deletedAt: 'x' }),
    t({ counterpartyName: 'PT Maju Jaya', type: 'income', amount: 12000000, date: '2026-11-15' }),
    t({ counterpartyName: 'Indomaret Kemang', amount: 10000, date: '2026-10-30' }), // other month
  ];
  expect(topCounterparties(txs, '2026-11')).toEqual([
    { name: 'Indomaret Kemang', amount: 136500, count: 2 },
    { name: 'Pertamina', amount: 120000, count: 1 },
    { name: 'Grab ride', amount: 24000, count: 1 },
  ]);
  expect(topCounterparties(txs, '2026', 1)).toEqual([{ name: 'Indomaret Kemang', amount: 146500, count: 3 }]);
});

test('budgetAdvice: too-low above 110%, too-high below 70%', () => {
  expect(budgetAdvice(1110000, 1000000)).toBe('too-low');
  expect(budgetAdvice(1100000, 1000000)).toBe('ok');
  expect(budgetAdvice(700000, 1000000)).toBe('ok');
  expect(budgetAdvice(690000, 1000000)).toBe('too-high');
});
