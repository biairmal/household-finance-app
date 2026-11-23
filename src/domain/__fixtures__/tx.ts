import { Transaction } from '../types';

let seq = 0;
export const t = (p: Partial<Transaction>): Transaction => ({
  id: `tx${++seq}`,
  type: 'expense',
  amount: 0,
  date: '2026-11-18',
  accountId: 'bca',
  source: 'manual',
  authorId: 'b',
  ...p,
});
