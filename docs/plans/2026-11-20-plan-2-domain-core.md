# Plan 2: Domain Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every money calculation and data rule in the spec, as pure, fully tested TypeScript with no I/O, so screens, import and sync can trust the numbers.

**Architecture:** `src/domain/` holds plain functions over plain data (no React, no storage). Balances are always computed from records, never stored (spec §7.2). `src/domain/sync/` holds the hybrid logical clock and the op-log merge used by both the local store (Plan 3) and Drive sync (Plan 5).

**Tech Stack:** TypeScript strict, Jest (jest-expo preset from Plan 1). No new runtime dependencies.

**Spec:** `/mnt/project-files/design/2026-11-20-household-finance-app-design.md`

## Global Constraints

- Amounts are integers in rupiah (`number`, no decimals). `Transaction.amount` is always positive; direction comes from `type`.
- Dates are local Asia/Jakarta calendar strings `YYYY-MM-DD`. Never convert them through UTC `Date` objects for period maths.
- Every account has a `currency` field, which is `'IDR'` only in v1 (spec §3).
- Records with `deletedAt` set are excluded from every calculation (spec §8.2: deleted transactions restorable for 30 days).
- Transfers are never spending or income. Credit card purchases count when made, and card payments are transfers (spec §8.1, §8.11).
- Budget status: `warning` at ratio ≥ 0.8, `over` at ratio > 1.0 (spec §8.8).
- Displayed money: `Rp 2.700.000` (dot thousands). Negative uses U+2212: `−Rp 2.340.000`.
- **Plan's call:** monthly set-aside amounts (bills, goals) are rounded **up to the nearest Rp 1.000**.

## Review Focus

- **Deleted records leaking into totals.** A tombstoned expense must vanish from balance, budget, stats and pocket figures. Tests in Tasks 2, 3 and 4.
- **Due date in the current month, or already past.** The set-aside must not divide by zero or go negative: months remaining is at least 1, and overdue is flagged. Tests in Task 5.
- **Two genuine identical purchases on one day** (e.g. two Rp 15.000 rides) must never be treated as a *certain* duplicate without a matching reference or running balance. Test in Task 8.
- **Month-end recurrence.** A bill due on the 31st repeating every 3 months must clamp to month end (30 Apr), not overflow into May. Test in Task 5.
- **Ops arriving in a different order on each phone** must give the identical state on both. Test in Task 9.

---

### Task 1: Money formatting

**Files:**
- Create: `src/domain/money.ts`
- Test: `src/domain/__tests__/money.test.ts`

**Interfaces:**
- Produces: `formatIDR(n: number): string`, `formatAmount(n: number): string`, `formatCompact(n: number): string`

- [ ] **Step 1: Write the failing test**

```ts
import { formatIDR, formatAmount, formatCompact } from '../money';
test('formatIDR', () => {
  expect(formatIDR(2700000)).toBe('Rp 2.700.000');
  expect(formatIDR(0)).toBe('Rp 0');
  expect(formatIDR(-2340000)).toBe('−Rp 2.340.000');
});
test('formatAmount has no prefix', () => {
  expect(formatAmount(12000000)).toBe('12.000.000');
  expect(formatAmount(-86500)).toBe('−86.500');
});
test('formatCompact', () => {
  expect(formatCompact(2100000)).toBe('2,1jt');
  expect(formatCompact(3000000)).toBe('3jt');
  expect(formatCompact(412000)).toBe('412rb');
  expect(formatCompact(950)).toBe('950');
});
```

