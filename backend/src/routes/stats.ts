import { Hono } from 'hono';
import type { Env, AffiliateLinkRow, TransactionRow, UserRow } from '../env';
import { all, get, toTransaction } from '../helpers/db';
import { authMiddleware, type AppEnv } from '../helpers/auth';

const stats = new Hono<AppEnv>();

interface CountRow { c: number }
interface SumRow { total: number }
interface EventDayRow { date: string; clicks: number; conversions: number; earnings: number }

stats.get('/dashboard', authMiddleware, async (c) => {
  const userId = c.get('user')._id;
  const monthKey = new Date().toISOString().slice(0, 7);

  const [linkAgg, earningsAgg, monthlyAgg, recentTx] = await Promise.all([
    get<{ totalLinks: number; totalClicks: number; totalConversions: number }>(
      c.env.DB,
      'SELECT COUNT(*) AS totalLinks, COALESCE(SUM(clicks), 0) AS totalClicks, COALESCE(SUM(conversions), 0) AS totalConversions FROM affiliate_links WHERE user = ?',
      userId
    ),
    get<SumRow>(
      c.env.DB,
      "SELECT COALESCE(SUM(amount), 0) AS total FROM transactions WHERE user = ? AND status = 'completed' AND direction = 'credit'",
      userId
    ),
    get<SumRow>(
      c.env.DB,
      "SELECT COALESCE(SUM(amount), 0) AS total FROM transactions WHERE user = ? AND status = 'completed' AND direction = 'credit' AND substr(created_at, 1, 7) = ?",
      userId,
      monthKey
    ),
    all<TransactionRow>(
      c.env.DB,
      'SELECT * FROM transactions WHERE user = ? ORDER BY created_at DESC LIMIT 5',
      userId
    ),
  ]);

  const totalClicks = linkAgg?.totalClicks || 0;
  const totalConversions = linkAgg?.totalConversions || 0;

  return c.json({
    totalLinks: linkAgg?.totalLinks || 0,
    totalClicks,
    totalConversions,
    totalEarnings: earningsAgg?.total || 0,
    monthlyEarnings: monthlyAgg?.total || 0,
    conversionRate: totalClicks ? +(((totalConversions || 0) / totalClicks) * 100).toFixed(2) : 0,
    recentTransactions: recentTx.map(toTransaction),
  });
});

stats.get('/performance', authMiddleware, async (c) => {
  const url = new URL(c.req.url);
  const period = url.searchParams.get('period') || '7d';
  const days = period === '30d' ? 30 : period === '90d' ? 90 : 7;
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const userId = c.get('user')._id;

  const rows = await all<EventDayRow>(
    c.env.DB,
    `SELECT date(created_at) AS date,
            COALESCE(SUM(CASE WHEN type = 'click' THEN 1 ELSE 0 END), 0) AS clicks,
            COALESCE(SUM(CASE WHEN type = 'conversion' THEN 1 ELSE 0 END), 0) AS conversions,
            COALESCE(SUM(CASE WHEN type = 'conversion' THEN amount ELSE 0 END), 0) AS earnings
     FROM affiliate_events
     WHERE user = ? AND created_at >= ?
     GROUP BY date(created_at)
     ORDER BY date ASC`,
    userId,
    since
  );

  // Fill gaps so the chart always has every day of the period.
  const pointMap = new Map(rows.map((r) => [r.date, r]));
  const points = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    const row = pointMap.get(date);
    points.push({
      date,
      clicks: row?.clicks || 0,
      conversions: row?.conversions || 0,
      earnings: row?.earnings || 0,
    });
  }

  return c.json({ period, points });
});

stats.get('/leaderboard', async (c) => {
  const url = new URL(c.req.url);
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '10', 10)));

  const top = await all<{ user: string; earnings: number }>(
    c.env.DB,
    `SELECT user, SUM(amount) AS earnings
     FROM transactions
     WHERE status = 'completed' AND direction = 'credit'
     GROUP BY user
     ORDER BY earnings DESC
     LIMIT ?`,
    limit
  );

  const userIds = top.map((t) => t.user);
  const users = userIds.length
    ? await all<UserRow>(c.env.DB, `SELECT * FROM users WHERE _id IN (${userIds.map(() => '?').join(',')})`, ...userIds)
    : [];
  const map = new Map(users.map((u) => [u._id, u]));

  return c.json(
    top.map((t, i) => {
      const u = map.get(t.user);
      return {
        rank: i + 1,
        earnings: t.earnings,
        user: u ? { _id: u._id, name: u.name, avatarUrl: u.avatar_url || undefined } : null,
      };
    })
  );
});

export default stats;
