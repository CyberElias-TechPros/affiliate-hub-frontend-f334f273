const AffiliateLink = require('../models/AffiliateLink');
const Product = require('../models/Product');
const Transaction = require('../models/Transaction');
const Referral = require('../models/Referral');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { notify, bumpAchievement, touchStreak } = require('../services/engagement.service');

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
  let isNew = false;
  if (!link) {
    link = await AffiliateLink.create({ user: req.user._id, product: product._id });
    isNew = true;
  }

  if (isNew) {
    await touchStreak(req.user._id);
    await bumpAchievement(req.user._id, 'first_link');
    await bumpAchievement(req.user._id, 'ten_links');
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

  await notify(link.user, {
    type: 'sale',
    title: '🎉 You made a sale!',
    message: `+₦${earned.toLocaleString()} from ${link.product.title}`,
    icon: '💰',
    link: '/wallet',
  });
  await touchStreak(link.user);
  await bumpAchievement(link.user, 'first_sale');
  await bumpAchievement(link.user, 'ten_sales');
  await bumpAchievement(link.user, 'fifty_sales');

  // Referral bonus on first qualified sale
  const buyer = await User.findById(link.user);
  if (buyer?.referredBy) {
    const ref = await Referral.findOne({
      referrer: buyer.referredBy,
      referred: buyer._id,
    });
    if (ref && ref.status !== 'rewarded') {
      const reward = Math.round(earned * 0.1);
      ref.status = 'rewarded';
      ref.rewardAmount = reward;
      await ref.save();
      await Transaction.create({
        user: buyer.referredBy,
        type: 'bonus',
        direction: 'credit',
        amount: reward,
        status: 'completed',
        description: `Referral bonus from ${buyer.name}`,
        reference: link.code,
      });
      await notify(buyer.referredBy, {
        type: 'referral',
        title: '🤝 Referral bonus!',
        message: `+₦${reward.toLocaleString()} from ${buyer.name}'s sale`,
        icon: '🎁',
        link: '/referrals',
      });
      await bumpAchievement(buyer.referredBy, 'first_referral');
    }
  }

  res.json({ ok: true, earned });
});
