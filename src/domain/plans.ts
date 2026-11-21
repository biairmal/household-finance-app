import { accountBalance } from './balances';
import { billPlan } from './bills';
import { monthOf } from './dates';
import { affordableMonthly, goalPlan } from './goals';
import { pocketBalance } from './pockets';
import { Account, Allocation, Bill, Funding, Goal, Pocket, Transaction, live } from './types';

export type PlanCtx = { accounts: Account[]; pockets: Pocket[]; allocations: Allocation[]; txs: Transaction[] };

export function fundedBy(funding: Funding, ctx: PlanCtx): number {
  if (funding.kind === 'pocket') return pocketBalance(funding.pocketId, ctx.allocations, ctx.txs);
  const account = ctx.accounts.find((a) => a.id === funding.accountId);
  return account ? accountBalance(account, ctx.txs) : 0;
}

/** What was put aside in `monthKey`: positive allocations to the pocket, or transfers into the account. */
export function setAsideIn(funding: Funding, monthKey: string, ctx: PlanCtx): number {
  if (funding.kind === 'pocket') {
    return live(ctx.allocations)
      .filter((a) => a.pocketId === funding.pocketId && a.amount > 0 && a.date.startsWith(monthKey))
      .reduce((s, a) => s + a.amount, 0);
  }
  return live(ctx.txs)
    .filter((t) => t.type === 'transfer' && t.toAccountId === funding.accountId && t.date.startsWith(monthKey))
    .reduce((s, t) => s + t.amount, 0);
}

/** This month's figure is planned from the funding at the start of the month, so setting it aside never shrinks it. */
export function billMonth(bill: Bill, ctx: PlanCtx, today: string) {
  const funded = fundedBy(bill.funding, ctx);
  const setAside = setAsideIn(bill.funding, monthOf(today), ctx);
  const plan = billPlan(bill, funded - setAside, today);
  return { plan, funded, setAside, done: setAside >= plan.monthly };
}

export function goalMonth(goal: Goal, ctx: PlanCtx, today: string, affordable: number) {
  const funded = fundedBy(goal.funding, ctx);
  const setAside = setAsideIn(goal.funding, monthOf(today), ctx);
  const plan = goalPlan(goal, funded - setAside, today, affordable);
  return { plan, funded, setAside, done: plan.required !== null && setAside >= plan.required };
}

export function plansSummary(bills: Bill[], goals: Goal[], ctx: PlanCtx, today: string, avgIncome: number, monthlyBudgets: number) {
  const billRows = live(bills).map((bill) => ({ bill, m: billMonth(bill, ctx, today) }));
  const overdue = billRows.filter((r) => r.m.plan.overdue).map((r) => r.bill);
  const current = billRows.filter((r) => !r.m.plan.overdue);
  const billsMonthly = current.reduce((s, r) => s + r.m.plan.monthly, 0);

  const goalRows = live(goals).map((goal) => ({ goal, m: goalMonth(goal, ctx, today, 0) }));
  const goalsMonthly = goalRows.reduce((s, r) => s + (r.m.plan.required ?? 0), 0);
  const affordable: Record<string, number> = {};
  for (const r of goalRows) {
    affordable[r.goal.id] = affordableMonthly({
      avgIncome, monthlyBudgets, billSetAsides: billsMonthly, otherGoals: goalsMonthly - (r.m.plan.required ?? 0),
    });
  }
  const dated = goalRows.filter((r) => r.m.plan.required !== null);
  return {
    billsMonthly,
    goalsMonthly,
    total: billsMonthly + goalsMonthly,
    doneCount: current.filter((r) => r.m.done).length + dated.filter((r) => r.m.done).length,
    itemCount: current.length + dated.length,
    overdue,
    affordable,
  };
}
