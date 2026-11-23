const JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];
const ALG = { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' };

const b64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
const parse = (s: string) => JSON.parse(new TextDecoder().decode(b64url(s)));

/** Verifies a Google ID token's RS256 signature, issuer, audience and expiry. Returns null on anything wrong. */
export async function verifyGoogleIdToken(
  token: string,
  audience: string,
): Promise<{ sub: string; email: string } | null> {
  try {
    const [h, p, s] = token.split('.');
    if (!h || !p || !s) return null;
    const header = parse(h);
    const payload = parse(p);
    if (header.alg !== 'RS256') return null;
    if (payload.aud !== audience || !ISSUERS.includes(payload.iss)) return null;
    if (typeof payload.exp !== 'number' || payload.exp * 1000 < Date.now()) return null;
    if (typeof payload.sub !== 'string' || typeof payload.email !== 'string') return null;

    const res = await fetch(JWKS_URL);
    if (!res.ok) return null;
    const { keys } = (await res.json()) as { keys: (JsonWebKey & { kid: string })[] };
    const jwk = keys.find((k) => k.kid === header.kid);
    if (!jwk) return null;
    const key = await crypto.subtle.importKey('jwk', jwk, ALG, false, ['verify']);
    const ok = await crypto.subtle.verify(ALG, key, b64url(s), new TextEncoder().encode(`${h}.${p}`));
    return ok ? { sub: payload.sub, email: payload.email } : null;
  } catch {
    return null;
  }
}
