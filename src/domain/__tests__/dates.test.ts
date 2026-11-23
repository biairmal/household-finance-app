import { expect, test } from '@jest/globals';
import { addMonthsToKey, daysInMonthKey, monthOf, todayJakarta } from '../dates';

test('todayJakarta is UTC+7', () => {
  expect(todayJakarta(Date.UTC(2026, 10, 20, 18, 30))).toBe('2026-11-21');
  expect(todayJakarta(Date.UTC(2026, 10, 20, 16, 59))).toBe('2026-11-20');
});

test('month keys', () => {
  expect(monthOf('2026-11-20')).toBe('2026-11');
  expect(addMonthsToKey('2026-12', 1)).toBe('2027-01');
  expect(addMonthsToKey('2026-01', -1)).toBe('2025-12');
  expect(daysInMonthKey('2028-02')).toBe(29);
  expect(daysInMonthKey('2026-11')).toBe(30);
});
