import { Hono } from 'hono';
import type { Env, NotificationRow } from '../env';
import { all, get, run, now, toNotification } from '../helpers/db';
import { ApiError, authMiddleware, type AppEnv } from '../helpers/auth';

const notifications = new Hono<AppEnv>();

notifications.get('/', authMiddleware, async (c) => {
  const userId = c.get('user')._id;
  const unreadOnly = new URL(c.req.url).searchParams.get('unreadOnly') === 'true';
  const filter = unreadOnly ? 'AND read = 0' : '';
  const items = await all<NotificationRow>(
    c.env.DB,
    `SELECT * FROM notifications WHERE user = ? ${filter} ORDER BY created_at DESC LIMIT 50`,
    userId
  );
  const unread = await get<{ c: number }>(c.env.DB, 'SELECT COUNT(*) AS c FROM notifications WHERE user = ? AND read = 0', userId);
  return c.json({ items: items.map(toNotification), unread: unread?.c || 0 });
});

notifications.put('/:id/read', authMiddleware, async (c) => {
  const userId = c.get('user')._id;
  const n = await get<NotificationRow>(c.env.DB, 'SELECT * FROM notifications WHERE _id = ? AND user = ?', c.req.param('id'), userId);
  if (!n) throw new ApiError(404, 'Notification not found');
  await run(c.env.DB, 'UPDATE notifications SET read = 1, updated_at = ? WHERE _id = ?', now(), n._id);
  return c.json({ notification: toNotification({ ...n, read: 1 }) });
});

notifications.put('/read-all', authMiddleware, async (c) => {
  const userId = c.get('user')._id;
  await run(c.env.DB, 'UPDATE notifications SET read = 1, updated_at = ? WHERE user = ? AND read = 0', now(), userId);
  return c.json({ ok: true });
});

notifications.delete('/:id', authMiddleware, async (c) => {
  const userId = c.get('user')._id;
  await run(c.env.DB, 'DELETE FROM notifications WHERE _id = ? AND user = ?', c.req.param('id'), userId);
  return c.json({ ok: true });
});

export default notifications;
