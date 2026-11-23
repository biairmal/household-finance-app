# Plan 3: Local Store + v5 Screens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The real app on one phone, fully offline. Data is stored as an op log in SQLite, and every v5 screen works with manual entry: Home, Transactions, Stats, Plans, Settings, accounts and pockets, categories and budgets, bills and goals. When this plan is done, Bia can log a real month by hand and trust the numbers.

**Architecture:** Every change is an `Op` (Plan 2, `src/domain/sync/ops.ts`) appended to a SQLite `ops` table. The screens never read SQLite. They read an in-memory `State` that is rebuilt from the op log at startup and then folded forward as new ops arrive. All money numbers come from the Plan 2 domain functions, through typed selectors in `src/store/selectors.ts`. React reads the store with `useSyncExternalStore`, so no state library is needed. The store sits behind a small `OpsDb` interface. This is the spec's `LocalStore` (§7.1): it has a SQLite implementation for the app and an in-memory one for Jest.

**Tech Stack:** Expo SDK 58, expo-router (tabs), expo-sqlite (native, and wasm/OPFS on web, both proven in Plan 1), expo-crypto (UUIDs), expo-font. New: `react-native-svg` (icons, donut and ring charts, the Kasi face), `@expo-google-fonts/plus-jakarta-sans`, and `expo-sharing` (backup file on Android). `expo-file-system` is already installed. Install each with `npx expo install`.

**Spec:** `docs/design/2026-11-20-household-finance-app-design.md` (§7.1, §7.2, §8.1, §8.2, §8.5–§8.8, §8.11, §8.12, §9)
**Mockups:** v5 row of https://claude.ai/artifact/KvNZnkqRkAadqbaBJBUMaQ (`V5Home`, `V5Trans`, `V5Stats`, `V5Plans`, `V5Settings`). `V5Import` is Plan 4.

## Status of Plan 1 (why this plan can start)

- The gate in spec §10 is spike 2 (iPhone storage) and spike 3 (iPhone sign-in). Both **passed** on 2026-11-21 (`src/spike-results.md`). The decision-gate table at the bottom of that file still says PENDING for those two rows and should be updated to PASS.
- Spike 4 (Drive sharing under `drive.file`) is **still open**. It decides the Drive folder layout, which only Plan 5 uses. Plan 3 never touches Drive.
- Because of that, **the spike screens stay in the app** until Plan 5 replaces them: they move under Settings → Developer (Task 3), and the `/spikes/*`, `/picker` and `/oauth-callback` paths must keep working. Do not delete `src/spike/` or `src/app/spikes/`.
- Known from Plan 1, out of scope here: after a redeploy, the first PWA open still shows the old version (fix with an "update ready" prompt in Plan 6). Refresh tokens surviving a reboot is checked in Plan 5. Google app verification is handled in Plan 6.

## Global Constraints

- Everything in Plan 2's Global Constraints still holds: integer rupiah, `YYYY-MM-DD` Jakarta dates, `currency: 'IDR'`, tombstones excluded from every number, transfers never count as spending, and the 0.8/1.0 budget thresholds.
- **Today** is always `todayJakarta()` (Task 1), never `new Date().toISOString().slice(0, 10)`, which gives the UTC date and is wrong between 00:00 and 07:00 in Jakarta.
- **Screens never compute money themselves.** Every number on screen comes from a selector (Task 4) that calls the domain functions. Any new calculation goes into `src/domain/` with a test first.
- **Every write goes through the store's commands** (`create`, `update`, `remove`, `restore`). Nothing writes to SQLite directly, so Plan 5 can sync the op log as-is.
- `update` emits one `set` op per field that **actually changed**. This keeps sync conflicts per field (spec §7.2).
- Phone-first layout, using the 390 px width of the mockups. On wider web screens, centre the app in a column of at most 480 px. Touch targets are at least 44 px.
- Look (spec §8.12, v5 mockups): Plus Jakarta Sans, tabular numbers, page background `#F4F6F5`, white cards with 16 px radius (14 px for small cards), hairline `#EEF1EF`, ink `#1A1D1C`, muted text `#5B6360`, accent `#0A9F5A` (green text `#0A8A4E`), red `#D13A40` for expense totals, amber `#E6A700` for warnings, and emoji in soft coloured circles for accounts and categories. List amounts use `formatAmount` (no `Rp`). Headline figures use `formatIDR`. Tight spots use `formatCompact`.
- All colours live in `src/ui/theme.ts`. No hex values in screens, so dark mode (Plan 6) only has to touch that one file.
- AGENTS.md: before using any Expo or React Native API (Tabs, fonts, SQLite, sharing), read the SDK 58 docs at `https://docs.expo.dev/versions/v58.0.0/`. Run `npx tsc --noEmit` and lint before calling a task done. If `npx expo lint` offers to install ESLint, accept it once in Task 3 and commit the config.
- CLAUDE.md UI rule: after each screen task, run the web build, look at it in a real browser at 390 px and at desktop width, compare it with the mockup artboard, fix what differs, and say which checks actually ran.

## Review Focus

