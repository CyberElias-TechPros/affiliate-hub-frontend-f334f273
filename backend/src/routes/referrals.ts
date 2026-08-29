import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Env, ReferralRow, UserRow } from '../env';
import { all, get, run, newId, uniqueCode, now, toReferral } from '../helpers/db';
import { ApiError, authMiddleware, type AppEnv } from '../helpers/auth';
import { frontendBaseUrl } from '../helpers/baseUrl';
import { notify } from '../services/engagement';

const referrals = new Hono<AppEnv>();

referrals.get('/me', authMiddleware, async (c) => {
  const user = c.get('user');
  let code = user.referral_code;

  if (!code) {
    code = await uniqueCode(c.env.DB, 'users', 'referral_code', 8);
    await run(c.env.DB, 'UPDATE users SET referral_code = ?, updated_at = ? WHERE _id = ?', code, now(), user._id);
  }

  const refs = await all<ReferralRow>(c.env.DB, 'SELECT * FROM referrals WHERE referrer = ? ORDER BY created_at DESC', user._id);
  const referredIds = refs.map((r) => r.referred).filter(Boolean);
  const referredUsers = referredIds.length
    ? await all<UserRow>(c.env.DB, `SELECT _id, name, email FROM users WHERE _id IN (${referredIds.map(() => '?').join(',')})`, ...referredIds)
    : [];
  const referredMap = new Map(referredUsers.map((u) => [u._id, u]));

  const base = frontendBaseUrl(c.env, c);
  return c.json({
    code,
    link: `${base}/auth?ref=${code}`,
    referrals: refs.map((r) => toReferral(r, r.referred ? (referredMap.get(r.referred) ? { name: referredMap.get(r.referred)!.name, email: referredMap.get(r.referred)!.email } : null) : null)),
    stats: {
      total: refs.length,
      qualified: refs.filter((r) => r.status === 'qualified' || r.status === 'rewarded').length,
      earned: refs.reduce((sum, r) => sum + (r.reward_amount || 0), 0),
    },
  });
});

referrals.post('/apply', authMiddleware, zValidator('json', z.object({ code: z.string().min(1).max(32) })), async (c) => {
  const { code } = c.req.valid('json');
  const user = c.get('user');

  const referrer = await get<UserRow>(c.env.DB, 'SELECT * FROM users WHERE referral_code = ?', code);
  if (!referrer || referrer._id === user._id) {
    return c.json({ ok: false });
  }
  if (user.referred_by) {
    return c.json({ ok: false, reason: 'already_referred' });
  }

  await run(c.env.DB, 'UPDATE users SET referred_by = ?, updated_at = ? WHERE _id = ?', referrer._id, now(), user._id);
  await run(
    c.env.DB,
    `INSERT INTO referrals (_id, referrer, referred, code, status, reward_amount, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'pending', 0, ?, ?)`,
    newId(), referrer._id, user._id, await uniqueCode(c.env.DB, 'referrals', 'code', 8), now(), now()
  );
  await notify(c.env.DB, referrer._id, {
    type: 'referral',
    title: '🎉 New referral!',
    message: `${user.name} applied your code.`,
    icon: '🤝',
    link: '/referrals',
  });
  return c.json({ ok: true });
});

export default referrals;