- [ ] **Step 2:** Run `npx jest src/domain/__tests__/money.test.ts`. Expected: FAIL (module not found).
- [ ] **Step 3:** Implement the three functions in `src/domain/money.ts`. Write the grouping by hand rather than with `Intl` (Hermes on Android has incomplete `Intl` locale data). Compact uses one decimal with a comma, and drops a trailing `,0`.
- [ ] **Step 4:** Run the test. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(domain): IDR formatting`.

### Task 2: Types, account balances, spending totals

**Files:**
- Create: `src/domain/types.ts`, `src/domain/balances.ts`
- Test: `src/domain/__tests__/balances.test.ts`

**Interfaces:**
- Produces, in `types.ts`:
  - `AccountType = 'bank' | 'savings' | 'credit' | 'ewallet' | 'cash'`
  - `Account { id: string; name: string; type: AccountType; institution?: string; accountNumber?: string; currency: 'IDR'; openingBalance: number; ownerMemberId?: string; deletedAt?: string }`
  - `TxType = 'income' | 'expense' | 'transfer'`
  - `Transaction { id: string; type: TxType; amount: number; date: string; time?: string; accountId: string; toAccountId?: string; categoryId?: string; pocketId?: string; note?: string; counterpartyName?: string; counterpartyAccount?: string; externalRef?: string; runningBalance?: number; source: 'manual' | 'screenshot'; authorId: string; deletedAt?: string }`
  - `Category { id: string; name: string; emoji: string; kind: 'expense' | 'income'; deletedAt?: string }`
  - `live<T extends { deletedAt?: string }>(xs: T[]): T[]` (filters out deleted records)
- Produces, in `balances.ts`:
  - `accountBalance(account: Account, txs: Transaction[]): number`
  - `totalsForPeriod(txs: Transaction[], prefix: string): { income: number; expense: number; net: number }`. `prefix` is `'2026-11'` (a month) or `'2026'` (a year).

- [ ] **Step 1: Write the failing test**

```ts
const bca: Account = { id:'bca', name:'BCA', type:'bank', currency:'IDR', openingBalance:0 };
const jago: Account = { id:'jago', name:'Jago', type:'savings', currency:'IDR', openingBalance:0 };
const card: Account = { id:'card', name:'BCA CC', type:'credit', currency:'IDR', openingBalance:0 };
const t = (p: Partial<Transaction>): Transaction => ({ id: Math.random().toString(), type:'expense', amount:0, date:'2026-11-18', accountId:'bca', source:'manual', authorId:'b', ...p });
const txs = [
  t({ type:'income', amount:12000000, date:'2026-11-15' }),
  t({ amount:86500 }),
  t({ type:'transfer', amount:1500000, toAccountId:'jago' }),
  t({ amount:2340000, accountId:'card' }),
  t({ type:'transfer', amount:1000000, toAccountId:'card' }),
  t({ amount:999999, deletedAt:'2026-11-19' }),
];
test('balances', () => {
  expect(accountBalance(bca, txs)).toBe(12000000 - 86500 - 1500000 - 1000000);
  expect(accountBalance(jago, txs)).toBe(1500000);
  expect(accountBalance(card, txs)).toBe(-1340000);
});
test('period totals exclude transfers and deleted', () => {
  expect(totalsForPeriod(txs, '2026-11')).toEqual({ income:12000000, expense:2426500, net:9573500 });
  expect(totalsForPeriod(txs, '2026-10')).toEqual({ income:0, expense:0, net:0 });
});
```

- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Implement both modules. Balance = opening + income − expense − transfers out + transfers in, over `live(txs)`.
- [ ] **Step 4:** Run it. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(domain): types and account balances`.

### Task 3: Pockets

**Files:**
- Create: `src/domain/pockets.ts`
- Modify: `src/domain/types.ts` (add `Pocket { id; accountId; name; deletedAt? }` and `Allocation { id; pocketId; amount: number /* signed */; date; authorId; deletedAt? }`)
- Test: `src/domain/__tests__/pockets.test.ts`

**Interfaces:**
- Produces: `pocketBalance(pocketId: string, allocations: Allocation[], txs: Transaction[]): number` and `accountSplit(account: Account, pockets: Pocket[], allocations: Allocation[], txs: Transaction[]): { pockets: { id: string; balance: number }[]; free: number; overAllocatedBy: number }`

- [ ] **Step 1: Write the failing test**

