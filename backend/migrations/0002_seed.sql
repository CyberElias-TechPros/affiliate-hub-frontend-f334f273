-- Affiliate Hub — demo seed data (safe to re-run: deletes demo rows first)
-- Run: npm run db:seed
-- Demo logins:
--   demo@affiliatehub.com / password123   (affiliate)
--   admin@affiliatehub.com / admin1234    (admin)

DELETE FROM support_tickets;
DELETE FROM bank_details;
DELETE FROM referrals;
DELETE FROM streaks;
DELETE FROM achievements;
DELETE FROM notifications;
DELETE FROM affiliate_events;
DELETE FROM affiliate_links;
DELETE FROM transactions;
DELETE FROM withdrawals;
DELETE FROM products;
DELETE FROM users;

INSERT INTO users (_id, name, email, password_hash, phone, whatsapp, country, niche, niches, avatar_url, role, onboarding_complete, provider, referral_code, referred_by, created_at, updated_at) VALUES
('seed-user-demo', 'Chinedu Nwankwo', 'demo@affiliatehub.com', 'pbkdf2-sha256$100000$61f18375b336720e541e73584d81d821$ba7dd3e15c0f4b6ee234bf5ea872c36f1d0becdcad42c3a3ab8d6d2d9254fd04', '+2348012345678', '+2348012345678', 'NG', 'tech', '["tech","finance"]', '', 'user', 1, 'local', 'DEMO1234', NULL, '2026-08-01T09:00:00.000Z', '2026-08-01T09:00:00.000Z'),
('seed-user-admin', 'Admin', 'admin@affiliatehub.com', 'pbkdf2-sha256$100000$4c49244bc57d2485372fddff1c0b31c4$d43826b44ac7c4da139369b31c4fafbdb131a71c88abf6fbf6f7acabc8a005b4', '', '', 'NG', '', '[]', '', 'admin', 1, 'local', 'ADMIN001', NULL, '2026-08-01T09:00:00.000Z', '2026-08-01T09:00:00.000Z'),
('seed-user-2', 'Amaka Udo', 'amaka@example.com', 'pbkdf2-sha256$100000$61f18375b336720e541e73584d81d821$ba7dd3e15c0f4b6ee234bf5ea872c36f1d0becdcad42c3a3ab8d6d2d9254fd04', '', '', 'NG', 'beauty', '["beauty","lifestyle"]', '', 'user', 1, 'local', 'AMAKA002', 'seed-user-demo', '2026-08-02T09:00:00.000Z', '2026-08-02T09:00:00.000Z'),
('seed-user-3', 'John Dada', 'john@example.com', 'pbkdf2-sha256$100000$61f18375b336720e541e73584d81d821$ba7dd3e15c0f4b6ee234bf5ea872c36f1d0becdcad42c3a3ab8d6d2d9254fd04', '', '', 'GH', 'finance', '["finance"]', '', 'user', 1, 'local', 'JOHND003', NULL, '2026-08-03T09:00:00.000Z', '2026-08-03T09:00:00.000Z');

