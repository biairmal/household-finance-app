import { expect, test } from '@jest/globals';
import { categoryAverages } from '../stats';
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
