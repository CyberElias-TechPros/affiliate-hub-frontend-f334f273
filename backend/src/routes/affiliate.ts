import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Env, AffiliateLinkRow, ProductRow, UserRow, ReferralRow } from '../env';
import { all, get, run, newId, newCode, now, toProduct, toLink } from '../helpers/db';
import { ApiError, authMiddleware, type AppEnv } from '../helpers/auth';
import { frontendBaseUrl } from '../helpers/baseUrl';
import { bumpAchievement, notify, touchStreak } from '../services/engagement';

const affiliate = new Hono<AppEnv>();

/** Resolve the target URL for a short code. */
async function resolveTarget(db: D1Database, link: AffiliateLinkRow, base: string): Promise<{ product: ProductRow | null; url: string }> {
  const product = await get<ProductRow>(db, "SELECT * FROM products WHERE _id = ?", link.product);
  let url = `${base}/product/${product?._id || ''}?ref=${link.code}`;
  if (product && product.vendor && /^https?:\/\//i.test(product.vendor)) {
    // External vendor: keep their URL but attach our attribution param so the
    // vendor can pass it back in the conversion webhook.
    try {
      const u = new URL(product.vendor);
      if (!u.searchParams.has('ref')) u.searchParams.set('ref', link.code);
      url = u.toString();
    } catch {
      url = `${product.vendor}${product.vendor.includes('?') ? '&' : '?'}ref=${link.code}`;
    }
  }
  return { product, url };
}

/** Record one click atomically (event + counter). */
async function recordClick(db: D1Database, link: AffiliateLinkRow): Promise<void> {
  const ts = now();
  await db.batch([
    db.prepare(
      "INSERT INTO affiliate_events (_id, link, user, product, type, amount, event_key, created_at) VALUES (?, ?, ?, ?, 'click', 0, NULL, ?)"
    ).bind(newId(), link._id, link.user, link.product, ts),
    db.prepare("UPDATE affiliate_links SET clicks = clicks + 1, updated_at = ? WHERE _id = ?").bind(ts, link._id),
  ]);
}

// ---------- List links (auth) ----------
affiliate.get('/links', authMiddleware, async (c) => {
  const userId = c.get('user')._id;
  const links = await all<AffiliateLinkRow>(
    c.env.DB,
    'SELECT * FROM affiliate_links WHERE user = ? ORDER BY created_at DESC',
    userId
  );
  const productIds = [...new Set(links.map((l) => l.product))];
  const products = productIds.length
    ? await all<ProductRow>(c.env.DB, `SELECT * FROM products WHERE _id IN (${productIds.map(() => '?').join(',')})`, ...productIds)
    : [];
  const productMap = new Map(products.map((p) => [p._id, toProduct(p)]));
  const base = frontendBaseUrl(c.env, c);

  return c.json({
    items: links.map((l) => toLink(l, `${base}/r/${l.code}`, productMap.get(l.product))),
  });
});

// ---------- Generate link (auth) ----------
affiliate.post('/generate-link', authMiddleware, zValidator('json', z.object({
  productId: z.string().min(1),
})), async (c) => {
  const { productId } = c.req.valid('json');
  const userId = c.get('user')._id;
  const product = await get<ProductRow>(c.env.DB, 'SELECT * FROM products WHERE _id = ? AND is_active = 1', productId);
  if (!product) throw new ApiError(404, 'Product not found');

  let link = await get<AffiliateLinkRow>(c.env.DB, 'SELECT * FROM affiliate_links WHERE user = ? AND product = ?', userId, productId);
  const base = frontendBaseUrl(c.env, c);
  let isNew = false;

  if (!link) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const code = newCode(10);
      try {
        await run(
          c.env.DB,
          `INSERT INTO affiliate_links (_id, user, product, code, clicks, conversions, earnings, created_at, updated_at)
           VALUES (?, ?, ?, ?, 0, 0, 0, ?, ?)`,
          newId(), userId, productId, code, now(), now()
        );
        link = await get<AffiliateLinkRow>(c.env.DB, 'SELECT * FROM affiliate_links WHERE user = ? AND product = ?', userId, productId);
        break;
      } catch {
        // unique code collision — retry with a new code
      }
    }
    if (!link) throw new ApiError(500, 'Could not generate link');
    isNew = true;
  }

  if (isNew) {
    await touchStreak(c.env.DB, userId);
    await bumpAchievement(c.env.DB, userId, 'first_link');
    await bumpAchievement(c.env.DB, userId, 'ten_links');
  }

  return c.json({
    link: toLink(link, `${base}/r/${link.code}`, toProduct(product)),
    product: toProduct(product),
  }, 201);
});

