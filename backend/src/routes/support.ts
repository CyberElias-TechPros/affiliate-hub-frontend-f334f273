import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Env, SupportTicketRow } from '../env';
import { all, run, newId, now } from '../helpers/db';
import { authMiddleware, adminMiddleware, type AppEnv } from '../helpers/auth';

const support = new Hono<AppEnv>();

// Users can file support tickets (replaces the fake "Report a Problem" form).
support.post('/tickets', authMiddleware, zValidator('json', z.object({
  subject: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(5000),
})), async (c) => {
  const { subject, message } = c.req.valid('json');
  const userId = c.get('user')._id;
  const _id = newId();
  const ts = now();
  await run(
    c.env.DB,
    `INSERT INTO support_tickets (_id, user, subject, message, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'open', ?, ?)`,
    _id, userId, subject, message, ts, ts
  );
  return c.json({ ticket: { _id, subject, status: 'open', createdAt: ts } }, 201);
});

// Admins can review tickets. Mounted under /api/v1/admin via the handler below.
support.get('/tickets', authMiddleware, adminMiddleware, async (c) => {
  const items = await all<SupportTicketRow>(c.env.DB, 'SELECT * FROM support_tickets ORDER BY created_at DESC LIMIT 100');
  return c.json({ items });
});

support.patch('/tickets/:id', authMiddleware, adminMiddleware, zValidator('json', z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']),
})), async (c) => {
  const { status } = c.req.valid('json');
  await run(c.env.DB, 'UPDATE support_tickets SET status = ?, updated_at = ? WHERE _id = ?', status, now(), c.req.param('id'));
  return c.json({ ok: true });
});

export default support;
