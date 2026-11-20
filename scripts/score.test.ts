import { describe, expect, it } from '@jest/globals';
import { type GotRow, score } from './score';

const got = (date: string, amount: number, direction: 'in' | 'out', cutOff = false): GotRow => ({
  date,
  amount,
  direction,
  description: '',
  cutOff,
});

describe('score', () => {
  it('counts exact rows as correct', () => {
    const s = score([{ date: '2026-11-18', amount: 86500, direction: 'out' }], [got('2026-11-18', 86500, 'out')]);
    expect(s).toMatchObject({ expected: 1, correct: 1, field: { date: 1, amount: 1, direction: 1 }, invented: [], missed: [] });
  });

  it('a wrong amount is a near-miss: pairs, but not correct', () => {
    const s = score([{ date: '2026-11-18', amount: 86500, direction: 'out' }], [got('2026-11-18', 8650, 'out')]);
    expect(s).toMatchObject({ correct: 0, field: { date: 1, amount: 0, direction: 1 }, invented: [], missed: [] });
  });

  it('exact partners win over near-misses regardless of order', () => {
    const e = [
      { date: '2026-11-18', amount: 10000, direction: 'out' as const },
      { date: '2026-11-18', amount: 20000, direction: 'out' as const },
    ];
    const s = score(e, [got('2026-11-18', 20000, 'out'), got('2026-11-18', 10000, 'out')]);
    expect(s.correct).toBe(2);
  });

  it('repeated identical rows each need their own extracted row', () => {
    const ride = { date: '2026-11-18', amount: 15000, direction: 'out' as const };
    const s = score([ride, ride], [got('2026-11-18', 15000, 'out')]);
    expect(s).toMatchObject({ expected: 2, correct: 1, missed: [ride] });
  });

  it('cut-off expected rows may be dropped or flagged; unflagged extras are invented', () => {
    const s = score(
      [
        { date: '2026-11-18', amount: 5000, direction: 'out', cutOff: true },
        { date: '2026-11-17', amount: 7000, direction: 'in', cutOff: true },
      ],
      [got('2026-11-18', 5000, 'out', true), got('2026-11-01', 999, 'in')],
    );
    expect(s.expected).toBe(0);
    expect(s.invented).toEqual([got('2026-11-01', 999, 'in')]);
  });
});
