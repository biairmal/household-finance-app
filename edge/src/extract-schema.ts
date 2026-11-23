export type ExtractedRow = {
  date: string; // YYYY-MM-DD
  time: string | null; // HH:MM
  amount: number; // integer rupiah, positive
  direction: 'in' | 'out';
  description: string;
  counterpartyName: string | null;
  counterpartyAccount: string | null;
  reference: string | null;
  runningBalance: number | null;
  cutOff: boolean;
};

const str = { type: 'STRING' };
const nstr = { type: 'STRING', nullable: true };

/** Gemini responseSchema (OpenAPI subset) matching ExtractedRow. */
export const responseSchema = {
  type: 'OBJECT',
  properties: {
    rows: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          date: { ...str, description: 'YYYY-MM-DD' },
          time: { ...nstr, description: 'HH:MM 24h, null if not shown' },
          amount: { type: 'INTEGER', description: 'whole rupiah, always positive' },
          direction: { type: 'STRING', enum: ['in', 'out'] },
          description: str,
          counterpartyName: nstr,
          counterpartyAccount: nstr,
          reference: nstr,
          runningBalance: { type: 'INTEGER', nullable: true },
          cutOff: { type: 'BOOLEAN', description: 'true if the row is clipped at the image edge' },
        },
        required: ['date', 'time', 'amount', 'direction', 'description', 'counterpartyName', 'counterpartyAccount', 'reference', 'runningBalance', 'cutOff'],
        propertyOrdering: ['date', 'time', 'amount', 'direction', 'description', 'counterpartyName', 'counterpartyAccount', 'reference', 'runningBalance', 'cutOff'],
      },
    },
  },
  required: ['rows'],
};

const isNullableString = (v: unknown) => v === null || typeof v === 'string';
const isDate = (v: unknown) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v));

function isRow(r: unknown): r is ExtractedRow {
  if (!r || typeof r !== 'object') return false;
  const x = r as Record<string, unknown>;
  return (
    isDate(x.date) &&
    (x.time === null || (typeof x.time === 'string' && /^\d{2}:\d{2}$/.test(x.time))) &&
    Number.isSafeInteger(x.amount) &&
    (x.amount as number) > 0 &&
    (x.direction === 'in' || x.direction === 'out') &&
    typeof x.description === 'string' &&
    isNullableString(x.counterpartyName) &&
    isNullableString(x.counterpartyAccount) &&
    isNullableString(x.reference) &&
    (x.runningBalance === null || Number.isSafeInteger(x.runningBalance)) &&
    typeof x.cutOff === 'boolean'
  );
}

/**
 * Returns the valid rows, or null if the output isn't the expected shape. An invalid row the model flagged
 * cutOff (e.g. amount 0 because it's clipped) is dropped; any other invalid row rejects the whole output.
 */
export function parseModelOutput(text: string): { rows: ExtractedRow[] } | null {
  try {
    const out = JSON.parse(text);
    if (!Array.isArray(out?.rows)) return null;
    const rows = out.rows.filter((r: unknown) => !(r && typeof r === 'object' && (r as ExtractedRow).cutOff === true && !isRow(r)));
    return rows.every(isRow) ? { rows } : null;
  } catch {
    return null;
  }
}
