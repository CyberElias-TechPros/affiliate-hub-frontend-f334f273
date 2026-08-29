import { Hono } from 'hono';
import type { Env, AchievementRow, StreakRow } from '../env';
import { all, get } from '../helpers/db';
import { authMiddleware, type AppEnv } from '../helpers/auth';
import { ACHIEVEMENTS } from '../services/engagement';

const achievements = new Hono<AppEnv>();

achievements.get('/', authMiddleware, async (c) => {
  const userId = c.get('user')._id;
  const owned = await all<AchievementRow>(c.env.DB, 'SELECT * FROM achievements WHERE user = ?', userId);
  const map = new Map(owned.map((a) => [a.code, a]));

  const items = ACHIEVEMENTS.map((def) => {
    const a = map.get(def.code);
    return {
      code: def.code,
      title: def.title,
      description: def.description,
      icon: def.icon,
      target: def.target,
      progress: a?.progress || 0,
      unlocked: !!a?.unlocked_at,
      unlockedAt: a?.unlocked_at || null,
    };
  });
  return c.json({ items });
});

achievements.get('/streak', authMiddleware, async (c) => {
  const s = await get<StreakRow>(c.env.DB, 'SELECT * FROM streaks WHERE user = ?', c.get('user')._id);
  return c.json({
    current: s?.current || 0,
    longest: s?.longest || 0,
    lastActiveDate: s?.last_active_date || '',
  });
});

export default achievements;
