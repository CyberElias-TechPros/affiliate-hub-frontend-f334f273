const { body } = require('express-validator');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { signToken } = require('../utils/jwt');

const issue = (user) => ({
  token: signToken({ id: user._id, email: user.email, role: user.role }),
  user: user.toSafeJSON(),
});

exports.signupValidators = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password min 6 chars'),
];

exports.loginValidators = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
];

exports.signup = asyncHandler(async (req, res) => {
  const { name, email, password, country, whatsapp, referralCode } = req.body;
  const exists = await User.findOne({ email });
  if (exists) throw new ApiError(409, 'Email already registered');

  const userData = { name, email, password, country, whatsapp };

  if (referralCode) {
    const Referral = require('../models/Referral');
    const referrer = await User.findOne({ referralCode });
    if (referrer) {
      userData.referredBy = referrer._id;
      const user = await User.create(userData);
      await Referral.create({ referrer: referrer._id, referred: user._id, status: 'pending' });
      return res.status(201).json(issue(user));
    }
  }

  const user = await User.create(userData);
  res.status(201).json(issue(user));
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  if (!user) throw new ApiError(401, 'Invalid credentials');

  const ok = await user.comparePassword(password);
  if (!ok) throw new ApiError(401, 'Invalid credentials');

  res.json(issue(user));
});

exports.socialAuth = asyncHandler(async (req, res) => {
  const { provider, email, name } = req.body;
  if (!email || !provider) throw new ApiError(400, 'provider and email required');

  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({
      name: name || email.split('@')[0],
      email,
      password: Math.random().toString(36).slice(2) + Date.now(),
      provider,
    });
  }
  res.json(issue(user));
});

exports.me = asyncHandler(async (req, res) => {
  res.json({ user: req.user.toSafeJSON() });
});

exports.completeOnboarding = asyncHandler(async (req, res) => {
  const { country, niche, niches, whatsapp } = req.body;
  if (country) req.user.country = country;
  if (niche) req.user.niche = niche;
  if (Array.isArray(niches)) req.user.niches = niches;
  if (whatsapp) req.user.whatsapp = whatsapp;
  req.user.onboardingComplete = true;
  await req.user.save();
  res.json({ user: req.user.toSafeJSON() });
});
