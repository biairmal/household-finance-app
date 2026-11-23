import { tick } from '../domain/sync/hlc';
import { Conflict, EntityName, Folded, Op, State, emptyFolded, foldOps, sortOps } from '../domain/sync/ops';
import { OpsDb } from './opsDb';
import { newId as defaultNewId } from './ids';

type Data = Record<string, unknown>;

/** Commands inside a batch: queued, then written in one append with one notification. */
export interface BatchTx {
  create(entity: EntityName, data: Data): string;
  update(entity: EntityName, id: string, patch: Data): void;
  remove(entity: EntityName, id: string): void;
  restore(entity: EntityName, id: string): void;
}

export interface Store {
  getState(): State;
  getConflicts(): Conflict[];
  subscribe(fn: () => void): () => void;
  readonly memberId: string | null;
  readonly deviceId: string;
  create(entity: EntityName, data: Data): Promise<string>;
  update(entity: EntityName, id: string, patch: Data): Promise<void>;
  remove(entity: EntityName, id: string): Promise<void>;
  restore(entity: EntityName, id: string): Promise<void>;
  batch(fn: (tx: BatchTx) => void): Promise<void>;
  setMember(name: string): Promise<void>;
  meta: { get(key: string): Promise<string | null>; set(key: string, value: string): Promise<void> };
  /** For Developer and backup. */
  loadOps(): Promise<Op[]>;
}

type Draft = { entity: EntityName; entityId: string } & ({ kind: 'create'; data: Data } | { kind: 'set'; field: string; value: unknown } | { kind: 'delete' });

export async function createStore(db: OpsDb, opts: { now?: () => number; newId?: () => string } = {}): Promise<Store> {
  const now = opts.now ?? Date.now;
  const newId = opts.newId ?? defaultNewId;

  let deviceId = await db.getMeta('deviceId');
  if (!deviceId) {
    deviceId = newId();
    await db.setMeta('deviceId', deviceId);
  }
  let memberId = await db.getMeta('memberId');
  const folded: Folded = foldOps(emptyFolded(), sortOps(await db.loadAll()));
  const savedHlc = await db.getMeta('lastHlc');
  let lastHlc = savedHlc && (!folded.lastHlc || savedHlc > folded.lastHlc) ? savedHlc : folded.lastHlc;

  const listeners = new Set<() => void>();
  let queue: Promise<unknown> = Promise.resolve();
  // Commands run one at a time, so HLCs are handed out in order and each sees the state before it.
  const serial = <T>(fn: () => Promise<T>): Promise<T> => {
    const run = queue.then(fn);
    queue = run.catch(() => undefined);
    return run;
  };

  const diff = (entity: EntityName, id: string, patch: Data): Draft[] => {
    const record = folded.state[entity][id] ?? {};
    return Object.entries(patch)
      .filter(([field, value]) => JSON.stringify(record[field]) !== JSON.stringify(value))
      .map(([field, value]) => ({ entity, entityId: id, kind: 'set', field, value }));
  };

  async function commit(drafts: Draft[], authorOverride?: string): Promise<void> {
    if (drafts.length === 0) return;
    // undefined fields would vanish in SQLite's JSON anyway; drop them so memory and disk agree.
    for (const d of drafts) if (d.kind === 'create') d.data = Object.fromEntries(Object.entries(d.data).filter(([, v]) => v !== undefined));
    let hlc = lastHlc;
    const ops: Op[] = drafts.map((d) => {
      hlc = tick(hlc, now(), deviceId!);
      return { ...d, id: newId(), hlc, authorId: authorOverride ?? memberId ?? deviceId! } as Op;
    });
    await db.append(ops); // throws → nothing below runs and the state stays as it was

    // Copy what the ops touch so every commit yields a new State object (React and selector caches key on it).
    const state = { ...folded.state };
    const copiedTables = new Set<EntityName>();
    const copiedRecords = new Set<string>();
    for (const op of ops) {
      if (!copiedTables.has(op.entity)) {
        state[op.entity] = { ...state[op.entity] };
        copiedTables.add(op.entity);
      }
      const key = `${op.entity}/${op.entityId}`;
      const record = state[op.entity][op.entityId];
      if (record && !copiedRecords.has(key)) state[op.entity][op.entityId] = { ...record };
      copiedRecords.add(key);
    }
    folded.state = state;
    folded.conflicts = [...folded.conflicts];
    foldOps(folded, ops);
    lastHlc = hlc;
    await db.setMeta('lastHlc', hlc!);
    listeners.forEach((fn) => fn());
  }

  const store: Store = {
    getState: () => folded.state,
    getConflicts: () => folded.conflicts,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    get memberId() {
      return memberId;
    },
    deviceId,
    create: (entity, data) =>
      serial(async () => {
        const id = newId();
        await commit([{ entity, entityId: id, kind: 'create', data }]);
        return id;
      }),
    update: (entity, id, patch) => serial(() => commit(diff(entity, id, patch))),
    remove: (entity, id) => serial(() => commit([{ entity, entityId: id, kind: 'delete' }])),
    restore: (entity, id) => serial(() => commit(diff(entity, id, { deletedAt: null }))),
    batch: (fn) =>
      serial(() => {
        const drafts: Draft[] = [];
        fn({
          create(entity, data) {
            const id = newId();
            drafts.push({ entity, entityId: id, kind: 'create', data });
            return id;
          },
          update: (entity, id, patch) => void drafts.push(...diff(entity, id, patch)),
          remove: (entity, id) => void drafts.push({ entity, entityId: id, kind: 'delete' }),
          restore: (entity, id) => void drafts.push(...diff(entity, id, { deletedAt: null })),
        });
        return commit(drafts);
      }),
    setMember: (name) =>
      serial(async () => {
        const id = newId();
        const clean = name.trim();
        await commit([{ entity: 'member', entityId: id, kind: 'create', data: { name: clean, initial: (clean[0] ?? '?').toUpperCase() } }], id);
        await db.setMeta('memberId', id);
        memberId = id;
      }),
    meta: { get: (key) => db.getMeta(key), set: (key, value) => db.setMeta(key, value) },
    loadOps: () => db.loadAll(),
  };
  return store;
}
