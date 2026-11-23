export type AccountType = 'bank' | 'savings' | 'credit' | 'ewallet' | 'cash';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  institution?: string;
  accountNumber?: string;
  currency: 'IDR';
  openingBalance: number;
  ownerMemberId?: string;
  deletedAt?: string;
}

export type TxType = 'income' | 'expense' | 'transfer';

export interface Transaction {
  id: string;
  type: TxType;
  /** Always positive; direction comes from `type`. */
  amount: number;
  /** Local Asia/Jakarta date, YYYY-MM-DD. */
  date: string;
  time?: string;
  accountId: string;
  toAccountId?: string;
  categoryId?: string;
  pocketId?: string;
  note?: string;
  counterpartyName?: string;
  counterpartyAccount?: string;
  externalRef?: string;
  runningBalance?: number;
  source: 'manual' | 'screenshot';
  authorId: string;
  deletedAt?: string;
}

export interface Category {
  id: string;
  name: string;
  emoji: string;
  kind: 'expense' | 'income';
  deletedAt?: string;
}

export interface Pocket {
  id: string;
  accountId: string;
  name: string;
  deletedAt?: string;
}

export interface Allocation {
  id: string;
  pocketId: string;
  /** Signed: positive moves money into the pocket, negative back to Free. */
  amount: number;
  date: string;
  authorId: string;
  deletedAt?: string;
}

export interface Budget {
  id: string;
  categoryId: string;
  period: 'monthly' | 'yearly';
  amount: number;
  deletedAt?: string;
}

export type Recurrence = { kind: 'once' } | { kind: 'monthly' } | { kind: 'yearly' } | { kind: 'everyNMonths'; n: number };

export type Funding = { kind: 'pocket'; pocketId: string } | { kind: 'account'; accountId: string };

export interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  recurrence: Recurrence;
  funding: Funding;
  reminderOffsetsDays: number[];
  createdAt: string;
  deletedAt?: string;
}

export interface Goal {
  id: string;
  name: string;
  target: number;
  targetDate?: string;
  funding: Funding;
  deletedAt?: string;
}

export interface Rule {
  id: string;
  match: { accountNumber?: string; nameContains?: string; descriptionContains?: string; accountId?: string };
  action: { kind: 'category'; categoryId: string } | { kind: 'transfer'; toAccountId: string } | { kind: 'pocket'; pocketId: string };
  updatedAt: string;
  deletedAt?: string;
}

export interface RowFacts {
  accountId: string;
  description: string;
  counterpartyName?: string;
  counterpartyAccount?: string;
}

export const live = <T extends { deletedAt?: string }>(xs: T[]): T[] => xs.filter((x) => !x.deletedAt);
