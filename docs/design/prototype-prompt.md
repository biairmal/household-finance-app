# Prompt: build the clickable prototype

Paste everything below the line into Claude Code, in an empty folder.

---

Build a **clickable, high-fidelity prototype** of a mobile household-finance app. Use my design skills **design-taste-frontend** and **impeccable** for every screen: load them before writing any UI, and do a polish pass with them at the end.

## What the app is
A shared money app for one household (me and my wife first; other households later). Both members log income, expenses and transfers across all their accounts (bank/debit, savings, credit card, e-wallets like GoPay/OVO, cash). The app shows monthly and yearly budgets that react as we spend, savings goals with "how much per month", and bills (including yearly ones like vehicle tax) with a monthly set-aside so they're never paid out of real savings. The main input is **importing screenshots of mobile-banking transaction history**: the app reads them, auto-categorizes known payees, detects transfers between our own accounts and flags duplicates. It works offline and syncs through the household's own Google Drive.

Locale: Indonesia. Currency is IDR only, formatted `Rp 2.700.000` (dot thousands, no decimals). Abbreviations like `2,1jt` / `412rb` are OK in tight spots. UI copy in English.

## Tech for the prototype
- Expo (React Native) + TypeScript + expo-router, runnable in the browser (`npx expo start --web`) and on an Android phone. This is the stack the real app will use, so build components cleanly enough to reuse.
- Mock data only, in one `mock/` module. No backend, no auth. Local state is fine for toggles, checkboxes and navigation.
- Phone-first layout (390×844 reference). No fake status bars.

## Design direction
- Modern, clean, calm. Think a premium fintech app, not a playful one. **No mascot and no emoji.**
- Mostly neutral (near-black ink on near-white), with **one accent green used only for positive meaning** (income, funded, on track). Amber = warning (≥80% of budget), red = over budget or overdue. Goals may use one secondary accent.
- One large hero number per screen, with tabular numerals.
- Prefer lists with hairline dividers over a card per item. Modest radii (8–12px, pills for chips). No heavy shadows, no gradients, no decorative animation. Motion only where it explains something (sheet open/close, row removed, progress filling once).
- Line icons (e.g. lucide-react-native), one consistent set.
- Touch targets ≥44px, text contrast AA, works with large text.
- Bottom tab bar: Home, Activity, **[center: Import screenshot]**, Budgets, Plans. Settings and Accounts are reached from Home's header.

## Screens and flows to build
1. **Welcome / household setup:** sign in with Google, then create a household (name it, pick the storage folder) or join one via invite. Then add the first accounts.
2. **Home:** period selector (month), "Left to spend" hero with "of Rp X budget · N days left", a daily-spending bar chart for the month with a dashed daily-pace line (past days, today highlighted, future days empty), Income / Spent / Set aside row, an "Upcoming" list (overdue bill on top, next bills, this month's set-asides with a "Mark set aside" action), and recent transactions. Member avatars in the header.
3. **Activity:** all transactions grouped by day, with search, filters (member, account, category, type), and a marker on screenshot-imported rows. Tapping a row opens **Edit transaction** (amount, date/time, type, account(s), category, pocket, note, counterparty) with Delete (confirm, then "restorable for 30 days"). Show "last edited by".
4. **Add transaction (manual):** fast amount keypad first, then category / account with smart defaults; expense / income / transfer switch. Show live budget impact ("Groceries: Rp 2.100.000 of 3.000.000 → 73%").
5. **Import flow:**
   a. Pick screenshots (multi-select) and confirm which account they belong to.
   b. Reading state (progress, can leave the screen). Offline variant: "Queued, will read when you're online".
   c. **Review:** each detected row with a checkbox and editable fields. Row types: auto-categorized (shows the rule used), transfer to own account ("not spending"), possible duplicate (unticked, with what it matches), unknown payee (category chips plus "Always use X for this payee? Create rule"), income. A footer shows totals selected and budget impact, with the primary "Save N transactions" button.
   d. Success state, then back to Home.
6. **Budgets:** Month / Year switch and period stepper. Hero "Spent" of the total budget, a stacked bar by category, then a row per category with a thin progress bar and amounts. Warning and over states, and on over-budget rows "3-month avg · Adjust". Yearly budgets section (holidays, Lebaran gifts, school fees).
7. **Stats:** month/year with filters. Spending by category vs budget, a 12-month trend per category, income vs expense per month with savings rate, top merchants, and a budget-tuning helper (3- and 12-month averages next to the budget, "set to average").
8. **Plans (bills and goals):** hero "Set aside each month". Overdue banner with "Mark paid". Bill rows with funded progress, monthly set-aside and due date. The "behind" state: "You're Rp 400.000 behind, Rp 500.000/mo until May". Goal rows showing **Needed per month vs You can afford** and the gap, with options (move date, lower target). A reached-goal state.
9. **Bill / goal editor:** amount, due date, repeat (once, monthly, yearly, every N months), funding source (pocket in an account **or** a whole linked account), reminder offsets (7 days, 1 day, on the day).
10. **Accounts and pockets:** account list (type, institution, last 4 digits, balance; credit card shown as amount owed). Account detail splits the balance into pockets plus "Free", e.g. Savings Rp 20.000.000 = Rent 4.000.000 + Vehicle tax 1.200.000 + Bali trip 2.000.000 + Free 12.800.000, with an over-allocated warning state.
11. **Auto-mapping rules:** list of rules ("Account no. 1234…, name contains 'Indomaret' → Groceries", "→ Transfer to Jago Savings"), add/edit a rule.
12. **Settings:** household members (invite by Google email, remove), reminders ("Remind me via: app notifications / Google Calendar"), storage (Google Drive folder, last sync), export (CSV zip / full JSON backup), categories.

Global states to show somewhere: **offline banner**, **syncing / last synced**, **sync conflict notice** ("Edited by both, see the other version"), empty states for a new household, and an error state for a failed screenshot read.

## Mock data to use
- Members: Bia (B) and his wife (W).
- Accounts: BCA Tahapan ••2231 (daily spending, Rp 6.100.000); Jago Savings (Rp 20.000.000, pockets as above); GoPay (Rp 412.000); BCA Credit Card (owed Rp 2.340.000, due 5 Dec); Cash (Rp 350.000).
- November 2026, today 20 Nov. Income Rp 12.000.000 (salary from "PT Maju Jaya" on 15 Nov). Budget Rp 9.000.000 total: Groceries 3.000.000 (spent 2.100.000), Transport & fuel 800.000 (760.000), Eating out 1.000.000 (1.150.000, over), Utilities 1.500.000 (1.100.000), Shopping 1.700.000 (1.190.000).
- Bills: Vehicle tax Rp 3.600.000 due 15 May 2027, funded 1.200.000, 400.000/mo. Apartment rent Rp 4.000.000 monthly, due 1 Dec, funded. PLN electricity Rp 650.000, 2 days overdue.
- Goals: Bali trip Rp 15.000.000 by Jun 2027, saved 4.500.000, needs 1.500.000/mo, affordable 1.100.000/mo. Emergency fund Rp 30.000.000, reached.
- Import sample (BCA, 2 screenshots): Indomaret Kemang −86.500 (Groceries, auto); Transfer to Jago Savings 1.500.000; Pertamina Fatmawati −150.000 (possible duplicate of 17 Nov); Budi Santoso −250.000 (unknown); PT Maju Jaya +12.000.000 (Salary, auto).

## Deliverable
A running prototype where I can tap through every screen and flow above. Finish with the skill-guided polish pass, then list anything you simplified or left out.
