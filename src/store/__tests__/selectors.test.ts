import { expect, test } from '@jest/globals';
import { Op, State, applyOps } from '../../domain/sync/ops';
import { Category } from '../../domain/types';
import { sampleOps } from '../sample';
import {
  accountRows, budgetHint, categories, categorySpend, dayGroups, homeSummary, plansView, recentlyDeleted, suggestedCategoryId, transactions,
} from '../selectors';

const NOW = Date.UTC(2026, 10, 20, 3, 0);
const TODAY = '2026-11-20';
const ops = sampleOps('me', NOW);
const state: State = applyOps(ops).state;
const cat = (s: State, name: string) => (categories(s) as Category[]).find((c) => c.name === name)!;

test('home summary for November', () => {
  expect(homeSummary(state, '2026-11')).toEqual({
    income: 12000000, expense: 6300000, net: 5700000, budgetLimit: 9000000, budgetSpent: 6300000, budgetRatio: 0.7, budgetLeft: 2700000,
  });
});

test('account balances and net worth', () => {
  const { rows, netWorth } = accountRows(state);
  expect(rows.map((r) => r.balance)).toEqual([6100000, 20000000, 412000, -2340000, 350000]);
  expect(netWorth).toBe(24522000);
  const jago = rows[1];
  expect(jago).toMatchObject({ pocketCount: 3, free: 10300000, overAllocatedBy: 0, subtitle: '3 pockets · 10.300.000 free' });
});

test('category spend shares and budget status', () => {
  const rows = categorySpend(state, 'month', '2026-11', 'expense');
  expect(rows.map((r) => Math.round(r.share * 100))).toEqual([33, 19, 18, 17, 12]);
  const eating = rows.find((r) => r.category.name === 'Eating out')!;
  expect(eating.budget?.status).toBe('over');
  expect(rows.find((r) => r.category.name === 'Transport & fuel')!.budget?.status).toBe('warning');
});

test('budget hint names the most over-budget category with its 3-month average', () => {
  expect(budgetHint(state, '2026-11')).toMatchObject({ category: { name: 'Eating out' }, overBy: 150000, avg3: 1200000 });
});

test('plans view: 5.900.000 a month and PLN 2 days overdue', () => {
  const v = plansView(state, TODAY);
  expect(v.summary).toMatchObject({ billsMonthly: 4400000, goalsMonthly: 1500000, total: 5900000 });
  expect(v.summary.overdue.map((b) => b.name)).toEqual(['PLN electricity']);
  expect(v.bills.find((b) => b.bill.name === 'PLN electricity')!.month.plan.daysOverdue).toBe(2);
  expect(v.goals[0]).toMatchObject({ affordable: 1100000, month: { plan: { required: 1500000, gap: 400000 } }, options: { extendTo: '2027-09-30', lowerTargetTo: 12200000 } });
});

test('day groups: newest first, transfers titled and kept out of the day net', () => {
  const groups = dayGroups(state, '2026-11');
  expect(groups[0]).toMatchObject({ date: '2026-11-20', weekday: 'Fri', dayNet: -62000 });
  expect(groups[0].rows.map((r) => r.title)).toEqual(['Kopi Kenangan', 'Grab ride']);
  const d18 = groups.find((g) => g.date === '2026-11-18')!;
  expect(d18.dayNet).toBe(-86500);
  const transfer = d18.rows.find((r) => r.tx.type === 'transfer')!;
  expect(transfer.title).toBe('BCA → Jago Savings');
  expect(d18.rows.find((r) => r.title === 'Indomaret Kemang')!.fromScreenshot).toBe(true);
  expect(dayGroups(state, '2026-11', 'KOPI').flatMap((g) => g.rows.map((r) => r.title))).toEqual(['Kopi Kenangan']);
  expect(dayGroups(state, '2025-10')).toEqual([]);
});

test('deleting Indomaret lowers the expense and lists it in recently deleted', () => {
  const indomaret = transactions(state).find((t) => t.counterpartyName === 'Indomaret Kemang')!;
  const del: Op = { id: 'del', hlc: `${String(NOW + 1000).padStart(15, '0')}:00000:x`, authorId: 'me', entity: 'transaction', entityId: indomaret.id, kind: 'delete' };
  const after = applyOps([...ops, del]).state;
  expect(homeSummary(state, '2026-11').expense - homeSummary(after, '2026-11').expense).toBe(86500);
  expect(recentlyDeleted(after, TODAY).map((t) => t.id)).toEqual([indomaret.id]);
  expect(recentlyDeleted(after, '2026-12-25')).toEqual([]);
});

test('suggested category comes from the Indomaret rule', () => {
  expect(suggestedCategoryId(state, 'indomaret', '2026-11')).toBe(cat(state, 'Food & groceries').id);
  expect(suggestedCategoryId(state, 'Sate Khas Senayan', '2026-11')).toBe(cat(state, 'Eating out').id);
  expect(suggestedCategoryId(state, 'something new', '2026-11')).toBe(cat(state, 'Food & groceries').id);
});

test('lists are cached per table', () => {
  expect(transactions(state)).toBe(transactions(state));
  expect(transactions({ ...state, account: {} })).toBe(transactions(state));
});
