/* eslint-disable no-console */
// End-to-end smoke test using mongodb-memory-server + supertest.
// Run: node src/utils/smoke.js
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'smoke-test-secret';
process.env.JWT_EXPIRES_IN = '1d';

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const request = require('supertest');

const ok = (label) => console.log(`  ✅ ${label}`);
const section = (label) => console.log(`\n▶ ${label}`);

(async () => {
  const mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();

  await mongoose.connect(process.env.MONGODB_URI);
  const app = require('../app');

  let passed = 0;
  const t = (label, cond) => {
    if (cond) {
      ok(label);
      passed++;
    } else {
      console.error(`  ❌ ${label}`);
      process.exit(1);
    }
  };

  section('Health');
  const health = await request(app).get('/health');
  t('GET /health => 200', health.status === 200 && health.body.status === 'ok');

  section('Auth: signup + login');
  const signup = await request(app)
    .post('/api/v1/auth/signup')
    .send({ name: 'Demo User', email: 'demo@test.com', password: 'password123', country: 'NG' });
  t('signup => 201', signup.status === 201);
  t('signup returns token + user', !!signup.body.token && signup.body.user.email === 'demo@test.com');

  const login = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'demo@test.com', password: 'password123' });
  t('login => 200', login.status === 200 && !!login.body.token);

  const token = login.body.token;
  const auth = (req) => req.set('Authorization', `Bearer ${token}`);

  section('Auth: /me + onboarding');
  const me = await auth(request(app).get('/api/v1/auth/me'));
  t('GET /auth/me => 200', me.status === 200 && me.body.user.email === 'demo@test.com');

  const onboard = await auth(
    request(app)
      .post('/api/v1/auth/onboarding')
      .send({ country: 'NG', niches: ['tech', 'finance'], whatsapp: '+2348012345678' })
  );
  t('onboarding => 200', onboard.status === 200 && onboard.body.user.onboardingComplete === true);

  section('Admin: create product (as admin)');
  // Create an admin via DB, then login
  const User = require('../models/User');
  await User.create({
    name: 'Admin',
    email: 'admin@test.com',
    password: 'admin1234',
    role: 'admin',
  });
  const adminLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'admin@test.com', password: 'admin1234' });
  const adminToken = adminLogin.body.token;
  const adminAuth = (req) => req.set('Authorization', `Bearer ${adminToken}`);

  const createProd = await adminAuth(
    request(app).post('/api/v1/admin/products').send({
      title: 'Test Product',
      description: 'Awesome thing',
      price: 50000,
      commission: 30,
      category: 'Digital',
      image: 'https://placehold.co/600',
      whyPromote: ['High conversion', 'Recurring revenue'],
    })
  );
  t('admin create product => 201', createProd.status === 201);
  const productId = createProd.body._id;

  // Non-admin should be blocked
  const blocked = await auth(
    request(app).post('/api/v1/admin/products').send({ title: 'x', price: 1, commission: 1 })
  );
  t('non-admin create product => 403', blocked.status === 403);

  section('Products: list + detail');
  const products = await request(app).get('/api/v1/products');
  t('GET /products => 200', products.status === 200 && products.body.items.length >= 1);

  const detail = await request(app).get(`/api/v1/products/${productId}`);
  t('GET /products/:id => 200', detail.status === 200 && detail.body.title === 'Test Product');

  section('Affiliate: generate link + simulate conversion');
  const gen = await auth(
    request(app).post('/api/v1/affiliate/generate-link').send({ productId })
  );
  t('generate link => 201', gen.status === 201 && !!gen.body.link.code);
  const code = gen.body.link.code;

  // Click via /r/:code (302)
  const click = await request(app).get(`/r/${code}`);
  t('click /r/:code => 302', click.status === 302);

  // Conversion webhook
  const conv = await request(app).post(`/api/v1/affiliate/r/${code}/convert`);
  t('convert => 200 with earned', conv.status === 200 && conv.body.earned > 0);

  section('Wallet: balance + transactions + withdraw');
  const balance = await auth(request(app).get('/api/v1/wallet/balance'));
  t('balance > 0', balance.status === 200 && balance.body.ngnBalance > 0);

  const txs = await auth(request(app).get('/api/v1/wallet/transactions'));
  t('transactions list', txs.status === 200 && txs.body.items.length > 0);

  const withdraw = await auth(
    request(app)
      .post('/api/v1/wallet/withdraw')
      .send({ amount: 1000, method: 'bank', details: { account: '0123456789', bank: 'GTB' } })
  );
  t('withdraw => 201', withdraw.status === 201);

  section('Engagement: notifications, achievements, streak');
  const notifs = await auth(request(app).get('/api/v1/notifications'));
  t('notifications populated', notifs.status === 200 && notifs.body.items.length > 0);
  t('unread count > 0', notifs.body.unread > 0);

  const ach = await auth(request(app).get('/api/v1/achievements'));
  t('achievements list', ach.status === 200 && ach.body.items.length > 0);
  const firstSale = ach.body.items.find((a) => a.code === 'first_sale');
  t('first_sale unlocked', firstSale?.unlocked === true);

  const streak = await auth(request(app).get('/api/v1/achievements/streak'));
  t('streak >= 1', streak.status === 200 && streak.body.current >= 1);

  section('Stats: dashboard + leaderboard');
  const dash = await auth(request(app).get('/api/v1/stats/dashboard'));
  t('dashboard ok', dash.status === 200 && dash.body.totalEarnings > 0);

  const leaderboard = await request(app).get('/api/v1/stats/leaderboard');
  t('leaderboard ok', leaderboard.status === 200 && Array.isArray(leaderboard.body));

  section('Referrals');
  const refMe = await auth(request(app).get('/api/v1/referrals/me'));
  t('referral code generated', refMe.status === 200 && !!refMe.body.code);

  // New user signs up with referral code
  const refSignup = await request(app)
    .post('/api/v1/auth/signup')
    .send({
      name: 'Referred User',
      email: 'ref@test.com',
      password: 'password123',
      referralCode: refMe.body.code,
    });
  t('referred signup => 201', refSignup.status === 201);

  section('Profile: update + bank details');
  const upd = await auth(
    request(app).put('/api/v1/profile/update').send({ name: 'Updated Name', niche: 'tech' })
  );
  t('profile update', upd.status === 200 && upd.body.user.name === 'Updated Name');

  const bank = await auth(
    request(app).put('/api/v1/profile/bank-details').send({
      bankName: 'GTBank',
      accountName: 'Demo User',
      accountNumber: '0123456789',
    })
  );
  t('bank details upsert', bank.status === 200 && bank.body.bank.bankName === 'GTBank');

  section('Admin: metrics + withdrawal management');
  const metrics = await adminAuth(request(app).get('/api/v1/admin/metrics'));
  t('admin metrics', metrics.status === 200 && metrics.body.users >= 2);

  const wList = await adminAuth(request(app).get('/api/v1/admin/withdrawals'));
  t('admin withdrawals list', wList.status === 200 && wList.body.items.length >= 1);

  const wId = wList.body.items[0]._id;
  const wUpd = await adminAuth(
    request(app).put(`/api/v1/admin/withdrawals/${wId}`).send({ status: 'completed' })
  );
  t('admin withdrawal -> completed', wUpd.status === 200);

  console.log(`\n🎉 ALL ${passed} ASSERTIONS PASSED`);

  await mongoose.disconnect();
  await mongo.stop();
  process.exit(0);
})().catch((err) => {
  console.error('💥 Smoke test failed:', err);
  process.exit(1);
});
