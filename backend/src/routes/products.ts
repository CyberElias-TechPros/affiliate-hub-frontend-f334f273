import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Env, ProductRow } from '../env';
import { all, get, toProduct } from '../helpers/db';
import { ApiError } from '../helpers/auth';

const products = new Hono<{ Bindings: Env }>();

/** Escape LIKE wildcards so user input is treated literally. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (m) => `\\${m}`);
}

products.get('/', async (c) => {
  const url = new URL(c.req.url);
  const category = url.searchParams.get('category');
  const sort = url.searchParams.get('sort') || 'newest';
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));
  const q = (url.searchParams.get('q') || '').trim();

  const where: string[] = ['is_active = 1'];
  const params: unknown[] = [];
  if (category && category !== 'all') {
    where.push('category = ?');
    params.push(category);
  }
  if (q) {
    where.push("(title LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\' OR tags LIKE ? ESCAPE '\\')");
    const like = `%${escapeLike(q)}%`;
    params.push(like, like, like);
  }

  const sortMap: Record<string, string> = {
    'price-low': 'price ASC',
    'price-high': 'price DESC',
    commission: 'commission DESC',
    newest: 'created_at DESC',
  };
  const orderBy = sortMap[sort] || 'created_at DESC';

  const whereSql = where.join(' AND ');
  const totalRow = await get<{ c: number }>(c.env.DB, `SELECT COUNT(*) AS c FROM products WHERE ${whereSql}`, ...params);
  const items = await all<ProductRow>(
    c.env.DB,
    `SELECT * FROM products WHERE ${whereSql} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
    ...params, limit, (page - 1) * limit
  );

  return c.json({
    items: items.map(toProduct),
    total: totalRow?.c || 0,
    page,
    limit,
  });
});

products.get('/search', zValidator('query', z.object({ q: z.string().min(1).max(200) })), async (c) => {
  const { q } = c.req.valid('query');
  const like = `%${escapeLike(q)}%`;
  const items = await all<ProductRow>(
    c.env.DB,
    "SELECT * FROM products WHERE is_active = 1 AND (title LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\' OR tags LIKE ? ESCAPE '\\') ORDER BY created_at DESC LIMIT 50",
    like, like, like
  );
  return c.json({ items: items.map(toProduct), total: items.length });
});

products.get('/categories', async (c) => {
  const rows = await all<{ category: string }>(
    c.env.DB,
    'SELECT DISTINCT category FROM products WHERE is_active = 1 AND category <> \'\' ORDER BY category ASC'
  );
  return c.json(rows.map((r) => r.category));
});

products.get('/:id', async (c) => {
  const product = await get<ProductRow>(c.env.DB, 'SELECT * FROM products WHERE _id = ?', c.req.param('id'));
  if (!product || !product.is_active) throw new ApiError(404, 'Product not found');
  return c.json(toProduct(product));
});

export default products;