```ts
// Savings Rp 20.000.000 (openingBalance) with pockets rent 4.000.000, vehicle 1.200.000, bali 2.000.000
test('split', () => {
  const s = accountSplit(savings, pockets, allocs, []);
  expect(s.free).toBe(12800000); expect(s.overAllocatedBy).toBe(0);
});
test('expense paid from a pocket reduces the pocket, not Free', () => {
  const pay = t({ amount:650000, accountId:'savings', pocketId:'rent' });
  expect(pocketBalance('rent', allocs, [pay])).toBe(3350000);
  expect(accountSplit(savings, pockets, allocs, [pay]).free).toBe(12800000);
});
test('over-allocation never makes Free negative', () => {
  const big = [...allocs, { id:'x', pocketId:'bali', amount:5000000, date:'2026-11-20', authorId:'b' }];
  expect(accountSplit(savings, pockets, big, [])).toMatchObject({ free:0, overAllocatedBy:5000000 });
});
test('deleted allocation ignored', () => {
  const d = [...allocs, { id:'y', pocketId:'bali', amount:100, date:'2026-11-20', authorId:'b', deletedAt:'2026-11-20' }];
  expect(accountSplit(savings, pockets, d, []).free).toBe(12800000);
});
```

- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Implement. Pocket balance = sum(live allocations) − sum(live expenses with that `pocketId`). Free = max(0, accountBalance − Σ pocket balances).
- [ ] **Step 4:** Run it. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(domain): pockets and free balance`.

### Task 4: Budgets

**Files:**
- Create: `src/domain/budgets.ts`
- Modify: `src/domain/types.ts` (add `Budget { id; categoryId; period: 'monthly' | 'yearly'; amount; deletedAt? }`)
- Test: `src/domain/__tests__/budgets.test.ts`

**Interfaces:**
- Produces: `budgetUsage(budget: Budget, txs: Transaction[], monthKey: string /* 'YYYY-MM' */): { spent: number; limit: number; ratio: number; status: 'ok' | 'warning' | 'over' }`. A yearly budget uses `monthKey.slice(0,4)`.

- [ ] **Step 1: Write the failing test**, using the spec's November figures:
  - groceries 3.000.000 with 2.100.000 spent → `{ratio:0.7, status:'ok'}`
  - transport 800.000 with 760.000 → `'warning'`
  - eating out 1.000.000 with 1.150.000 → `'over'`
  - ratio exactly 0.8 → `'warning'`, and exactly 1.0 → `'warning'`
  - an October expense is not counted in November
  - a yearly holidays budget sums expenses from January to November 2026
  - a deleted expense is not counted
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Implement. Count only live `expense` transactions with the matching `categoryId` whose `date` starts with the period prefix.
- [ ] **Step 4:** Run it. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(domain): budget usage`.

### Task 5: Bills

**Files:**
- Create: `src/domain/dates.ts`, `src/domain/bills.ts`
- Modify: `src/domain/types.ts` (add `Recurrence = {kind:'once'} | {kind:'monthly'} | {kind:'yearly'} | {kind:'everyNMonths'; n: number}`, `Funding = {kind:'pocket'; pocketId: string} | {kind:'account'; accountId: string}`, and `Bill { id; name; amount; dueDate; recurrence: Recurrence; funding: Funding; reminderOffsetsDays: number[]; createdAt: string; deletedAt? }`)
- Test: `src/domain/__tests__/bills.test.ts`

**Interfaces:**
- Produces:
  - `monthsRemaining(today: string, due: string): number`, computed as `(dueY*12+dueM) − (todayY*12+todayM)`, with a minimum of 1
  - `daysBetween(a: string, b: string): number`
  - `addMonthsClamped(date: string, n: number): string`
  - `roundUp1000(n: number): number`
  - `billPlan(bill: Bill, funded: number, today: string): { monthly: number; behindBy: number; overdue: boolean; daysOverdue: number; daysUntilDue: number }`
  - `nextDueDate(bill: Bill): string | null` (`null` for `once`)

