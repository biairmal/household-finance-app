import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { verifyGoogleIdToken } from '../src/auth';

const ALG = { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' };
const enc = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
let keys: CryptoKeyPair;
let other: CryptoKeyPair;

const sign = async (payload: object, key = keys.privateKey) => {
  const data = `${enc({ alg: 'RS256', kid: 'k1' })}.${enc(payload)}`;
  const sig = await crypto.subtle.sign(ALG, key, new TextEncoder().encode(data));
  return `${data}.${Buffer.from(sig).toString('base64url')}`;
};
const good = () => ({
  iss: 'https://accounts.google.com',
  aud: 'client-id',
  sub: '123',
  email: 'a@example.com',
  exp: Math.floor(Date.now() / 1000) + 600,
});

beforeAll(async () => {
  const gen = () =>
    crypto.subtle.generateKey({ ...ALG, modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]) }, true, [
      'sign',
      'verify',
    ]) as Promise<CryptoKeyPair>;
  keys = await gen();
  other = await gen();
  const jwk = { ...(await crypto.subtle.exportKey('jwk', keys.publicKey)), kid: 'k1' };
  vi.stubGlobal('fetch', vi.fn(async () => Response.json({ keys: [jwk] })));
});
afterEach(() => vi.clearAllMocks());

describe('verifyGoogleIdToken', () => {
  it('accepts a correctly signed, unexpired token for our audience', async () => {
    expect(await verifyGoogleIdToken(await sign(good()), 'client-id')).toEqual({ sub: '123', email: 'a@example.com' });
  });
  it('rejects another audience', async () => {
    expect(await verifyGoogleIdToken(await sign({ ...good(), aud: 'someone-else' }), 'client-id')).toBeNull();
  });
  it('rejects an expired token', async () => {
    expect(await verifyGoogleIdToken(await sign({ ...good(), exp: 1 }), 'client-id')).toBeNull();
  });
  it('rejects a foreign issuer', async () => {
    expect(await verifyGoogleIdToken(await sign({ ...good(), iss: 'https://evil.example' }), 'client-id')).toBeNull();
  });
  it('rejects a token signed by a different key', async () => {
    expect(await verifyGoogleIdToken(await sign(good(), other.privateKey), 'client-id')).toBeNull();
  });
  it('rejects a tampered payload', async () => {
    const [h, , s] = (await sign(good())).split('.');
    expect(await verifyGoogleIdToken(`${h}.${enc({ ...good(), sub: '999' })}.${s}`, 'client-id')).toBeNull();
  });
});
