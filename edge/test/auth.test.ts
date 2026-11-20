import { describe, expect, it } from 'vitest';
import worker, { type Env } from '../src/index';
import { verifyGoogleIdToken } from '../src/auth';

const env: Env = {
  GOOGLE_CLIENT_ID: 'client-id',
  GOOGLE_CLIENT_SECRET: 'secret',
  GEMINI_API_KEY: 'key',
  GEMINI_MODEL: 'gemini-test',
  ALLOWED_ORIGINS: 'https://app.example',
};

const post = (path: string, body?: string, headers: Record<string, string> = {}) =>
  worker.fetch(new Request(`https://edge.example${path}`, { method: 'POST', body, headers }), env);

describe('auth', () => {
  it('/oauth/refresh with no body → 400', async () => {
    expect((await post('/oauth/refresh')).status).toBe(400);
  });

  it('/oauth/exchange with missing fields → 400', async () => {
    expect((await post('/oauth/exchange', '{"code":"x"}')).status).toBe(400);
  });

  it('/extract with no Authorization header → 401', async () => {
    expect((await post('/extract', '{"images":[]}')).status).toBe(401);
  });

  it('/extract with a garbage bearer token → 401', async () => {
    expect((await post('/extract', '{"images":[]}', { Authorization: 'Bearer garbage' })).status).toBe(401);
  });

  it("verifyGoogleIdToken('garbage') → null", async () => {
    expect(await verifyGoogleIdToken('garbage', 'client-id')).toBeNull();
  });

  it('unknown route → 404', async () => {
    expect((await post('/nope')).status).toBe(404);
  });
});
