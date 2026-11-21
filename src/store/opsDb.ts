import { Op } from '../domain/sync/ops';

/** The spec's LocalStore (§7.1): the op log plus a few device settings. */
export interface OpsDb {
  loadAll(): Promise<Op[]>;
  /** Idempotent: an op id already stored is ignored. */
  append(ops: Op[]): Promise<void>;
  getMeta(key: string): Promise<string | null>;
  setMeta(key: string, value: string): Promise<void>;
}

export function memoryOpsDb(): OpsDb {
  const ops = new Map<string, Op>();
  const meta = new Map<string, string>();
  return {
    loadAll: async () => [...ops.values()],
    append: async (more) => {
      for (const op of more) if (!ops.has(op.id)) ops.set(op.id, op);
    },
    getMeta: async (key) => meta.get(key) ?? null,
    setMeta: async (key, value) => {
      meta.set(key, value);
    },
  };
}