- [ ] **Step 1: Write the failing test**

```ts
test('monthsRemaining', () => {
  expect(monthsRemaining('2026-11-20','2027-05-15')).toBe(6);
  expect(monthsRemaining('2026-11-20','2026-11-28')).toBe(1);
  expect(monthsRemaining('2026-11-20','2026-11-18')).toBe(1);
});
test('vehicle tax plan (spec example)', () => {
  const p = billPlan({ ...vehicle, amount:3600000, dueDate:'2027-05-15', createdAt:'2026-08-10' }, 1200000, '2026-11-20');
  expect(p.monthly).toBe(400000);
});
test('behind schedule raises the monthly amount and reports the gap', () => {
  const p = billPlan({ ...vehicle, amount:3600000, dueDate:'2027-05-15', createdAt:'2026-08-10' }, 800000, '2026-11-20');
  expect(p.behindBy).toBe(800000);   // base 400.000 × 4 months (Aug–Nov) − 800.000
  expect(p.monthly).toBe(467000);    // roundUp1000(2.800.000 / 6)
});
test('overdue PLN', () => {
  const p = billPlan({ ...pln, amount:650000, dueDate:'2026-11-18', createdAt:'2026-10-01' }, 0, '2026-11-20');
  expect(p).toMatchObject({ overdue:true, daysOverdue:2, monthly:650000 });
});
test('next due dates', () => {
  expect(nextDueDate({ ...b, dueDate:'2027-05-15', recurrence:{kind:'yearly'} })).toBe('2028-05-15');
  expect(nextDueDate({ ...b, dueDate:'2026-12-01', recurrence:{kind:'monthly'} })).toBe('2027-01-01');
  expect(nextDueDate({ ...b, dueDate:'2026-01-31', recurrence:{kind:'everyNMonths', n:3} })).toBe('2026-04-30');
  expect(nextDueDate({ ...b, recurrence:{kind:'once'} })).toBeNull();
});
```

- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Implement. `monthly = roundUp1000(max(0, amount − funded) / monthsRemaining)`. `behindBy = max(0, base × monthsElapsed − funded)`, where `base = roundUp1000(amount / monthsBetween(createdAt, dueDate))` and `monthsElapsed` counts months from `createdAt`'s month through today's month inclusive. Overdue means today > dueDate and funded < amount. When overdue, `monthly` = the remaining amount. Do date maths on Y/M/D integers parsed from the strings.
- [ ] **Step 4:** Run it. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(domain): bill set-aside planning`.

### Task 6: Goals

**Files:**
- Create: `src/domain/goals.ts`
- Modify: `src/domain/types.ts` (add `Goal { id; name; target; targetDate?: string; funding: Funding; deletedAt? }`)
- Test: `src/domain/__tests__/goals.test.ts`

**Interfaces:**
- Consumes: `monthsRemaining` and `roundUp1000` (Task 5)
- Produces:
  - `averageMonthlyIncome(txs: Transaction[], today: string, months = 3): number`, averaged over the last `months` complete calendar months
  - `affordableMonthly(input: { avgIncome: number; monthlyBudgets: number; billSetAsides: number; otherGoals: number }): number`, floored at 0
  - `goalPlan(goal: Goal, funded: number, today: string, affordable: number): { required: number | null; affordable: number; gap: number }`

- [ ] **Step 1: Write the failing test**
  - Bali: target 15.000.000, funded 4.500.000, targetDate `'2027-06-30'`, today `'2026-11-20'` → `required` 1.500.000 (7 months)
  - `affordableMonthly({avgIncome:15000000, monthlyBudgets:9000000, billSetAsides:4400000, otherGoals:500000})` → 1.100.000, so the Bali gap is 400.000
  - when spending already exceeds income, affordable is 0
  - a goal with no `targetDate` → `required: null, gap: 0`
  - `averageMonthlyIncome` with salaries of 12.000.000 in Aug, Sep and Oct plus one in Nov, today `'2026-11-20'` → 12.000.000 (November is excluded as incomplete)
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run it. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(domain): goal planning`.