// ---------- Promote assets (auth) ----------
affiliate.get('/assets', authMiddleware, zValidator('query', z.object({ productId: z.string().min(1) })), async (c) => {
  const { productId } = c.req.valid('query');
  const product = await get<ProductRow>(c.env.DB, 'SELECT * FROM products WHERE _id = ?', productId);
  if (!product) throw new ApiError(404, 'Product not found');

  const gallery = JSON.parse(product.gallery || '[]') as string[];
  return c.json({
    images: [product.image, ...gallery].filter(Boolean),
    swipeCopy:
      product.swipe_copy ||
      `🔥 ${product.title} — earn ${product.commission}% commission. Grab it here:`,
  });
});

// ---------- Public JSON resolution (used by the SPA /r/:code page) ----------
affiliate.get('/r/:code', async (c) => {
  const code = c.req.param('code');
  const link = await get<AffiliateLinkRow>(c.env.DB, 'SELECT * FROM affiliate_links WHERE code = ?', code);
  if (!link) throw new ApiError(404, 'Link not found');

  const base = frontendBaseUrl(c.env, c);
  const { product, url } = await resolveTarget(c.env.DB, link, base);
  await recordClick(c.env.DB, link);

  return c.json({
    ok: true,
    url,
    clicks: link.clicks + 1,
    product: product ? { _id: product._id, title: product.title } : null,
  });
});

// ---------- Public 302 redirect (direct short-link hits, e.g. shared via SMS) ----------
export async function resolveRedirect(
  db: D1Database,
  code: string,
  base: string
): Promise<{ url: string; clicks: number } | null> {
  const link = await get<AffiliateLinkRow>(db, 'SELECT * FROM affiliate_links WHERE code = ?', code);
  if (!link) return null;
  const { url } = await resolveTarget(db, link, base);
  await recordClick(db, link);
  return { url, clicks: link.clicks + 1 };
}

affiliate.get('/redirect/:code', async (c) => {
  const code = c.req.param('code');
  const base = frontendBaseUrl(c.env, c);
  const result = await resolveRedirect(c.env.DB, code, base);
  if (!result) throw new ApiError(404, 'Link not found');
  return c.redirect(result.url, 302);
});

