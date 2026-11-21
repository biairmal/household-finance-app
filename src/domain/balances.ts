import { Account, Transaction, live } from './types';

export function accountBalance(account: Account, txs: Transaction[]): number {
  let balance = account.openingBalance;
  for (const t of live(txs)) {
    if (t.accountId === account.id) balance += t.type === 'income' ? t.amount : -t.amount;
    if (t.type === 'transfer' && t.toAccountId === account.id) balance += t.amount;
  }
  return balance;
}

/** `prefix` is a month ('2026-11') or a year ('2026'). Transfers are never income or spending. */
export function totalsForPeriod(txs: Transaction[], prefix: string): { income: number; expense: number; net: number } {
  let income = 0;
  let expense = 0;
  for (const t of live(txs)) {
    if (!t.date.startsWith(prefix)) continue;
    if (t.type === 'income') income += t.amount;
    else if (t.type === 'expense') expense += t.amount;
  }
  return { income, expense, net: income - expense };
}
