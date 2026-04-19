const Achievement = require('../models/Achievement');
const Streak = require('../models/Streak');
const asyncHandler = require('../utils/asyncHandler');
const { ACHIEVEMENTS } = require('../services/engagement.service');

exports.list = asyncHandler(async (req, res) => {
  const owned = await Achievement.find({ user: req.user._id });
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
      unlocked: !!a?.unlockedAt,
      unlockedAt: a?.unlockedAt || null,
    };
  });
  res.json({ items });
});

exports.streak = asyncHandler(async (req, res) => {
  const s = (await Streak.findOne({ user: req.user._id })) || {
    current: 0,
    longest: 0,
    lastActiveDate: '',
  };
  res.json({ current: s.current, longest: s.longest, lastActiveDate: s.lastActiveDate });
});
