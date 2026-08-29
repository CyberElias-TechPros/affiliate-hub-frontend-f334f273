import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Env, TransactionRow, WithdrawalRow } from '../env';
import { all, get, run, newId, now, toTransaction, toWithdrawal } from '../helpers/db';
import { ApiError, authMiddleware, type AppEnv } from '../helpers/auth';
import { bumpAchievement, notify } from '../services/engagement';

const wallet = new Hono<AppEnv>();

const FX_NGN_PER_USD = () => 1500;

export const WITHDRAW_METHODS: Array<{ id: 'bank' | 'usdt' | 'paypal'; label: string; minAmount: number; fee: number; time: string }> = [
  { id: 'bank', label: 'Bank Transfer (NGN)', minAmount: 1000, fee: 0, time: '24-48 hours' },
  { id: 'usdt', label: 'USDT (TRC20)', minAmount: 5000, fee: 1, time: '1-6 hours' },
  { id: 'paypal', label: 'PayPal (USD)', minAmount: 5000, fee: 2.5, time: '24-72 hours' },
];

/** Balance = completed credits - completed debits. */
async function calcBalance(db: D1Database, userId: string): Promise<number> {
  const row = await get<{ balance: number }>(
    db,
    `SELECT COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount ELSE -amount END), 0) AS balance
     FROM transactions WHERE user = ? AND status = 'completed'`,
    userId
  );
  return row?.balance || 0;
}

/** Funds locked by in-flight withdrawals (pending debits). */
async function calcLocked(db: D1Database, userId: string): Promise<number> {
  const row = await get<{ locked: number }>(
    db,
    `SELECT COALESCE(SUM(amount), 0) AS locked
     FROM transactions WHERE user = ? AND direction = 'debit' AND status IN ('pending', 'processing')`,
    userId
  );
  return row?.locked || 0;
}

async function calcPending(db: D1Database, userId: string): Promise<number> {
  const row = await get<{ total: number }>(
    db,
    `SELECT COALESCE(SUM(amount), 0) AS total
     FROM transactions WHERE user = ? AND status = 'pending' AND direction = 'credit'`,
    userId
  );
  return row?.total || 0;
}

async function calcUsdBalance(db: D1Database, userId: string, fxRate: number): Promise<number> {
  const row = await get<{ balance: number }>(
    db,
    `SELECT COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount ELSE -amount END), 0) AS balance
     FROM transactions WHERE user = ? AND status = 'completed' AND currency = 'USD'`,
    userId
  );
  return Math.round((row?.balance || 0) * 100) / 100;
}

wallet.get('/balance', authMiddleware, async (c) => {
  const userId = c.get('user')._id;
  const fx = Math.max(1, parseFloat(c.env.FX_NGN_PER_USD || String(FX_NGN_PER_USD())));
  const [ngn, pending, locked, usd] = await Promise.all([
    calcBalance(c.env.DB, userId),
    calcPending(c.env.DB, userId),
    calcLocked(c.env.DB, userId),
    calcUsdBalance(c.env.DB, userId, fx),
  ]);
  return c.json({
    ngnBalance: ngn,
    usdBalance: Math.max(0, Math.round(((ngn - locked) / fx + usd) * 100) / 100),
    pending,
    locked,
    currency: 'NGN',
    fxRate: fx,
  });
});

