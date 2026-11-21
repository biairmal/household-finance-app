import { expect, test } from '@jest/globals';
import { accountSplit, pocketBalance } from '../pockets';
import { Account, Allocation, Pocket } from '../types';
import { t } from '../__fixtures__/tx';

const savings: Account = { id: 'savings', name: 'Savings', type: 'savings', currency: 'IDR', openingBalance: 20000000 };
const pockets: Pocket[] = [
  { id: 'rent', accountId: 'savings', name: 'Rent' },
  { id: 'vehicle', accountId: 'savings', name: 'Vehicle tax' },
  { id: 'bali', accountId: 'savings', name: 'Bali' },
  { id: 'gone', accountId: 'savings', name: 'Deleted', deletedAt: '2026-11-01' },
];
const a = (id: string, pocketId: string, amount: number, extra: Partial<Allocation> = {}): Allocation => ({
  id, pocketId, amount, date: '2026-11-01', authorId: 'b', ...extra,
});
const allocs = [a('a1', 'rent', 4000000), a('a2', 'vehicle', 1200000), a('a3', 'bali', 2000000)];

test('split', () => {
  const s = accountSplit(savings, pockets, allocs, []);
  expect(s.free).toBe(12800000);
  expect(s.overAllocatedBy).toBe(0);
  expect(s.pockets.map((p) => p.id)).toEqual(['rent', 'vehicle', 'bali']);
});

test('expense paid from a pocket reduces the pocket, not Free', () => {
  const pay = t({ amount: 650000, accountId: 'savings', pocketId: 'rent' });
  expect(pocketBalance('rent', allocs, [pay])).toBe(3350000);
  expect(accountSplit(savings, pockets, allocs, [pay]).free).toBe(12800000);
});

test('deleted pocket expense is ignored', () => {
  const pay = t({ amount: 650000, accountId: 'savings', pocketId: 'rent', deletedAt: '2026-11-19' });
  expect(pocketBalance('rent', allocs, [pay])).toBe(4000000);
});

test('over-allocation never makes Free negative', () => {
  // 7.2M already allocated; another 17.8M makes 25M against a 20M balance.
  const big = [...allocs, a('x', 'bali', 17800000)];
  expect(accountSplit(savings, pockets, big, [])).toMatchObject({ free: 0, overAllocatedBy: 5000000 });
});

test('deleted allocation ignored', () => {
  const d = [...allocs, a('y', 'bali', 100, { deletedAt: '2026-11-20' })];
  expect(accountSplit(savings, pockets, d, []).free).toBe(12800000);
});

test('a credit card owing money with no pockets is not over-allocated', () => {
  const card: Account = { id: 'cc', name: 'Card', type: 'credit', currency: 'IDR', openingBalance: -2340000 };
  expect(accountSplit(card, pockets, allocs, [])).toEqual({ pockets: [], free: 0, overAllocatedBy: 0 });
});
