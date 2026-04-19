const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');

const authRoutes = require('./routes/auth.routes');
const productRoutes = require('./routes/product.routes');
const walletRoutes = require('./routes/wallet.routes');
const statsRoutes = require('./routes/stats.routes');
const profileRoutes = require('./routes/profile.routes');
const affiliateRoutes = require('./routes/affiliate.routes');
const notificationRoutes = require('./routes/notification.routes');
const achievementRoutes = require('./routes/achievement.routes');
const referralRoutes = require('./routes/referral.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: (process.env.CORS_ORIGIN || '*').split(',').map((s) => s.trim()),
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
});

app.get('/health', (_req, res) =>
  res.json({ status: 'ok', uptime: process.uptime(), ts: Date.now() })
);

// Public short-link redirect (e.g. /r/abc123)
const affiliateController = require('./controllers/affiliate.controller');
app.get('/r/:code', affiliateController.redirect);

app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/wallet', walletRoutes);
app.use('/api/v1/stats', statsRoutes);
app.use('/api/v1/profile', profileRoutes);
app.use('/api/v1/affiliate', affiliateRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/achievements', achievementRoutes);
app.use('/api/v1/referrals', referralRoutes);
app.use('/api/v1/admin', adminRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
