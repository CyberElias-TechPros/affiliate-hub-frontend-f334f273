import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Env, BankDetailsRow, UserRow } from '../env';
import { get, run, newId, now, toUser, toBankDetails } from '../helpers/db';
import { ApiError, authMiddleware, type AppEnv } from '../helpers/auth';
import { hashPassword, verifyPassword } from '../helpers/crypto';

const profile = new Hono<AppEnv>();

profile.get('/', authMiddleware, async (c) => {
  const bank = await get<BankDetailsRow>(c.env.DB, 'SELECT * FROM bank_details WHERE user = ?', c.get('user')._id);
  return c.json({ user: c.get('userOut'), bank: bank ? toBankDetails(bank) : null });
});

profile.put('/update', authMiddleware, zValidator('json', z.object({
  name: z.string().trim().min(1).max(100).optional(),
  phone: z.string().max(50).optional(),
  whatsapp: z.string().max(50).optional(),
  country: z.string().max(10).optional(),
  niche: z.string().max(100).optional(),
  niches: z.array(z.string().max(100)).max(10).optional(),
  avatarUrl: z.string().max(500).optional(),
})), async (c) => {
  const body = c.req.valid('json');
  const user = c.get('user');
  const allowed = ['name', 'phone', 'whatsapp', 'country', 'niche', 'avatarUrl'] as const;

  for (const key of allowed) {
    if (body[key] !== undefined) {
      await run(c.env.DB, `UPDATE users SET ${key} = ?, updated_at = ? WHERE _id = ?`, String(body[key]), now(), user._id);
    }
  }
  if (body.niches !== undefined) {
    await run(c.env.DB, 'UPDATE users SET niches = ?, updated_at = ? WHERE _id = ?', JSON.stringify(body.niches), now(), user._id);
  }

  const updated = await get<UserRow>(c.env.DB, 'SELECT * FROM users WHERE _id = ?', user._id);
  return c.json({ user: toUser(updated!) });
});

profile.put('/bank-details', authMiddleware, zValidator('json', z.object({
  bankName: z.string().trim().max(100).optional(),
  accountName: z.string().trim().max(100).optional(),
  accountNumber: z.string().trim().max(20).optional(),
  usdtAddress: z.string().trim().max(200).optional(),
  paypalEmail: z.string().trim().email().optional(),
})), async (c) => {
  const body = c.req.valid('json');
  const userId = c.get('user')._id;
  const existing = await get<BankDetailsRow>(c.env.DB, 'SELECT * FROM bank_details WHERE user = ?', userId);
  const values = {
    bankName: body.bankName ?? existing?.bank_name ?? '',
    accountName: body.accountName ?? existing?.account_name ?? '',
    accountNumber: body.accountNumber ?? existing?.account_number ?? '',
    usdtAddress: body.usdtAddress ?? existing?.usdt_address ?? '',
    paypalEmail: body.paypalEmail ?? existing?.paypal_email ?? '',
  };

  if (existing) {
    await run(
      c.env.DB,
      'UPDATE bank_details SET bank_name = ?, account_name = ?, account_number = ?, usdt_address = ?, paypal_email = ?, updated_at = ? WHERE user = ?',
      values.bankName, values.accountName, values.accountNumber, values.usdtAddress, values.paypalEmail, now(), userId
    );
  } else {
    await run(
      c.env.DB,
      `INSERT INTO bank_details (_id, user, bank_name, account_name, account_number, usdt_address, paypal_email, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      newId(), userId, values.bankName, values.accountName, values.accountNumber, values.usdtAddress, values.paypalEmail, now(), now()
    );
  }

  const bank = await get<BankDetailsRow>(c.env.DB, 'SELECT * FROM bank_details WHERE user = ?', userId);
  return c.json({ bank: toBankDetails(bank!) });
});

profile.put('/security', authMiddleware, zValidator('json', z.object({
  currentPassword: z.string().min(1).optional(),
  newPassword: z.string().min(6, 'New password min 6 chars').max(128),
})), async (c) => {
  const { currentPassword, newPassword } = c.req.valid('json');
  const user = c.get('user');

  // Social-only accounts have no password yet — allow setting one without currentPassword.
  if (user.password_hash) {
    if (!currentPassword) throw new ApiError(400, 'Current password is required');
    const ok = await verifyPassword(currentPassword, user.password_hash);
    if (!ok) throw new ApiError(401, 'Current password is incorrect');
  }

  const hashed = await hashPassword(newPassword);
  await run(c.env.DB, "UPDATE users SET password_hash = ?, provider = 'local', updated_at = ? WHERE _id = ?", hashed, now(), user._id);
  return c.json({ message: 'Password updated' });
});

export default profile;
