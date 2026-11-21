import { describe, expect, test } from '@jest/globals';
import { compareHlc, receive, tick } from '../sync/hlc';
import { Op, applyOps, emptyFolded, foldOps } from '../sync/ops';

const T0 = Date.UTC(2026, 10, 20, 3, 0, 0);
const hlc = (ms: number, counter: number, dev: string) => `${String(ms).padStart(15, '0')}:${String(counter).padStart(5, '0')}:${dev}`;

describe('hlc', () => {
  test('tick is strictly increasing even when the wall clock goes back', () => {
    let h = tick(null, T0, 'A');
    for (const now of [T0 + 5, T0 + 5, T0 - 1000, T0 + 2, T0 + 10]) {
      const next = tick(h, now, 'A');
      expect(compareHlc(next, h)).toBe(1);
      h = next;
    }
  });

  test('receive is greater than both inputs', () => {
    const local = hlc(T0, 3, 'A');
    for (const remote of [hlc(T0, 7, 'B'), hlc(T0 + 1000, 0, 'B'), hlc(T0 - 1000, 9, 'B')]) {
      const r = receive(local, remote, T0 - 5000, 'A');
      expect(compareHlc(r, local)).toBe(1);
      expect(compareHlc(r, remote)).toBe(1);
    }
    expect(compareHlc(receive(null, hlc(T0, 2, 'B'), T0, 'A'), hlc(T0, 2, 'B'))).toBe(1);
  });
});

const create = (id: string, h: string, data: Record<string, unknown>, authorId = 'a'): Op =>
  ({ id, hlc: h, authorId, entity: 'transaction', entityId: 't1', kind: 'create', data });
const set = (id: string, h: string, field: string, value: unknown, authorId = 'a'): Op =>
  ({ id, hlc: h, authorId, entity: 'transaction', entityId: 't1', kind: 'set', field, value });
const del = (id: string, h: string, authorId = 'a'): Op =>
  ({ id, hlc: h, authorId, entity: 'transaction', entityId: 't1', kind: 'delete' });

describe('applyOps', () => {
  test('create then set updates the field', () => {
    const { state } = applyOps([create('o1', hlc(T0, 0, 'A'), { amount: 15000 }), set('o2', hlc(T0 + 1, 0, 'A'), 'amount', 16000)]);
    expect(state.transaction.t1).toEqual({ id: 't1', amount: 16000, updatedBy: 'a', updatedAt: new Date(T0 + 1).toISOString() });
  });

  test('concurrent sets: higher HLC wins and the loss is recorded', () => {
    const { state, conflicts } = applyOps([
      create('o1', hlc(T0, 0, 'A'), { categoryId: 'misc' }, 'a'),
      set('o2', hlc(T0 + 10, 0, 'B'), 'categoryId', 'food', 'b'),
      set('o3', hlc(T0 + 5, 0, 'A'), 'categoryId', 'groceries', 'a'),
    ]);
    expect(state.transaction.t1.categoryId).toBe('food');
    expect(conflicts).toEqual([
      { entity: 'transaction', entityId: 't1', field: 'categoryId', keptValue: 'food', lostValue: 'groceries', lostAuthorId: 'a', lostHlc: hlc(T0 + 5, 0, 'A') },
    ]);
  });

  test('same author, or more than a day apart, is not a conflict', () => {
    const base = create('o1', hlc(T0, 0, 'A'), {});
    expect(applyOps([base, set('o2', hlc(T0 + 1, 0, 'A'), 'note', 'x'), set('o3', hlc(T0 + 2, 0, 'A'), 'note', 'y')]).conflicts).toEqual([]);
    expect(applyOps([base, set('o2', hlc(T0, 1, 'A'), 'note', 'x'), set('o3', hlc(T0 + 86400001, 0, 'B'), 'note', 'y', 'b')]).conflicts).toEqual([]);
  });

  test('delete sets deletedAt and a later set does not resurrect', () => {
    const { state } = applyOps([
      create('o1', hlc(T0, 0, 'A'), { amount: 1 }),
      del('o2', hlc(T0 + 60000, 0, 'B'), 'b'),
      set('o3', hlc(T0 + 120000, 0, 'A'), 'amount', 2),
    ]);
    expect(state.transaction.t1.deletedAt).toBe(new Date(T0 + 60000).toISOString());
    expect(state.transaction.t1.amount).toBe(2);
  });

  test('the same op id applied twice is applied once', () => {
    const ops = [create('o1', hlc(T0, 0, 'A'), {}), set('o2', hlc(T0 + 1, 0, 'A'), 'note', 'x', 'a'), set('o3', hlc(T0 + 2, 0, 'B'), 'note', 'y', 'b')];
    expect(applyOps([...ops, ops[2], ops[1]])).toEqual(applyOps(ops));
  });

  test('order independence across 50 seeded shuffles', () => {
    let seed = 42;
    const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
    const ops: Op[] = [create('c', hlc(T0, 0, 'A'), { amount: 1, note: 'n' })];
    const fields = ['amount', 'note', 'categoryId'];
    for (let i = 0; i < 30; i++) {
      const dev = i % 2 ? 'A' : 'B';
      ops.push(set(`s${i}`, hlc(T0 + Math.floor(rand() * 1000), i, dev), fields[i % 3], i, dev.toLowerCase()));
    }
    ops.push(del('d', hlc(T0 + 500, 0, 'B'), 'b'));
    const expected = applyOps(ops);
    for (let k = 0; k < 50; k++) {
      const shuffled = [...ops];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      expect(applyOps(shuffled)).toEqual(expected);
    }
    const sorted = [...ops].sort((a, b) => (a.hlc < b.hlc ? -1 : a.hlc > b.hlc ? 1 : a.id < b.id ? -1 : 1));
    const acc = foldOps(foldOps(emptyFolded(), sorted.slice(0, 13)), sorted.slice(13));
    expect({ state: acc.state, conflicts: acc.conflicts }).toEqual(expected);
    expect(acc.lastHlc).toBe(sorted[sorted.length - 1].hlc);
  });

  test('a set by author b leaves updatedBy b', () => {
    const { state } = applyOps([create('o1', hlc(T0, 0, 'A'), {}), set('o2', hlc(T0 + 1, 0, 'B'), 'note', 'x', 'b')]);
    expect(state.transaction.t1.updatedBy).toBe('b');
  });

  test('member is an entity', () => {
    const { state } = applyOps([
      { id: 'm', hlc: hlc(T0, 0, 'A'), authorId: 'm1', entity: 'member', entityId: 'm1', kind: 'create', data: { name: 'Bia', initial: 'B' } },
    ]);
    expect(state.member.m1).toMatchObject({ name: 'Bia', initial: 'B' });
  });
});
