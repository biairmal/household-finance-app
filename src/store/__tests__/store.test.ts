import { describe, expect, test } from '@jest/globals';
import { totalsForPeriod } from '../../domain/balances';
import { compareHlc } from '../../domain/sync/hlc';
import { applyOps } from '../../domain/sync/ops';
import { Transaction } from '../../domain/types';
import { OpsDb, memoryOpsDb } from '../opsDb';
import { createStore } from '../store';

const T0 = Date.UTC(2026, 10, 20, 3, 0, 0);
const setup = async (db: OpsDb = memoryOpsDb(), clock = { t: T0 }) => {
  let n = 0;
  const store = await createStore(db, { now: () => clock.t++, newId: () => `id${++n}` });
  return { store, db, clock };
};
const tx = { type: 'expense', amount: 86500, date: '2026-11-18', accountId: 'bca', source: 'manual', currency: 'IDR' };
const txs = (s: ReturnType<Awaited<ReturnType<typeof createStore>>['getState']>) => Object.values(s.transaction) as unknown as Transaction[];

describe('store', () => {
  test('create stores the data with updatedBy = the member', async () => {
    const { store } = await setup();
    await store.setMember('Bia');
    const id = await store.create('transaction', tx);
    expect(store.getState().transaction[id]).toMatchObject({ ...tx, id, updatedBy: store.memberId });
    expect(store.getState().member[store.memberId!]).toMatchObject({ name: 'Bia', initial: 'B' });
  });

  test('update writes only the fields that changed', async () => {
    const { store, db } = await setup();
    const id = await store.create('transaction', tx);
    const before = (await db.loadAll()).length;
    await store.update('transaction', id, { amount: 86500, note: 'Indomaret' });
    const after = await db.loadAll();
    expect(after.length).toBe(before + 1);
    expect(after[after.length - 1]).toMatchObject({ kind: 'set', field: 'note', value: 'Indomaret' });
    await store.update('transaction', id, { amount: 86500 });
    expect((await db.loadAll()).length).toBe(before + 1);
  });

  test('remove and restore move the transaction out of and back into totals', async () => {
    const { store } = await setup();
    const id = await store.create('transaction', tx);
    await store.remove('transaction', id);
    expect(store.getState().transaction[id].deletedAt).toBeTruthy();
    expect(totalsForPeriod(txs(store.getState()), '2026-11').expense).toBe(0);
    await store.restore('transaction', id);
    expect(store.getState().transaction[id].deletedAt).toBeNull();
    expect(totalsForPeriod(txs(store.getState()), '2026-11').expense).toBe(86500);
  });

  test('a new store over the same db gives the same state (restart)', async () => {
    const { store, db } = await setup();
    await store.setMember('Bia');
    const id = await store.create('transaction', tx);
    await store.update('transaction', id, { amount: 90000 });
    const again = await createStore(db, { now: () => T0 + 999999 });
    expect(again.getState()).toEqual(store.getState());
    expect(again.deviceId).toBe(store.deviceId);
    expect(again.memberId).toBe(store.memberId);
  });

  test('incremental fold equals a full rebuild after 200 random commands', async () => {
    const { store, db } = await setup();
    let seed = 7;
    const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
    const ids: string[] = [];
    for (let i = 0; i < 200; i++) {
      const r = rand();
      const pick = ids[Math.floor(rand() * ids.length)];
      if (r < 0.3 || !pick) ids.push(await store.create('transaction', { ...tx, amount: i }));
      else if (r < 0.7) await store.update('transaction', pick, { amount: Math.floor(rand() * 5) * 1000, note: rand() < 0.5 ? 'a' : 'b' });
      else if (r < 0.85) await store.remove('transaction', pick);
      else if (r < 0.95) await store.restore('transaction', pick);
      else await store.batch((b) => { b.create('category', { name: `c${i}` }); b.update('transaction', pick, { note: `n${i}` }); });
    }
    expect(store.getState()).toEqual(applyOps(await db.loadAll()).state);
  });

  test('HLCs are strictly increasing even when now() goes backwards', async () => {
    const clock = { t: T0 };
    const { store, db } = await setup(memoryOpsDb(), clock);
    for (let i = 0; i < 5; i++) {
      await store.create('transaction', tx);
      clock.t -= 10000;
    }
    const hlcs = (await db.loadAll()).map((o) => o.hlc);
    for (let i = 1; i < hlcs.length; i++) expect(compareHlc(hlcs[i], hlcs[i - 1])).toBe(1);
  });

  test('an append that throws leaves the state untouched and re-throws', async () => {
    const db = memoryOpsDb();
    const { store } = await setup(db);
    await store.create('transaction', tx);
    const before = store.getState();
    const snapshot = JSON.stringify(before);
    db.append = () => Promise.reject(new Error('disk full'));
    await expect(store.create('transaction', tx)).rejects.toThrow('disk full');
    expect(store.getState()).toBe(before);
    expect(JSON.stringify(store.getState())).toBe(snapshot);
  });

  test('subscribers are called once per command and once per batch, and state is a new object', async () => {
    const { store } = await setup();
    let calls = 0;
    const unsubscribe = store.subscribe(() => calls++);
    const s0 = store.getState();
    const id = await store.create('transaction', tx);
    expect(calls).toBe(1);
    expect(store.getState()).not.toBe(s0);
    await store.batch((b) => {
      b.create('transaction', tx);
      b.update('transaction', id, { amount: 1 });
      b.remove('transaction', id);
    });
    expect(calls).toBe(2);
    await store.update('transaction', id, { amount: 1 }); // unchanged: no write, no notify
    expect(calls).toBe(2);
    unsubscribe();
    await store.create('transaction', tx);
    expect(calls).toBe(2);
  });
});
