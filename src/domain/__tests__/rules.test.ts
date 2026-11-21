import { expect, test } from '@jest/globals';
import { applyRules, matchOwnAccount } from '../rules';
import { Account, Rule, RowFacts } from '../types';

const accounts: Account[] = [
  { id: 'bca', name: 'BCA', type: 'bank', currency: 'IDR', openingBalance: 0, accountNumber: '5550001111' },
  { id: 'jago', name: 'Jago', type: 'savings', currency: 'IDR', openingBalance: 0, accountNumber: '1029384410' },
];
const row = (p: Partial<RowFacts>): RowFacts => ({ accountId: 'bca', description: '', ...p });
const rule = (id: string, match: Rule['match'], categoryId: string, updatedAt = '2026-11-01'): Rule => ({
  id, match, action: { kind: 'category', categoryId }, updatedAt,
});

test('name match is case-insensitive', () => {
  const r = applyRules(row({ counterpartyName: 'INDOMARET KEMANG' }), [rule('r1', { nameContains: 'indomaret' }, 'groceries')], accounts);
  expect(r).toEqual({ action: { kind: 'category', categoryId: 'groceries' }, ruleId: 'r1' });
});

test('name falls back to the description when there is no counterparty', () => {
  const r = applyRules(row({ description: 'QRIS INDOMARET KEMANG' }), [rule('r1', { nameContains: 'indomaret' }, 'groceries')], accounts);
  expect(r.ruleId).toBe('r1');
});

test('account number beats name', () => {
  const rules = [rule('name', { nameContains: 'budi' }, 'services', '2026-11-20'), rule('acct', { accountNumber: '1234567890' }, 'family')];
  const r = applyRules(row({ counterpartyName: 'BUDI SANTOSO', counterpartyAccount: '1234567890' }), rules, accounts);
  expect(r.ruleId).toBe('acct');
});

test('name beats description', () => {
  const rules = [rule('desc', { descriptionContains: 'transfer' }, 'misc', '2026-11-20'), rule('name', { nameContains: 'budi' }, 'services')];
  expect(applyRules(row({ description: 'TRANSFER', counterpartyName: 'Budi' }), rules, accounts).ruleId).toBe('name');
});

test('newest of two equal rules wins', () => {
  const rules = [rule('old', { nameContains: 'grab' }, 'transport', '2026-10-01'), rule('new', { nameContains: 'grab' }, 'food', '2026-11-01')];
  expect(applyRules(row({ counterpartyName: 'GRAB FOOD' }), rules, accounts).ruleId).toBe('new');
});

test('masked own account becomes a transfer, before rules', () => {
  const facts = row({ counterpartyName: 'BUDI', counterpartyAccount: '••4410' });
  expect(matchOwnAccount(facts, accounts)).toBe('jago');
  expect(applyRules(facts, [rule('r', { nameContains: 'budi' }, 'family')], accounts)).toEqual({
    action: { kind: 'transfer', toAccountId: 'jago' },
    ruleId: null,
  });
});

test('masked with fewer than 4 digits, or unmasked partial, does not match', () => {
  expect(matchOwnAccount(row({ counterpartyAccount: '••410' }), accounts)).toBeNull();
  expect(matchOwnAccount(row({ counterpartyAccount: '4410' }), accounts)).toBeNull();
  expect(matchOwnAccount(row({ accountId: 'jago', counterpartyAccount: '1029384410' }), accounts)).toBeNull();
});

test('account-scoped rule only fires on that account', () => {
  const rules = [{ ...rule('r', { nameContains: 'indomaret', accountId: 'card' }, 'groceries') }];
  expect(applyRules(row({ counterpartyName: 'INDOMARET' }), rules, accounts).ruleId).toBeNull();
  expect(applyRules(row({ accountId: 'card', counterpartyName: 'INDOMARET' }), rules, accounts).ruleId).toBe('r');
});

test('deleted rule never fires', () => {
  const r = { ...rule('r', { nameContains: 'indomaret' }, 'groceries'), deletedAt: '2026-11-02' };
  expect(applyRules(row({ counterpartyName: 'INDOMARET' }), [r], accounts)).toEqual({ action: null, ruleId: null });
});
