-- Affiliate Hub — D1 schema (SQLite)
-- Run: npm run db:init   (npx wrangler d1 execute affiliate-hub --file=migrations/0001_init.sql)

CREATE TABLE IF NOT EXISTS users (
  _id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  whatsapp TEXT DEFAULT '',
  country TEXT DEFAULT 'NG',
  niche TEXT DEFAULT '',
  niches TEXT DEFAULT '[]',
  avatar_url TEXT DEFAULT '',
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
  onboarding_complete INTEGER NOT NULL DEFAULT 0,
  provider TEXT NOT NULL DEFAULT 'local' CHECK (provider IN ('local','google','apple')),
  referral_code TEXT UNIQUE,
  referred_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by);

CREATE TABLE IF NOT EXISTS products (
  _id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  price REAL NOT NULL CHECK (price >= 0),
  currency TEXT DEFAULT 'NGN',
  commission REAL NOT NULL DEFAULT 10 CHECK (commission >= 0 AND commission <= 100),
  category TEXT DEFAULT 'General',
  tags TEXT DEFAULT '[]',
  image TEXT DEFAULT '',
  gallery TEXT DEFAULT '[]',
  vendor TEXT DEFAULT 'Affiliate Hub',
  cookie_days INTEGER DEFAULT 30,
  why_promote TEXT DEFAULT '[]',
  swipe_copy TEXT DEFAULT '',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);

CREATE TABLE IF NOT EXISTS affiliate_links (
  _id TEXT PRIMARY KEY,
  user TEXT NOT NULL REFERENCES users(_id) ON DELETE CASCADE,
  product TEXT NOT NULL REFERENCES products(_id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  clicks INTEGER NOT NULL DEFAULT 0,
  conversions INTEGER NOT NULL DEFAULT 0,
  earnings REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(user, product)
);
CREATE INDEX IF NOT EXISTS idx_affiliate_links_user ON affiliate_links(user);
CREATE INDEX IF NOT EXISTS idx_affiliate_links_product ON affiliate_links(product);

-- Per-event analytics (clicks + conversions) so charts can show real daily data.
CREATE TABLE IF NOT EXISTS affiliate_events (
  _id TEXT PRIMARY KEY,
  link TEXT NOT NULL REFERENCES affiliate_links(_id) ON DELETE CASCADE,
  user TEXT NOT NULL REFERENCES users(_id) ON DELETE CASCADE,
  product TEXT NOT NULL REFERENCES products(_id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('click','conversion')),
  amount REAL NOT NULL DEFAULT 0,
  event_key TEXT UNIQUE,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_affiliate_events_user ON affiliate_events(user, created_at);
CREATE INDEX IF NOT EXISTS idx_affiliate_events_link ON affiliate_events(link, created_at);

CREATE TABLE IF NOT EXISTS transactions (
  _id TEXT PRIMARY KEY,
  user TEXT NOT NULL REFERENCES users(_id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('commission','withdrawal','bonus','refund','adjustment')),
  direction TEXT NOT NULL CHECK (direction IN ('credit','debit')),
  amount REAL NOT NULL CHECK (amount >= 0),
  currency TEXT DEFAULT 'NGN',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','cancelled')),
  description TEXT DEFAULT '',
  reference TEXT DEFAULT '',
  meta TEXT DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user, created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);

CREATE TABLE IF NOT EXISTS withdrawals (
  _id TEXT PRIMARY KEY,
  user TEXT NOT NULL REFERENCES users(_id) ON DELETE CASCADE,
  amount REAL NOT NULL CHECK (amount >= 0),
  currency TEXT DEFAULT 'NGN',
  method TEXT NOT NULL CHECK (method IN ('bank','usdt','paypal')),
  details TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  transaction_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON withdrawals(user);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);

CREATE TABLE IF NOT EXISTS bank_details (
  _id TEXT PRIMARY KEY,
  user TEXT NOT NULL UNIQUE REFERENCES users(_id) ON DELETE CASCADE,
  bank_name TEXT DEFAULT '',
  account_name TEXT DEFAULT '',
  account_number TEXT DEFAULT '',
  usdt_address TEXT DEFAULT '',
  paypal_email TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  _id TEXT PRIMARY KEY,
  user TEXT NOT NULL REFERENCES users(_id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('sale','withdrawal','system','achievement','referral','click_milestone')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  icon TEXT DEFAULT '',
  link TEXT DEFAULT '',
  read INTEGER NOT NULL DEFAULT 0,
  meta TEXT DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user, created_at);

CREATE TABLE IF NOT EXISTS achievements (
  _id TEXT PRIMARY KEY,
  user TEXT NOT NULL REFERENCES users(_id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  icon TEXT DEFAULT '🏆',
  progress REAL NOT NULL DEFAULT 0,
  target REAL NOT NULL DEFAULT 1,
  unlocked_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(user, code)
);
CREATE INDEX IF NOT EXISTS idx_achievements_user ON achievements(user);

CREATE TABLE IF NOT EXISTS streaks (
  _id TEXT PRIMARY KEY,
  user TEXT NOT NULL UNIQUE REFERENCES users(_id) ON DELETE CASCADE,
  current INTEGER NOT NULL DEFAULT 0,
  longest INTEGER NOT NULL DEFAULT 0,
  last_active_date TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS referrals (
  _id TEXT PRIMARY KEY,
  referrer TEXT NOT NULL REFERENCES users(_id) ON DELETE CASCADE,
  referred TEXT NOT NULL REFERENCES users(_id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','qualified','rewarded')),
  reward_amount REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(referrer, referred)
);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer);

CREATE TABLE IF NOT EXISTS support_tickets (
  _id TEXT PRIMARY KEY,
  user TEXT NOT NULL REFERENCES users(_id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user);

-- Simple key-value store (e.g. settings, feature flags)
CREATE TABLE IF NOT EXISTS kv (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
