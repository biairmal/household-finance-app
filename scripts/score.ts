// Scores extracted rows against hand-written expected rows (spec §10.4: ≥95% right on amount, date, direction).

export type ExpectedRow = { date: string; amount: number; direction: 'in' | 'out'; description?: string; cutOff?: boolean };
export type GotRow = { date: string; amount: number; direction: 'in' | 'out'; description: string; cutOff: boolean };

export type Score = {
  expected: number; // rows that count (expected rows not marked cutOff)
  correct: number; // date, amount and direction all right
  field: { date: number; amount: number; direction: number }; // per-field right counts
  invented: GotRow[]; // extracted rows with no expected row and not flagged cutOff
  missed: ExpectedRow[]; // counted expected rows with no extracted row at all
};

const fields = ['date', 'amount', 'direction'] as const;
const matches = (e: ExpectedRow, g: GotRow) => fields.filter((f) => e[f] === g[f]).length;

/**
 * Pairs each expected row with the unused extracted row that agrees on the most of date/amount/direction
 * (at least 2, so a pair is plausibly the same transaction). Expected rows marked cutOff may be dropped or
 * returned with cutOff: true; they don't count either way. Unpaired extracted rows are "invented" unless flagged cutOff.
 */
export function score(expected: ExpectedRow[], got: GotRow[]): Score {
  const unused = new Set(got.map((_, i) => i));
  const s: Score = { expected: 0, correct: 0, field: { date: 0, amount: 0, direction: 0 }, invented: [], missed: [] };
  // Full matches first, so a near-miss can't steal another row's exact partner.
  const order = expected.map((_, k) => k).sort((a, b) => Number(!!expected[a].cutOff) - Number(!!expected[b].cutOff));
  const pairs = new Map<number, GotRow>(); // expected index → extracted row
  for (const need of [3, 2]) {
    for (const k of order) {
      if (pairs.has(k)) continue;
      const i = [...unused].find((j) => matches(expected[k], got[j]) >= need);
      if (i !== undefined) {
        unused.delete(i);
        pairs.set(k, got[i]);
      }
    }
  }
  for (const [k, e] of expected.entries()) {
    if (e.cutOff) continue;
    s.expected++;
    const g = pairs.get(k);
    if (!g) {
      s.missed.push(e);
      continue;
    }
    for (const f of fields) if (e[f] === g[f]) s.field[f]++;
    if (matches(e, g) === 3) s.correct++;
  }
  s.invented = [...unused].map((i) => got[i]).filter((g) => !g.cutOff);
  return s;
}
