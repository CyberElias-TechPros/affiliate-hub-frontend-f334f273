import type { D1Database } from '@cloudflare/workers-types';
import type { AchievementRow, StreakRow } from '../env';
import { get, run, newId, now, todayKey } from '../helpers/db';

export const ACHIEVEMENTS = [
  { code: 'first_sale', title: 'First Sale!', description: 'Make your first commission.', icon: '🎉', target: 1 },
  { code: 'ten_sales', title: 'Hot Streak', description: 'Hit 10 commissions.', icon: '🔥', target: 10 },
  { code: 'fifty_sales', title: 'Top Promoter', description: '50 commissions earned.', icon: '🏆', target: 50 },
  { code: 'first_link', title: 'Link Master', description: 'Generate your first affiliate link.', icon: '🔗', target: 1 },
  { code: 'ten_links', title: 'Portfolio Builder', description: 'Create 10 affiliate links.', icon: '📚', target: 10 },
  { code: 'streak_7', title: '7-Day Streak', description: 'Stay active 7 days in a row.', icon: '⚡', target: 7 },
  { code: 'streak_30', title: 'Month-Long Hustler', description: '30-day activity streak.', icon: '💎', target: 30 },
  { code: 'first_payout', title: 'Cashed Out', description: 'Request your first payout.', icon: '💰', target: 1 },
  { code: 'first_referral', title: 'Recruiter', description: 'Refer your first affiliate.', icon: '🤝', target: 1 },
];

export async function notify(db: D1Database, userId: string, payload: {
  type: string;
  title: string;
  message: string;
  icon?: string;
  link?: string;
}): Promise<void> {
  await run(
    db,
    `INSERT INTO notifications (_id, user, type, title, message, icon, link, read, meta, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, '{}', ?, ?)`,
    newId(), userId, payload.type, payload.title, payload.message, payload.icon || '', payload.link || '', now(), now()
  );
}

/** Increments an achievement counter and fires a notification on unlock. */
export async function bumpAchievement(db: D1Database, userId: string, code: string, increment = 1): Promise<AchievementRow | null> {
  const def = ACHIEVEMENTS.find((a) => a.code === code);
  if (!def) return null;

  const existing = await get<AchievementRow>(db, 'SELECT * FROM achievements WHERE user = ? AND code = ?', userId, code);
  const current = existing?.progress || 0;
  const next = current + increment;
  const justUnlocked = !existing?.unlocked_at && next >= def.target;

  await run(
    db,
    `INSERT INTO achievements (_id, user, code, title, description, icon, progress, target, unlocked_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user, code) DO UPDATE SET
       title = excluded.title, description = excluded.description, icon = excluded.icon,
       progress = excluded.progress, target = excluded.target,
       unlocked_at = COALESCE(achievements.unlocked_at, excluded.unlocked_at),
       updated_at = excluded.updated_at`,
    newId(), userId, def.code, def.title, def.description, def.icon, Math.min(next, def.target), def.target,
    justUnlocked ? now() : null, now(), now()
  );

  if (justUnlocked) {
    await notify(db, userId, {
      type: 'achievement',
      title: `Achievement unlocked: ${def.title}`,
      message: def.description,
      icon: def.icon,
      link: '/achievements',
    });
  }

  return get<AchievementRow>(db, 'SELECT * FROM achievements WHERE user = ? AND code = ?', userId, code);
}

function yesterdayKey(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Advances (or resets) the user's daily activity streak. */
export async function touchStreak(db: D1Database, userId: string): Promise<StreakRow | null> {
  const today = todayKey();
  let streak = await get<StreakRow>(db, 'SELECT * FROM streaks WHERE user = ?', userId);

  if (!streak) {
    streak = {
      _id: newId(), user: userId, current: 1, longest: 1, last_active_date: today,
      created_at: now(), updated_at: now(),
    };
    await run(
      db,
      `INSERT INTO streaks (_id, user, current, longest, last_active_date, created_at, updated_at)
       VALUES (?, ?, 1, 1, ?, ?, ?)`,
      streak._id, userId, today, now(), now()
    );
  } else if (streak.last_active_date === today) {
    return streak;
  } else if (streak.last_active_date === yesterdayKey()) {
    streak.current += 1;
    streak.longest = Math.max(streak.longest, streak.current);
    streak.last_active_date = today;
    streak.updated_at = now();
    await run(db, 'UPDATE streaks SET current = ?, longest = ?, last_active_date = ?, updated_at = ? WHERE _id = ?',
      streak.current, streak.longest, today, now(), streak._id);
  } else {
    streak.current = 1;
    streak.longest = Math.max(streak.longest, 1);
    streak.last_active_date = today;
    streak.updated_at = now();
    await run(db, 'UPDATE streaks SET current = ?, longest = ?, last_active_date = ?, updated_at = ? WHERE _id = ?',
      streak.current, streak.longest, today, now(), streak._id);
  }

  if (streak.current === 7) await bumpAchievement(db, userId, 'streak_7', 7);
  if (streak.current === 30) await bumpAchievement(db, userId, 'streak_30', 30);
  return streak;
}