- **Set-aside done this month must not shrink the target.** After "Mark set aside Rp 400.000" for vehicle tax, the card must still say 400.000/mo, now done, not drop to 334.000. Plans compute this month's figure from the funding at the **start of the month** (Task 1).
- **Overdue means unpaid, not underfunded.** A PLN bill whose pocket holds the full amount, but which is past its due date and not paid, is overdue. Paying it moves the due date on (or marks a one-off bill paid). Task 1 changes Plan 2's rule, and its test, to this.
- **Incremental fold equals a full rebuild.** After any sequence of commands, `store.state` must deep-equal `applyOps(allOpsInDb).state`. Tested in Task 2.
- **Restore after delete.** A deleted transaction leaves every total. Restoring it within 30 days brings it back in all of them. Tested in Task 2 and checked on screen in Task 12.
- **Transfers and pocket moves never appear as spending** on Home, Stats or budget bars. A card payment is a transfer.
- **App restart keeps everything.** Force-quit on both phones, reopen offline, and every number is the same (Task 14).

## Not in this plan

Screenshot import, the auto-mapping rules screen and balance checks are Plan 4. The scan tab shows a placeholder until then. Google sign-in, household create/join, members other than the local one, Drive sync and the conflict notice are Plan 5. Reminders, CSV/zip export, backup *restore*, theme and dark mode, accent colour, the Kasi on/off switch, the "update ready" prompt and the user-set income figure for goals are Plan 6.

---

### Task 1: Domain follow-ups for the app

**Files:**
- Modify: `src/domain/types.ts`, `src/domain/sync/ops.ts`, `src/domain/bills.ts`, `src/domain/goals.ts`, `src/domain/dates.ts`, `src/domain/export.ts`
- Create: `src/domain/plans.ts`
- Test: `src/domain/__tests__/bills.test.ts` (update), `src/domain/__tests__/sync.test.ts` (extend), `src/domain/__tests__/goals.test.ts` (extend), `src/domain/__tests__/plans.test.ts`, `src/domain/__tests__/dates.test.ts`

**Interfaces:**
- `types.ts`: add `Member { id: string; name: string; initial: string; deletedAt?: string }`. Add `categoryId?: string` and `paidAt?: string` to `Bill` (the category a payment is booked to, and when a one-off bill was paid). Add `updatedBy?: string; updatedAt?: string` to every record type, filled in by the fold.
- `ops.ts`: add `'member'` to `EntityName` and `ENTITY_NAMES`. Split the fold so it can be resumed: `type Folded = { state: State; conflicts: Conflict[]; lastSet: Map<…>; lastHlc: Hlc | null }`, `emptyFolded(): Folded`, and `foldOps(acc: Folded, sortedOps: Op[]): Folded`, which mutates and returns `acc`. `applyOps` becomes "de-duplicate, sort, `foldOps(emptyFolded(), …)`" with its output unchanged. Every applied op sets `record.updatedBy = op.authorId` and `record.updatedAt = <ISO time of op.hlc>`.
- `dates.ts`: `todayJakarta(nowMs = Date.now()): string` (UTC+7, no DST), `monthOf(date: string): string` (`'YYYY-MM'`), `addMonthsToKey(monthKey: string, n: number): string`, `daysInMonthKey(monthKey: string): number`.
- `bills.ts`: **two rule changes to Plan 2**:
  1. `overdue = today > dueDate && !bill.paidAt`, whatever the funding. Paying advances `dueDate`, or for `once` sets `paidAt`, so an unpaid bill past its date is overdue even when the pocket is full. When overdue, `monthly` is still `max(0, amount − funded)`.
  2. `behindBy` counts **completed** months only, from `createdAt`'s month through last month: `monthsElapsed = monthIndex(today) − monthIndex(createdAt)`, and 0 in the creation month. The current month's set-aside is "due this month", not "behind". The Plan 2 test `behind schedule…` becomes `behindBy: 400000` (base 400.000 × 3 months Aug–Oct − 800.000). Its `monthly` stays 467.000. The test `past due but fully funded is not overdue` flips to expecting `overdue: true`.
- `plans.ts` (new):
  - `fundedBy(funding: Funding, ctx: { accounts; pockets; allocations; txs }): number`. For a pocket it is `pocketBalance`; for an account it is `accountBalance` (spec §8.5).
  - `setAsideIn(funding: Funding, monthKey: string, ctx): number`. For a pocket: the sum of live positive allocations to it dated in that month. For an account: live transfers **into** it dated in that month.
  - `billMonth(bill, ctx, today): { plan: ReturnType<typeof billPlan>; funded: number; setAside: number; done: boolean }`, computed as `billPlan(bill, funded − setAside, today)` (funding at the start of the month), with `done = setAside >= plan.monthly`.
  - `goalMonth(goal, ctx, today, affordable)`: the same idea using `goalPlan`.
  - `plansSummary(bills, goals, ctx, today, avgIncome, monthlyBudgets): { billsMonthly; goalsMonthly; total; doneCount; itemCount; overdue: Bill[] }`. Overdue bills are listed in `overdue` and **left out** of `billsMonthly`, because the Plans hero shows "Bills 4.400.000" while PLN sits in the overdue banner. `affordable` for each goal is `affordableMonthly` with `otherGoals` = the sum of the *other* goals' required amounts. `monthlyBudgets` = Σ monthly budgets + Σ yearly budgets / 12.
