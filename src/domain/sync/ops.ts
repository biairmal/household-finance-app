import { Hlc, compareHlc, parseHlc } from './hlc';

export type EntityName = 'account' | 'transaction' | 'category' | 'pocket' | 'allocation' | 'budget' | 'bill' | 'goal' | 'rule';

export const ENTITY_NAMES: EntityName[] = ['account', 'transaction', 'category', 'pocket', 'allocation', 'budget', 'bill', 'goal', 'rule'];

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

/** Rebuilds state from the full op list. Pure and order-independent: ops are de-duplicated and sorted by HLC first. */
export function applyOps(ops: Op[]): { state: State; conflicts: Conflict[] } {
  const unique = [...new Map(ops.map((op) => [op.id, op])).values()];
  unique.sort((a, b) => compareHlc(a.hlc, b.hlc) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const state = emptyState();
  const conflicts: Conflict[] = [];
  const lastSet = new Map<string, { value: unknown; authorId: string; hlc: Hlc }>();

  for (const op of unique) {
    const table = state[op.entity];
    if (!table) continue; // unknown entity from a newer app version
    const record = table[op.entityId];

    if (op.kind === 'create') {
      table[op.entityId] = { ...record, ...op.data, id: op.entityId };
    } else if (!record) {
      continue; // set/delete on a record that was never created
    } else if (op.kind === 'delete') {
      // A later set never clears this; restoring is an explicit set of deletedAt.
      record.deletedAt ??= new Date(parseHlc(op.hlc).ms).toISOString();
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
  }
  return { state, conflicts };
}
