import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Env, UserRow, ProductRow, TransactionRow, WithdrawalRow, ReferralRow, BankDetailsRow, StreakRow, AchievementRow } from '../env';
import { all, get, run, newId, now, toUser, toProduct, toWithdrawal } from '../helpers/db';
import { ApiError, authMiddleware, adminMiddleware, type AppEnv } from '../helpers/auth';
import { notify } from '../services/engagement';

const admin = new Hono<AppEnv>();
admin.use(authMiddleware, adminMiddleware);

// ---------- Metrics ----------
admin.get('/metrics', async (c) => {
  const [users, products, totalEarnings, pendingWithdrawals, openTickets] = await Promise.all([
    get<{ c: number }>(c.env.DB, 'SELECT COUNT(*) AS c FROM users'),
    get<{ c: number }>(c.env.DB, 'SELECT COUNT(*) AS c FROM products'),
    get<{ total: number }>(c.env.DB, "SELECT COALESCE(SUM(amount), 0) AS total FROM transactions WHERE status = 'completed' AND direction = 'credit'"),
    get<{ c: number }>(c.env.DB, "SELECT COUNT(*) AS c FROM withdrawals WHERE status = 'pending'"),
    get<{ c: number }>(c.env.DB, "SELECT COUNT(*) AS c FROM support_tickets WHERE status IN ('open','in_progress')"),
  ]);
  return c.json({
    users: users?.c || 0,
    products: products?.c || 0,
    totalEarnings: totalEarnings?.total || 0,
    pendingWithdrawals: pendingWithdrawals?.c || 0,
    openTickets: openTickets?.c || 0,
  });
});

// ---------- Users ----------
admin.get('/users', async (c) => {
  const url = new URL(c.req.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));
  const q = (url.searchParams.get('q') || '').trim();

  const where = ['1=1'];
  const params: unknown[] = [];
  if (q) {
    where.push('(name LIKE ? ESCAPE \'\\\' OR email LIKE ? ESCAPE \'\\\')');
    const like = `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
    params.push(like, like);
  }
  const whereSql = where.join(' AND ');
  const totalRow = await get<{ c: number }>(c.env.DB, `SELECT COUNT(*) AS c FROM users WHERE ${whereSql}`, ...params);
  const items = await all<UserRow>(
    c.env.DB,
    `SELECT * FROM users WHERE ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    ...params, limit, (page - 1) * limit
  );
  return c.json({ items: items.map(toUser), total: totalRow?.c || 0, page });
});

admin.put('/users/:id/role', zValidator('json', z.object({ role: z.enum(['user', 'admin']) })), async (c) => {
  const { role } = c.req.valid('json');
  const target = await get<UserRow>(c.env.DB, 'SELECT * FROM users WHERE _id = ?', c.req.param('id'));
  if (!target) throw new ApiError(404, 'User not found');

  // Never allow demoting yourself.
  if (target._id === c.get('user')._id && role === 'user') {
    throw new ApiError(400, 'You cannot demote your own account');
  }
  // Never remove the last admin.
  if (target.role === 'admin' && role === 'user') {
    const adminCount = await get<{ c: number }>(c.env.DB, "SELECT COUNT(*) AS c FROM users WHERE role = 'admin'");
    if ((adminCount?.c || 0) <= 1) throw new ApiError(400, 'Cannot demote the last admin');
  }

  await run(c.env.DB, 'UPDATE users SET role = ?, updated_at = ? WHERE _id = ?', role, now(), target._id);
  const updated = await get<UserRow>(c.env.DB, 'SELECT * FROM users WHERE _id = ?', target._id);
  return c.json({ user: toUser(updated!) });
});

