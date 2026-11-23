import { expect, test } from '@jest/globals';
import { accountBalance, totalsForPeriod } from '../balances';
import { Account } from '../types';
import { t } from '../__fixtures__/tx';

const bca: Account = { id: 'bca', name: 'BCA', type: 'bank', currency: 'IDR', openingBalance: 0 };
const jago: Account = { id: 'jago', name: 'Jago', type: 'savings', currency: 'IDR', openingBalance: 0 };
const card: Account = { id: 'card', name: 'BCA CC', type: 'credit', currency: 'IDR', openingBalance: 0 };
const txs = [
  t({ type: 'income', amount: 12000000, date: '2026-11-15' }),
  t({ amount: 86500 }),
  t({ type: 'transfer', amount: 1500000, toAccountId: 'jago' }),
  t({ amount: 2340000, accountId: 'card' }),
  t({ type: 'transfer', amount: 1000000, toAccountId: 'card' }),
  t({ amount: 999999, deletedAt: '2026-11-19' }),
];

test('balances', () => {
  expect(accountBalance(bca, txs)).toBe(12000000 - 86500 - 1500000 - 1000000);
  expect(accountBalance(jago, txs)).toBe(1500000);
  expect(accountBalance(card, txs)).toBe(-1340000);
});

test('opening balance is the starting point', () => {
  expect(accountBalance({ ...jago, openingBalance: 500000 }, txs)).toBe(2000000);
});

test('period totals exclude transfers and deleted', () => {
  expect(totalsForPeriod(txs, '2026-11')).toEqual({ income: 12000000, expense: 2426500, net: 9573500 });
  expect(totalsForPeriod(txs, '2026')).toEqual({ income: 12000000, expense: 2426500, net: 9573500 });
  expect(totalsForPeriod(txs, '2026-10')).toEqual({ income: 0, expense: 0, net: 0 });
});
