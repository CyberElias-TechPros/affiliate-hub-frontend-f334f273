import { createMiddleware } from 'hono/factory';
import type { Env } from '../env';

// Simple per-isolate rate limiter (in-memory). Cloudflare isolates are ephemeral,
// so this is a best-effort throttle — pair with Cloudflare Rate Limiting rules
// for production-grade protection.
interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export const authRateLimit = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const max = parseInt(c.env.AUTH_RATE_LIMIT_MAX || '30', 10);
  const windowMs = 15 * 60 * 1000;
  const key = `auth:${c.req.header('CF-Connecting-IP') || c.req.header('x-forwarded-for') || 'unknown'}`;

  let bucket = buckets.get(key);
  const nowTs = Date.now();
  if (!bucket || bucket.resetAt < nowTs) {
    bucket = { count: 0, resetAt: nowTs + windowMs };
  }
  bucket.count += 1;
  buckets.set(key, bucket);

  if (buckets.size > 10000) {
    for (const [k, b] of buckets) if (b.resetAt < nowTs) buckets.delete(k);
  }

  const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - nowTs) / 1000));
  c.header('X-RateLimit-Limit', String(max));
  c.header('X-RateLimit-Remaining', String(Math.max(0, max - bucket.count)));

  if (bucket.count > max) {
    c.header('Retry-After', String(retryAfter));
    return c.json({ error: 'Too many requests, please try again later.' }, 429);
  }
  await next();
});
