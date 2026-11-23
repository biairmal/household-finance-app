import { expect, test } from '@jest/globals';
import { defaultCategories } from '../defaults';

test('spec §9 default categories', () => {
  const cats = defaultCategories();
  expect(cats).toHaveLength(19);
  expect(cats.filter((c) => c.kind === 'expense')).toHaveLength(15);
  expect(new Set(cats.map((c) => c.name)).size).toBe(19);
  expect(cats.every((c) => c.emoji.length > 0)).toBe(true);
  expect(cats.find((c) => c.name === 'Other')?.kind).toBe('expense');
});
