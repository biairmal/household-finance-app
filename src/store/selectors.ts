// Every number a screen shows comes from here, and every calculation here calls src/domain.
import { accountBalance, totalsForPeriod } from '../domain/balances';
import { budgetUsage } from '../domain/budgets';
import { daysBetween, daysInMonthKey, monthOf, todayJakarta } from '../domain/dates';
import { averageMonthlyIncome, goalOptions } from '../domain/goals';
import { formatAmount } from '../domain/money';
import { PlanCtx, billMonth, goalMonth, plansSummary } from '../domain/plans';
import { accountSplit } from '../domain/pockets';
import { applyRules } from '../domain/rules';
import { budgetAdvice, categoryAverages, categoryTrend, incomeVsExpense, topCounterparties } from '../domain/stats';
import { EntityName, State } from '../domain/sync/ops';
import { Account, AccountType, Allocation, Bill, Budget, Category, Goal, Member, Pocket, Rule, Transaction, live } from '../domain/types';

/** Live records of one entity, cached per table object (the store copies a table only when an op touches it). */
function list<T extends { deletedAt?: string }>(entity: EntityName, includeDeleted = false) {
  const cache = new WeakMap<object, T[]>();
  return (s: State): T[] => {
    const table = s[entity];
    let v = cache.get(table);
    if (!v) {
      const all = Object.values(table) as unknown as T[];
      v = includeDeleted ? all : live(all);
      cache.set(table, v);
    }
    return v;
  };
}

/** Caches a derived value per State object and argument list. */
function memo<A extends unknown[], R>(fn: (s: State, ...args: A) => R) {
  const cache = new WeakMap<State, Map<string, R>>();
  return (s: State, ...args: A): R => {
    let m = cache.get(s);
    if (!m) cache.set(s, (m = new Map()));
    const key = JSON.stringify(args);
    if (!m.has(key)) m.set(key, fn(s, ...args));
    return m.get(key)!;
  };
}

export const accounts = list<Account>('account');
export const transactions = list<Transaction>('transaction');
export const allTransactions = list<Transaction>('transaction', true);
export const categories = list<Category>('category');
export const allCategories = list<Category>('category', true);
export const pockets = list<Pocket>('pocket');
export const allocations = list<Allocation>('allocation');
export const budgets = list<Budget>('budget');
export const bills = list<Bill>('bill');
export const goals = list<Goal>('goal');
export const members = list<Member>('member');
export const allMembers = list<Member>('member', true);
export const rules = list<Rule>('rule');

export const ctx = memo((s): PlanCtx => ({ accounts: accounts(s), pockets: pockets(s), allocations: allocations(s), txs: transactions(s) }));

const byId = <T extends { id: string }>(xs: T[]) => new Map(xs.map((x) => [x.id, x]));
const categoryMap = memo((s) => byId(allCategories(s)));
const accountMap = memo((s) => byId(accounts(s)));
const memberMap = memo((s) => byId(allMembers(s)));

export const categoryOf = (s: State, id?: string): Category | undefined => (id ? categoryMap(s).get(id) : undefined);
export const accountOf = (s: State, id?: string): Account | undefined => (id ? accountMap(s).get(id) : undefined);
export const memberOf = (s: State, id?: string): Member | undefined => (id ? memberMap(s).get(id) : undefined);

export const homeSummary = memo((s, monthKey: string) => {
  const txs = transactions(s);
  const { income, expense, net } = totalsForPeriod(txs, monthKey);
  let budgetLimit = 0;
  let budgetSpent = 0;
  for (const b of budgets(s)) {
    if (b.period !== 'monthly') continue;
    const u = budgetUsage(b, txs, monthKey);
    budgetLimit += u.limit;
    budgetSpent += u.spent;
  }
  const budgetRatio = budgetLimit > 0 ? budgetSpent / budgetLimit : 0;
  return { income, expense, net, budgetLimit, budgetSpent, budgetRatio, budgetLeft: budgetLimit - budgetSpent };
});

export const ACCOUNT_TYPES: Record<AccountType, { label: string; emoji: string; tint: 'blue' | 'pink' | 'green' | 'red' | 'yellow' }> = {
  bank: { label: 'Bank', emoji: '🏦', tint: 'blue' },
  savings: { label: 'Savings', emoji: '🐷', tint: 'pink' },
  ewallet: { label: 'E-wallet', emoji: '👛', tint: 'green' },
  credit: { label: 'Credit card', emoji: '💳', tint: 'red' },
  cash: { label: 'Cash', emoji: '💵', tint: 'yellow' },
};

