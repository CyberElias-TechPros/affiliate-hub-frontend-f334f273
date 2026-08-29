import { Hono } from 'hono';
import type { Env, UserRow } from '../env';
import { get, run, newId, uniqueCode, now, toUser } from '../helpers/db';
import { signToken, ApiError } from '../helpers/auth';
import { frontendBaseUrl, apiBaseUrl } from '../helpers/baseUrl';
import { verifyGoogleIdToken, verifyAppleIdToken, exchangeCodeForToken, type OIDCPayload } from '../helpers/oidc';
import { notify } from '../services/engagement';
import { sign, verify } from 'hono/jwt';

const oauth = new Hono<{ Bindings: Env }>();

interface StatePayload {
  [key: string]: unknown;
  r?: string;
  exp: number;
}

async function makeState(env: Env, redirect: string): Promise<string> {
  const payload: StatePayload = { r: redirect.slice(0, 500), exp: Math.floor(Date.now() / 1000) + 600 };
  return sign(payload, env.JWT_SECRET, 'HS256');
}

async function readState(env: Env, state: string): Promise<string> {
  try {
    const payload = (await verify(state, env.JWT_SECRET, 'HS256')) as unknown as StatePayload;
    return payload.r?.startsWith('/') ? payload.r : '/dashboard';
  } catch {
    return '/dashboard';
  }
}

async function upsertSocialUser(env: Env, provider: 'google' | 'apple', payload: OIDCPayload): Promise<UserRow> {
  const email = (payload.email || '').toLowerCase();
  if (!email) throw new ApiError(400, 'Provider account has no email');

  let user = await get<UserRow>(env.DB, 'SELECT * FROM users WHERE email = ?', email);
  if (!user) {
    const _id = newId();
    const ts = now();
    await run(
      env.DB,
      `INSERT INTO users (_id, name, email, password_hash, phone, whatsapp, country, niche, niches, avatar_url, role, onboarding_complete, provider, referral_code, referred_by, created_at, updated_at)
       VALUES (?, ?, ?, '', '', '', 'NG', '', '[]', '', 'user', 0, ?, ?, NULL, ?, ?)`,
      _id, payload.name || email.split('@')[0], email, provider, await uniqueCode(env.DB, 'users', 'referral_code', 8), ts, ts
    );
    await notify(env.DB, _id, {
      type: 'system',
      title: '👋 Welcome to Affiliate Hub!',
      message: 'Complete your onboarding to start earning.',
      icon: '🎉',
      link: '/onboarding',
    });
    user = (await get<UserRow>(env.DB, 'SELECT * FROM users WHERE _id = ?', _id))!;
  } else if (!user.referral_code) {
    await run(env.DB, 'UPDATE users SET referral_code = ?, updated_at = ? WHERE _id = ?', await uniqueCode(env.DB, 'users', 'referral_code', 8), now(), user._id);
  }
  return user;
}

// ---------- Google ----------
oauth.get('/google', async (c) => {
  const clientId = c.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new ApiError(503, 'Google sign-in is not configured');
  const redirect = c.req.query('redirect') || '/dashboard';
  const state = await makeState(c.env, redirect);
  const redirectUri = `${apiBaseUrl(c.env, c)}/api/v1/auth/oauth/google/callback`;
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', state);
  url.searchParams.set('prompt', 'select_account');
  return c.redirect(url.toString(), 302);
});

oauth.get('/google/callback', async (c) => {
  const code = c.req.query('code');
  if (!code) throw new ApiError(400, 'Missing code');
  const state = c.req.query('state') || '';
  const redirectTo = await readState(c.env, state);

  const clientId = c.env.GOOGLE_CLIENT_ID;
  const clientSecret = c.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new ApiError(503, 'Google sign-in is not configured');

  const redirectUri = `${apiBaseUrl(c.env, c)}/api/v1/auth/oauth/google/callback`;
  const tokens = await exchangeCodeForToken({
    tokenUrl: 'https://oauth2.googleapis.com/token',
    clientId,
    clientSecret,
    code,
    redirectUri,
  });
  let payload: OIDCPayload;
  try {
    payload = await verifyGoogleIdToken(tokens.id_token, clientId);
  } catch (err) {
    throw new ApiError(401, err instanceof Error ? err.message : 'Google id_token verification failed');
  }

  const user = await upsertSocialUser(c.env, 'google', payload);
  const token = await signToken(c.env, user);
  return c.redirect(`${frontendBaseUrl(c.env, c)}/auth?token=${encodeURIComponent(token)}&redirect=${encodeURIComponent(redirectTo)}`, 302);
});

// ---------- Apple ----------
oauth.get('/apple', async (c) => {
  const clientId = c.env.APPLE_CLIENT_ID;
  if (!clientId) throw new ApiError(503, 'Apple sign-in is not configured');
  const redirect = c.req.query('redirect') || '/dashboard';
  const state = await makeState(c.env, redirect);
  const redirectUri = `${apiBaseUrl(c.env, c)}/api/v1/auth/oauth/apple/callback`;
  const url = new URL('https://appleid.apple.com/auth/authorize');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'name email');
  url.searchParams.set('state', state);
  url.searchParams.set('response_mode', 'query');
  return c.redirect(url.toString(), 302);
});

oauth.get('/apple/callback', async (c) => {
  const code = c.req.query('code');
  if (!code) throw new ApiError(400, 'Missing code');
  const state = c.req.query('state') || '';
  const redirectTo = await readState(c.env, state);

  const clientId = c.env.APPLE_CLIENT_ID;
  const clientSecret = c.env.APPLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new ApiError(503, 'Apple sign-in is not configured');

  const redirectUri = `${apiBaseUrl(c.env, c)}/api/v1/auth/oauth/apple/callback`;
  const tokens = await exchangeCodeForToken({
    tokenUrl: 'https://appleid.apple.com/auth/token',
    clientId,
    clientSecret,
    code,
    redirectUri,
  });
  let payload: OIDCPayload;
  try {
    payload = await verifyAppleIdToken(tokens.id_token, clientId);
  } catch (err) {
    throw new ApiError(401, err instanceof Error ? err.message : 'Apple id_token verification failed');
  }

  const user = await upsertSocialUser(c.env, 'apple', payload);
  const token = await signToken(c.env, user);
  return c.redirect(`${frontendBaseUrl(c.env, c)}/auth?token=${encodeURIComponent(token)}&redirect=${encodeURIComponent(redirectTo)}`, 302);
});

export default oauth;
