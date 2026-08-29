import type { Context, MiddlewareHandler } from 'hono';
import type { Env, UserRow } from '../env';
import { get } from './db';
import { toUser } from './db';
import { sign, verify } from 'hono/jwt';

export interface JWTPayload {
  [key: string]: unknown;
  id: string;
  email: string;
  role: string;
  exp?: number;
  iat?: number;
}

export async function signToken(env: Env, user: Pick<UserRow, '_id' | 'email' | 'role'>): Promise<string> {
  if (!env.JWT_SECRET) throw new ApiError(503, 'JWT_SECRET is not configured');
  const expiresIn = env.JWT_EXPIRES_IN || '7d';
  const nowSec = Math.floor(Date.now() / 1000);
  const exp = nowSec + parseDuration(expiresIn);
  return sign({ id: user._id, email: user.email, role: user.role, iat: nowSec, exp } as JWTPayload, env.JWT_SECRET, 'HS256');
}

function parseDuration(v: string): number {
  const m = /^(\d+)([smhd])$/.exec(v.trim());
  if (!m) return 7 * 24 * 3600;
  const n = parseInt(m[1], 10);
  switch (m[2]) {
    case 's': return n;
    case 'm': return n * 60;
    case 'h': return n * 3600;
    case 'd': return n * 86400;
    default: return 7 * 24 * 3600;
  }
}

export async function verifyToken(token: string, secret: string): Promise<JWTPayload> {
  return (await verify(token, secret, 'HS256')) as unknown as JWTPayload;
}

// ---------- Middleware ----------

export type AppVariables = { user: UserRow; userOut: ReturnType<typeof toUser> };
export type AppEnv = { Bindings: Env; Variables: AppVariables };
export type AppContext = Context<AppEnv>;

export const authMiddleware: MiddlewareHandler<{ Bindings: Env; Variables: { user: UserRow; userOut: ReturnType<typeof toUser> } }> = async (c, next) => {
  const header = c.req.header('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return c.json({ error: 'Authentication required' }, 401);

  let payload: JWTPayload;
  try {
    payload = await verifyToken(token, c.env.JWT_SECRET);
  } catch {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }

  const user = await get<UserRow>(c.env.DB, 'SELECT * FROM users WHERE _id = ?', payload.id);
  if (!user) return c.json({ error: 'User no longer exists' }, 401);

  c.set('user', user);
  c.set('userOut', toUser(user));
  await next();
};

export const adminMiddleware: MiddlewareHandler<{ Bindings: Env; Variables: { user: UserRow; userOut: ReturnType<typeof toUser> } }> = async (c, next) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Authentication required' }, 401);
  if (user.role !== 'admin') return c.json({ error: 'Forbidden' }, 403);
  await next();
};

export function requireAuth(c: AppContext): UserRow {
  const user = c.get('user');
  if (!user) throw new ApiError(401, 'Authentication required');
  return user;
}

// ---------- Errors ----------

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
  }
}