export const last4 = (n?: string) => (n && n.replace(/\D/g, '').length >= 4 ? `••${n.replace(/\D/g, '').slice(-4)}` : null);

export const accountRows = memo((s) => {
  const txs = transactions(s);
  const rows = accounts(s).map((account) => {
    const balance = accountBalance(account, txs);
    const split = accountSplit(account, pockets(s), allocations(s), txs);
    const pocketCount = split.pockets.length;
    const subtitle = pocketCount
      ? `${pocketCount} pocket${pocketCount > 1 ? 's' : ''} · ${formatAmount(split.free)} free`
      : [ACCOUNT_TYPES[account.type]?.label, last4(account.accountNumber)].filter(Boolean).join(' · ');
    return { account, balance, subtitle, pocketCount, free: split.free, overAllocatedBy: split.overAllocatedBy, pockets: split.pockets };
  });
  return { rows, netWorth: rows.reduce((t, r) => t + r.balance, 0) };
});

const TINTS = ['green', 'red', 'orange', 'blue', 'pink', 'yellow'] as const;
export const categoryTint = (id?: string) => {
  if (!id) return 'blue' as const;
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TINTS[h % TINTS.length];
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const weekdayOf = (date: string) => {
  const [y, m, d] = date.split('-').map(Number);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
};

const shortName = (a?: Account) => (a ? a.institution || a.name : '?');

export function txRow(s: State, tx: Transaction) {
  const category = categoryOf(s, tx.categoryId);
  const initial = memberOf(s, tx.authorId)?.initial;
  if (tx.type === 'transfer') {
    return {
      tx, title: `${shortName(accountOf(s, tx.accountId))} → ${accountOf(s, tx.toAccountId)?.name ?? '?'}`,
      subtitle: ['Transfer', initial].filter(Boolean).join(' · '), emoji: '🔁', tint: 'blue' as const,
      fromScreenshot: tx.source === 'screenshot', signedAmount: tx.amount,
    };
  }
  return {
    tx,
    title: tx.counterpartyName || tx.note || category?.name || (tx.type === 'income' ? 'Income' : 'Expense'),
    subtitle: [category?.name ?? 'Uncategorized', shortName(accountOf(s, tx.accountId)), initial].filter(Boolean).join(' · '),
    emoji: category?.emoji ?? '❔',
    tint: tx.type === 'income' ? ('green' as const) : categoryTint(tx.categoryId),
    fromScreenshot: tx.source === 'screenshot',
    signedAmount: tx.type === 'income' ? tx.amount : -tx.amount,
  };
}
export type TxRow = ReturnType<typeof txRow>;

export const dayGroups = memo((s, monthKey: string, query?: string, accountId?: string) => {
  const q = query?.trim().toLowerCase();
  const matches = (tx: Transaction) => {
    if (accountId && tx.accountId !== accountId && tx.toAccountId !== accountId) return false;
    if (!q) return true;
    const hay = [tx.note, tx.counterpartyName, categoryOf(s, tx.categoryId)?.name, accountOf(s, tx.accountId)?.name, accountOf(s, tx.toAccountId)?.name];
    return hay.some((h) => h?.toLowerCase().includes(q));
  };
  const days = new Map<string, Transaction[]>();
  for (const tx of transactions(s)) {
    if (!tx.date.startsWith(monthKey) || !matches(tx)) continue;
    days.set(tx.date, [...(days.get(tx.date) ?? []), tx]);
  }
  return [...days.entries()]
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([date, txs]) => {
      txs.sort((a, b) => (b.time ?? '').localeCompare(a.time ?? '') || (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
      const { net } = totalsForPeriod(txs, date);
      return { date, weekday: weekdayOf(date), dayNet: net, rows: txs.map((tx) => txRow(s, tx)) };
    });
});

export const monthTotals = memo((s, year: string) =>
  Array.from({ length: 12 }, (_, i) => {
    const monthKey = `${year}-${String(i + 1).padStart(2, '0')}`;
    return { monthKey, ...totalsForPeriod(transactions(s), monthKey) };
  }),
);

export const calendarMonth = memo((s, monthKey: string) =>
  Array.from({ length: daysInMonthKey(monthKey) }, (_, i) => {
    const date = `${monthKey}-${String(i + 1).padStart(2, '0')}`;
    const { income, expense } = totalsForPeriod(transactions(s), date);
    return { date, income, expense };
  }),
);

const NO_CATEGORY = (kind: 'expense' | 'income'): Category => ({ id: '', name: 'Uncategorized', emoji: '❔', kind });

/** Spending (or income) by category for a month ('2026-11') or year ('2026'), with budget usage for expenses. */
export const categorySpend = memo((s, period: 'month' | 'year', key: string, kind: 'expense' | 'income') => spendFrom(s, transactions(s), period, key, kind));

export function spendFrom(s: State, txs: Transaction[], period: 'month' | 'year', key: string, kind: 'expense' | 'income') {
  const sums = new Map<string, number>();
  for (const t of live(txs)) {
    if (t.type !== kind || !t.date.startsWith(key)) continue;
    sums.set(t.categoryId ?? '', (sums.get(t.categoryId ?? '') ?? 0) + t.amount);
  }
  const total = [...sums.values()].reduce((a, b) => a + b, 0);
  const budgetOf = new Map(budgets(s).map((b) => [b.categoryId, b]));
  return [...sums.entries()]
    .map(([id, amount]) => {
      const category = categoryOf(s, id) ?? NO_CATEGORY(kind);
      const b = kind === 'expense' ? budgetOf.get(id) : undefined;
      // In the year view a monthly budget counts twelve times.
      const asked = b && period === 'year' && b.period === 'monthly' ? { ...b, period: 'yearly' as const, amount: b.amount * 12 } : b;
      const budget = asked && (period === 'month' ? asked.period === 'monthly' : true) ? budgetUsage(asked, txs, period === 'month' ? key : `${key}-12`) : undefined;
      return { category, amount, share: total > 0 ? amount / total : 0, budget };
    })
    .sort((a, b) => b.amount - a.amount);
}

export const budgetHint = memo((s, monthKey: string) => budgetHintFrom(s, transactions(s), monthKey));

/** The monthly budget furthest over in `monthKey`, computed from `txs` (Stats passes filtered ones). */
export function budgetHintFrom(s: State, txs: Transaction[], monthKey: string) {
  let best: { category: Category; overBy: number; avg3: number; budget: Budget } | null = null;
  for (const b of budgets(s)) {
    if (b.period !== 'monthly') continue;
    const u = budgetUsage(b, txs, monthKey);
    const category = categoryOf(s, b.categoryId);
    if (u.status !== 'over' || !category || category.deletedAt) continue;
    const overBy = u.spent - u.limit;
    if (!best || overBy > best.overBy) best = { category, overBy, avg3: categoryAverages(txs, b.categoryId, monthKey).avg3, budget: b };
  }
  return best;
}

/** Everything the Stats tab shows, from transactions filtered by member and account first. */
export const statsView = memo((s, period: 'month' | 'year', key: string, kind: 'expense' | 'income', memberId: string, accountId: string) => {
  const txs = transactions(s).filter((t) => (!memberId || t.authorId === memberId) && (!accountId || t.accountId === accountId || t.toAccountId === accountId));
  const rows = spendFrom(s, txs, period, key, kind);
  const endMonth = period === 'month' ? key : `${key}-12`;
  let limit = 0;
  let spent = 0;
  for (const b of budgets(s)) {
    if (period === 'month' && b.period !== 'monthly') continue;
    const asked = period === 'year' && b.period === 'monthly' ? { ...b, period: 'yearly' as const, amount: b.amount * 12 } : b;
    const u = budgetUsage(asked, txs, endMonth);
    limit += u.limit;
    spent += u.spent;
  }
  const tuning = budgets(s)
    .filter((b) => b.period === 'monthly' && categoryOf(s, b.categoryId) && !categoryOf(s, b.categoryId)!.deletedAt)
    .map((b) => {
      const avg = categoryAverages(txs, b.categoryId, endMonth);
      return { budget: b, category: categoryOf(s, b.categoryId)!, ...avg, advice: budgetAdvice(avg.avg3, b.amount) };
    });
  return {
    rows,
    total: rows.reduce((t, r) => t + r.amount, 0),
    budget: { limit, spent, left: limit - spent, ratio: limit > 0 ? spent / limit : 0 },
    hint: period === 'month' && kind === 'expense' ? budgetHintFrom(s, txs, key) : null,
    flow: incomeVsExpense(txs, endMonth),
    top: topCounterparties(txs, key),
    tuning,
    trend: (categoryId: string) => categoryTrend(txs, categoryId, endMonth),
  };
});

/** Σ monthly budgets + Σ yearly budgets / 12. */
export const monthlyBudgetTotal = memo((s) => Math.round(budgets(s).reduce((t, b) => t + (b.period === 'monthly' ? b.amount : b.amount / 12), 0)));

export const plansView = memo((s, today: string) => {
  const c = ctx(s);
  const avgIncome = averageMonthlyIncome(c.txs, today);
  const summary = plansSummary(bills(s), goals(s), c, today, avgIncome, monthlyBudgetTotal(s));
  return {
    summary,
    avgIncome,
    bills: [...bills(s)].sort((a, b) => a.dueDate.localeCompare(b.dueDate)).map((bill) => ({ bill, month: billMonth(bill, c, today) })),
    goals: goals(s).map((goal) => {
      const affordable = summary.affordable[goal.id] ?? 0;
      const month = goalMonth(goal, c, today, affordable);
      return { goal, affordable, month, options: goalOptions(goal, month.funded - month.setAside, today, affordable) };
    }),
  };
});

/** What the category's budget looks like after this expense (the edited transaction's old amount left out). */
export const budgetImpact = memo((s, categoryId: string, amount: number, date: string, excludeId?: string) => {
  const budget = budgets(s).find((b) => b.categoryId === categoryId);
  const category = categoryOf(s, categoryId);
  if (!budget || !category) return null;
  const probe: Transaction = { id: '__probe', type: 'expense', amount, date, accountId: '', categoryId, source: 'manual', authorId: '' };
  const u = budgetUsage(budget, [...transactions(s).filter((t) => t.id !== excludeId), probe], monthOf(date));
  return { name: category.name, spentAfter: u.spent, limit: u.limit, ratioAfter: u.ratio, status: u.status };
});

/** The single Home tip: overdue bill → over-budget category → set-aside not done → all on track. */
export const homeTip = memo((s, today: string) => {
  const v = plansView(s, today);
  const overdue = v.bills.find((b) => b.month.plan.overdue);
  if (overdue) return { kind: 'overdue' as const, bill: overdue.bill, days: overdue.month.plan.daysOverdue };
  const hint = budgetHint(s, monthOf(today));
  if (hint) return { kind: 'over' as const, category: hint.category, overBy: hint.overBy };
  const bill = v.bills.find((b) => !b.month.done && b.month.plan.monthly > 0);
  if (bill) return { kind: 'setAside' as const, name: bill.bill.name, amount: bill.month.plan.monthly };
  const goal = v.goals.find((g) => !g.month.done && (g.month.plan.required ?? 0) > 0);
  if (goal) return { kind: 'setAside' as const, name: goal.goal.name, amount: goal.month.plan.required ?? 0 };
  return { kind: 'ok' as const };
});

/** Deleted transactions still restorable (deleted within the last 30 days), newest deletion first. */
export const recentlyDeleted = memo((s, today: string) =>
  allTransactions(s)
    .filter((t) => t.deletedAt && daysBetween(todayJakarta(Date.parse(t.deletedAt)), today) <= 30)
    .sort((a, b) => b.deletedAt!.localeCompare(a.deletedAt!)),
);

export const lastUsedAccountId = memo((s): string | undefined => {
  const latest = [...transactions(s)].sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))[0];
  const ids = accountMap(s);
  return latest && ids.has(latest.accountId) ? latest.accountId : accounts(s)[0]?.id;
});

