const User = require('../models/User');
const Product = require('../models/Product');
const Transaction = require('../models/Transaction');
const Withdrawal = require('../models/Withdrawal');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

// ---------- USERS ----------
exports.listUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, q } = req.query;
  const filter = {};
  if (q) filter.$or = [{ name: new RegExp(q, 'i') }, { email: new RegExp(q, 'i') }];
  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    User.countDocuments(filter),
  ]);
  res.json({ items: items.map((u) => u.toSafeJSON()), total, page: Number(page) });
});

exports.updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!['user', 'admin'].includes(role)) throw new ApiError(400, 'Invalid role');
  const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
  if (!user) throw new ApiError(404, 'User not found');
  res.json({ user: user.toSafeJSON() });
});

exports.deleteUser = asyncHandler(async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

// ---------- PRODUCTS ----------
exports.createProduct = asyncHandler(async (req, res) => {
  const product = await Product.create(req.body);
  res.status(201).json(product);
});

exports.updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!product) throw new ApiError(404, 'Product not found');
  res.json(product);
});

exports.deleteProduct = asyncHandler(async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

// ---------- WITHDRAWALS ----------
exports.listWithdrawals = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = {};
  if (status) filter.status = status;
  const items = await Withdrawal.find(filter).populate('user', 'name email').sort({ createdAt: -1 });
  res.json({ items });
});

exports.updateWithdrawal = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['pending', 'processing', 'completed', 'failed'].includes(status))
    throw new ApiError(400, 'Invalid status');

  const w = await Withdrawal.findById(req.params.id);
  if (!w) throw new ApiError(404, 'Withdrawal not found');

  w.status = status;
  await w.save();

  if (w.transaction) {
    const txStatus =
      status === 'completed' ? 'completed' : status === 'failed' ? 'failed' : 'pending';
    await Transaction.findByIdAndUpdate(w.transaction, { status: txStatus });
  }
  res.json({ withdrawal: w });
});

// ---------- METRICS ----------
exports.metrics = asyncHandler(async (_req, res) => {
  const [users, products, totalEarnings, pendingWithdrawals] = await Promise.all([
    User.countDocuments(),
    Product.countDocuments(),
    Transaction.aggregate([
      { $match: { status: 'completed', direction: 'credit' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Withdrawal.countDocuments({ status: 'pending' }),
  ]);
  res.json({
    users,
    products,
    totalEarnings: totalEarnings[0]?.total || 0,
    pendingWithdrawals,
  });
});
