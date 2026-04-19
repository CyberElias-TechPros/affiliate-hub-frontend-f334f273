const AffiliateLink = require('../models/AffiliateLink');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

exports.dashboard = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const [linkAgg, earningsAgg, recentTx] = await Promise.all([
    AffiliateLink.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: null,
          totalLinks: { $sum: 1 },
          totalClicks: { $sum: '$clicks' },
          totalConversions: { $sum: '$conversions' },
        },
      },
    ]),
    Transaction.aggregate([
      { $match: { user: userId, status: 'completed', direction: 'credit' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Transaction.find({ user: userId }).sort({ createdAt: -1 }).limit(5),
  ]);

  res.json({
    totalLinks: linkAgg[0]?.totalLinks || 0,
    totalClicks: linkAgg[0]?.totalClicks || 0,
    totalConversions: linkAgg[0]?.totalConversions || 0,
    totalEarnings: earningsAgg[0]?.total || 0,
    conversionRate: linkAgg[0]?.totalClicks
      ? +(((linkAgg[0].totalConversions || 0) / linkAgg[0].totalClicks) * 100).toFixed(2)
      : 0,
    recentTransactions: recentTx,
  });
});

exports.performance = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { period = '7d' } = req.query;
  const days = period === '30d' ? 30 : period === '90d' ? 90 : 7;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const data = await Transaction.aggregate([
    { $match: { user: userId, createdAt: { $gte: since }, direction: 'credit' } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        clicks: { $sum: 0 },
        earnings: { $sum: '$amount' },
        conversions: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  res.json({ period, points: data.map((d) => ({ date: d._id, ...d, _id: undefined })) });
});

exports.leaderboard = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 10, 50);
  const top = await Transaction.aggregate([
    { $match: { status: 'completed', direction: 'credit' } },
    { $group: { _id: '$user', earnings: { $sum: '$amount' } } },
    { $sort: { earnings: -1 } },
    { $limit: limit },
  ]);

  const users = await User.find({ _id: { $in: top.map((t) => t._id) } }).select('name avatarUrl');
  const map = new Map(users.map((u) => [String(u._id), u]));

  res.json(
    top.map((t, i) => ({
      rank: i + 1,
      earnings: t.earnings,
      user: map.get(String(t._id)) || null,
    }))
  );
});
