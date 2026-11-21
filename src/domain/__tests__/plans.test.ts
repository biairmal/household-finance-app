import { expect, test } from '@jest/globals';
import { goalOptions } from '../goals';
import { billMonth, goalMonth, plansSummary, PlanCtx } from '../plans';
import { Account, Allocation, Bill, Goal, Pocket } from '../types';
import { t } from '../__fixtures__/tx';

const TODAY = '2026-11-20';
const accounts: Account[] = [
  { id: 'bca', name: 'BCA', type: 'bank', currency: 'IDR', openingBalance: 6100000 },
  { id: 'jago', name: 'Jago', type: 'savings', currency: 'IDR', openingBalance: 20000000 },
];
const pockets: Pocket[] = [
  { id: 'vehicle', accountId: 'jago', name: 'Vehicle tax' },
  { id: 'rent', accountId: 'jago', name: 'Rent' },
  { id: 'bali', accountId: 'jago', name: 'Bali' },
];
const alloc = (id: string, pocketId: string, amount: number, date: string): Allocation => ({ id, pocketId, amount, date, authorId: 'b' });
const allocations: Allocation[] = [
  alloc('v1', 'vehicle', 400000, '2026-08-25'), alloc('v2', 'vehicle', 400000, '2026-09-25'), alloc('v3', 'vehicle', 400000, '2026-10-25'),
  alloc('r1', 'rent', 4000000, '2026-11-01'),
  alloc('b1', 'bali', 4500000, '2026-10-01'),
];
const ctx: PlanCtx = { accounts, pockets, allocations, txs: [] };

const bill = (p: Partial<Bill>): Bill => ({
  id: 'x', name: 'x', amount: 0, dueDate: TODAY, recurrence: { kind: 'monthly' },
  funding: { kind: 'account', accountId: 'bca' }, reminderOffsetsDays: [7, 1, 0], createdAt: '2026-11-01', ...p,
});
const vehicle = bill({ id: 'vehicle', amount: 3600000, dueDate: '2027-05-15', recurrence: { kind: 'yearly' }, funding: { kind: 'pocket', pocketId: 'vehicle' }, createdAt: '2026-08-10' });
const rent = bill({ id: 'rent', amount: 4000000, dueDate: '2026-12-01', funding: { kind: 'pocket', pocketId: 'rent' } });
const pln = bill({ id: 'pln', amount: 650000, dueDate: '2026-11-18', createdAt: '2026-10-18' });
const bali: Goal = { id: 'bali', name: 'Bali', target: 15000000, targetDate: '2027-06-30', funding: { kind: 'pocket', pocketId: 'bali' } };

test('set-aside done this month does not shrink the target', () => {
  expect(billMonth(vehicle, ctx, TODAY)).toMatchObject({ funded: 1200000, setAside: 0, done: false, plan: { monthly: 400000, behindBy: 0 } });
  const after = { ...ctx, allocations: [...allocations, alloc('v4', 'vehicle', 400000, '2026-11-20')] };
  expect(billMonth(vehicle, after, TODAY)).toMatchObject({ funded: 1600000, setAside: 400000, done: true, plan: { monthly: 400000 } });
});

test('rent funded this month is done', () => {
  expect(billMonth(rent, ctx, TODAY)).toMatchObject({ setAside: 4000000, done: true, plan: { monthly: 4000000 } });
});

test('account funding: set-aside is transfers into the account this month', () => {
  const txs = [
    t({ type: 'transfer', accountId: 'bca', toAccountId: 'jago', amount: 500000, date: '2026-11-03' }),
    t({ type: 'income', accountId: 'jago', amount: 100, date: '2026-11-03' }),
  ];
  const g: Goal = { ...bali, funding: { kind: 'account', accountId: 'jago' } };
  expect(goalMonth(g, { ...ctx, txs }, TODAY, 0)).toMatchObject({ funded: 20500100, setAside: 500000 });
});

test('PLN unpaid past its date is overdue even when funded, and left out of the monthly bills', () => {
  const plnPocket = bill({ ...pln, funding: { kind: 'pocket', pocketId: 'pln' } });
  const c = {
    ...ctx,
    pockets: [...pockets, { id: 'pln', accountId: 'jago', name: 'PLN' }],
    allocations: [...allocations, alloc('p1', 'pln', 650000, '2026-10-20')],
  };
  expect(billMonth(plnPocket, c, TODAY).plan).toMatchObject({ overdue: true, daysOverdue: 2 });
  const s = plansSummary([vehicle, rent, plnPocket], [], c, TODAY, 14500000, 9000000);
  expect(s.overdue.map((b) => b.id)).toEqual(['pln']);
  expect(s.billsMonthly).toBe(4400000);
});

test('plans summary spec numbers', () => {
  const s = plansSummary([vehicle, rent, pln], [bali], ctx, TODAY, 14500000, 9000000);
  expect(s).toMatchObject({ billsMonthly: 4400000, goalsMonthly: 1500000, total: 5900000, doneCount: 1, itemCount: 3 });
  expect(s.overdue.map((b) => b.id)).toEqual(['pln']);
  expect(s.affordable.bali).toBe(1100000);
});

test('deleted bills and goals are ignored', () => {
  const s = plansSummary([{ ...vehicle, deletedAt: 'x' }], [{ ...bali, deletedAt: 'x' }], ctx, TODAY, 0, 0);
  expect(s).toMatchObject({ total: 0, itemCount: 0 });
});

test('goal options for Bali', () => {
  expect(goalOptions(bali, 4500000, TODAY, 1100000)).toEqual({ extendTo: '2027-09-30', lowerTargetTo: 12200000 });
  expect(goalOptions(bali, 4500000, TODAY, 0)).toEqual({ extendTo: null, lowerTargetTo: 4500000 });
});
