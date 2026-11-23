import { accountBalance } from './balances';
import { Account, Allocation, Pocket, Transaction, live } from './types';

export function pocketBalance(pocketId: string, allocations: Allocation[], txs: Transaction[]): number {
  const allocated = live(allocations).filter((a) => a.pocketId === pocketId).reduce((s, a) => s + a.amount, 0);
  const spent = live(txs).filter((t) => t.type === 'expense' && t.pocketId === pocketId).reduce((s, t) => s + t.amount, 0);
  return allocated - spent;
}

export function accountSplit(
  account: Account,
  pockets: Pocket[],
  allocations: Allocation[],
  txs: Transaction[],
): { pockets: { id: string; balance: number }[]; free: number; overAllocatedBy: number } {
  const split = live(pockets)
    .filter((p) => p.accountId === account.id)
    .map((p) => ({ id: p.id, balance: pocketBalance(p.id, allocations, txs) }));
  const inPockets = split.reduce((s, p) => s + p.balance, 0);
  const balance = accountBalance(account, txs);
  // A negative balance (a card owing money) has nothing to allocate, so only pocketed money can be over-allocated.
  return { pockets: split, free: Math.max(0, balance - inPockets), overAllocatedBy: Math.max(0, inPockets - Math.max(0, balance)) };
}
