const Product = require('../models/Product');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

exports.list = asyncHandler(async (req, res) => {
  const { category, sort, page = 1, limit = 20, q } = req.query;
  const filter = { isActive: true };
  if (category && category !== 'all') filter.category = category;
  if (q) filter.$text = { $search: q };

  const sortMap = {
    'price-low': { price: 1 },
    'price-high': { price: -1 },
    commission: { commission: -1 },
    newest: { createdAt: -1 },
  };
  const sortBy = sortMap[sort] || { createdAt: -1 };

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Product.find(filter).sort(sortBy).skip(skip).limit(Number(limit)),
    Product.countDocuments(filter),
  ]);

  res.json({ items, total, page: Number(page), limit: Number(limit) });
});

exports.detail = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new ApiError(404, 'Product not found');
  res.json(product);
});

exports.search = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q) throw new ApiError(400, 'Search query (q) is required');
  const items = await Product.find({ $text: { $search: q }, isActive: true }).limit(50);
  res.json({ items, total: items.length });
});

exports.categories = asyncHandler(async (_req, res) => {
  const cats = await Product.distinct('category', { isActive: true });
  res.json(cats);
});
