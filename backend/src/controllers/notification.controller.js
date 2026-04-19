const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

exports.list = asyncHandler(async (req, res) => {
  const { unreadOnly } = req.query;
  const filter = { user: req.user._id };
  if (unreadOnly === 'true') filter.read = false;

  const items = await Notification.find(filter).sort({ createdAt: -1 }).limit(50);
  const unread = await Notification.countDocuments({ user: req.user._id, read: false });
  res.json({ items, unread });
});

exports.markRead = asyncHandler(async (req, res) => {
  const n = await Notification.findOne({ _id: req.params.id, user: req.user._id });
  if (!n) throw new ApiError(404, 'Notification not found');
  n.read = true;
  await n.save();
  res.json({ notification: n });
});

exports.markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { $set: { read: true } });
  res.json({ ok: true });
});

exports.remove = asyncHandler(async (req, res) => {
  await Notification.deleteOne({ _id: req.params.id, user: req.user._id });
  res.json({ ok: true });
});
