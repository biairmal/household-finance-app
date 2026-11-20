import { afterEach, describe, expect, it, vi } from 'vitest';
import worker, { type Env } from '../src/index';
import type { ExtractedRow } from '../src/extract-schema';

vi.mock('../src/auth', () => ({
  verifyGoogleIdToken: async (t: string) => (t === 'good' ? { sub: '1', email: 'a@example.com' } : null),
}));

const env: Env = {
  GOOGLE_CLIENT_ID: 'client-id',
  GOOGLE_CLIENT_SECRET: 'secret',
  GEMINI_API_KEY: 'gemini-key',
  GEMINI_MODEL: 'gemini-test-001',
  ALLOWED_ORIGINS: '',
};

const row: ExtractedRow = {
  date: '2026-11-18',
  time: '14:02',
  amount: 86500,
  direction: 'out',
  description: 'GOPAY TOPUP',
  counterpartyName: null,
  counterpartyAccount: null,
  reference: 'REF123',
  runningBalance: 1250000,
  cutOff: false,
};

const gemini = (text: string, status = 200) =>
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json({ candidates: [{ content: { parts: [{ text }] } }] }, { status })),
  );

const extract = (body: unknown, token = 'good') =>
  worker.fetch(
    new Request('https://edge.example/extract', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
    env,
  );

afterEach(() => vi.unstubAllGlobals());

describe('/extract', () => {
  it('passes a valid model response through unchanged', async () => {
    gemini(JSON.stringify({ rows: [row] }));
    const res = await extract({ images: ['aGVsbG8='], accountHint: 'BCA' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ rows: [row] });
  });

  it('calls the pinned model with the key in a header and the images inline', async () => {
    gemini(JSON.stringify({ rows: [] }));
    await extract({ images: ['aGVsbG8=', 'd29ybGQ='] });
    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/models/gemini-test-001:generateContent');
    expect(url).not.toContain('gemini-key');
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe('gemini-key');
    const body = JSON.parse(init.body as string);
    expect(body.contents[0].parts.filter((p: { inline_data?: unknown }) => p.inline_data)).toHaveLength(2);
    expect(body.generationConfig.responseMimeType).toBe('application/json');
  });

  it('malformed model output → 502 bad_model_output', async () => {
    gemini('not json');
    const res = await extract({ images: ['aGVsbG8='] });
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: 'bad_model_output' });
  });

  it.each([
    ['amount not an integer', { ...row, amount: 865.5 }],
    ['negative amount', { ...row, amount: -100 }],
    ['bad date', { ...row, date: '18/11/2026' }],
    ['bad direction', { ...row, direction: 'debit' }],
    ['missing cutOff', { ...row, cutOff: undefined }],
  ])('model row with %s → 502', async (_, bad) => {
    gemini(JSON.stringify({ rows: [bad] }));
    expect((await extract({ images: ['aGVsbG8='] })).status).toBe(502);
  });

  it('more than 10 images → 400', async () => {
    gemini(JSON.stringify({ rows: [] }));
    expect((await extract({ images: Array(11).fill('aGVsbG8=') })).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('no images → 400', async () => {
    expect((await extract({ images: [] })).status).toBe(400);
  });

  it('Gemini HTTP error → 502 model_error', async () => {
    gemini('{}', 500);
    const res = await extract({ images: ['aGVsbG8='] });
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: 'model_error' });
  });

  it('invalid ID token → 401 before any model call', async () => {
    gemini(JSON.stringify({ rows: [] }));
    expect((await extract({ images: ['aGVsbG8='] }, 'bad')).status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });
});