admin.delete('/users/:id', async (c) => {
  const targetId = c.req.param('id');
  if (targetId === c.get('user')._id) throw new ApiError(400, 'You cannot delete your own account');
  const target = await get<UserRow>(c.env.DB, 'SELECT * FROM users WHERE _id = ?', targetId);
  if (!target) throw new ApiError(404, 'User not found');

  if (target.role === 'admin') {
    const adminCount = await get<{ c: number }>(c.env.DB, "SELECT COUNT(*) AS c FROM users WHERE role = 'admin'");
    if ((adminCount?.c || 0) <= 1) throw new ApiError(400, 'Cannot delete the last admin');
  }

  // FK cascades cleanup for child records in D1 (ON DELETE CASCADE), but SQLite
  // needs PRAGMA foreign_keys enabled per-connection, so delete explicitly.
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM affiliate_events WHERE user = ?').bind(targetId),
    c.env.DB.prepare('DELETE FROM affiliate_links WHERE user = ?').bind(targetId),
    c.env.DB.prepare('DELETE FROM referrals WHERE referrer = ? OR referred = ?').bind(targetId, targetId),
    c.env.DB.prepare('DELETE FROM transactions WHERE user = ?').bind(targetId),
    c.env.DB.prepare('DELETE FROM withdrawals WHERE user = ?').bind(targetId),
    c.env.DB.prepare('DELETE FROM notifications WHERE user = ?').bind(targetId),
    c.env.DB.prepare('DELETE FROM achievements WHERE user = ?').bind(targetId),
    c.env.DB.prepare('DELETE FROM streaks WHERE user = ?').bind(targetId),
    c.env.DB.prepare('DELETE FROM bank_details WHERE user = ?').bind(targetId),
    c.env.DB.prepare('DELETE FROM support_tickets WHERE user = ?').bind(targetId),
    c.env.DB.prepare('DELETE FROM users WHERE _id = ?').bind(targetId),
  ]);
  return c.json({ ok: true });
});

// ---------- Products ----------
const productSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(10000).optional().default(''),
  price: z.number().min(0),
  currency: z.string().max(10).optional().default('NGN'),
  commission: z.number().min(0).max(100).optional().default(10),
  category: z.string().max(100).optional().default('General'),
  tags: z.array(z.string().max(50)).max(20).optional().default([]),
  image: z.string().max(1000).optional().default(''),
  gallery: z.array(z.string().max(1000)).max(10).optional().default([]),
  vendor: z.string().max(300).optional().default('Affiliate Hub'),
  cookieDays: z.number().int().min(1).max(365).optional().default(30),
  whyPromote: z.array(z.string().max(500)).max(20).optional().default([]),
  swipeCopy: z.string().max(2000).optional().default(''),
  isActive: z.boolean().optional().default(true),
});