INSERT INTO products (_id, title, description, price, currency, commission, category, tags, image, gallery, vendor, cookie_days, why_promote, swipe_copy, is_active, created_at, updated_at) VALUES
('seed-product-forex', 'Premium Forex Trading Course', 'Complete forex trading course for beginners to advanced traders. Learn strategies, risk management and live trading.', 150000, 'NGN', 45, 'Digital', '["forex","course","trading"]', 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&h=600&fit=crop', '["https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=900&h=600&fit=crop"]', 'Affiliate Hub', 30, '["High conversion rate","30-day cookie","Recurring upsells"]', '🔥 Master forex trading today — earn huge commissions', 1, '2026-08-01T09:00:00.000Z', '2026-08-01T09:00:00.000Z'),
('seed-product-watch', 'Smart Fitness Watch Pro', 'Advanced fitness tracker with heart rate monitoring, GPS and 7-day battery life.', 45000, 'NGN', 25, 'Tech', '["fitness","watch","wearable"]', 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=600&fit=crop', '["https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=900&h=600&fit=crop"]', 'Affiliate Hub', 30, '["High demand niche","Strong margins","Great gift item"]', '⌚ The Smart Fitness Watch Pro — track everything, earn on every sale', 1, '2026-08-01T09:00:00.000Z', '2026-08-01T09:00:00.000Z'),
('seed-product-skincare', 'Organic Skincare Set', 'Complete organic skincare routine with natural ingredients for all skin types.', 28000, 'NGN', 30, 'Beauty', '["skincare","organic","beauty"]', 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=600&h=600&fit=crop', '[]', 'Affiliate Hub', 30, '["Repeat purchases","Natural ingredients","Trusted brand"]', '✨ Organic Skincare Set — glow up and earn with every order', 1, '2026-08-01T09:00:00.000Z', '2026-08-01T09:00:00.000Z'),
('seed-product-crypto', 'Crypto Mastermind Ebook', 'Step-by-step crypto investing playbook for absolute beginners.', 12000, 'NGN', 60, 'Digital', '["crypto","ebook","investing"]', 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=600&h=600&fit=crop', '[]', 'Affiliate Hub', 90, '["60% commission","Instant delivery","90-day cookie"]', '🚀 Crypto Mastermind — start your investing journey today', 1, '2026-08-01T09:00:00.000Z', '2026-08-01T09:00:00.000Z'),
('seed-product-headphones', 'Wireless Noise-Cancelling Headphones', 'Studio-grade audio with 40h battery life and active noise cancellation.', 89000, 'NGN', 18, 'Tech', '["audio","headphones","wireless"]', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=600&fit=crop', '[]', 'Affiliate Hub', 30, '["Premium price point","Long battery life","Popular gift"]', '🎧 Wireless Noise-Cancelling Headphones — high ticket, high commission', 1, '2026-08-01T09:00:00.000Z', '2026-08-01T09:00:00.000Z'),
('seed-product-yoga', 'Yoga & Wellness Program', '12-week guided yoga and wellness program with video lessons.', 35000, 'NGN', 40, 'Health', '["yoga","wellness","fitness"]', 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&h=600&fit=crop', '[]', 'Affiliate Hub', 45, '["Subscriptions","High repeat rates","Video content"]', '🧘 12-week Yoga & Wellness Program — feel better, earn more', 1, '2026-08-01T09:00:00.000Z', '2026-08-01T09:00:00.000Z');

-- Demo affiliate links + analytics
INSERT INTO affiliate_links (_id, user, product, code, clicks, conversions, earnings, created_at, updated_at) VALUES
('seed-link-1', 'seed-user-demo', 'seed-product-forex', 'demoForex01', 86, 3, 202500, '2026-08-01T09:00:00.000Z', '2026-08-20T09:00:00.000Z'),
('seed-link-2', 'seed-user-demo', 'seed-product-watch', 'demoWatch01', 41, 1, 11250, '2026-08-05T09:00:00.000Z', '2026-08-20T09:00:00.000Z'),
('seed-link-3', 'seed-user-2', 'seed-product-skincare', 'amakaSkincare', 28, 2, 16800, '2026-08-06T09:00:00.000Z', '2026-08-20T09:00:00.000Z'),
('seed-link-4', 'seed-user-3', 'seed-product-crypto', 'johnCrypto01', 55, 4, 28800, '2026-08-07T09:00:00.000Z', '2026-08-20T09:00:00.000Z');

-- Click + conversion events for the last 14 days (chart data)
INSERT INTO affiliate_events (_id, link, user, product, type, amount, event_key, created_at) VALUES
('ev-c-01', 'seed-link-1', 'seed-user-demo', 'seed-product-forex', 'click', 0, 'seed-c1', '2026-08-16T10:00:00.000Z'),
('ev-c-02', 'seed-link-1', 'seed-user-demo', 'seed-product-forex', 'click', 0, 'seed-c2', '2026-08-16T14:00:00.000Z'),
('ev-c-03', 'seed-link-1', 'seed-user-demo', 'seed-product-forex', 'click', 0, 'seed-c3', '2026-08-17T09:00:00.000Z'),
('ev-c-04', 'seed-link-4', 'seed-user-3', 'seed-product-crypto', 'click', 0, 'seed-c4', '2026-08-17T11:00:00.000Z'),
('ev-c-05', 'seed-link-1', 'seed-user-demo', 'seed-product-forex', 'click', 0, 'seed-c5', '2026-08-18T10:30:00.000Z'),
('ev-c-06', 'seed-link-2', 'seed-user-demo', 'seed-product-watch', 'click', 0, 'seed-c6', '2026-08-18T15:00:00.000Z'),
('ev-c-07', 'seed-link-3', 'seed-user-2', 'seed-product-skincare', 'click', 0, 'seed-c7', '2026-08-19T09:00:00.000Z'),
('ev-c-08', 'seed-link-1', 'seed-user-demo', 'seed-product-forex', 'click', 0, 'seed-c8', '2026-08-19T12:00:00.000Z'),
('ev-c-09', 'seed-link-4', 'seed-user-3', 'seed-product-crypto', 'click', 0, 'seed-c9', '2026-08-19T18:00:00.000Z'),
('ev-c-10', 'seed-link-1', 'seed-user-demo', 'seed-product-forex', 'click', 0, 'seed-c10', '2026-08-20T08:00:00.000Z'),
('ev-c-11', 'seed-link-2', 'seed-user-demo', 'seed-product-watch', 'click', 0, 'seed-c11', '2026-08-20T16:00:00.000Z'),
('ev-s-01', 'seed-link-1', 'seed-user-demo', 'seed-product-forex', 'conversion', 67500, 'seed-s1', '2026-08-17T11:30:00.000Z'),
('ev-s-02', 'seed-link-1', 'seed-user-demo', 'seed-product-forex', 'conversion', 67500, 'seed-s2', '2026-08-18T13:00:00.000Z'),
('ev-s-03', 'seed-link-1', 'seed-user-demo', 'seed-product-forex', 'conversion', 67500, 'seed-s3', '2026-08-20T09:30:00.000Z'),
('ev-s-04', 'seed-link-2', 'seed-user-demo', 'seed-product-watch', 'conversion', 11250, 'seed-s4', '2026-08-19T10:00:00.000Z'),
('ev-s-05', 'seed-link-3', 'seed-user-2', 'seed-product-skincare', 'conversion', 8400, 'seed-s5', '2026-08-19T14:00:00.000Z'),
('ev-s-06', 'seed-link-4', 'seed-user-3', 'seed-product-crypto', 'conversion', 7200, 'seed-s6', '2026-08-19T17:00:00.000Z'),
('ev-s-07', 'seed-link-4', 'seed-user-3', 'seed-product-crypto', 'conversion', 7200, 'seed-s7', '2026-08-20T11:00:00.000Z'),
('ev-s-08', 'seed-link-3', 'seed-user-2', 'seed-product-skincare', 'conversion', 8400, 'seed-s8', '2026-08-20T13:00:00.000Z');

INSERT INTO transactions (_id, user, type, direction, amount, currency, status, description, reference, meta, created_at, updated_at) VALUES
('seed-tx-1', 'seed-user-demo', 'commission', 'credit', 67500, 'NGN', 'completed', 'Commission for Premium Forex Trading Course', 'demoForex01', '{}', '2026-08-17T11:30:00.000Z', '2026-08-17T11:30:00.000Z'),
('seed-tx-2', 'seed-user-demo', 'commission', 'credit', 67500, 'NGN', 'completed', 'Commission for Premium Forex Trading Course', 'demoForex01', '{}', '2026-08-18T13:00:00.000Z', '2026-08-18T13:00:00.000Z'),
('seed-tx-3', 'seed-user-2', 'commission', 'credit', 8400, 'NGN', 'completed', 'Commission for Organic Skincare Set', 'amakaSkincare', '{}', '2026-08-19T14:00:00.000Z', '2026-08-19T14:00:00.000Z'),
('seed-tx-4', 'seed-user-demo', 'commission', 'credit', 11250, 'NGN', 'completed', 'Commission for Smart Fitness Watch Pro', 'demoWatch01', '{}', '2026-08-19T10:00:00.000Z', '2026-08-19T10:00:00.000Z'),
('seed-tx-5', 'seed-user-3', 'commission', 'credit', 7200, 'NGN', 'completed', 'Commission for Crypto Mastermind Ebook', 'johnCrypto01', '{}', '2026-08-19T17:00:00.000Z', '2026-08-19T17:00:00.000Z'),
('seed-tx-6', 'seed-user-demo', 'commission', 'credit', 67500, 'NGN', 'completed', 'Commission for Premium Forex Trading Course', 'demoForex01', '{}', '2026-08-20T09:30:00.000Z', '2026-08-20T09:30:00.000Z'),
('seed-tx-7', 'seed-user-3', 'commission', 'credit', 7200, 'NGN', 'completed', 'Commission for Crypto Mastermind Ebook', 'johnCrypto01', '{}', '2026-08-20T11:00:00.000Z', '2026-08-20T11:00:00.000Z'),
('seed-tx-8', 'seed-user-2', 'commission', 'credit', 8400, 'NGN', 'completed', 'Commission for Organic Skincare Set', 'amakaSkincare', '{}', '2026-08-20T13:00:00.000Z', '2026-08-20T13:00:00.000Z'),
('seed-tx-9', 'seed-user-demo', 'withdrawal', 'debit', 50000, 'NGN', 'completed', 'Withdrawal via bank', NULL, '{}', '2026-08-15T09:00:00.000Z', '2026-08-16T09:00:00.000Z');

INSERT INTO withdrawals (_id, user, amount, currency, method, details, status, transaction_id, created_at, updated_at) VALUES
('seed-wd-1', 'seed-user-demo', 50000, 'NGN', 'bank', '{"bankName":"GTBank","accountName":"Chinedu Nwankwo","accountNumber":"0123456789"}', 'completed', 'seed-tx-9', '2026-08-15T09:00:00.000Z', '2026-08-16T09:00:00.000Z');

INSERT INTO bank_details (_id, user, bank_name, account_name, account_number, usdt_address, paypal_email, created_at, updated_at) VALUES
('seed-bank-1', 'seed-user-demo', 'GTBank', 'Chinedu Nwankwo', '0123456789', '', 'demo@affiliatehub.com', '2026-08-10T09:00:00.000Z', '2026-08-10T09:00:00.000Z');

INSERT INTO notifications (_id, user, type, title, message, icon, link, read, meta, created_at, updated_at) VALUES
('seed-n-1', 'seed-user-demo', 'sale', '🎉 You made a sale!', '+₦67,500 from Premium Forex Trading Course', '💰', '/wallet', 0, '{}', '2026-08-20T09:30:00.000Z', '2026-08-20T09:30:00.000Z'),
('seed-n-2', 'seed-user-demo', 'achievement', 'Achievement unlocked: Hot Streak', 'Hit 10 commissions.', '🔥', '/achievements', 0, '{}', '2026-08-19T10:00:00.000Z', '2026-08-19T10:00:00.000Z'),
('seed-n-3', 'seed-user-demo', 'system', 'Welcome to Affiliate Hub', 'Complete your profile to unlock more features.', '👋', '/profile', 1, '{}', '2026-08-01T09:00:00.000Z', '2026-08-01T09:00:00.000Z');

INSERT INTO achievements (_id, user, code, title, description, icon, progress, target, unlocked_at, created_at, updated_at) VALUES
('seed-a-1', 'seed-user-demo', 'first_sale', 'First Sale!', 'Make your first commission.', '🎉', 1, 1, '2026-08-17T11:30:00.000Z', '2026-08-17T11:30:00.000Z', '2026-08-17T11:30:00.000Z'),
('seed-a-2', 'seed-user-demo', 'ten_sales', 'Hot Streak', 'Hit 10 commissions.', '🔥', 2, 10, NULL, '2026-08-17T11:30:00.000Z', '2026-08-17T11:30:00.000Z'),
('seed-a-3', 'seed-user-demo', 'first_link', 'Link Master', 'Generate your first affiliate link.', '🔗', 2, 1, '2026-08-01T09:00:00.000Z', '2026-08-01T09:00:00.000Z', '2026-08-01T09:00:00.000Z'),
('seed-a-4', 'seed-user-demo', 'first_payout', 'Cashed Out', 'Request your first payout.', '💰', 1, 1, '2026-08-15T09:00:00.000Z', '2026-08-15T09:00:00.000Z', '2026-08-15T09:00:00.000Z');

INSERT INTO streaks (_id, user, current, longest, last_active_date, created_at, updated_at) VALUES
('seed-st-1', 'seed-user-demo', 6, 6, '2026-08-20', '2026-08-15T09:00:00.000Z', '2026-08-20T09:30:00.000Z');

INSERT INTO referrals (_id, referrer, referred, code, status, reward_amount, created_at, updated_at) VALUES
('seed-ref-1', 'seed-user-demo', 'seed-user-2', 'AMAKA002', 'pending', 0, '2026-08-02T09:00:00.000Z', '2026-08-02T09:00:00.000Z');
