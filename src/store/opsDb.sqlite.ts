import * as SQLite from 'expo-sqlite';
import { EntityName, Op } from '../domain/sync/ops';
import { OpsDb } from './opsDb';

type Row = { id: string; hlc: string; author_id: string; entity: string; entity_id: string; kind: string; body: string };

const SCHEMA = `
CREATE TABLE IF NOT EXISTS ops (
  id TEXT PRIMARY KEY NOT NULL, hlc TEXT NOT NULL, author_id TEXT NOT NULL, device_id TEXT NOT NULL,
  entity TEXT NOT NULL, entity_id TEXT NOT NULL, kind TEXT NOT NULL, body TEXT NOT NULL,
  uploaded INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS ops_hlc ON ops (hlc);
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
PRAGMA user_version = 1;
`;

const body = (op: Op): string =>
  JSON.stringify(op.kind === 'create' ? op.data : op.kind === 'set' ? { field: op.field, value: op.value } : {});

function toOp(r: Row): Op {
  const base = { id: r.id, hlc: r.hlc, authorId: r.author_id, entity: r.entity as EntityName, entityId: r.entity_id };
  const b = JSON.parse(r.body);
  if (r.kind === 'create') return { ...base, kind: 'create', data: b };
  if (r.kind === 'set') return { ...base, kind: 'set', field: b.field, value: b.value };
  return { ...base, kind: 'delete' };
}

// The device id is the last part of the HLC (see hlc.ts).
const deviceOf = (hlc: string) => hlc.split(':').slice(2).join(':');

export async function sqliteOpsDb(name = 'household.db'): Promise<OpsDb & { sizeBytes(): Promise<number> }> {
  const db = await SQLite.openDatabaseAsync(name);
  await db.execAsync(SCHEMA);
  return {
    async loadAll() {
      const rows = await db.getAllAsync<Row>('SELECT id, hlc, author_id, entity, entity_id, kind, body FROM ops ORDER BY hlc, id');
      return rows.map(toOp);
    },
    async append(ops) {
      await db.withTransactionAsync(async () => {
        for (const op of ops) {
          await db.runAsync(
            'INSERT OR IGNORE INTO ops (id, hlc, author_id, device_id, entity, entity_id, kind, body) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            op.id, op.hlc, op.authorId, deviceOf(op.hlc), op.entity, op.entityId, op.kind, body(op),
          );
        }
      });
    },
    async getMeta(key) {
      const r = await db.getFirstAsync<{ value: string }>('SELECT value FROM meta WHERE key = ?', key);
      return r?.value ?? null;
    },
    async setMeta(key, value) {
      await db.runAsync('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', key, value);
    },
    async sizeBytes() {
      const c = await db.getFirstAsync<{ n: number }>('PRAGMA page_count');
      const s = await db.getFirstAsync<{ n: number }>('PRAGMA page_size');
      return (Object.values(c ?? {})[0] as number) * (Object.values(s ?? {})[0] as number);
    },
  };
}
