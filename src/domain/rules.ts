import { Account, Rule, RowFacts, live } from './types';

const digits = (s: string) => s.replace(/\D/g, '');

/** Exact digit match, or suffix match for a masked number ('••4410') with 4+ visible digits. */
function sameAccountNumber(seen: string, full: string): boolean {
  const d = digits(seen);
  const f = digits(full);
  if (!d || !f) return false;
  if (d === f) return true;
  return /[^\d\s-]/.test(seen) && d.length >= 4 && f.endsWith(d);
}

const contains = (hay: string | undefined, needle: string) => !!hay && hay.toLowerCase().includes(needle.toLowerCase());

export function matchOwnAccount(facts: RowFacts, accounts: Account[]): string | null {
  const seen = facts.counterpartyAccount;
  if (!seen) return null;
  const own = live(accounts).find((a) => a.id !== facts.accountId && a.accountNumber && sameAccountNumber(seen, a.accountNumber));
  return own?.id ?? null;
}

/** 3 = account number, 2 = name, 1 = description; 0 = rule does not match. */
function specificity(rule: Rule, facts: RowFacts): number {
  const m = rule.match;
  if (m.accountId && m.accountId !== facts.accountId) return 0;
  if (!m.accountNumber && !m.nameContains && !m.descriptionContains) return 0;
  if (m.accountNumber && !(facts.counterpartyAccount && sameAccountNumber(facts.counterpartyAccount, m.accountNumber))) return 0;
  if (m.nameContains && !contains(facts.counterpartyName ?? facts.description, m.nameContains)) return 0;
  if (m.descriptionContains && !contains(facts.description, m.descriptionContains)) return 0;
  return m.accountNumber ? 3 : m.nameContains ? 2 : 1;
}

/** Own-account transfers win; then the most specific rule, newest first on ties. */
export function applyRules(facts: RowFacts, rules: Rule[], accounts: Account[]): { action: Rule['action'] | null; ruleId: string | null } {
  const own = matchOwnAccount(facts, accounts);
  if (own) return { action: { kind: 'transfer', toAccountId: own }, ruleId: null };
  const best = live(rules)
    .map((rule) => ({ rule, score: specificity(rule, facts) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.rule.updatedAt.localeCompare(a.rule.updatedAt))[0];
  return best ? { action: best.rule.action, ruleId: best.rule.id } : { action: null, ruleId: null };
}
