# Household Finance App: Design

Date: 2026-11-20 · Owner: Bia · Status: ready for approval

## 1. Intent and the why

A shared money app for one household (Bia and his wife first, other households later). Both members track income, expenses and transfers across all their accounts (debit, credit card, e-wallets, savings), see budgets react as they spend, know how much to set aside monthly for goals and for yearly bills (like vehicle tax) without eating into real savings, and get reminded before bills are due.

What makes it worth building over existing apps:
- **Almost no typing.** Pick a screenshot of a mobile-banking transaction history; the app reads it and fills in transactions. Known payees/accounts get categorized automatically.
- **The household owns its data.** Data lives in the household's own Google Drive, never on Bia's server. This also makes a future paid product possible without Bia holding anyone's financial data.
- **Works offline**, syncs when online, exports easily.
- **Feels like an app**, not a website in a browser.

Success: Bia and his wife log a month of real spending mostly from screenshots, trust the budget/bill/goal numbers, and never have to reconcile duplicates by hand.

## 2. Goals

1. Shared household with multiple members, equal rights.
2. Accounts: debit/bank, savings, credit card, e-wallet, cash. Transactions: income, expense, transfer.
3. Screenshot import → review screen → save. Works with multiple screenshots at once.
4. Auto-mapping rules: recognized counterparty → category, or → transfer to own account.
5. Pockets (envelopes) inside accounts; bills funds and goals can be a pocket or a real linked account.
6. Bills: amount, due date, recurrence; monthly set-aside calculated; reminders before/on/after due date.
7. Goals: required monthly amount vs. affordable amount, with the gap shown.
8. Budgets: monthly and yearly per category; usage shown at entry time.
9. Offline-first with sync through Google Drive.
10. Export: CSV and full JSON backup.
12. Monthly and yearly spending stats to help adjust budgets.
11. Storage provider swappable (Drive first; Dropbox/iCloud later).

## 3. Non-goals (v1)