- `goals.ts`: `goalOptions(goal, funded, today, affordable): { extendTo: string | null; lowerTargetTo: number | null }`. `extendTo` is the first month-end date at which the required amount ≤ affordable (null when affordable is 0). `lowerTargetTo` = `funded + affordable × monthsRemaining`, rounded down to Rp 100.000.
- `export.ts`: no change in code, but the backup round-trip test must pass with a `member` op in it.

- [ ] **Step 1: Write the failing tests.**
  - `todayJakarta(Date.UTC(2026, 10, 20, 18, 30))` → `'2026-11-21'` (01:30 in Jakarta); `Date.UTC(2026, 10, 20, 16, 59)` → `'2026-11-20'`.
  - `addMonthsToKey('2026-12', 1)` → `'2027-01'`, `addMonthsToKey('2026-01', -1)` → `'2025-12'`; `daysInMonthKey('2028-02')` → 29.
  - `foldOps` resumed in two halves deep-equals `applyOps` over the whole list (reuse the 50-shuffle op set). A `set` by author `b` leaves `updatedBy: 'b'`.
  - Vehicle tax, 1.200.000 funded by allocations dated Aug–Oct, today `2026-11-20` → `billMonth` gives `monthly 400000, done false, behindBy 0`. Add a 400.000 allocation dated `2026-11-20` → still `monthly 400000`, now `done true`.
  - Rent 4.000.000 monthly, due `2026-12-01`, one allocation of 4.000.000 dated `2026-11-01` → `monthly 4000000, done true`.
  - PLN 650.000 due `2026-11-18`, pocket holding 650.000, no `paidAt`, today `2026-11-20` → overdue, `daysOverdue 2`, and listed in `plansSummary(...).overdue`, not in `billsMonthly`.
  - The `plansSummary` spec numbers: vehicle + rent + Bali (Task 4's sample data) → `billsMonthly 4400000, goalsMonthly 1500000, total 5900000`.
  - `goalOptions` for Bali (funded 4.500.000, target 15.000.000, Jun 2027, affordable 1.100.000, today `2026-11-20`) → `extendTo '2027-09-30'` (10 months × 1,1jt ≥ 10,5jt) and `lowerTargetTo 12200000` (4,5jt + 1,1jt × 7).
  - A member op survives the backup round trip.
- [ ] **Step 2:** Run `npx jest src/domain`. Expected: the new tests FAIL, and so do the two Plan 2 tests whose expectations changed.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npx jest src/domain`. Expected: all pass.
- [ ] **Step 5:** Commit: `feat(domain): month plans, jakarta today, resumable fold, member entity`.

### Task 2: Op store over SQLite

**Files:**
- Create: `src/store/opsDb.ts` (interface + in-memory implementation), `src/store/opsDb.sqlite.ts`, `src/store/store.ts`, `src/store/ids.ts`
- Test: `src/store/__tests__/store.test.ts`

**Interfaces:**
- `OpsDb { loadAll(): Promise<Op[]>; append(ops: Op[]): Promise<void>; getMeta(key: string): Promise<string | null>; setMeta(key: string, value: string): Promise<void> }`, plus `memoryOpsDb(): OpsDb`.
- SQLite schema (database `household.db`, `PRAGMA user_version = 1`):
  - `ops(id TEXT PRIMARY KEY, hlc TEXT NOT NULL, author_id TEXT NOT NULL, device_id TEXT NOT NULL, entity TEXT NOT NULL, entity_id TEXT NOT NULL, kind TEXT NOT NULL, body TEXT NOT NULL, uploaded INTEGER NOT NULL DEFAULT 0)` with an index on `hlc`. `body` is the JSON of `data`, or `{field, value}`, or `{}`. `uploaded` is for Plan 5.
  - `meta(key TEXT PRIMARY KEY, value TEXT NOT NULL)`, holding `deviceId`, `memberId`, `lastHlc` and `onboarded`.
  - `append` runs inside one transaction and uses `INSERT OR IGNORE`, so replays are harmless.
- `ids.ts`: `newId(): string` (expo-crypto `randomUUID`; Hermes has no global `crypto`, which Plan 1 found the hard way).
- `createStore(db: OpsDb, opts: { now?: () => number; newId?: () => string }): Promise<Store>`. On start it loads all ops and runs `applyOps`. It creates and saves `deviceId` the first time.
  - `Store { getState(): State; getConflicts(): Conflict[]; subscribe(fn): () => void; memberId: string | null; deviceId: string; create<E extends EntityName>(entity: E, data): Promise<string /* id */>; update(entity, id, patch: Record<string, unknown>): Promise<void>; remove(entity, id): Promise<void>; restore(entity, id): Promise<void>; batch(fn: (tx) => void): Promise<void>; setMember(name: string): Promise<void>; meta: { get; set } }`.
  - Every command ticks the HLC (`tick(lastHlc, now(), deviceId)`), appends the ops, then folds them with `foldOps` (they always sort after everything already folded, since the HLC only grows), saves `lastHlc`, and notifies subscribers once.
  - `update` compares with the current record (`JSON.stringify` per field) and skips unchanged fields. If nothing changed, it writes nothing.
  - `restore` is `set deletedAt null`.
  - `batch` gathers several commands (for example a bill payment: an expense, then advancing `dueDate`) into one append and one notification.
  - Write order is **append, then fold**. If the append throws, the state must not change and the error is re-thrown, so the screen can show it.

- [ ] **Step 1: Write the failing tests** (with `memoryOpsDb`):
  - create a transaction → `getState().transaction[id]` has the data, `updatedBy` = the member
  - `update` with an unchanged amount and a new note → exactly one new op in the db
  - remove → `deletedAt` set; restore → `deletedAt` null, and `totalsForPeriod` counts it again
  - a new `createStore` over the same db gives a deep-equal state (restart)
  - after 200 random commands, `getState()` deep-equals `applyOps(await db.loadAll()).state`
  - HLCs in the db are strictly increasing even when `now()` goes backwards
  - an `append` that throws leaves the state untouched
  - subscribers are called once per command and once per batch
- [ ] **Step 2:** Run `npx jest src/store`. Expected: FAIL.
- [ ] **Step 3:** Implement `opsDb.ts`, `store.ts` and `ids.ts`, then `opsDb.sqlite.ts` following the storage spike's pattern (`openDatabaseAsync`, `withTransactionAsync`). Jest covers only the memory implementation. The SQLite one is checked on the phones in Task 14 and in the browser in Task 3.
- [ ] **Step 4:** Run it. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(store): op log store with incremental fold`.

### Task 3: App shell, theme, tabs, onboarding

**Files:**
- Create: `src/ui/theme.ts`, `src/ui/icons.tsx`, `src/ui/StoreProvider.tsx`, `src/app/(tabs)/_layout.tsx`, `src/app/(tabs)/index.tsx` (Home, a stub for now), `src/app/(tabs)/transactions.tsx`, `src/app/(tabs)/scan.tsx`, `src/app/(tabs)/stats.tsx`, `src/app/(tabs)/plans.tsx`, `src/app/onboarding.tsx`, `src/app/settings/index.tsx` (stub), `src/app/settings/developer.tsx`, `src/domain/defaults.ts`
- Modify: `src/app/_layout.tsx`, `src/app/index.tsx` (removed; Home moves into `(tabs)`)
- Test: `src/domain/__tests__/defaults.test.ts`

**Interfaces:**
- `theme.ts`: `colors` (the tokens in Global Constraints, plus soft circle tints `#EAF0FD #FDEFF6 #E3F5EC #FDE8E8 #FFF8E1 #FFF1DF`, warning surface `#FFF8E1`, danger surface `#FFF0F0`), `radius { card: 16, small: 14, control: 12, chip: 10 }`, `font { regular, semibold, bold, extrabold }` (font family names), `space`.
- `icons.tsx`: tab and header icons as `react-native-svg` components, using the stroke paths from the v5 artboards (home, list, scan, pie, target, gear, chevrons, search, plus).
- `StoreProvider`: opens `household.db`, runs `createStore`, calls `navigator.storage.persist()` on web, and shows a plain loading state, or a readable error when SQLite fails to open (on web, point at `crossOriginIsolated`). It exposes `useStore()` (the store) and `useAppState<T>(selector: (s: State) => T): T`, built on `useSyncExternalStore`. Memoise selector results per state object, so screens don't re-render on every unrelated op.
- `defaults.ts`: `defaultCategories(): Omit<Category, 'id'>[]`, the spec §9 list with emoji: 15 expense (Food & groceries 🛒, Eating out 🍜, Transport & fuel ⛽, Housing/rent 🏠, Utilities 💡, Health 💊, Education 🎓, Shopping 🛍️, Family & gifts 👪, Religious giving 🤲, Entertainment 🎬, Subscriptions 📺, Vehicle 🛵, Fees & admin 🧾, Other 📦) and 4 income (Salary 💼, Bonus/THR 🎁, Side income 🧑‍💻, Other income ➕).
- Tabs: Home · Transactions · [Scan, the raised green centre button from the mockup] · Stats · Plans, as a custom `tabBar` matching the v5 nav (80 px high, active tab green and extra-bold). The Scan tab shows Kasi with "Screenshot import is coming in the next update" and an "Add manually" button that opens the add-transaction screen.
- Onboarding (shown when `meta.onboarded` is unset): your name (creates the local `member`, and `setMember` stores `memberId`), then "Start empty" (seeds the default categories and opens Settings → Accounts) or "Load sample November" (Task 4's sample data). Set `onboarded` at the end.
- Settings → Developer lists the four spike screens and shows the device id, the op count and the db size. The routes under `src/app/spikes/` stay where they are.

- [ ] **Step 1:** Write the `defaults` test (19 categories, 15 expense, unique names) and watch it fail. Then implement `defaults.ts`.
- [ ] **Step 2:** Install the new packages: `npx expo install react-native-svg @expo-google-fonts/plus-jakarta-sans expo-sharing`.
- [ ] **Step 3:** Build the theme, icons, provider, tab layout, onboarding and Developer screen. Load the fonts in the root layout and keep the splash screen up until they are loaded. Wrap the app in a centred column of at most 480 px on web.
- [ ] **Step 4:** Run `npx expo start --web`. In the browser at 390 px: onboarding → name → Start empty → the tabs show and the centre button is raised. Reload, and onboarding is not shown again (persisted in SQLite). `/spikes/storage` still opens. Check desktop width too (centred column).
- [ ] **Step 5:** Run `npx tsc --noEmit` and lint. Commit: `feat(app): shell, tabs, theme, onboarding`.

### Task 4: Selectors and sample data

**Files:**
- Create: `src/store/selectors.ts`, `src/store/sample.ts`
- Test: `src/store/__tests__/selectors.test.ts`

**Interfaces:**
- Typed lists: `accounts(s)`, `transactions(s)`, `categories(s)`, `pockets(s)`, `allocations(s)`, `budgets(s)`, `bills(s)`, `goals(s)`, `members(s)`, `rules(s)`. Each returns live records cast to the domain types and **cached per `State` object** (a `WeakMap`), so screens can call them freely.
- `ctx(s)`: the `{ accounts, pockets, allocations, txs }` bundle that `plans.ts` takes.
- `homeSummary(s, monthKey)`: `{ income, expense, net, budgetLimit, budgetSpent, budgetRatio, budgetLeft }`. The budget uses only categories with a monthly budget.
- `accountRows(s)`: `{ account, balance, subtitle, pocketCount, free, overAllocatedBy }[]`, plus `netWorth`. A credit card shows its balance as negative with the subtitle "owed". Savings with pockets show "3 pockets · 12.800.000 free".
- `dayGroups(s, monthKey, query?)`: `{ date, weekday, dayNet, rows: { tx, title, subtitle, emoji, tint, fromScreenshot, signedAmount }[] }[]`, newest first. `title` is the counterparty or note, otherwise the category name; for transfers it is "BCA → Jago Savings". `subtitle` is "Category · Account · initial". `query` matches note, counterparty, category name and account name, case-insensitive.
- `monthTotals(s, year)`: 12 rows of `{ monthKey, income, expense, net }`. `calendarMonth(s, monthKey)`: per-day income and expense.
- `categorySpend(s, period: 'month' | 'year', key, kind: 'expense' | 'income')`: `{ category, amount, share, budget?: ReturnType<typeof budgetUsage> }[]`, sorted by amount.
- `budgetHint(s, monthKey)`: the most over-budget category with its 3-month average (`{ category, overBy, avg3 }`), or null.
- `plansView(s, today)`: wraps `plansSummary`, plus each bill's `billMonth` and each goal's `goalMonth` and `goalOptions`.
- `recentlyDeleted(s, today)`: transactions with `deletedAt` within the last 30 days.
- `lastUsedAccountId(s)` and `suggestedCategoryId(s, counterpartyOrNote)`. The suggestion first tries `applyRules` with a category action, then falls back to the most-used category for that text, then the most-used expense category this month.
- `sample.ts`: `sampleOps(memberIds, now)` builds the November 2026 household from `docs/design/prototype-prompt.md` (BCA Tahapan ••2231, Jago Savings, GoPay, BCA Credit Card, Cash; salary 12.000.000 from PT Maju Jaya on 15 Nov; category spending that totals 6.300.000; the five budgets; vehicle tax, rent and PLN; the Bali goal; the Kopi Kenangan, Grab, Indomaret and BCA→Jago rows). Members are Bia (B) and Wife (W), so the "· W" subtitles show. Opening balances are back-calculated so the final balances match the mockup.

  **Where sample.ts departs from the mockup:** the prototype data has the Bali goal at 4.500.000 saved but its pocket at 2.000.000. The sample keeps the goal's 4.500.000, so the Bali pocket holds 4.500.000 and Jago Free is **10.300.000**, not 12.800.000. The emergency fund goal is left out, because it has no funding source in the prototype data.

- [ ] **Step 1: Write the failing tests** against `applyOps(sampleOps(...)).state`:
  - `homeSummary('2026-11')` → income 12.000.000, expense 6.300.000, net 5.700.000, budget 9.000.000, ratio 0.7, left 2.700.000
  - `accountRows` balances 6.100.000 / 20.000.000 / 412.000 / −2.340.000 / 350.000, and `netWorth` 24.522.000
  - `categorySpend` shares, rounded: 33 / 19 / 18 / 17 / 12; Eating out has status `over`
  - `budgetHint` → Eating out, over by 150.000
  - `plansView` → total 5.900.000, PLN overdue by 2 days
  - `dayGroups('2026-11')` → the 20 Nov group is first and its day net is −62.000; the BCA→Jago row's title is "BCA → Jago Savings" and it does not count in the day's spending
  - deleting the Indomaret transaction lowers expense by 86.500, and `recentlyDeleted` lists it
  - `suggestedCategoryId` for "indomaret" → groceries once the sample's Indomaret rule exists
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run it. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(store): selectors and sample household`.

### Task 5: Home

**Files:**
- Create: `src/ui/components.tsx` (only what Home needs now: `Screen`, `Card`, `Row`, `IconCircle`, `Money`, `ProgressBar`, `MonthStepper`, `Kasi`), `src/ui/kasi.tsx`
- Modify: `src/app/(tabs)/index.tsx`
- Mockup: `V5Home`

**Interfaces:**
- Consumes: `homeSummary`, `accountRows`, `plansView` (for the tip), `budgetHint`.
- `Kasi { mood: 'happy' | 'thinking' | 'celebrating' | 'panic'; size }`: a yellow circle drawn with `react-native-svg`, with simple eyes and mouth per mood. No emoji glyph, so it looks the same on Android and iOS.
- **Kasi tip** (one, in this order): an overdue bill ("Electricity is 2 days overdue. Pay now" → Plans) → an over-budget category → a set-aside not done this month → "All on track". This is pure: `homeTip(s, today)` in `selectors.ts`, with a test.

- [ ] **Step 1:** Write a `homeTip` test (the sample data gives the PLN overdue tip; after PLN is paid, it gives the eating-out tip). Run it and watch it fail, then implement.
- [ ] **Step 2:** Build Home to match `V5Home`: a green header with member initials, "Our household" and "Hi, <name>", and the gear (→ Settings); the summary card overlapping the header (month stepper, Income / Expense / Total, the budget bar with "Budget 70% used" and "Rp 2.700.000 left"); the Kasi tip; "Accounts" with net worth and a row per account (→ the account detail screen from Task 8). The month stepper changes the summary only.
- [ ] **Step 3:** Verify in the browser at 390 px with the sample data, side by side with `V5Home`. All numbers match except Jago "10.300.000 free" (see Task 4). Then check desktop width.
- [ ] **Step 4:** Commit: `feat(app): home`.

### Task 6: Add and edit a transaction

**Files:**
- Create: `src/app/tx/new.tsx`, `src/app/tx/[id].tsx`, `src/ui/AmountPad.tsx`, `src/ui/Segmented.tsx`, `src/ui/ChipPicker.tsx`
- Modify: `src/store/selectors.ts` (`budgetImpact`), plus its test
- Spec: §8.2

**Interfaces:**
- `budgetImpact(s, categoryId, amount, date): { name; spentAfter; limit; ratioAfter; status } | null` (test: groceries + 86.500 → 2.186.500 of 3.000.000, 73%, ok).
- New transaction (a modal stack screen):
  - The amount pad comes first and takes the number keys only, formatting live as `86.500`.
  - An Expense / Income / Transfer switch.
  - Category chips, with the suggested one first.
  - The account, defaulting to the last used. For a transfer there is a "to account", and the category is hidden.
  - A pocket, only when the chosen account has pockets.
  - The date, defaulting to `todayJakarta()`, with quick chips for today, yesterday and pick. Plus an optional time and a note or counterparty.
  - The live budget impact line under the category ("Groceries: Rp 2.186.500 of 3.000.000 → 73%", amber at 80%, red over 100%).
  - Save is disabled until the amount is above 0 and the account is set (and a different to-account for transfers).
- Edit transaction: the same form, filled in, with "Last edited by <member>" (from `updatedBy`) and a screenshot marker if `source === 'screenshot'`. Save calls `update` with the changed fields only. Delete asks for confirmation ("Delete this transaction? You can restore it for 30 days.") → `remove` → back.

- [ ] **Step 1:** Write the `budgetImpact` test, watch it fail, then implement it.
- [ ] **Step 2:** Build both screens.
- [ ] **Step 3:** Verify in the browser:
  - Add Rp 86.500 Groceries on BCA; Home expense goes up by 86.500 and BCA goes down by the same.
  - Edit it to 90.000; both figures change.
  - Change it to a transfer BCA → Jago; Home expense drops back and both balances move.
  - Delete it; every figure returns to where it was.
- [ ] **Step 4:** Commit: `feat(app): add and edit transactions`.

### Task 7: Transactions tab

**Files:**
- Modify: `src/app/(tabs)/transactions.tsx`
- Mockup: `V5Trans`

**Interfaces:**
- Consumes: `dayGroups`, `calendarMonth`, `monthTotals`, `categorySpend`, `homeSummary`.
- Header: month stepper (← Nov 2026 →) and a search toggle; the Daily / Calendar / Monthly / Summary switch; the Income / Expense / Total row.
  - **Daily:** day cards (big date number, weekday pill that is dark for today, day net in red or green) with rows (emoji circle, title with 📸 for screenshot rows, subtitle, amount; income is green, transfers are grey). Tapping a row → edit (Task 6).
  - **Calendar:** a month grid of the days with small income and expense figures. Tapping a day jumps to it in Daily.
  - **Monthly:** the 12 months of the selected year with income, expense and net. Tapping one → that month in Daily.
  - **Summary:** expense and income by category for the month, with share.
- The floating "+" (red, as in the mockup, bottom right above the tab bar) → new transaction.
- An empty month shows Kasi (thinking) with "Nothing logged in November yet" and an Add button.
- Use `FlatList`/`SectionList` for Daily, so a month with 300 rows still scrolls smoothly on the Samsung.

- [ ] **Step 1:** Build the screen.
- [ ] **Step 2:** Verify it against `V5Trans` with the sample data at 390 px: the 20 Nov day net is 62.000, the transfer row is grey, and the 📸 marker shows on the Indomaret row. Check all four views, searching "kopi", and an empty month (Oct 2025).
- [ ] **Step 3:** Commit: `feat(app): transactions tab`.

### Task 8: Accounts and pockets

**Files:**
- Create: `src/app/settings/accounts.tsx` (list + add), `src/app/account/[id].tsx` (detail), `src/app/account/edit.tsx` (form, used for both new and edit), `src/app/account/move.tsx` (move money between pockets)
- Spec: §8.1, §8.5

**Interfaces:**
- Account form: name, type (bank, savings, credit card, e-wallet, cash; each with its emoji and tint from the mockup), institution, account number (full, used for matching in Plan 4; only the last 4 are shown, as `••2231`), opening balance (for a credit card: "amount owed now", stored negative), owner (optional member). Deleting an account that still has transactions asks for confirmation and says how many will be hidden with it.
- Account detail:
  - The balance and the split: one row per pocket plus "Free". When over-allocated, show a red "Over-allocated by Rp X" and Free 0, never a negative Free (spec §8.5).
  - This account's transactions (`dayGroups` filtered by account).
  - Buttons: Add pocket, Move money, Edit.
- Move money: from (Free or a pocket) → to (Free or a pocket) and an amount. It writes allocations in one `batch`: Free → pocket is `+amount` on the pocket; pocket → Free is `−amount`; pocket A → pocket B is `−amount` on A and `+amount` on B. Moving more than the source holds shows the amount in red and blocks Save.

- [ ] **Step 1:** Build the screens.
- [ ] **Step 2:** Verify in the browser:
  - Create Jago with an opening balance of 20.000.000 and add three pockets; Free shows the remainder.
  - Move 1.000.000 from Free → Rent; Free goes down and Rent goes up.
  - Add an expense paid from the Rent pocket; Rent goes down and Free stays the same.
  - Allocate more than the balance; the over-allocated state shows.
  - Create a credit card owing 2.340.000; Home shows −2.340.000 "owed".
- [ ] **Step 3:** Commit: `feat(app): accounts and pockets`.

### Task 9: Categories and budget setup

**Files:**
- Create: `src/app/settings/categories.tsx`, `src/app/settings/budgets.tsx`
- Spec: §8.8, §9

**Interfaces:**
- Categories: an expense / income switch; list, add, rename, change emoji (pick from a fixed set of about 40 emoji; no emoji keyboard needed), and delete. Deleting a category that has transactions asks for confirmation and moves them to "Other" in the same `batch`.
- Budget setup: every expense category with its monthly or yearly amount, or none. One row per category, tap to edit: an amount pad plus a Monthly / Yearly switch, and "No budget" removes it. The top shows the monthly total (Σ monthly + Σ yearly / 12).

- [ ] **Step 1:** Build both screens.
- [ ] **Step 2:** Verify: set Groceries to 3.000.000/month; Home's budget bar and Stats use it at once. Delete "Entertainment" while it has a transaction; the transaction now shows under Other.
- [ ] **Step 3:** Commit: `feat(app): categories and budgets`.

### Task 10: Stats

**Files:**
- Create: `src/domain/stats.ts`, `src/domain/__tests__/stats.test.ts`, `src/ui/Donut.tsx`
- Modify: `src/app/(tabs)/stats.tsx`, `src/store/selectors.ts`
- Mockup: `V5Stats`; spec §8.11

**Interfaces:**
- `stats.ts` (pure, with tests first):
  - `categoryTrend(txs, categoryId, endMonth, months = 12): { monthKey; amount }[]`
  - `incomeVsExpense(txs, endMonth, months = 12): { monthKey; income; expense; saved; savingsRate }[]` (`savingsRate` is 0 when income is 0)
  - `topCounterparties(txs, prefix, limit = 5): { name; amount; count }[]` (expenses only, grouped by normalised counterparty or note)
  - `categoryAverages(txs, categoryId, endMonth): { avg3; avg12 }` (complete months before `endMonth`, rounded to Rp 1.000)
  - `budgetAdvice(avg3, budget): 'too-low' | 'too-high' | 'ok'` (too-low when avg3 > budget × 1.1; too-high when avg3 < budget × 0.7)
- Screen, top to bottom:
  1. A month / year switch with a stepper, and an Expense / Income switch.
  2. The donut (category colours from the mockup, "Spent 6,3jt" in the middle).
  3. "Budget 70% used, Rp 2.700.000 left for 10 days", with an On track / Watch it / Over pill.
  4. The Kasi hint from `budgetHint`, with **Adjust budget**, which sets that budget to its 3-month average after a confirmation.
  5. Category rows with the share badge, emoji, amount and budget bar.
  6. Below the mockup's content: income vs expense per month (bars plus savings rate), a 12-month trend for the selected category, top merchants, and the budget-tuning list (3-month and 12-month average next to each budget, with the advice and "Set to average").
- Filters (member, account) as chips above the donut. All of these screens compute from `txs` filtered first, so the filter applies everywhere.

- [ ] **Step 1:** Write the `stats.ts` tests (12 months with one empty month in the middle; savings rate when income is 0; Indomaret twice and Pertamina once → Indomaret on top; deleted and transfer transactions never count). Run them and watch them fail, then implement.
- [ ] **Step 2:** Build the screen.
- [ ] **Step 3:** Verify against `V5Stats` with the sample data: shares 33 / 19 / 18 / 17 / 12, the Eating out bar red at 100%, and Transport amber. Switch to Year, then to Income; filter to member W.
- [ ] **Step 4:** Commit: `feat(app): stats`.

### Task 11: Plans, bills and goals

**Files:**
- Modify: `src/app/(tabs)/plans.tsx`
- Create: `src/app/plans/bill.tsx` (editor, new or edit), `src/app/plans/goal.tsx` (editor), `src/app/plans/[kind]/[id].tsx` (detail with actions), `src/ui/Ring.tsx`
- Mockup: `V5Plans`; spec §8.6, §8.7

**Interfaces:**
- Consumes: `plansView`.
- Plans screen:
  - The "Plans" title with a "New" button (bill or goal).
  - The green hero "Set aside each month Rp 5.900.000 · Bills 4.400.000 · Goals 1.500.000", with a ring for `doneCount/itemCount`.
  - An overdue banner per overdue bill (Kasi panic, "PLN is 2 days overdue! Rp 650.000", **Paid**).
  - Bill cards in a 2-column grid (emoji circle, due chip, name, "400.000/mo", a funded bar, "1,2jt of 3,6jt", or "Funded ✓", or "Behind by Rp 400.000" in amber).
  - Goal rows ("4,5jt of 15jt · Jun 2027", a bar, "Need 1,5jt/mo · can afford 1,1jt", and **See options** when there is a gap). A reached goal shows Kasi celebrating.
- Bill editor: name, emoji, amount, due date, repeat (once, monthly, yearly, every N months), category for the payment, funding (a pocket in an account, with an option to create one, **or** a whole linked account), and reminder offsets stored as `[7, 1, 0]` by default. The reminders themselves are Plan 6.
- Goal editor: name, emoji, target, optional target date, and funding.
- Actions on a bill or goal detail:
  - **Mark set aside** (this month's amount, editable): for pocket funding it creates an allocation. For account funding it opens a prefilled transfer form (from the last used account to the linked account).
  - **Paid** (bills): in one `batch`, an expense of `amount` from the funding account (with `pocketId` for pocket funding) and the bill's category, then for a recurring bill `dueDate = nextDueDate(bill)`, or for a once bill `paidAt = today`.
  - Goal **See options**: a sheet with "Move date to Sep 2027", "Lower target to Rp 12.200.000" and "Keep as is", using `goalOptions`.
- Deleting a bill or goal leaves its pocket and money in place.

- [ ] **Step 1:** Build the screens.
- [ ] **Step 2:** Verify with the sample data against `V5Plans`:
  - The hero shows 5.900.000 and the PLN banner shows.
  - Paid on PLN: the banner goes, a 650.000 Utilities expense appears in Transactions, and the PLN due date moves to 18 Dec.
  - Mark set aside on vehicle tax: the card still says 400.000/mo and the ring goes up by one.
  - On the Bali goal, choose Move date; the gap is gone.
- [ ] **Step 3:** Commit: `feat(app): plans, bills and goals`.

### Task 12: Settings, recently deleted, backup

**Files:**
- Modify: `src/app/settings/index.tsx`
- Create: `src/app/settings/deleted.tsx`, `src/store/backup.ts` (+ `backup.web.ts`)
- Mockup: `V5Settings`

**Interfaces:**
- Settings is laid out like `V5Settings`, showing only rows that work now:
  - **Money:** Accounts & pockets (count), Categories (count), Budget setup.
  - **Data:** Recently deleted (count), Back up now, Developer.
  - The mockup's other rows (Auto-mapping rules, Members, Sync & storage, Theme, Accent colour, Show Kasi tips, Reminders, Export) arrive in Plans 4–6. Leave them out rather than showing dead rows.
- Recently deleted: the `recentlyDeleted` list with **Restore** on each row.
- Back up now: `serializeBackup(await db.loadAll(), { householdId: 'local', exportedAt })` saved as `household-backup-YYYY-MM-DD.json`. On web it is a download through a Blob link; on Android it is written with expo-file-system to the cache folder, then shared with `expo-sharing`. **Why it is in this plan:** until Plan 5 syncs to Drive, the phone is the only copy of the data, and iOS can evict web storage.

- [ ] **Step 1:** Build it.
- [ ] **Step 2:** Verify: delete a transaction, restore it from Recently deleted, and check that every total is back. Back up now on web downloads a JSON file whose `ops` count matches Developer's op count. `parseBackup` of that file in a Node REPL (or a quick Jest check) succeeds.
- [ ] **Step 3:** Commit: `feat(app): settings, recently deleted, backup`.

### Task 13: Polish pass

- [ ] **Step 1:** Use the `impeccable` skill to critique each tab against its v5 artboard and fix the differences (spacing, type weights, colours, empty states). Then use the `web-design-guidelines` skill as an accessibility check: labels on icon buttons, contrast of the muted text on `#F4F6F5`, and 44 px targets.
- [ ] **Step 2:** Large text: set the system font to its largest size on Android. Nothing may be clipped on Home, a transaction row or the amount pad.
- [ ] **Step 3:** Commit: `fix(app): polish pass`.

### Task 14: Both phones

- [ ] **Step 1:** Run `npx jest`, `npx tsc --noEmit` and lint. Expected: all clean.
- [ ] **Step 2:** Build and install the APK on the Samsung. Deploy the PWA (`npm run deploy`); `/spikes/*` and `/picker` must still load, because the Drive spike may still be in progress. Reopen the home-screen app on the iPhone so it picks up the new version (it can take two opens; see Plan 1).
- [ ] **Step 3:** On each phone, from the home-screen icon or the APK:
  1. Onboard with your name, then Start empty.
  2. Add two accounts, one pocket and five transactions, including a transfer and one paid from the pocket.
  3. Force-quit, turn on airplane mode and reopen. Every number must be the same.
  4. Back up now and confirm the file opens.
  5. Note anything slow (a cold start over 3 s, the Daily list stuttering).
- [ ] **Step 4:** Record the results in `docs/plans/plan-3-results.md` (pass or fail per step and per phone, with the date). Commit: `docs: plan 3 device results`.
