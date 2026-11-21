import { expect, test } from '@jest/globals';
import { formatIDR, formatAmount, formatCompact } from '../money';

test('formatIDR', () => {
  expect(formatIDR(2700000)).toBe('Rp 2.700.000');
  expect(formatIDR(0)).toBe('Rp 0');
  expect(formatIDR(-2340000)).toBe('−Rp 2.340.000');
  expect(formatIDR(999)).toBe('Rp 999');
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
  expect(formatCompact(-1500000)).toBe('−1,5jt');
});