// ---------- Conversion webhook (vendor integration, secret-protected) ----------
affiliate.post('/r/:code/convert', async (c) => {
  const secret = c.env.AFFILIATE_WEBHOOK_SECRET;
  if (!secret) throw new ApiError(503, 'Conversion tracking is not configured');
  const provided = c.req.header('x-affiliate-wh-secret') || c.req.header('x-webhook-secret') || '';
  if (provided !== secret) throw new ApiError(403, 'Invalid webhook secret');

  const body = await c.req.json().catch(() => ({}));
  const code = c.req.param('code');
  // eventId is REQUIRED: without a stable id, retries can't be deduplicated and
  // affiliates would be double-credited on every vendor retry.
  const eventKey = typeof body.eventId === 'string' && body.eventId.trim() ? `wh:${body.eventId.trim()}` : null;
  if (!eventKey) throw new ApiError(400, 'eventId is required for conversion events');

  const existing = await get<{ _id: string }>(c.env.DB, 'SELECT _id FROM affiliate_events WHERE event_key = ?', eventKey);
  if (existing) return c.json({ ok: true, earned: 0, duplicate: true });

  const link = await get<AffiliateLinkRow>(c.env.DB, 'SELECT * FROM affiliate_links WHERE code = ?', code);
  if (!link) throw new ApiError(404, 'Link not found');
  const product = await get<ProductRow>(c.env.DB, 'SELECT * FROM products WHERE _id = ?', link.product);
  if (!product) throw new ApiError(404, 'Product not found');

  const earned = Math.round(product.price * (product.commission / 100));
  const ts = now();

  await c.env.DB.batch([
    c.env.DB.prepare(
      'UPDATE affiliate_links SET conversions = conversions + 1, earnings = earnings + ?, updated_at = ? WHERE _id = ?'
    ).bind(earned, ts, link._id),
    c.env.DB.prepare(
      "INSERT INTO affiliate_events (_id, link, user, product, type, amount, event_key, created_at) VALUES (?, ?, ?, ?, 'conversion', ?, ?, ?)"
    ).bind(newId(), link._id, link.user, link.product, earned, eventKey, ts),
    c.env.DB.prepare(
      `INSERT INTO transactions (_id, user, type, direction, amount, currency, status, description, reference, meta, created_at, updated_at)
       VALUES (?, ?, 'commission', 'credit', ?, 'NGN', 'completed', ?, ?, '{}', ?, ?)`
    ).bind(newId(), link.user, earned, `Commission for ${product.title}`, link.code, ts, ts),
    c.env.DB.prepare(
      `INSERT INTO notifications (_id, user, type, title, message, icon, link, read, meta, created_at, updated_at)
       VALUES (?, ?, 'sale', ?, ?, '💰', '/wallet', 0, '{}', ?, ?)`
    ).bind(newId(), link.user, '🎉 You made a sale!', `+₦${earned.toLocaleString()} from ${product.title}`, ts, ts),
  ]);

  await touchStreak(c.env.DB, link.user);
  await bumpAchievement(c.env.DB, link.user, 'first_sale');
  await bumpAchievement(c.env.DB, link.user, 'ten_sales');
  await bumpAchievement(c.env.DB, link.user, 'fifty_sales');

  // Referral bonus on the referee's first qualified sale.
  const buyer = await get<UserRow>(c.env.DB, 'SELECT * FROM users WHERE _id = ?', link.user);
  if (buyer && buyer.referred_by) {
    const ref = await get<ReferralRow>(c.env.DB, 'SELECT * FROM referrals WHERE referrer = ? AND referred = ?', buyer.referred_by, buyer._id);
    if (ref && ref.status !== 'rewarded') {
      const reward = Math.round(earned * 0.1);
      await run(c.env.DB, "UPDATE referrals SET status = 'rewarded', reward_amount = ?, updated_at = ? WHERE _id = ?", reward, ts, ref._id);
      await run(
        c.env.DB,
        `INSERT INTO transactions (_id, user, type, direction, amount, currency, status, description, reference, meta, created_at, updated_at)
         VALUES (?, ?, 'bonus', 'credit', ?, 'NGN', 'completed', ?, ?, '{}', ?, ?)`,
        newId(), buyer.referred_by, reward, `Referral bonus from ${buyer.name}`, link.code, ts, ts
      );
      await notify(c.env.DB, buyer.referred_by, {
        type: 'referral',
        title: '🤝 Referral bonus!',
        message: `+₦${reward.toLocaleString()} from ${buyer.name}'s sale`,
        icon: '🎁',
        link: '/referrals',
      });
      await bumpAchievement(c.env.DB, buyer.referred_by, 'first_referral');
    }
  }

  return c.json({ ok: true, earned });
});

export default affiliate;
