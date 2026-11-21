import { defaultCategories } from '../domain/defaults';
import { tick } from '../domain/sync/hlc';
import { EntityName, Op } from '../domain/sync/ops';
import { AccountType, TxType } from '../domain/types';

type Creator = { create(entity: EntityName, data: Record<string, unknown>): string };

type Draft = {
  type: TxType; amount: number; date: string; time?: string; account: string; to?: string; category?: string;
  counterparty?: string; note?: string; by: 'me' | 'w'; screenshot?: boolean; pocket?: string;
};

/**
 * The November 2026 household from docs/design/prototype-prompt.md, as the v5 mockups show it.
 * Departs from the mockup in one place: the Bali pocket holds the goal's 4.500.000 (the prototype had 2.000.000),
 * so Jago "free" is 10.300.000, not 12.800.000. The emergency fund goal is left out (it has no funding source).
 */
export function seedSample(c: Creator, meId: string): void {
  const wife = c.create('member', { name: 'Wife', initial: 'W' });
  const cat: Record<string, string> = {};
  for (const d of defaultCategories()) cat[d.name] = c.create('category', d);

  const accounts: { key: string; name: string; type: AccountType; institution?: string; accountNumber?: string; target: number }[] = [
    { key: 'bca', name: 'BCA Tahapan', type: 'bank', institution: 'BCA', accountNumber: '0372142231', target: 6100000 },
    { key: 'jago', name: 'Jago Savings', type: 'savings', institution: 'Jago', accountNumber: '100845567890', target: 20000000 },
    { key: 'gopay', name: 'GoPay', type: 'ewallet', institution: 'GoPay', target: 412000 },
    { key: 'cc', name: 'BCA Credit Card', type: 'credit', institution: 'BCA', accountNumber: '4556123498761188', target: -2340000 },
    { key: 'cash', name: 'Cash', type: 'cash', target: 350000 },
  ];

  const G = 'Food & groceries', EAT = 'Eating out', TR = 'Transport & fuel', UT = 'Utilities', SH = 'Shopping';
  const txs: Draft[] = [
    // November: spending that totals 6.300.000.
    { type: 'expense', amount: 1200000, date: '2026-11-03', account: 'bca', category: G, counterparty: 'Superindo', by: 'w' },
    { type: 'expense', amount: 450000, date: '2026-11-09', account: 'cash', category: G, counterparty: 'Pasar Santa', by: 'w' },
    { type: 'expense', amount: 363500, date: '2026-11-12', account: 'gopay', category: G, counterparty: 'Indomaret', by: 'me' },
    { type: 'expense', amount: 86500, date: '2026-11-18', time: '18:20', account: 'bca', category: G, counterparty: 'Indomaret Kemang', by: 'me', screenshot: true },
    { type: 'expense', amount: 412000, date: '2026-11-08', account: 'cc', category: EAT, counterparty: 'Sate Khas Senayan', by: 'me' },
    { type: 'expense', amount: 300000, date: '2026-11-14', account: 'gopay', category: EAT, counterparty: 'GrabFood', by: 'w' },
    { type: 'expense', amount: 400000, date: '2026-11-16', account: 'bca', category: EAT, counterparty: 'Bakmi GM', by: 'me' },
    { type: 'expense', amount: 38000, date: '2026-11-20', time: '09:10', account: 'gopay', category: EAT, counterparty: 'Kopi Kenangan', by: 'w' },
    { type: 'expense', amount: 300000, date: '2026-11-06', account: 'cc', category: TR, counterparty: 'Shell', by: 'me' },
    { type: 'expense', amount: 286000, date: '2026-11-11', account: 'gopay', category: TR, counterparty: 'Gojek', by: 'w' },
    { type: 'expense', amount: 150000, date: '2026-11-17', account: 'bca', category: TR, counterparty: 'Pertamina Fatmawati', by: 'me' },
    { type: 'expense', amount: 24000, date: '2026-11-20', time: '08:15', account: 'gopay', category: TR, note: 'Grab ride', by: 'me' },
    { type: 'expense', amount: 400000, date: '2026-11-02', account: 'bca', category: UT, counterparty: 'Telkomsel', by: 'w' },
    { type: 'expense', amount: 450000, date: '2026-11-05', account: 'bca', category: UT, counterparty: 'Biznet', by: 'me' },
    { type: 'expense', amount: 250000, date: '2026-11-10', account: 'bca', category: UT, counterparty: 'PDAM', by: 'w' },
    { type: 'expense', amount: 690000, date: '2026-11-07', account: 'cc', category: SH, counterparty: 'Tokopedia', by: 'w' },
    { type: 'expense', amount: 500000, date: '2026-11-13', account: 'cc', category: SH, counterparty: 'Uniqlo', by: 'w' },
    { type: 'income', amount: 12000000, date: '2026-11-15', account: 'bca', category: 'Salary', counterparty: 'PT Maju Jaya', by: 'me' },
    { type: 'transfer', amount: 1500000, date: '2026-11-18', time: '10:00', account: 'bca', to: 'jago', by: 'me', screenshot: true },
  ];
  // August to October: salary plus side income averages 14.500.000, which makes the Bali goal's "can afford" 1.100.000.
  for (const m of ['2026-08', '2026-09', '2026-10']) {
    txs.push(
      { type: 'income', amount: 12000000, date: `${m}-25`, account: 'bca', category: 'Salary', counterparty: 'PT Maju Jaya', by: 'me' },
      { type: 'income', amount: 2500000, date: `${m}-28`, account: 'bca', category: 'Side income', note: 'Freelance design', by: 'w' },
      { type: 'expense', amount: 2000000, date: `${m}-10`, account: 'bca', category: G, counterparty: 'Superindo', by: 'w' },
      { type: 'expense', amount: 700000, date: `${m}-10`, account: 'bca', category: TR, counterparty: 'Pertamina', by: 'me' },
      { type: 'expense', amount: 1200000, date: `${m}-10`, account: 'bca', category: EAT, counterparty: 'GrabFood', by: 'w' },
      { type: 'expense', amount: 1050000, date: `${m}-10`, account: 'bca', category: UT, counterparty: 'PLN', by: 'me' },
      { type: 'expense', amount: 900000, date: `${m}-10`, account: 'cc', category: SH, counterparty: 'Tokopedia', by: 'w' },
    );
  }

  // Opening balances are back-calculated so the final balances match the mockup.
  const effect: Record<string, number> = {};
  for (const t of txs) {
    effect[t.account] = (effect[t.account] ?? 0) + (t.type === 'income' ? t.amount : -t.amount);
    if (t.to) effect[t.to] = (effect[t.to] ?? 0) + t.amount;
  }
  const acc: Record<string, string> = {};
  for (const a of accounts) {
    acc[a.key] = c.create('account', {
      name: a.name, type: a.type, institution: a.institution, accountNumber: a.accountNumber, currency: 'IDR', openingBalance: a.target - (effect[a.key] ?? 0),
    });
  }

  const pocket = {
    rent: c.create('pocket', { accountId: acc.jago, name: 'Rent' }),
    vehicle: c.create('pocket', { accountId: acc.jago, name: 'Vehicle tax' }),
    bali: c.create('pocket', { accountId: acc.jago, name: 'Bali trip' }),
  };
  const allocate = (pocketId: string, amount: number, date: string) => c.create('allocation', { pocketId, amount, date, authorId: meId });
  allocate(pocket.vehicle, 400000, '2026-08-25');
  allocate(pocket.vehicle, 400000, '2026-09-25');
  allocate(pocket.vehicle, 400000, '2026-10-25');
  allocate(pocket.bali, 4500000, '2026-10-01');
  allocate(pocket.rent, 4000000, '2026-11-01');

  for (const t of txs) {
    c.create('transaction', {
      type: t.type, amount: t.amount, date: t.date, time: t.time, accountId: acc[t.account], toAccountId: t.to ? acc[t.to] : undefined,
      categoryId: t.category ? cat[t.category] : undefined, counterpartyName: t.counterparty, note: t.note,
      source: t.screenshot ? 'screenshot' : 'manual', authorId: t.by === 'w' ? wife : meId,
    });
  }

  // The prototype's five budgets add up to 8.000.000 but the mockup shows 9.000.000; Health (unspent) fills the gap.
  for (const [category, amount] of [[G, 3000000], [TR, 800000], [EAT, 1000000], [UT, 1500000], [SH, 1700000], ['Health', 1000000]] as const) {
    c.create('budget', { categoryId: cat[category], period: 'monthly', amount });
  }

  c.create('bill', {
    name: 'Vehicle tax', emoji: '🛵', amount: 3600000, dueDate: '2027-05-15', recurrence: { kind: 'yearly' },
    funding: { kind: 'pocket', pocketId: pocket.vehicle }, categoryId: cat.Vehicle, reminderOffsetsDays: [7, 1, 0], createdAt: '2026-08-10',
  });
  c.create('bill', {
    name: 'Rent', emoji: '🏠', amount: 4000000, dueDate: '2026-12-01', recurrence: { kind: 'monthly' },
    funding: { kind: 'pocket', pocketId: pocket.rent }, categoryId: cat['Housing/rent'], reminderOffsetsDays: [7, 1, 0], createdAt: '2026-11-01',
  });
  c.create('bill', {
    name: 'PLN electricity', emoji: '💡', amount: 650000, dueDate: '2026-11-18', recurrence: { kind: 'monthly' },
    funding: { kind: 'account', accountId: acc.bca }, categoryId: cat[UT], reminderOffsetsDays: [7, 1, 0], createdAt: '2026-10-18',
  });
  c.create('goal', { name: 'Bali trip', emoji: '✈️', target: 15000000, targetDate: '2027-06-30', funding: { kind: 'pocket', pocketId: pocket.bali } });
  c.create('rule', { match: { nameContains: 'Indomaret' }, action: { kind: 'category', categoryId: cat[G] }, updatedAt: '2026-11-01T00:00:00.000Z' });
}

/** The sample as ops, for tests. The app seeds through store.batch instead. */
export function sampleOps(meId: string, now: number): Op[] {
  const ops: Op[] = [];
  let hlc: string | null = null;
  let n = 0;
  seedSample(
    {
      create(entity, data) {
        const id = `s${++n}`;
        hlc = tick(hlc, now, 'sample');
        ops.push({ id: `op${n}`, hlc, authorId: meId, entity, entityId: id, kind: 'create', data });
        return id;
      },
    },
    meId,
  );
  return ops;
}
