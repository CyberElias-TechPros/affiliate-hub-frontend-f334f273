import type { Env } from '../env';

interface RequestLike {
  header?: (name: string) => string | undefined;
  url: string;
}

/** Base URL of the frontend — used for shareable affiliate/referral/product links. */
export function frontendBaseUrl(env: Env, c?: { req: RequestLike }): string {
  if (env.PUBLIC_FRONTEND_URL) return env.PUBLIC_FRONTEND_URL.replace(/\/$/, '');
  // Fall back to the request origin so links always work.
  const origin = c?.req?.header?.('Origin') || c?.req?.url?.split('/').slice(0, 3).join('/');
  return origin || 'http://localhost:5173';
}

/** Base URL of this API — used for OAuth redirect URIs.
 *  Accepts either the bare origin (https://api.example.com) or a full base
 *  (https://api.example.com/api/v1) to be forgiving of config mistakes.
 */
export function apiBaseUrl(env: Env, c?: { req: RequestLike }): string {
  if (env.PUBLIC_API_URL) {
    return env.PUBLIC_API_URL.replace(/\/$/, '').replace(/\/api\/v1$/, '');
  }
  return c?.req?.url?.split('/').slice(0, 3).join('/') || 'http://localhost:8787';
}
