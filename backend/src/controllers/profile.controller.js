const User = require('../models/User');
const BankDetails = require('../models/BankDetails');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const bcrypt = require('bcryptjs');

exports.get = asyncHandler(async (req, res) => {
  const bank = await BankDetails.findOne({ user: req.user._id });
  res.json({ user: req.user.toSafeJSON(), bank });
});

exports.update = asyncHandler(async (req, res) => {
  const allowed = ['name', 'phone', 'whatsapp', 'country', 'niche', 'avatarUrl'];
  for (const key of allowed) {
    if (req.body[key] !== undefined) req.user[key] = req.body[key];
  }
  await req.user.save();
  res.json({ user: req.user.toSafeJSON() });
});

exports.updateBank = asyncHandler(async (req, res) => {
  const update = req.body;
  const bank = await BankDetails.findOneAndUpdate(
    { user: req.user._id },
    { $set: update, user: req.user._id },
    { new: true, upsert: true }
  );
  res.json({ bank });
});

exports.updateSecurity = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) throw new ApiError(400, 'Both passwords required');
  if (newPassword.length < 6) throw new ApiError(400, 'New password min 6 chars');

  const user = await User.findById(req.user._id).select('+password');
  const ok = await bcrypt.compare(currentPassword, user.password);
  if (!ok) throw new ApiError(401, 'Current password is incorrect');

  user.password = newPassword;
  await user.save();
  res.json({ message: 'Password updated' });
});
