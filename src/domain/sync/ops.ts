import { Hlc, compareHlc, parseHlc } from './hlc';

export type EntityName = 'account' | 'transaction' | 'category' | 'pocket' | 'allocation' | 'budget' | 'bill' | 'goal' | 'rule' | 'member';

export const ENTITY_NAMES: EntityName[] = ['account', 'transaction', 'category', 'pocket', 'allocation', 'budget', 'bill', 'goal', 'rule', 'member'];

export type Op = { id: string; hlc: Hlc; authorId: string; entity: EntityName; entityId: string } & (
  | { kind: 'create'; data: Record<string, unknown> }
  | { kind: 'set'; field: string; value: unknown }
  | { kind: 'delete' }
);

export type State = Record<EntityName, Record<string, Record<string, unknown>>>;

export type Conflict = {
  entity: EntityName;
  entityId: string;
  field: string;
  keptValue: unknown;
  lostValue: unknown;
  lostAuthorId: string;
  lostHlc: Hlc;
};

const DAY_MS = 86400000;

export const emptyState = (): State =>
  Object.fromEntries(ENTITY_NAMES.map((e) => [e, {}])) as State;

type LastSet = { value: unknown; authorId: string; hlc: Hlc };

/** A fold in progress: keep it and pass later ops (sorted, all after lastHlc) to foldOps to resume. */
export type Folded = { state: State; conflicts: Conflict[]; lastSet: Map<string, LastSet>; lastHlc: Hlc | null };

export const emptyFolded = (): Folded => ({ state: emptyState(), conflicts: [], lastSet: new Map(), lastHlc: null });

/** Applies HLC-sorted ops to acc, mutating and returning it. */
export function foldOps(acc: Folded, sortedOps: Op[]): Folded {
  const { state, conflicts, lastSet } = acc;
  for (const op of sortedOps) {
    acc.lastHlc = op.hlc;
    const table = state[op.entity];
    if (!table) continue; // unknown entity from a newer app version
    const record = table[op.entityId];
    const at = new Date(parseHlc(op.hlc).ms).toISOString();

    if (op.kind === 'create') {
      table[op.entityId] = { ...record, ...op.data, id: op.entityId, updatedBy: op.authorId, updatedAt: at };
      continue;
    } else if (!record) {
      continue; // set/delete on a record that was never created
    } else if (op.kind === 'delete') {
      // A later set never clears this; restoring is an explicit set of deletedAt.
      record.deletedAt ??= at;
    } else {
      // shortcut: v1 calls two different authors' sets within 24h a conflict; use version vectors if that over-reports.
      const key = `${op.entity}/${op.entityId}/${op.field}`;
      const prev = lastSet.get(key);
      if (
        prev &&
        prev.authorId !== op.authorId &&
        parseHlc(op.hlc).ms - parseHlc(prev.hlc).ms < DAY_MS &&
        JSON.stringify(prev.value) !== JSON.stringify(op.value)
      ) {
        conflicts.push({
          entity: op.entity, entityId: op.entityId, field: op.field,
          keptValue: op.value, lostValue: prev.value, lostAuthorId: prev.authorId, lostHlc: prev.hlc,
        });
      }
      lastSet.set(key, { value: op.value, authorId: op.authorId, hlc: op.hlc });
      record[op.field] = op.value;
    }
    record.updatedBy = op.authorId;
    record.updatedAt = at;
  }
  return acc;
}

export const sortOps = (ops: Op[]): Op[] =>
  [...new Map(ops.map((op) => [op.id, op])).values()].sort((a, b) => compareHlc(a.hlc, b.hlc) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

/** Rebuilds state from the full op list. Pure and order-independent: ops are de-duplicated and sorted by HLC first. */
export function applyOps(ops: Op[]): { state: State; conflicts: Conflict[] } {
  const { state, conflicts } = foldOps(emptyFolded(), sortOps(ops));
  return { state, conflicts };
}