admin.post('/products', zValidator('json', productSchema), async (c) => {
  const b = c.req.valid('json');
  const _id = newId();
  const ts = now();
  await run(
    c.env.DB,
    `INSERT INTO products (_id, title, description, price, currency, commission, category, tags, image, gallery, vendor, cookie_days, why_promote, swipe_copy, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    _id, b.title, b.description, b.price, b.currency, b.commission, b.category,
    JSON.stringify(b.tags), b.image, JSON.stringify(b.gallery), b.vendor, b.cookieDays,
    JSON.stringify(b.whyPromote), b.swipeCopy, b.isActive ? 1 : 0, ts, ts
  );
  const product = await get<ProductRow>(c.env.DB, 'SELECT * FROM products WHERE _id = ?', _id);
  return c.json(toProduct(product!), 201);
});

admin.put('/products/:id', zValidator('json', productSchema.partial()), async (c) => {
  const existing = await get<ProductRow>(c.env.DB, 'SELECT * FROM products WHERE _id = ?', c.req.param('id'));
  if (!existing) throw new ApiError(404, 'Product not found');
  const b = c.req.valid('json');

  await run(
    c.env.DB,
    `UPDATE products SET
       title = ?, description = ?, price = ?, currency = ?, commission = ?, category = ?,
       tags = ?, image = ?, gallery = ?, vendor = ?, cookie_days = ?, why_promote = ?,
       swipe_copy = ?, is_active = ?, updated_at = ?
     WHERE _id = ?`,
    b.title ?? existing.title,
    b.description ?? existing.description,
    b.price ?? existing.price,
    b.currency ?? existing.currency,
    b.commission ?? existing.commission,
    b.category ?? existing.category,
    b.tags !== undefined ? JSON.stringify(b.tags) : existing.tags,
    b.image ?? existing.image,
    b.gallery !== undefined ? JSON.stringify(b.gallery) : existing.gallery,
    b.vendor ?? existing.vendor,
    b.cookieDays ?? existing.cookie_days,
    b.whyPromote !== undefined ? JSON.stringify(b.whyPromote) : existing.why_promote,
    b.swipeCopy ?? existing.swipe_copy,
    b.isActive !== undefined ? (b.isActive ? 1 : 0) : existing.is_active,
    now(), existing._id
  );
  const product = await get<ProductRow>(c.env.DB, 'SELECT * FROM products WHERE _id = ?', existing._id);
  return c.json(toProduct(product!));
});

admin.delete('/products/:id', async (c) => {
  const id = c.req.param('id');
  const product = await get<ProductRow>(c.env.DB, 'SELECT * FROM products WHERE _id = ?', id);
  if (!product) throw new ApiError(404, 'Product not found');
  // Soft-disable instead of hard-delete so historical affiliate links keep working.
  await run(c.env.DB, 'UPDATE products SET is_active = 0, updated_at = ? WHERE _id = ?', now(), id);
  return c.json({ ok: true, deactivated: true });
});

// ---------- Withdrawals ----------
admin.get('/withdrawals', async (c) => {
  const status = new URL(c.req.url).searchParams.get('status');
  const where = status ? 'WHERE w.status = ?' : '';
  const params: unknown[] = status ? [status] : [];
  const items = await all<WithdrawalRow & { user_name: string; user_email: string }>(
    c.env.DB,
    `SELECT w.*, u.name AS user_name, u.email AS user_email
     FROM withdrawals w JOIN users u ON u._id = w.user
     ${where} ORDER BY w.created_at DESC LIMIT 200`,
    ...params
  );
  return c.json({
    items: items.map((w) => ({
      ...toWithdrawal(w),
      user: { _id: w.user, name: w.user_name, email: w.user_email },
    })),
  });
});

admin.put('/withdrawals/:id', zValidator('json', z.object({ status: z.enum(['pending', 'processing', 'completed', 'failed']) })), async (c) => {
  const { status } = c.req.valid('json');
  const w = await get<WithdrawalRow>(c.env.DB, 'SELECT * FROM withdrawals WHERE _id = ?', c.req.param('id'));
  if (!w) throw new ApiError(404, 'Withdrawal not found');

  // Idempotent transitions: already terminal states can't be moved.
  if ((w.status === 'completed' || w.status === 'failed') && w.status !== status) {
    throw new ApiError(400, `Withdrawal is already ${w.status}`);
  }

  await run(c.env.DB, 'UPDATE withdrawals SET status = ?, updated_at = ? WHERE _id = ?', status, now(), w._id);

  const txStatus = status === 'completed' ? 'completed' : status === 'failed' ? 'failed' : 'pending';
  if (w.transaction_id) {
    await run(c.env.DB, 'UPDATE transactions SET status = ?, updated_at = ? WHERE _id = ?', txStatus, now(), w.transaction_id);
  }

  await notify(c.env.DB, w.user, {
    type: 'withdrawal',
    title: status === 'completed' ? '✅ Withdrawal completed' : status === 'failed' ? '❌ Withdrawal failed' : '🔎 Withdrawal processing',
    message: `₦${w.amount.toLocaleString()} via ${w.method} is now ${status}.`,
    icon: status === 'completed' ? '✅' : status === 'failed' ? '❌' : '⏳',
    link: '/wallet',
  });

  const updated = await get<WithdrawalRow>(c.env.DB, 'SELECT * FROM withdrawals WHERE _id = ?', w._id);
  return c.json({ withdrawal: toWithdrawal(updated!) });
});

// ---------- Support tickets ----------
admin.get('/tickets', async (c) => {
  const items = await all<{ _id: string; user: string; subject: string; message: string; status: string; created_at: string; name: string; email: string }>(
    c.env.DB,
    `SELECT t.*, u.name, u.email FROM support_tickets t JOIN users u ON u._id = t.user ORDER BY t.created_at DESC LIMIT 100`
  );
  return c.json({ items });
});

admin.patch('/tickets/:id', zValidator('json', z.object({ status: z.enum(['open', 'in_progress', 'resolved', 'closed']) })), async (c) => {
  const { status } = c.req.valid('json');
  await run(c.env.DB, 'UPDATE support_tickets SET status = ?, updated_at = ? WHERE _id = ?', status, now(), c.req.param('id'));
  return c.json({ ok: true });
});

export default admin;
