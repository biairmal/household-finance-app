import { verifyGoogleIdToken } from './auth';

export interface Env {
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GEMINI_API_KEY: string;
  GEMINI_MODEL: string;
  /** Comma-separated web origins allowed by CORS (the Pages URL, localhost in dev). */
  ALLOWED_ORIGINS: string;
}

const TOKEN_URL = 'https://oauth2.googleapis.com/token';

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const readJson = async (req: Request): Promise<Record<string, unknown> | null> => {
  try {
    const body = await req.json();
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
};

async function googleToken(env: Env, params: Record<string, string>) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, ...params }),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, status: res.status, data };
}

async function route(req: Request, env: Env): Promise<Response> {
  const { pathname } = new URL(req.url);
  if (req.method !== 'POST') return json({ error: 'not_found' }, 404);

  if (pathname === '/oauth/exchange') {
    const body = await readJson(req);
    if (typeof body?.code !== 'string' || typeof body.redirectUri !== 'string') return json({ error: 'bad_request' }, 400);
    const r = await googleToken(env, { grant_type: 'authorization_code', code: body.code, redirect_uri: body.redirectUri });
    if (!r.ok) return json({ error: r.data.error ?? 'token_exchange_failed' }, r.status === 400 ? 400 : 502);
    return json({
      accessToken: r.data.access_token,
      refreshToken: r.data.refresh_token,
      expiresIn: r.data.expires_in,
      idToken: r.data.id_token,
    });
  }

  if (pathname === '/oauth/refresh') {
    const body = await readJson(req);
    if (typeof body?.refreshToken !== 'string') return json({ error: 'bad_request' }, 400);
    const r = await googleToken(env, { grant_type: 'refresh_token', refresh_token: body.refreshToken });
    if (!r.ok) return json({ error: r.data.error ?? 'refresh_failed' }, r.status === 400 ? 401 : 502);
    return json({ accessToken: r.data.access_token, expiresIn: r.data.expires_in, idToken: r.data.id_token });
  }

  if (pathname === '/extract') {
    const auth = req.headers.get('Authorization') ?? '';
    const user = auth.startsWith('Bearer ') ? await verifyGoogleIdToken(auth.slice(7), env.GOOGLE_CLIENT_ID) : null;
    if (!user) return json({ error: 'unauthorized' }, 401);
    return json({ error: 'not_implemented' }, 501);
  }

  return json({ error: 'not_found' }, 404);
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const origin = req.headers.get('Origin');
    const allowed = !!origin && env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).includes(origin);
    const cors: Record<string, string> = allowed
      ? {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Headers': 'Authorization, Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          Vary: 'Origin',
        }
      : {};
    const res = req.method === 'OPTIONS' ? new Response(null, { status: 204 }) : await route(req, env);
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
    // Only path and status: never tokens, bodies or user ids.
    console.log(`${req.method} ${new URL(req.url).pathname} ${res.status}`);
    return res;
  },
};
