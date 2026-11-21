import { expect, test } from '@jest/globals';
import { exportCsvFiles, parseBackup, serializeBackup, toCsv } from '../export';
import { Op, applyOps } from '../sync/ops';

const h = (n: number) => `${String(1763600000000 + n).padStart(15, '0')}:00000:A`;
const ops: Op[] = [
  { id: '1', hlc: h(1), authorId: 'a', entity: 'transaction', entityId: 't1', kind: 'create', data: { date: '2026-11-18', type: 'expense', amount: 86500, note: 'Kopi "Kenangan", Kemang' } },
  { id: '2', hlc: h(2), authorId: 'a', entity: 'transaction', entityId: 't2', kind: 'create', data: { amount: 1 } },
  { id: '3', hlc: h(3), authorId: 'a', entity: 'transaction', entityId: 't2', kind: 'delete' },
  { id: '4', hlc: h(4), authorId: 'a', entity: 'account', entityId: 'bca', kind: 'create', data: { name: 'BCA', currency: 'IDR', openingBalance: 0 } },
  { id: '5', hlc: h(5), authorId: 'b', entity: 'transaction', entityId: 't1', kind: 'set', field: 'categoryId', value: 'food' },
];
const meta = { householdId: 'hh1', exportedAt: '2026-11-21T00:00:00.000Z' };

test('toCsv quotes and doubles inner quotes', () => {
  expect(toCsv([{ a: 'Kopi "Kenangan", Kemang', b: 'x\ny', c: 86500, d: undefined }], ['a', 'b', 'c', 'd'])).toBe(
    'a,b,c,d\n"Kopi ""Kenangan"", Kemang","x\ny",86500,\n',
  );
});

test('exportCsvFiles writes every file and skips deleted records', () => {
  const files = exportCsvFiles(applyOps(ops).state);
  expect(Object.keys(files).sort()).toEqual(['accounts.csv', 'bills.csv', 'budgets.csv', 'categories.csv', 'goals.csv', 'transactions.csv']);
  const lines = files['transactions.csv'].trim().split('\n');
  expect(lines).toHaveLength(2);
  expect(lines[1]).toBe('t1,2026-11-18,,expense,86500,,,food,,"Kopi ""Kenangan"", Kemang",,,,,');
  expect(files['accounts.csv']).toContain('bca,BCA,,,,IDR,0,');
  expect(files['goals.csv']).toBe('id,name,target,targetDate,funding\n');
});

test('backup round trip', () => {
  const parsed = parseBackup(serializeBackup(ops, meta));
  expect(parsed.meta).toEqual(meta);
  expect(applyOps(parsed.ops)).toEqual(applyOps(ops));
});

test('rejects other versions and malformed files', () => {
  expect(() => parseBackup(JSON.stringify({ version: 2, meta, ops: [] }))).toThrow('Unsupported backup version 2');
  expect(() => parseBackup(JSON.stringify({ version: 1, meta, ops: [{ id: 'x' }] }))).toThrow('Invalid backup file');
  expect(() => parseBackup(JSON.stringify({ version: 1, ops: [] }))).toThrow('Invalid backup file');
});
