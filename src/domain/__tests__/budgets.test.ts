import { expect, test } from '@jest/globals';
import { budgetUsage } from '../budgets';
import { Budget } from '../types';
import { t } from '../__fixtures__/tx';

const monthly = (categoryId: string, amount: number): Budget => ({ id: categoryId, categoryId, period: 'monthly', amount });
const spend = (categoryId: string, amount: number, date = '2026-11-10') => t({ categoryId, amount, date });

test('spec November figures', () => {
  const g = budgetUsage(monthly('groceries', 3000000), [spend('groceries', 2100000)], '2026-11');
  expect(g.status).toBe('ok');
  expect(g.ratio).toBeCloseTo(0.7);
  expect(g.spent).toBe(2100000);
  expect(budgetUsage(monthly('transport', 800000), [spend('transport', 760000)], '2026-11').status).toBe('warning');
  expect(budgetUsage(monthly('eating', 1000000), [spend('eating', 1150000)], '2026-11').status).toBe('over');
});

test('boundaries: 0.8 and 1.0 are warning', () => {
  expect(budgetUsage(monthly('x', 1000000), [spend('x', 800000)], '2026-11')).toMatchObject({ ratio: 0.8, status: 'warning' });
  expect(budgetUsage(monthly('x', 1000000), [spend('x', 1000000)], '2026-11')).toMatchObject({ ratio: 1, status: 'warning' });
});

test('only this month, this category, live expenses', () => {
  const txs = [
    spend('x', 100000),
    spend('x', 500000, '2026-10-31'),
    spend('y', 500000),
    spend('x', 900000, '2026-11-12'),
    t({ categoryId: 'x', amount: 700000, deletedAt: '2026-11-13' }),
    t({ categoryId: 'x', amount: 300000, type: 'income' }),
  ];
  txs[3].deletedAt = '2026-11-13';
  expect(budgetUsage(monthly('x', 1000000), txs, '2026-11').spent).toBe(100000);
});

test('yearly budget sums January to November', () => {
  const holidays: Budget = { id: 'h', categoryId: 'holidays', period: 'yearly', amount: 10000000 };
  const txs = [spend('holidays', 3000000, '2026-01-05'), spend('holidays', 4000000, '2026-11-02'), spend('holidays', 9000000, '2025-12-30')];
  expect(budgetUsage(holidays, txs, '2026-11')).toMatchObject({ spent: 7000000, ratio: 0.7, status: 'ok' });
});
