const Referral = require('../models/Referral');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { nanoid } = require('nanoid');

async function ensureCode(user) {
  if (user.referralCode) return user.referralCode;
  const code = nanoid(8);
  user.referralCode = code;
  await user.save();
  return code;
}

exports.me = asyncHandler(async (req, res) => {
  const code = await ensureCode(req.user);
  const refs = await Referral.find({ referrer: req.user._id }).populate('referred', 'name email');
  const stats = {
    total: refs.length,
    qualified: refs.filter((r) => r.status === 'qualified' || r.status === 'rewarded').length,
    earned: refs.reduce((sum, r) => sum + (r.rewardAmount || 0), 0),
  };
  res.json({
    code,
    link: `${process.env.PUBLIC_BASE_URL || ''}/auth?ref=${code}`,
    referrals: refs,
    stats,
  });
});

exports.applyOnSignup = asyncHandler(async (req, res) => {
  const { code } = req.body;
  if (!code) return res.json({ ok: false });

  const referrer = await User.findOne({ referralCode: code });
  if (!referrer || String(referrer._id) === String(req.user._id)) {
    return res.json({ ok: false });
  }

  if (req.user.referredBy) return res.json({ ok: false, reason: 'already_referred' });

  req.user.referredBy = referrer._id;
  await req.user.save();
  await Referral.create({ referrer: referrer._id, referred: req.user._id, status: 'pending' });
  res.json({ ok: true });
});