wallet.get('/transactions', authMiddleware, async (c) => {
  const url = new URL(c.req.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));
  const status = url.searchParams.get('status');
  const userId = c.get('user')._id;

  const where = ['user = ?'];
  const params: unknown[] = [userId];
  if (status) {
    where.push('status = ?');
    params.push(status);
  }
  const whereSql = where.join(' AND ');

  const totalRow = await get<{ c: number }>(c.env.DB, `SELECT COUNT(*) AS c FROM transactions WHERE ${whereSql}`, ...params);
  const items = await all<TransactionRow>(
    c.env.DB,
    `SELECT * FROM transactions WHERE ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    ...params, limit, (page - 1) * limit
  );
  return c.json({ items: items.map(toTransaction), total: totalRow?.c || 0, page, limit });
});

wallet.get('/withdraw-methods', async (c) => c.json(WITHDRAW_METHODS));

const withdrawSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  method: z.enum(['bank', 'usdt', 'paypal']),
  details: z.record(z.string(), z.unknown()).default({}),
});

wallet.post('/withdraw', authMiddleware, zValidator('json', withdrawSchema), async (c) => {
  const { amount, method, details } = c.req.valid('json');
  const userId = c.get('user')._id;
  const methodDef = WITHDRAW_METHODS.find((m) => m.id === method)!;

  if (amount < methodDef.minAmount) {
    throw new ApiError(400, `Minimum withdrawal for ${method} is ₦${methodDef.minAmount.toLocaleString()}`);
  }

  // Method-specific payout details validation.
  if (method === 'bank') {
    const bank = String(details.bankName || '').trim();
    const accountName = String(details.accountName || '').trim();
    const accountNumber = String(details.accountNumber || '').trim();
    if (!bank || !accountName || !/^\d{10}$/.test(accountNumber)) {
      throw new ApiError(400, 'Bank withdrawals require bankName, accountName and a 10-digit accountNumber');
    }
  }
  if (method === 'usdt' && !String(details.usdtAddress || '').trim()) {
    throw new ApiError(400, 'USDT withdrawals require a usdtAddress');
  }
  if (method === 'paypal' && !/^\S+@\S+\.\S+$/.test(String(details.paypalEmail || ''))) {
    throw new ApiError(400, 'PayPal withdrawals require a valid paypalEmail');
  }

  // Fee is deducted from the payout (never from the wallet).
  const fee = Math.round(amount * (methodDef.fee / 100) * 100) / 100;
  const payout = Math.max(0, amount - fee);

  const [balance, locked] = await Promise.all([calcBalance(c.env.DB, userId), calcLocked(c.env.DB, userId)]);
  const available = balance - locked;
  if (amount > available) {
    throw new ApiError(400, `Insufficient balance (available: ₦${available.toLocaleString()})`);
  }

  const txId = newId();
  const wId = newId();
  const ts = now();
  const cleanDetails = {
    ...details,
    ...(method === 'bank' ? {
      bankName: String(details.bankName).trim(),
      accountName: String(details.accountName).trim(),
      accountNumber: String(details.accountNumber).trim(),
    } : {}),
  };

  await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO transactions (_id, user, type, direction, amount, currency, status, description, reference, meta, created_at, updated_at)
       VALUES (?, ?, 'withdrawal', 'debit', ?, 'NGN', 'pending', ?, NULL, ?, ?, ?)`
    ).bind(txId, userId, amount, `Withdrawal via ${method}`, JSON.stringify({ fee, payout, method }), ts, ts),
    c.env.DB.prepare(
      `INSERT INTO withdrawals (_id, user, amount, currency, method, details, status, transaction_id, created_at, updated_at)
       VALUES (?, ?, ?, 'NGN', ?, ?, 'pending', ?, ?, ?)`
    ).bind(wId, userId, amount, method, JSON.stringify(cleanDetails), txId, ts, ts),
    c.env.DB.prepare(
      `INSERT INTO notifications (_id, user, type, title, message, icon, link, read, meta, created_at, updated_at)
       VALUES (?, ?, 'withdrawal', ?, ?, '⏳', '/wallet', 0, '{}', ?, ?)`
    ).bind(newId(), userId, 'Withdrawal requested', `₦${amount.toLocaleString()} via ${method} is pending review.`, ts, ts),
  ]);

  await bumpAchievement(c.env.DB, userId, 'first_payout');

  const tx = await get<TransactionRow>(c.env.DB, 'SELECT * FROM transactions WHERE _id = ?', txId);
  const w = await get<WithdrawalRow>(c.env.DB, 'SELECT * FROM withdrawals WHERE _id = ?', wId);
  return c.json({ withdrawal: toWithdrawal(w!), transaction: toTransaction(tx!) }, 201);
});

export default wallet;
