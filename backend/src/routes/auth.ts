import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Env, UserRow } from '../env';
import { get, run, newId, uniqueCode, now, toUser } from '../helpers/db';
import { hashPassword, verifyPassword } from '../helpers/crypto';
import { authMiddleware, signToken, ApiError } from '../helpers/auth';
import { authRateLimit } from '../helpers/rateLimit';
import { notify } from '../services/engagement';

const auth = new Hono<{ Bindings: Env }>();

async function createUser(db: D1Database, data: {
  name: string;
  email: string;
  password?: string;
  passwordHash?: string;
  country?: string;
  whatsapp?: string;
  provider?: 'local' | 'google' | 'apple';
  referralCode?: string;
}): Promise<UserRow> {
  const _id = newId();
  const ts = now();
  const passwordHash = data.passwordHash ?? (data.password ? await hashPassword(data.password) : '');
  // The new user always gets their own freshly generated code; data.referralCode
  // is the referrer's code and must never be assigned to this user.
  const referralCode = await uniqueCode(db, 'users', 'referral_code', 8);
  let referredBy: string | null = null;

  if (data.referralCode) {
    const referrer = await get<UserRow>(db, 'SELECT * FROM users WHERE referral_code = ?', data.referralCode);
    if (referrer && referrer._id !== _id) referredBy = referrer._id;
  }

  await run(
    db,
    `INSERT INTO users (_id, name, email, password_hash, phone, whatsapp, country, niche, niches, avatar_url, role, onboarding_complete, provider, referral_code, referred_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, '', ?, ?, '', '[]', '', 'user', 0, ?, ?, ?, ?, ?)`,
    _id, data.name.trim(), data.email.toLowerCase(), passwordHash, data.whatsapp || '',
    data.country || 'NG', data.provider || 'local', referralCode, referredBy, ts, ts
  );

  if (referredBy) {
    await run(
      db,
      `INSERT INTO referrals (_id, referrer, referred, code, status, reward_amount, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'pending', 0, ?, ?)`,
      newId(), referredBy, _id, await uniqueCode(db, 'referrals', 'code', 8), ts, ts
    );
    await notify(db, referredBy, {
      type: 'referral',
      title: '🎉 New referral!',
      message: `${data.name} joined with your link.`,
      icon: '🤝',
      link: '/referrals',
    });
  }

  const user = await get<UserRow>(db, 'SELECT * FROM users WHERE _id = ?', _id);
  if (!user) throw new ApiError(500, 'Failed to create user');
  return user;
}

// ---------- Signup ----------
auth.post('/signup', authRateLimit, zValidator('json', z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().email('Valid email required').transform((v) => v.toLowerCase()),
  password: z.string().min(6, 'Password min 6 chars').max(128),
  country: z.string().max(10).optional(),
  whatsapp: z.string().max(50).optional(),
  referralCode: z.string().max(32).optional(),
})), async (c) => {
  const body = c.req.valid('json');
  const exists = await get<UserRow>(c.env.DB, 'SELECT _id FROM users WHERE email = ?', body.email);
  if (exists) throw new ApiError(409, 'Email already registered');

  const user = await createUser(c.env.DB, body);
  const token = await signToken(c.env, user);
  await notify(c.env.DB, user._id, {
    type: 'system',
    title: '👋 Welcome to Affiliate Hub!',
    message: 'Complete your onboarding to start earning.',
    icon: '🎉',
    link: '/onboarding',
  });
  return c.json({ token, user: toUser(user) }, 201);
});

// ---------- Login ----------
auth.post('/login', authRateLimit, zValidator('json', z.object({
  email: z.string().email().transform((v) => v.toLowerCase()),
  password: z.string().min(1),
})), async (c) => {
  const { email, password } = c.req.valid('json');
  const user = await get<UserRow>(c.env.DB, 'SELECT * FROM users WHERE email = ?', email);
  if (!user || !user.password_hash) throw new ApiError(401, 'Invalid credentials');

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) throw new ApiError(401, 'Invalid credentials');

  const token = await signToken(c.env, user);
  return c.json({ token, user: toUser(user) });
});

// ---------- Current user ----------
auth.get('/me', authMiddleware, async (c) => {
  return c.json({ user: c.get('userOut') });
});

// ---------- Onboarding ----------
auth.post('/onboarding', authMiddleware, zValidator('json', z.object({
  country: z.string().max(10).optional(),
  niche: z.string().max(100).optional(),
  niches: z.array(z.string().max(100)).max(10).optional(),
  whatsapp: z.string().max(50).optional(),
})), async (c) => {
  const body = c.req.valid('json');
  const user = c.get('user');

  if (body.country !== undefined) await run(c.env.DB, 'UPDATE users SET country = ? WHERE _id = ?', body.country, user._id);
  if (body.niche !== undefined) await run(c.env.DB, 'UPDATE users SET niche = ? WHERE _id = ?', body.niche, user._id);
  if (body.niches !== undefined) await run(c.env.DB, 'UPDATE users SET niches = ? WHERE _id = ?', JSON.stringify(body.niches), user._id);
  if (body.whatsapp !== undefined) await run(c.env.DB, 'UPDATE users SET whatsapp = ? WHERE _id = ?', body.whatsapp, user._id);
  await run(c.env.DB, 'UPDATE users SET onboarding_complete = 1, updated_at = ? WHERE _id = ?', now(), user._id);

  const updated = await get<UserRow>(c.env.DB, 'SELECT * FROM users WHERE _id = ?', user._id);
  return c.json({ user: toUser(updated!) });
});

export { auth, createUser };
export default auth;
