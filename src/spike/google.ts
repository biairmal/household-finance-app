import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { clearRefreshToken, getRefreshToken, setRefreshToken } from './token-store';

export const CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '';
export const EDGE_URL = process.env.EXPO_PUBLIC_EDGE_URL ?? '';
const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? '';
const SCOPES = [
  'openid',
  'email',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/calendar.app.created',
];

export type Session = { accessToken: string; idToken: string; expiresAt: number; via: 'sign-in' | 'refresh' };
let session: Session | null = null;

const redirectUri = () => (Platform.OS === 'web' ? `${location.origin}/spikes/auth` : `${WEB_URL}/oauth-callback`);

const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

/** PKCE pair (RFC 7636, S256). */
async function pkce() {
  const verifier = b64url(Crypto.getRandomBytes(32));
  const hash = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, new TextEncoder().encode(verifier));
  return { verifier, challenge: b64url(new Uint8Array(hash)) };
}

const authUrl = (state: string, challenge: string, scopes: string[]) =>
  'https://accounts.google.com/o/oauth2/v2/auth?' +
  new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: scopes.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });

async function edge<T>(path: string, body: object): Promise<T> {
  const res = await fetch(`${EDGE_URL}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`${path} ${res.status} ${data.error ?? ''}`);
  return data as T;
}

async function exchange(code: string, codeVerifier: string): Promise<Session> {
  const t = await edge<{ accessToken: string; refreshToken?: string; expiresIn: number; idToken: string }>(
    '/oauth/exchange',
    { code, redirectUri: redirectUri(), codeVerifier },
  );
  if (t.refreshToken) await setRefreshToken(t.refreshToken);
  session = {
    accessToken: t.accessToken,
    idToken: t.idToken,
    expiresAt: Date.now() + t.expiresIn * 1000,
    via: 'sign-in',
  };
  return session;
}

/**
 * Starts sign-in. On web this navigates away (redirect, not popup); finish with completeWebSignIn() on return.
 * extraScopes lets the calendar spike retry with calendar.events (Task 6 Step 3).
 */
export async function signIn(extraScopes: string[] = []): Promise<Session | null> {
  const state = Crypto.randomUUID();
  const { verifier, challenge } = await pkce();
  const url = authUrl(state, challenge, [...SCOPES, ...extraScopes]);
  if (Platform.OS === 'web') {
    localStorage.setItem('oauthState', state);
    localStorage.setItem('oauthVerifier', verifier);
    location.assign(url);
    return null;
  }
  const res = await WebBrowser.openAuthSessionAsync(url, 'householdmoney://oauth');
  if (res.type !== 'success') return null;
  const params = new URL(res.url).searchParams;
  if (params.get('state') !== state) throw new Error('state mismatch');
  const code = params.get('code');
  if (!code) throw new Error(params.get('error') ?? 'no code');
  return exchange(code, verifier);
}

/** Web only: if the URL carries ?code from Google, exchange it and clean the URL. */
export async function completeWebSignIn(): Promise<Session | null> {
  if (Platform.OS !== 'web') return null;
  const params = new URLSearchParams(location.search);
  const code = params.get('code');
  if (!code && !params.get('error')) return null;
  history.replaceState(null, '', location.pathname);
  const expected = localStorage.getItem('oauthState');
  const verifier = localStorage.getItem('oauthVerifier');
  localStorage.removeItem('oauthState');
  localStorage.removeItem('oauthVerifier');
  if (!expected || !verifier || params.get('state') !== expected) throw new Error('state mismatch');
  if (!code) throw new Error(params.get('error') ?? 'no code');
  return exchange(code, verifier);
}

/** Returns a valid session, refreshing through the Worker when needed. Null when not signed in. */
export async function getSession(force = false): Promise<Session | null> {
  if (!force && session && session.expiresAt - 60_000 > Date.now()) return session;
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;
  const t = await edge<{ accessToken: string; expiresIn: number; idToken?: string }>('/oauth/refresh', {
    refreshToken,
  });
  session = {
    accessToken: t.accessToken,
    idToken: t.idToken ?? session?.idToken ?? '',
    expiresAt: Date.now() + t.expiresIn * 1000,
    via: 'refresh',
  };
  return session;
}

export async function signOut() {
  session = null;
  await clearRefreshToken();
}

export const emailOf = (idToken: string): string | null => {
  try {
    return JSON.parse(atob(idToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).email ?? null;
  } catch {
    return null;
  }
};

/** Authenticated Google API call with the current access token. Throws with the response text on HTTP errors. */
export async function google(url: string, init: RequestInit = {}): Promise<Response> {
  const s = await getSession();
  if (!s) throw new Error('not signed in');
  const res = await fetch(url, { ...init, headers: { ...init.headers, Authorization: `Bearer ${s.accessToken}` } });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res;
}
