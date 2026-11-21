import { router } from 'expo-router';
import { nextDueDate } from '../domain/bills';
import { todayJakarta } from '../domain/dates';
import { formatIDR } from '../domain/money';
import { Bill, Funding } from '../domain/types';
import { Store } from '../store/store';
import { accounts, lastUsedAccountId, pockets } from '../store/selectors';
import { confirm } from './confirm';

/** The account a funding draws from: the linked account, or the account holding the pocket. */
export const fundingAccountId = (store: Store, f: Funding) =>
  f.kind === 'account' ? f.accountId : pockets(store.getState()).find((p) => p.id === f.pocketId)?.accountId;

/** Paid: one batch books the expense from the funding and moves the bill to its next due date (or marks a one-off paid). */
export async function payBill(store: Store, bill: Bill) {
  const accountId = fundingAccountId(store, bill.funding);
  if (!accountId) return;
  const name = accounts(store.getState()).find((a) => a.id === accountId)?.name ?? 'the account';
  if (!(await confirm(`Mark ${bill.name} paid?`, `This records a ${formatIDR(bill.amount)} expense from ${name}.`, 'Paid', false))) return;
  const today = todayJakarta();
  const next = nextDueDate(bill);
  await store.batch((tx) => {
    tx.create('transaction', {
      type: 'expense', amount: bill.amount, date: today, accountId, note: bill.name, source: 'manual', authorId: store.memberId ?? store.deviceId,
      ...(bill.funding.kind === 'pocket' && { pocketId: bill.funding.pocketId }),
      ...(bill.categoryId && { categoryId: bill.categoryId }),
    });
    tx.update('bill', bill.id, next ? { dueDate: next } : { paidAt: today });
  });
}

/** Mark set aside: an allocation into the pocket, or a prefilled transfer form into the linked account. */
export async function markSetAside(store: Store, funding: Funding, amount: number, name: string) {
  if (funding.kind === 'pocket') {
    await store.create('allocation', { pocketId: funding.pocketId, amount, date: todayJakarta(), authorId: store.memberId ?? store.deviceId });
    return;
  }
  const s = store.getState();
  const last = lastUsedAccountId(s);
  const from = last && last !== funding.accountId ? last : accounts(s).find((a) => a.id !== funding.accountId)?.id;
  router.push({ pathname: '/tx/new', params: { type: 'transfer', amount: String(amount), ...(from && { from }), to: funding.accountId, note: `${name} set-aside` } });
}
