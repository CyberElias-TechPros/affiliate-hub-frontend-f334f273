const Transaction = require('../models/Transaction');
const Withdrawal = require('../models/Withdrawal');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const FX_NGN_PER_USD = 1500;

async function calcBalance(userId) {
  const agg = await Transaction.aggregate([
    { $match: { user: userId, status: 'completed' } },
    {
      $group: {
        _id: null,
        balance: {
          $sum: {
            $cond: [{ $eq: ['$direction', 'credit'] }, '$amount', { $multiply: ['$amount', -1] }],
          },
        },
      },
    },
  ]);
  return agg[0]?.balance || 0;
}

exports.balance = asyncHandler(async (req, res) => {
  const ngn = await calcBalance(req.user._id);
  res.json({
    ngnBalance: ngn,
    usdBalance: Math.round((ngn / FX_NGN_PER_USD) * 100) / 100,
    currency: 'NGN',
  });
});

exports.transactions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  const filter = { user: req.user._id };
  if (status) filter.status = status;

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Transaction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Transaction.countDocuments(filter),
  ]);
  res.json({ items, total, page: Number(page), limit: Number(limit) });
});

exports.withdraw = asyncHandler(async (req, res) => {
  const { amount, method, details } = req.body;
  if (!amount || amount < 100) throw new ApiError(400, 'Minimum withdrawal is 100');
  if (!['bank', 'usdt', 'paypal'].includes(method)) throw new ApiError(400, 'Invalid method');

  const balance = await calcBalance(req.user._id);
  if (amount > balance) throw new ApiError(400, 'Insufficient balance');

  const tx = await Transaction.create({
    user: req.user._id,
    type: 'withdrawal',
    direction: 'debit',
    amount,
    status: 'pending',
    description: `Withdrawal via ${method}`,
  });

  const w = await Withdrawal.create({
    user: req.user._id,
    amount,
    method,
    details,
    transaction: tx._id,
  });

  res.status(201).json({ withdrawal: w, transaction: tx });
});

exports.methods = asyncHandler(async (_req, res) => {
  res.json([
    { id: 'bank', label: 'Bank Transfer (NGN)', minAmount: 1000, fee: 0 },
    { id: 'usdt', label: 'USDT (TRC20)', minAmount: 5000, fee: 1 },
    { id: 'paypal', label: 'PayPal (USD)', minAmount: 5000, fee: 2.5 },
  ]);
});
