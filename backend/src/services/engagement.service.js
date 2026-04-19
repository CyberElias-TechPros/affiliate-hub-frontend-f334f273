const Notification = require('../models/Notification');
const Achievement = require('../models/Achievement');
const Streak = require('../models/Streak');

const ACHIEVEMENTS = [
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

async function notify(userId, payload) {
  return Notification.create({ user: userId, ...payload });
}

async function bumpAchievement(userId, code, increment = 1) {
  const def = ACHIEVEMENTS.find((a) => a.code === code);
  if (!def) return null;

  const existing = await Achievement.findOne({ user: userId, code });
  const current = existing?.progress || 0;
  const next = current + increment;
  const justUnlocked = !existing?.unlockedAt && next >= def.target;

  const ach = await Achievement.findOneAndUpdate(
    { user: userId, code },
    {
      $set: {
        title: def.title,
        description: def.description,
        icon: def.icon,
        target: def.target,
        progress: Math.min(next, def.target),
        ...(justUnlocked ? { unlockedAt: new Date() } : {}),
      },
    },
    { upsert: true, new: true }
  );

  if (justUnlocked) {
    await notify(userId, {
      type: 'achievement',
      title: `Achievement unlocked: ${def.title}`,
      message: def.description,
      icon: def.icon,
      link: '/achievements',
    });
  }
  return ach;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}
function yesterdayKey() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

async function touchStreak(userId) {
  const today = todayKey();
  let streak = await Streak.findOne({ user: userId });
  if (!streak) {
    streak = await Streak.create({ user: userId, current: 1, longest: 1, lastActiveDate: today });
  } else if (streak.lastActiveDate === today) {
    return streak;
  } else if (streak.lastActiveDate === yesterdayKey()) {
    streak.current += 1;
    streak.longest = Math.max(streak.longest, streak.current);
    streak.lastActiveDate = today;
    await streak.save();
  } else {
    streak.current = 1;
    streak.lastActiveDate = today;
    await streak.save();
  }

  if (streak.current === 7) await bumpAchievement(userId, 'streak_7', 7);
  if (streak.current === 30) await bumpAchievement(userId, 'streak_30', 30);
  return streak;
}

module.exports = { ACHIEVEMENTS, notify, bumpAchievement, touchStreak };
