import { daysBetween } from './dates';
import { Transaction, live } from './types';

type FingerprintInput = Pick<Transaction, 'accountId' | 'date' | 'amount' | 'type' | 'externalRef' | 'counterpartyName' | 'note'>;

const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

export function fingerprint(tx: FingerprintInput): string {
  const tail = tx.externalRef ? `ref:${tx.externalRef}` : `desc:${normalize(`${tx.counterpartyName ?? ''} ${tx.note ?? ''}`)}`;
  return [tx.accountId, tx.date, tx.amount, tx.type, tail].join('|');
}

/**
 * Candidate id → existing id it may duplicate. Each existing transaction is claimed at most once,
 * so two genuine identical rides against one recorded ride flag only one.
 */
export function possibleDuplicates(candidates: Transaction[], existing: Transaction[]): Map<string, string> {
  const pool = new Map<string, string[]>();
  for (const e of live(existing)) {
    const k = fingerprint(e);
    pool.set(k, [...(pool.get(k) ?? []), e.id]);
  }
  const out = new Map<string, string>();
  for (const c of candidates) {
    const id = pool.get(fingerprint(c))?.shift();
    if (id) out.set(c.id, id);
  }
  return out;
}

/** Only an equal bank reference or an equal running balance proves a duplicate. */
export function isCertainDuplicate(a: Transaction, b: Transaction): boolean {
  if (a.deletedAt || b.deletedAt) return false;
  if (a.accountId !== b.accountId || a.date !== b.date || a.amount !== b.amount || a.type !== b.type) return false;
  if (a.externalRef && b.externalRef) return a.externalRef === b.externalRef;
  if (a.runningBalance !== undefined && b.runningBalance !== undefined) return a.runningBalance === b.runningBalance;
  return false;
}

/** An existing transfer this imported row is one leg of: same amount, within 2 days, closest date first. */
export function findTransferPair(row: Transaction, existing: Transaction[]): Transaction | null {
  const matches = live(existing).filter(
    (e) =>
      e.id !== row.id &&
      e.type === 'transfer' &&
      e.amount === row.amount &&
      Math.abs(daysBetween(e.date, row.date)) <= 2 &&
      ((row.type !== 'expense' && e.toAccountId === row.accountId) || (row.type !== 'income' && e.accountId === row.accountId)),
  );
  matches.sort((a, b) => Math.abs(daysBetween(a.date, row.date)) - Math.abs(daysBetween(b.date, row.date)));
  return matches[0] ?? null;
}
