import { expect, test } from '@jest/globals';
import { findTransferPair, fingerprint, isCertainDuplicate, possibleDuplicates } from '../duplicates';
import { t } from '../__fixtures__/tx';

const ride = (p = {}) => t({ amount: 15000, counterpartyName: 'GOJEK  ride', ...p });

test('fingerprint normalizes the description', () => {
  expect(fingerprint(ride())).toBe(fingerprint(ride({ counterpartyName: ' gojek ride ' })));
});

test('Pertamina row matches an existing identical transaction', () => {
  const existing = t({ amount: 150000, date: '2026-11-17', counterpartyName: 'PERTAMINA' });
  const row = t({ amount: 150000, date: '2026-11-17', counterpartyName: 'Pertamina', source: 'screenshot' });
  expect(possibleDuplicates([row], [existing]).get(row.id)).toBe(existing.id);
});

test('two rides with different refs are not duplicates', () => {
  const a = ride({ externalRef: 'A1' });
  const b = ride({ externalRef: 'B2' });
  expect(possibleDuplicates([b], [a]).size).toBe(0);
  expect(isCertainDuplicate(a, b)).toBe(false);
});

test('two rides with no refs: possible, never certain', () => {
  const a = ride();
  const b = ride();
  expect(possibleDuplicates([b], [a]).get(b.id)).toBe(a.id);
  expect(isCertainDuplicate(a, b)).toBe(false);
});

test('two genuine rides against one recorded ride flag only one', () => {
  const recorded = ride();
  const [x, y] = [ride(), ride()];
  expect(possibleDuplicates([x, y], [recorded]).size).toBe(1);
});

test('equal ref is certain', () => {
  expect(isCertainDuplicate(ride({ externalRef: 'R1' }), ride({ externalRef: 'R1', counterpartyName: 'other text' }))).toBe(true);
  expect(isCertainDuplicate(ride({ externalRef: 'R1' }), ride({ externalRef: 'R1', amount: 16000 }))).toBe(false);
});

test('running balance decides when there is no ref', () => {
  expect(isCertainDuplicate(ride({ runningBalance: 500000 }), ride({ runningBalance: 500000 }))).toBe(true);
  expect(isCertainDuplicate(ride({ runningBalance: 500000 }), ride({ runningBalance: 485000 }))).toBe(false);
});

test('transfer pairing within 2 days', () => {
  const transfer = t({ type: 'transfer', amount: 1500000, date: '2026-11-18', accountId: 'bca', toAccountId: 'jago' });
  const into = (date: string) => t({ type: 'income', amount: 1500000, date, accountId: 'jago' });
  expect(findTransferPair(into('2026-11-19'), [transfer])).toBe(transfer);
  expect(findTransferPair(into('2026-11-21'), [transfer])).toBeNull();
  expect(findTransferPair(t({ amount: 1500000, date: '2026-11-18', accountId: 'bca' }), [transfer])).toBe(transfer);
  expect(findTransferPair(t({ amount: 1500000, date: '2026-11-18', accountId: 'jago' }), [transfer])).toBeNull();
});

test('deleted existing transactions never match', () => {
  const gone = ride({ deletedAt: '2026-11-19', externalRef: 'R1' });
  const transfer = t({ type: 'transfer', amount: 15000, toAccountId: 'jago', deletedAt: '2026-11-19' });
  expect(possibleDuplicates([ride({ externalRef: 'R1' })], [gone]).size).toBe(0);
  expect(isCertainDuplicate(gone, ride({ externalRef: 'R1' }))).toBe(false);
  expect(findTransferPair(t({ type: 'income', amount: 15000, accountId: 'jago' }), [transfer])).toBeNull();
});