### Task 7: Auto-mapping rules

**Files:**
- Create: `src/domain/rules.ts`
- Modify: `src/domain/types.ts` (add `Rule { id; match: { accountNumber?: string; nameContains?: string; descriptionContains?: string; accountId?: string }; action: {kind:'category'; categoryId: string} | {kind:'transfer'; toAccountId: string} | {kind:'pocket'; pocketId: string}; updatedAt: string; deletedAt? }` and `RowFacts { accountId: string; description: string; counterpartyName?: string; counterpartyAccount?: string }`)
- Test: `src/domain/__tests__/rules.test.ts`

**Interfaces:**
- Produces: `matchOwnAccount(facts: RowFacts, accounts: Account[]): string | null` and `applyRules(facts: RowFacts, rules: Rule[], accounts: Account[]): { action: Rule['action'] | null; ruleId: string | null }`

- [ ] **Step 1: Write the failing test**
  - `'INDOMARET KEMANG'` against the rule `nameContains:'indomaret'` → groceries (case-insensitive)
  - counterparty `'BUDI SANTOSO'` with account `'1234567890'`, where an `accountNumber:'1234567890'` rule says family and a `nameContains:'budi'` rule says services → family (account number beats name)
  - two `nameContains` rules both match → the one with the later `updatedAt` wins
  - counterparty account `'••4410'` with an own account whose `accountNumber` is `'1029384410'` → `{kind:'transfer', toAccountId:'jago'}`. Own-account detection runs before rules. Masked digits match by suffix when 4 or more digits are visible.
  - a rule scoped by `accountId:'card'` does not fire for rows on `'bca'`
  - a deleted rule never fires
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Implement. Specificity order: accountNumber > nameContains > descriptionContains. Ties break by `updatedAt` descending.
- [ ] **Step 4:** Run it. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(domain): auto-mapping rules`.

### Task 8: Duplicates and transfer pairing

**Files:**
- Create: `src/domain/duplicates.ts`
- Test: `src/domain/__tests__/duplicates.test.ts`

**Interfaces:**
- Produces:
  - `fingerprint(tx: Pick<Transaction,'accountId'|'date'|'amount'|'type'|'externalRef'|'counterpartyName'|'note'>): string`
  - `possibleDuplicates(candidates: Transaction[], existing: Transaction[]): Map<string /* candidate id */, string /* existing id */>`
  - `isCertainDuplicate(a: Transaction, b: Transaction): boolean`
  - `findTransferPair(row: Transaction, existing: Transaction[]): Transaction | null`

- [ ] **Step 1: Write the failing test**
  - The Pertamina −150.000 row on 17 Nov matches an existing identical transaction → it appears in `possibleDuplicates`
  - two Rp 15.000 rides on the same day, same description, **different** `externalRef` → not possible duplicates
  - the same two rides with **no** refs → possible duplicate, but `isCertainDuplicate` → `false`
  - same account, date, amount and type with an equal `externalRef` → `isCertainDuplicate` → `true`
  - no ref but an equal `runningBalance` → `true`. Equal fields but a different `runningBalance` → `false`
  - transfer pairing: a 1.500.000 transfer bca→jago dated 18 Nov is found for a row of +1.500.000 into jago dated 19 Nov, but not for one dated 21 Nov (more than 2 days)
  - deleted existing transactions never match
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Implement. The fingerprint uses `externalRef` when present, otherwise the normalized description (lowercase, collapsed whitespace, trimmed).
- [ ] **Step 4:** Run it. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(domain): duplicate detection and transfer pairing`.

### Task 9: Hybrid logical clock and op-log merge

**Files:**
- Create: `src/domain/sync/hlc.ts`, `src/domain/sync/ops.ts`
- Test: `src/domain/__tests__/sync.test.ts`

