import { ENTITY_NAMES, EntityName, Op, State } from './sync/ops';

const cell = (v: unknown): string => {
  if (v === undefined || v === null) return '';
  const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const toCsv = (rows: Record<string, unknown>[], columns: string[]): string =>
  [columns.join(','), ...rows.map((r) => columns.map((c) => cell(r[c])).join(','))].join('\n') + '\n';

const FILES: Record<string, [EntityName, string[]]> = {
  'accounts.csv': ['account', ['id', 'name', 'type', 'institution', 'accountNumber', 'currency', 'openingBalance', 'ownerMemberId']],
  'transactions.csv': ['transaction', ['id', 'date', 'time', 'type', 'amount', 'accountId', 'toAccountId', 'categoryId', 'pocketId', 'note', 'counterpartyName', 'counterpartyAccount', 'externalRef', 'source', 'authorId']],
  'categories.csv': ['category', ['id', 'name', 'emoji', 'kind']],
  'budgets.csv': ['budget', ['id', 'categoryId', 'period', 'amount']],
  'bills.csv': ['bill', ['id', 'name', 'amount', 'dueDate', 'recurrence', 'funding', 'reminderOffsetsDays', 'createdAt']],
  'goals.csv': ['goal', ['id', 'name', 'target', 'targetDate', 'funding']],
};

export function exportCsvFiles(state: State): Record<string, string> {
  return Object.fromEntries(
    Object.entries(FILES).map(([file, [entity, columns]]) => [
      file,
      toCsv(Object.values(state[entity]).filter((r) => !r.deletedAt), columns),
    ]),
  );
}

type BackupMeta = { householdId: string; exportedAt: string };

export const serializeBackup = (ops: Op[], meta: BackupMeta): string => JSON.stringify({ version: 1, meta, ops });

export function parseBackup(json: string): { ops: Op[]; meta: BackupMeta } {
  const data = JSON.parse(json);
  if (data?.version !== 1) throw new Error(`Unsupported backup version ${data?.version}`);
  const { ops, meta } = data;
  if (typeof meta?.householdId !== 'string' || typeof meta?.exportedAt !== 'string' || !Array.isArray(ops)) {
    throw new Error('Invalid backup file');
  }
  for (const op of ops) {
    const ok =
      typeof op?.id === 'string' && typeof op.hlc === 'string' && typeof op.entityId === 'string' &&
      ENTITY_NAMES.includes(op.entity) && ['create', 'set', 'delete'].includes(op.kind);
    if (!ok) throw new Error('Invalid backup file');
  }
  return { ops, meta };
}
