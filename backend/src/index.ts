import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { Env } from './env';
import { ApiError } from './helpers/auth';
import { run } from './helpers/db';

import authRoutes from './routes/auth';
import oauthRoutes from './routes/oauth';
import productRoutes from './routes/products';
import affiliateRoutes, { resolveRedirect } from './routes/affiliate';
import walletRoutes from './routes/wallet';
import statsRoutes from './routes/stats';
import profileRoutes from './routes/profile';
import notificationRoutes from './routes/notifications';
import achievementRoutes from './routes/achievements';
import referralRoutes from './routes/referrals';
import supportRoutes from './routes/support';
import adminRoutes from './routes/admin';
import { frontendBaseUrl } from './helpers/baseUrl';

const app = new Hono<{ Bindings: Env }>();

app.use(logger());

app.use(async (c, next) => {
  const origins = (c.env.CORS_ORIGIN || '*').split(',').map((s) => s.trim()).filter(Boolean);
  const handler = cors({
    origin: origins.includes('*') ? '*' : origins,
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'x-affiliate-wh-secret', 'x-webhook-secret'],
    // Bearer tokens are used for auth (no cookies), so credentials are not
    // required — this also lets CORS_ORIGIN="*" work when the env is unset.
    credentials: false,
    maxAge: 86400,
  });
  return handler(c, next);
});

app.get('/health', async (c) => {
  const ok = await run(c.env.DB, 'SELECT 1 AS ok').then(() => true).catch(() => false);
  return c.json({ status: ok ? 'ok' : 'degraded', uptime: Date.now(), ts: Date.now() });
});

// ---- Public short-link routing (direct hits on the API host) ----
// /r/:code -> 302 redirect (recorded as a click).
app.get('/r/:code', async (c) => {
  const code = c.req.param('code');
  const base = frontendBaseUrl(c.env, c);
  const result = await resolveRedirect(c.env.DB, code, base);
  if (!result) throw new ApiError(404, 'Link not found');
  return c.redirect(result.url, 302);
});

// ---- API v1 ----
app.route('/api/v1/auth/oauth', oauthRoutes);
app.route('/api/v1/auth', authRoutes);
app.route('/api/v1/products', productRoutes);
app.route('/api/v1/affiliate', affiliateRoutes);
app.route('/api/v1/wallet', walletRoutes);
app.route('/api/v1/stats', statsRoutes);
app.route('/api/v1/profile', profileRoutes);
app.route('/api/v1/notifications', notificationRoutes);
app.route('/api/v1/achievements', achievementRoutes);
app.route('/api/v1/referrals', referralRoutes);
app.route('/api/v1/support', supportRoutes);
app.route('/api/v1/admin', adminRoutes);

// ---- 404 ----
app.notFound((c) => c.json({ error: `Route not found: ${c.req.method} ${new URL(c.req.url).pathname}` }, 404));

// ---- Central error handler ----
app.onError((err, c) => {
  if (err instanceof ApiError) {
    const payload: Record<string, unknown> = { error: err.message };
    if (err.details) payload.details = err.details;
    return c.json(payload, err.status as 400);
  }
  const message = err?.message || 'Internal server error';
  console.error('[api-error]', err);
  return c.json({ error: message.includes('UNIQUE') ? 'Duplicate value' : message }, 500);
});

export default app;