**Interfaces:**
- Produces:
  - `Hlc = string`, formatted as `${ms.toString().padStart(15,'0')}:${counter.toString().padStart(5,'0')}:${deviceId}`, so it sorts lexicographically
  - `tick(last: Hlc | null, nowMs: number, deviceId: string): Hlc`, `receive(local: Hlc | null, remote: Hlc, nowMs: number, deviceId: string): Hlc`, `compareHlc(a: Hlc, b: Hlc): number`
  - `EntityName = 'account' | 'transaction' | 'category' | 'pocket' | 'allocation' | 'budget' | 'bill' | 'goal' | 'rule'`
  - `Op = { id: string; hlc: Hlc; authorId: string; entity: EntityName; entityId: string } & ({ kind: 'create'; data: Record<string, unknown> } | { kind: 'set'; field: string; value: unknown } | { kind: 'delete' })`
  - `State = Record<EntityName, Record<string, Record<string, unknown>>>`
  - `Conflict = { entity: EntityName; entityId: string; field: string; keptValue: unknown; lostValue: unknown; lostAuthorId: string; lostHlc: Hlc }`
  - `applyOps(ops: Op[]): { state: State; conflicts: Conflict[] }`. This is pure and rebuilds from the full op list. Plan 3 adds incremental application on top.

- [ ] **Step 1: Write the failing test**
  - `tick` is strictly increasing even when `nowMs` goes backwards. `receive` gives an HLC greater than both inputs.
  - create then set → the field is updated
  - two concurrent `set`s on `transaction.t1.categoryId` from devices A and B → the higher HLC wins, and one `Conflict` records the lost value and author
  - `delete` sets `deletedAt` to the delete op's HLC time (ISO date), and a later-HLC `set` does not resurrect the record
  - **order independence:** `applyOps(shuffle(ops))` deep-equals `applyOps(ops)` across 50 random shuffles (seeded)
  - the same op id applied twice is applied once
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Implement. Sort ops by HLC, de-duplicate by `id`, then fold. Per field, keep the `set` with the highest HLC. A field is in conflict when it received sets from two or more distinct authors whose HLCs are not ordered by an earlier sync. In v1, treat any two sets from different authors within the same 24h as a conflict.
- [ ] **Step 4:** Run it. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(domain): hlc and op-log merge`.

### Task 10: Export and backup

**Files:**
- Create: `src/domain/export.ts`
- Test: `src/domain/__tests__/export.test.ts`

**Interfaces:**
- Consumes: `State`, `applyOps` (Task 9)
- Produces: `toCsv(rows: Record<string, unknown>[], columns: string[]): string`, `exportCsvFiles(state: State): Record<string /* e.g. 'transactions.csv' */, string>`, `serializeBackup(ops: Op[], meta: { householdId: string; exportedAt: string }): string`, `parseBackup(json: string): { ops: Op[]; meta: { householdId: string; exportedAt: string } }`

- [ ] **Step 1: Write the failing test**
  - `toCsv` quotes fields containing a comma, quote or newline, and doubles inner quotes: `Kopi "Kenangan", Kemang` → `"Kopi ""Kenangan"", Kemang"`
  - amounts are written as plain integers (`86500`), not formatted
  - `exportCsvFiles` returns `accounts.csv`, `transactions.csv`, `categories.csv`, `budgets.csv`, `bills.csv` and `goals.csv`, and deleted records are excluded
  - backup round trip: `applyOps(parseBackup(serializeBackup(ops, meta)).ops)` equals `applyOps(ops)`
  - `parseBackup` of JSON with `"version": 2` throws `Unsupported backup version 2`
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Implement. The backup is `{ "version": 1, meta, ops }`.
- [ ] **Step 4:** Run it. Expected: PASS.
- [ ] **Step 5:** Run the whole domain suite: `npx jest src/domain`. Expected: all pass. Commit: `feat(domain): csv export and json backup`.