const mostUsed = (txs: Transaction[]) => {
  const count = new Map<string, { n: number; amount: number }>();
  for (const t of txs) {
    if (!t.categoryId) continue;
    const c = count.get(t.categoryId) ?? { n: 0, amount: 0 };
    count.set(t.categoryId, { n: c.n + 1, amount: c.amount + t.amount });
  }
  return [...count.entries()].sort(([, a], [, b]) => b.n - a.n || b.amount - a.amount)[0]?.[0];
};

/** A rule first, then the category most used for this text, then the most used expense category this month. */
export const suggestedCategoryId = memo((s, text: string, monthKey: string = monthOf(todayJakarta())): string | undefined => {
  const live = new Set(categories(s).map((c) => c.id));
  const q = text.trim().toLowerCase();
  if (q) {
    const { action } = applyRules({ accountId: '', description: text, counterpartyName: text }, rules(s), accounts(s));
    if (action?.kind === 'category' && live.has(action.categoryId)) return action.categoryId;
    const same = transactions(s).filter((t) => t.type !== 'transfer' && [t.counterpartyName, t.note].some((h) => h?.toLowerCase() === q));
    const fromText = mostUsed(same);
    if (fromText && live.has(fromText)) return fromText;
  }
  const fallback = mostUsed(transactions(s).filter((t) => t.type === 'expense' && t.date.startsWith(monthKey)));
  return fallback && live.has(fallback) ? fallback : undefined;
});
