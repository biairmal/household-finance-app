import { Category } from './types';

// Spec §9: the Indonesian-household starter set.
const EXPENSE: [string, string][] = [
  ['Food & groceries', '🛒'], ['Eating out', '🍜'], ['Transport & fuel', '⛽'], ['Housing/rent', '🏠'], ['Utilities', '💡'],
  ['Health', '💊'], ['Education', '🎓'], ['Shopping', '🛍️'], ['Family & gifts', '👪'], ['Religious giving', '🤲'],
  ['Entertainment', '🎬'], ['Subscriptions', '📺'], ['Vehicle', '🛵'], ['Fees & admin', '🧾'], ['Other', '📦'],
];
const INCOME: [string, string][] = [['Salary', '💼'], ['Bonus/THR', '🎁'], ['Side income', '🧑‍💻'], ['Other income', '➕']];

export const defaultCategories = (): Omit<Category, 'id'>[] => [
  ...EXPENSE.map(([name, emoji]) => ({ name, emoji, kind: 'expense' as const })),
  ...INCOME.map(([name, emoji]) => ({ name, emoji, kind: 'income' as const })),
];