- App Store / Play Store release (Android installs via APK; iPhone uses the installed web app).
- Direct bank API connections / open banking.
- Multi-currency (Bia's decision: out of scope for now; IDR only, Indonesian number formatting). The data model still stores a currency code on every account and amounts as integers in the currency's smallest unit, so USD savings accounts can be added later without migrating data. The hard part later is totals across currencies and IDR↔USD transfers, which need exchange rates. Likely first step later: per-account currency with no conversion (separate totals per currency, cross-currency transfers record both amounts).
- Investments, stock/crypto tracking, net-worth charts beyond account balances.
- Roles/permissions (view-only etc.). Everyone in a household is equal.
- Billing/subscriptions for other households. The architecture must not block it, but nothing is built.
- iPhone "Share to app" from the Photos app (not possible for a web app on iOS).

## 4. Anti-goals (failure even if it "works")

- Any household's financial data stored on Bia's server (including screenshots, transactions, bill dates, OAuth refresh tokens).
- Logging takes more effort than a spreadsheet.
- Numbers that double-count (credit card purchase + card payment both as spending; the same transaction imported from two overlapping screenshots; a transfer counted as income on one side).
- Sync silently loses a member's edits.
- "Free savings" quietly includes money already promised to rent or bills.

## 5. Constraints

- Bia is a solo builder; near-zero budget. No Apple developer fee (USD 99/yr) or Play fee (USD 25) in v1.
- Phones: Bia on Samsung Android, wife on iPhone.
- Running costs must fit free tiers except per-screenshot AI cost.
- Google Drive access limited to the narrow `drive.file` scope (files the app created or the user opened with the app). Full-Drive scopes require a paid security assessment.
- Locale: Indonesia (Asia/Jakarta, IDR, Indonesian banks and e-wallets such as BCA, Mandiri, BRI, Jago, SeaBank, GoPay, OVO, DANA, ShopeePay).

## 6. Approaches considered

| Approach | Trade-offs | Verdict |
|---|---|---|
| **A. Expo (React Native) app, one codebase → Android APK + installable web app (PWA) for iPhone** | Native feel on Android, share-to-app on Android, on-device notifications on Android, robust native SQLite. Two build targets to test; React Native Web has rough edges. | **Chosen by Bia.** |
| B. Web app (PWA) for both phones | One build, simplest to maintain, Android share-target still works. Less native feel, browser storage slightly less robust, no on-device scheduled notifications. | Recommended as simpler, but Bia prefers Expo's native Android experience. |
| C. Store apps on both (Expo/Flutter) | Best experience on both, iOS share sheet. USD 99/yr + USD 25 and store review. | Deferred until the app earns money; Approach A upgrades to this without rewriting. |
| D. iPhone sideload with free Apple ID | Real app on iPhone for free, but it expires every 7 days and needs a Mac/AltStore refresh. | Rejected: too fragile for daily use. |

Language: TypeScript (Claude's call; Bia didn't indicate Dart experience).

## 7. Architecture overview

```
 Bia's Android (Expo APK)        Wife's iPhone (Expo web build, home-screen PWA)
   local SQLite + op log            local SQLite (wasm/OPFS) or IndexedDB + op log
        │   ▲                               │   ▲
        ▼   │   sync (append own ops,       ▼   │
   ┌──────────────────── household folder in Google Drive ─────────────────┐
   │  ops/<deviceId>/*.jsonl   snapshots/*.json   attachments? (none v1)   │
   └───────────────────────────────────────────────────────────────────────┘
        │                                   │
        └──────── HTTPS ───────► Stateless edge service (e.g. Cloudflare Worker)
                                   • screenshot → AI vision model → JSON transactions
                                   • OAuth code→token exchange / refresh (holds client secret only)
                                   • stores nothing
        Google Calendar (household calendar events with alerts) ◄── written by the app
```

### 7.1 Client
- Expo (current SDK), TypeScript, expo-router. Same UI code for Android and web.
- Platform-specific modules behind small interfaces: `ShareIntake` (Android share target vs. in-app picker), `Notifier` (local notifications on Android; no-op on web), `LocalStore` (native SQLite vs. web storage).
- Web build is a PWA: manifest, service worker caching the app shell so it opens offline, `display: standalone`.

### 7.2 Local data and sync (the core risk area)
- Each device keeps the full household dataset locally and works fully offline.
- Every change is recorded as an operation (create/update field/delete) with an id, entity id, timestamp from a hybrid logical clock, device id and author.
- **Sync protocol over Drive:** each device only ever writes its own files (`ops/<deviceId>/<seq>.jsonl`, batched). On sync, a device uploads its new ops and downloads other devices' new files, then merges. No two devices write the same file, so Drive never has edit conflicts.
- **Money movements are their own records, and balances are always computed from them** (Claude's call). Transactions, pocket allocations ("mark set aside"), bill payments and balance checks are each their own record. A pocket's amount or an account's balance is the sum of its records, never a stored number. Two members doing money actions offline therefore never conflict: both records survive. The records themselves stay fully editable and deletable (§8.2), and totals recompute.
- **Merge rule for edits:** per-field last-writer-wins by hybrid logical clock (e.g. both members rename a category, or change the same transaction's category); deletes are tombstones. Every overwritten value goes into a local conflict log, and the record shows "edited by both, tap to see the other version" so nothing is lost silently (Claude's call). Creating the same thing twice (e.g. both members import the same screenshot) is handled by duplicate detection (§8.3), not by sync.
- Periodic snapshots so a new device or a reinstalled web app doesn't replay the full history.
- Sync triggers: app open, after local changes (debounced), when connectivity returns, manual pull-to-refresh.
- Storage provider behind a `StorageProvider` interface (list/read/append/create folder/share) so Dropbox/iCloud can be added.

### 7.3 Household and members
- One member creates the household → app creates a Drive folder and a household metadata file.
- Inviting: owner enters member's Google email → app shares the folder via Drive permissions → member signs in and selects the household folder via the Google Picker, which grants the app access under `drive.file`.
- All members have equal rights. Leaving/removing a member = removing Drive sharing.

### 7.4 Edge service (stateless)
- Single small service (Cloudflare Workers free tier as Claude's default).
- **Auth:** requires a valid Google ID token; rejects others. Per-user rate limit (e.g. N screenshots/day) using only a counter keyed by hashed user id, so strangers can't run up the AI bill.
- **Screenshot endpoint:** accepts 1–10 images (client downscales/compresses first), sends to an AI vision model with a strict JSON schema, returns transactions. Nothing logged or stored. Model is configurable. Default: a Google Gemini Flash vision model (Bia tested Gemini on his real screenshots and it read them well). Pin a specific model version in the API rather than relying on auto-selection. Free tier for development only, because free-tier inputs may be used by Google to improve its products; paid tier for real household data. Claude Haiku as the fallback provider.
- **OAuth broker:** a browser web app can't safely hold a Google client secret or get long-lived refresh tokens on its own. The service does the authorization-code exchange and refresh, and returns tokens to the device. The refresh token is stored only on the device. The service keeps only the client secret.
- Bring-your-own-key mode (household supplies its own AI key) is a later option, not v1.

## 8. Features

### 8.1 Accounts
- Types: bank/debit, savings, credit card, e-wallet, cash. Each has name, institution, last-4/account number (for matching), opening balance, owner member (optional).
- Credit card balance is a liability. Card purchases are expenses; card payments are **transfers** from a bank account to the card.
- Balance = opening balance + sum of transactions. The user can enter a "balance check" from the screenshot or by hand; mismatches are shown (no auto-correction).

### 8.2 Transactions
- Fields: date/time, amount, type (income/expense/transfer), account (and to-account for transfers), category, pocket (optional), note, counterparty (name, account number), source (manual/screenshot), external ref (if the screenshot shows one), author.
- **Every transaction can be edited or deleted after it's saved** (Bia's requirement), whether it was imported from a screenshot or entered by hand: amount, date/time, type, accounts, category, pocket, note, counterparty. Changing an amount, date or account recomputes balances, budgets, pockets, bills and goals. Changing a transfer updates both sides. Deleting asks for confirmation, and the transaction stays restorable for 30 days (tombstone). Each transaction shows "last edited by <member>". Screenshot-imported rows keep a marker so users can find and spot-check them.
- Manual entry stays fast: amount, category, account, with smart defaults (last used account, suggested category).

### 8.3 Screenshot import
Flow:
1. Android: Share from Gallery to the app (one or many images), or pick in app. iPhone: open the app → "Import screenshot" → multi-select from Photos.
2. The user picks which account the screenshot belongs to (pre-selected if the app recognizes the bank layout or the last-used account).
3. Offline: images queue locally and process when online. A badge shows queued items.
4. Service returns rows: date, time (if shown), amount, debit/credit direction, description, counterparty name/account number, reference no., running balance (if shown).
5. **Review screen:** every field of every row can be corrected before saving (amount, date, direction, description, account, category). Each row shows the proposed type, category and transfer match, flags duplicates, and has an include/exclude toggle. "Save all" commits them.
6. **Duplicate detection:** fingerprint = account + date + amount + direction + (reference no. or normalized description). Rows matching existing transactions are unchecked by default with a "possible duplicate" label. This covers overlapping screenshots and both members importing the same one.
   - **After sync (Bia's decision):** duplicates created on two devices offline are auto-merged only when certain: the same bank reference number, or the same running balance after the transaction on the same account. Everything else that matches the fingerprint is flagged "Possible duplicate, merge?" with one-tap merge or keep both. Real repeats (two identical rides in a day) are never deleted automatically.
7. **Transfer pairing:** if a row's counterparty matches one of the household's own accounts, it becomes a transfer. When the other side is later imported from the other account's screenshot, it is matched to the existing transfer instead of creating a second record (same amount, ±1–2 days).
8. Screenshots are not kept after import (v1).

### 8.4 Auto-mapping rules
- A rule = match conditions (counterparty account number equals, counterparty name contains, description contains, optionally the account) → action (set category / mark as transfer to account X / set pocket).
- Rules apply on screenshot import and on manual entry suggestions.
- Learning: when a user changes a category on the review screen, the app offers "Always categorize <counterparty> as <category>?" → creates a rule.
- Rules sync like any other data. Priority: most specific match wins (account number > name > description); ties go to the most recently edited rule.

### 8.5 Pockets (envelopes)
- Any account can have pockets. An account's balance is split into named pockets plus "Free" (the remainder).
- Moving money between pockets is an allocation, not income or spending.
- Example: Savings Rp 20jt = Rent Rp 6jt + Vehicle tax Rp 1.2jt + Free savings Rp 12.8jt.
- If pockets exceed the account balance, the app shows it as over-allocated (red), never a negative "Free".
- A bill fund or goal is either a pocket in an account or a whole linked account (e.g. a dedicated Jago pocket); in the second case its funded amount is that account's balance.

### 8.6 Bills
- Fields: name, amount, due date, recurrence (once, monthly, yearly, every N months), funding source (pocket or linked account), reminder offsets.
- Monthly set-aside = (amount − currently funded) ÷ full months remaining until due. Recomputed each month. If behind, the remaining months' amount rises and the app says so ("You're Rp 400.000 behind; set aside Rp 500.000/month until August").
- Paying a bill = expense from the funding pocket/account; for recurring bills the next cycle starts.
- Monthly bills like rent are also bills (the pocket holds this month's rent).
- Dashboard: "This month, set aside: Vehicle tax Rp 400.000, Rent Rp 4jt, …" with a one-tap "mark set aside", which records the pocket allocation or prompts for the transfer to a linked account.

### 8.7 Goals
- Fields: name, target amount, target date (optional), funding source (pocket or linked account).
- Shows **required monthly** = (target − funded) ÷ months remaining.
- Shows **affordable monthly** = average monthly income (last 3 months, or a figure the user sets) − monthly budgets − bill set-asides − other goals' required amounts.
- If required > affordable, show the gap and options: extend the date, lower the target, or accept it.

### 8.8 Budgets
- Monthly budget per category; yearly budget per category for lumpy spending (holidays, gifts, school fees).
- A category can have a monthly budget, a yearly budget, or none.
- On every expense entry or review screen row: "Food: Rp 2.1jt of Rp 3jt used this month", turning amber at 80% and red over 100%.
- Budget overview screen for the month and year. No rollover in v1 (Claude's call).

### 8.9 Reminders
- **Google Calendar (Claude's call on mechanics):** each member's own device manages a "Household bills" calendar in *that member's* Google account, created by the app under the `calendar.app.created` scope (the app can only touch calendars it created). Every device rebuilds its events from the synced bill data, so no device ever writes to another member's calendar and no calendar sharing is needed. Alerts default to 7 days before, 1 day before and on the day (configurable per member). If `calendar.app.created` proves unworkable in the spike, fall back to events in the member's primary calendar with per-event reminders (needs `calendar.events`).
- **Android (Bia's request: the richer notifications):** local notifications scheduled on the phone, with current numbers ("Vehicle tax due in 3 days, Rp 400.000 short"); tapping opens the bill. Rescheduled whenever bills, pockets or balances change after a sync.
- **No double alerts:** per-member setting "Remind me via: app notifications / Calendar". Android members default to app notifications, and their calendar events are created without alerts (events still visible). iPhone members default to Calendar alerts.
- **Overdue:** shown in the app on open (both phones); Android also gets a local overdue notification. Calendar can't express "overdue", so on iPhone overdue shows in the app only.

### 8.10 Export
- Any time, from settings: CSV per entity (transactions, accounts, categories, budgets, bills, goals) zipped, plus one full JSON backup that can be re-imported.
- The Drive folder itself is also readable data (snapshots are JSON).

### 8.11 Stats (Bia's requirement)
- **Period switch:** month or year, with previous/next navigation. Filters: member, account, category.
- **Spending by category:** total and share of total, with budget vs actual for each category.
- **Trend:** spending per category across the last 12 months (or several years in year view), so seasonal patterns like Lebaran or school fees are visible.
- **Income vs expense** per month, with the amount saved and the savings rate.
- **Top counterparties/merchants** by total spent.
- **Budget tuning helper:** for each category, the 3-month and 12-month averages next to the current budget, with "budget looks too low/high" hints and a one-tap "set budget to average".
- Transfers and pocket allocations are excluded from spending. Credit card purchases count when made, not when the card is paid.
- Chart library left to the builder.

### 8.12 Navigation, settings and look (Bia's direction, from the mockup rounds)
- **UX benchmark:** Money Manager by Realbyte for speed of entry and navigation. Visual inspiration: Gojek (cards, colorful icons) and Copilot Money (clean grouped lists). Patterns are borrowed, not their branding.
- **Tabs:** Home · Transactions · [Scan screenshot, centre] · Stats · Plans. Settings is reached from the gear on Home.
- **Home:** month summary (Income / Expense / Total plus budget used), one Kasi tip, then **all accounts with balances and net worth**. No grid of rarely used shortcuts.
- **Transactions:** month navigation, Daily / Calendar / Monthly / Summary views, day groups with day totals, a marker on screenshot-imported rows, and a floating "+" for manual entry.
- **Stats:** expense/income donut by category, with budget progress per category and the over-budget hint.
- **Plans:** set-aside summary, overdue alert, bill cards, goals.
- **Settings:** accounts & pockets, categories, auto-mapping rules, budget setup, members, sync & storage, theme (light/dark/system plus accent color), Kasi tips on/off, reminders, export & backup.
- **Look:** Plus Jakarta Sans; green accent; emoji-style icons in soft colored circles for accounts, categories and settings; rounded cards (14–16px); round checkboxes matching the rounded buttons. Income is green, expenses are red only in totals.
- **Kasi mascot:** a plain round yellow emoji-style face (happy, thinking, celebrating, panic). Used sparingly: one tip on Home, the import screen, over-budget and overdue moments. Can be turned off.
- Mockups: https://claude.ai/artifact/KvNZnkqRkAadqbaBJBUMaQ (version 5 row is current).

## 9. Default categories
Indonesian-household starter set, editable: Food & groceries, Eating out, Transport & fuel, Housing/rent, Utilities (PLN, PDAM, internet, pulsa), Health, Education, Shopping, Family & gifts, Religious giving (zakat, infaq), Entertainment, Subscriptions, Vehicle (tax, service), Fees & admin, Other. Income: Salary, Bonus/THR, Side income, Other income.

## 10. Risks to validate first (spike before full build)
1. **Drive sharing under `drive.file`:** confirm that a second member can read and append to the files in a folder created by the owner's session once they open it via the Picker, including new files created later by the owner's device. If not, change the layout (e.g. each member's device writes to its own folder and shares it).
2. **Offline storage in the Expo web build on iOS Safari (installed PWA):** confirm SQLite-on-web (expo-sqlite web / wasm + OPFS) works and persists in standalone mode. Fallback: IndexedDB-backed store behind `LocalStore`.
3. **Google OAuth in an iOS home-screen web app:** confirm sign-in and redirect work in standalone mode, with tokens refreshed via the edge service.
4. **Screenshot accuracy:** test on real screenshots from the household's actual banks/e-wallets (to be collected from Bia). Target: ≥95% of rows correct in amount/date/direction before relying on it.
5. **Google app verification:** the Calendar scope (`calendar.app.created`, or `calendar.events` as fallback) is "sensitive". In "Testing" mode, refresh tokens expire after 7 days, so Bia's own household should go through Google's free verification (privacy policy page, short demo video) early. `drive.file` is non-sensitive.

**If spike 2 or 3 fails on iPhone** (Claude's call): stop and bring the result back to Bia before building further. The options then are keeping Expo for Android with a different iPhone version, or switching both phones to the plain web app (Approach B). Spikes 1–3 come before any feature work.

## 11. Left to the builder
- Exact libraries (state management, UI kit, sync clock implementation, zip/CSV).
- Database schema details and op-log file batching sizes.
- Exact AI prompt/schema, image downscaling parameters, rate-limit numbers.
- Screen-level details beyond §8.12 and the mockups.
- Testing strategy (unit tests for money math, budget/bill/goal calculations and merge logic are mandatory; they're where bugs cost trust).
