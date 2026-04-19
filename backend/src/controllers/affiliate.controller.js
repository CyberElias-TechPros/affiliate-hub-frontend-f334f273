const AffiliateLink = require('../models/AffiliateLink');
const Product = require('../models/Product');
const Transaction = require('../models/Transaction');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const baseUrl = (req) =>
  process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;

exports.list = asyncHandler(async (req, res) => {
  const links = await AffiliateLink.find({ user: req.user._id })
    .populate('product')
    .sort({ createdAt: -1 });
  const items = links.map((l) => ({
    ...l.toObject(),
    url: `${baseUrl(req)}/r/${l.code}`,
  }));
  res.json({ items });
});

exports.generate = asyncHandler(async (req, res) => {
  const { productId } = req.body;
  const product = await Product.findById(productId);
  if (!product) throw new ApiError(404, 'Product not found');

  let link = await AffiliateLink.findOne({ user: req.user._id, product: product._id });
  if (!link) {
    link = await AffiliateLink.create({ user: req.user._id, product: product._id });
  }
  res.status(201).json({
    link: { ...link.toObject(), url: `${baseUrl(req)}/r/${link.code}` },
    product,
  });
});

exports.assets = asyncHandler(async (req, res) => {
  const { productId } = req.query;
  const product = await Product.findById(productId);
  if (!product) throw new ApiError(404, 'Product not found');

  res.json({
    images: [product.image, ...(product.gallery || [])].filter(Boolean),
    swipeCopy:
      product.swipeCopy ||
      `🔥 ${product.title} — earn ${product.commission}% commission. Grab it here:`,
  });
});

// Public click redirect — increments stats then 302s to product (or sample URL).
exports.redirect = asyncHandler(async (req, res) => {
  const link = await AffiliateLink.findOne({ code: req.params.code }).populate('product');
  if (!link) throw new ApiError(404, 'Link not found');

  link.clicks += 1;
  await link.save();

  const target =
    link.product?.vendor && link.product.vendor.startsWith('http')
      ? link.product.vendor
      : `${baseUrl(req)}/product/${link.product?._id || ''}?ref=${link.code}`;
  res.redirect(target);
});

// Public conversion webhook — for testing the engine without a real network.
exports.recordConversion = asyncHandler(async (req, res) => {
  const link = await AffiliateLink.findOne({ code: req.params.code }).populate('product');
  if (!link) throw new ApiError(404, 'Link not found');

  const earned = Math.round((link.product.price * link.product.commission) / 100);
  link.conversions += 1;
  link.earnings += earned;
  await link.save();

  await Transaction.create({
    user: link.user,
    type: 'commission',
    direction: 'credit',
    amount: earned,
    status: 'completed',
    description: `Commission for ${link.product.title}`,
    reference: link.code,
  });

  res.json({ ok: true, earned });
});
