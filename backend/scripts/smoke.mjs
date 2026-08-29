#!/usr/bin/env node
/* eslint-disable no-console */
// End-to-end smoke test for the Cloudflare Workers API.
// Requires `wrangler dev --local` running on http://localhost:8787.
// Run: node scripts/smoke.mjs

const BASE = process.env.API_BASE_URL || 'http://localhost:8787';
const WH_SECRET = 'local-webhook-secret';

let passed = 0;
const failures = [];
let requestCount = 0;

function ok(label, cond, extra) {
  requestCount++;
  if (cond) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failures.push(label);
    console.error(`  ❌ ${label}${extra ? ` — ${JSON.stringify(extra)}` : ''}`);
  }
}

async function req(method, path, { token, body, headers = {} } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    redirect: 'manual',
  });
  let data = null;
  const text = await res.text();
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data, headers: res.headers };
}

const section = (label) => console.log(`\n▶ ${label}`);

// ---------- helpers ----------
let demoToken = '';
let adminToken = '';
let productId = '';

section('Health & public endpoints');
{
  const r = await req('GET', '/health');
  ok('GET /health => 200', r.status === 200 && r.data.status === 'ok', r.data);

  const list = await req('GET', '/api/v1/products?limit=5');
  ok('GET /products => 200 + items', list.status === 200 && Array.isArray(list.data.items) && list.data.items.length > 0, list.data);
  productId = list.data.items[0]?._id;
  ok('products carry commissionAmount', typeof list.data.items[0]?.commissionAmount === 'number');

  const search = await req('GET', `/api/v1/products/search?q=${encodeURIComponent('forex')}`);
  ok('GET /products/search => 200', search.status === 200 && search.data.items.length >= 1);

  const cats = await req('GET', '/api/v1/products/categories');
  ok('GET /products/categories => 200', cats.status === 200 && cats.data.includes('Tech') || cats.data.includes('Digital'), cats.data);

  const detail = await req('GET', `/api/v1/products/${productId}`);
  ok('GET /products/:id => 200', detail.status === 200 && detail.data._id === productId);
}

section('Auth: login, me, signup');
{
  const login = await req('POST', '/api/v1/auth/login', { body: { email: 'demo@affiliatehub.com', password: 'password123' } });
  ok('demo login => 200 + token', login.status === 200 && !!login.data.token, login.data);
  demoToken = login.data.token;

  const bad = await req('POST', '/api/v1/auth/login', { body: { email: 'demo@affiliatehub.com', password: 'wrong' } });
  ok('wrong password => 401', bad.status === 401, bad.data);

  const me = await req('GET', '/api/v1/auth/me', { token: demoToken });
  ok('GET /auth/me => 200', me.status === 200 && me.data.user.email === 'demo@affiliatehub.com');

  const noAuth = await req('GET', '/api/v1/auth/me');
  ok('auth required => 401', noAuth.status === 401);

  const email = `smoke_${Date.now()}@test.com`;
  const su = await req('POST', '/api/v1/auth/signup', { body: { name: 'Smoke User', email, password: 'password123', referralCode: 'DEMO1234' } });
  ok('signup => 201 + token + referralCode', su.status === 201 && !!su.data.token && !!su.data.user.referralCode, su.data);
  ok('signup applied referral', su.data.user.referredBy === 'seed-user-demo', su.data.user.referredBy);

  const dup = await req('POST', '/api/v1/auth/signup', { body: { name: 'Dup', email, password: 'password123' } });
  ok('duplicate email => 409', dup.status === 409, dup.data);
}

section('Admin: login, metrics, CRUD');
{
  const login = await req('POST', '/api/v1/auth/login', { body: { email: 'admin@affiliatehub.com', password: 'admin1234' } });
  ok('admin login => 200', login.status === 200 && !!login.data.token, login.data);
  adminToken = login.data.token;

  const metrics = await req('GET', '/api/v1/admin/metrics', { token: adminToken });
  ok('admin metrics => 200', metrics.status === 200 && metrics.data.users >= 3, metrics.data);

  const forbidden = await req('GET', '/api/v1/admin/metrics', { token: demoToken });
  ok('non-admin blocked => 403', forbidden.status === 403);

  const prod = await req('POST', '/api/v1/admin/products', {
    token: adminToken,
    body: { title: 'Smoke Product', description: 'test', price: 50000, commission: 30, category: 'Digital', image: 'https://placehold.co/600' },
  });
  ok('admin create product => 201', prod.status === 201 && prod.data.price === 50000, prod.data);
  const smokeProductId = prod.data._id;

  const upd = await req('PUT', `/api/v1/admin/products/${smokeProductId}`, { token: adminToken, body: { commission: 40 } });
  ok('admin update product', upd.status === 200 && upd.data.commission === 40, upd.data);

  const del = await req('DELETE', `/api/v1/admin/products/${smokeProductId}`, { token: adminToken });
  ok('admin delete product (soft)', del.status === 200 && del.data.deactivated === true, del.data);
}

section('Affiliate: links, redirect, conversion');
{
  const gen = await req('POST', '/api/v1/affiliate/generate-link', { token: demoToken, body: { productId } });
  ok('generate link => 201', gen.status === 201 && !!gen.data.link.code && !!gen.data.link.url, gen.data);
  const code = gen.data.link.code;

  const gen2 = await req('POST', '/api/v1/affiliate/generate-link', { token: demoToken, body: { productId } });
  ok('generate is idempotent per product', gen2.status === 201 && gen2.data.link.code === code);

  const links = await req('GET', '/api/v1/affiliate/links', { token: demoToken });
  ok('list links => 200', links.status === 200 && links.data.items.length >= 1);

  const resolve = await req('GET', `/api/v1/affiliate/r/${code}`);
  ok('resolve /r/:code => JSON url', resolve.status === 200 && typeof resolve.data.url === 'string', resolve.data);

  const direct = await req('GET', `/r/${code}`);
  ok('direct /r/:code => 302', direct.status === 302, { status: direct.status, location: direct.headers.get('location') });

  const noSecret = await req('POST', `/api/v1/affiliate/r/${code}/convert`, { body: { eventId: 'e1' } });
  ok('convert w/o secret => 403', noSecret.status === 403, noSecret.data);

  const conv = await req('POST', `/api/v1/affiliate/r/${code}/convert`, {
    body: { eventId: `smoke-${Date.now()}` },
    headers: { 'x-affiliate-wh-secret': WH_SECRET },
  });
  ok('convert with secret => 200 + earned > 0', conv.status === 200 && conv.data.earned > 0, conv.data);

  const conv2 = await req('POST', `/api/v1/affiliate/r/${code}/convert`, {
    body: { eventId: 'smoke-dup' },
    headers: { 'x-affiliate-wh-secret': WH_SECRET },
  });
  const conv3 = await req('POST', `/api/v1/affiliate/r/${code}/convert`, {
    body: { eventId: 'smoke-dup' },
    headers: { 'x-affiliate-wh-secret': WH_SECRET },
  });
  ok('conversion idempotent via eventId', conv2.status === 200 && conv3.status === 200 && conv3.data.duplicate === true);
}

section('Wallet: balance, transactions, withdraw');
{
  const bal = await req('GET', '/api/v1/wallet/balance', { token: demoToken });
  ok('balance => 200 + ngn/usd', bal.status === 200 && typeof bal.data.ngnBalance === 'number' && typeof bal.data.usdBalance === 'number', bal.data);

  const txs = await req('GET', '/api/v1/wallet/transactions', { token: demoToken });
  ok('transactions => 200', txs.status === 200 && Array.isArray(txs.data.items));

  const methods = await req('GET', '/api/v1/wallet/withdraw-methods');
  ok('withdraw-methods public + time field', methods.status === 200 && methods.data[0].time, methods.data);

  const badDetails = await req('POST', '/api/v1/wallet/withdraw', {
    token: demoToken,
    body: { amount: 2000, method: 'bank', details: { bankName: 'GTB' } },
  });
  ok('withdraw invalid details => 400', badDetails.status === 400, badDetails.data);

  const low = await req('POST', '/api/v1/wallet/withdraw', {
    token: demoToken,
    body: { amount: 500, method: 'bank', details: { bankName: 'GTBank', accountName: 'Chinedu', accountNumber: '0123456789' } },
  });
  ok('withdraw below method min => 400', low.status === 400, low.data);

  const wd = await req('POST', '/api/v1/wallet/withdraw', {
    token: demoToken,
    body: { amount: 10000, method: 'bank', details: { bankName: 'GTBank', accountName: 'Chinedu Nwankwo', accountNumber: '0123456789' } },
  });
  ok('withdraw => 201 + pending', wd.status === 201 && wd.data.withdrawal.status === 'pending', wd.data);
  const withdrawalId = wd.data.withdrawal._id;

  // Locked funds: second withdrawal should be blocked if it exceeds available.
  const bal2 = await req('GET', '/api/v1/wallet/balance', { token: demoToken });
  ok('balance exposes locked', typeof bal2.data.locked === 'number' && bal2.data.locked >= 10000, bal2.data);

  // Admin completes the withdrawal.
  const done = await req('PUT', `/api/v1/admin/withdrawals/${withdrawalId}`, { token: adminToken, body: { status: 'completed' } });
  ok('admin completes withdrawal => 200', done.status === 200 && done.data.withdrawal.status === 'completed', done.data);

  const again = await req('PUT', `/api/v1/admin/withdrawals/${withdrawalId}`, { token: adminToken, body: { status: 'failed' } });
  ok('terminal withdrawal cannot be reverted', again.status === 400, again.data);
}

section('Stats: dashboard, performance, leaderboard');
{
  const dash = await req('GET', '/api/v1/stats/dashboard', { token: demoToken });
  ok('dashboard => 200', dash.status === 200 && typeof dash.data.totalClicks === 'number', dash.data);

  const perf = await req('GET', '/api/v1/stats/performance?period=7d', { token: demoToken });
  ok('performance => 7 points with clicks', perf.status === 200 && perf.data.points.length === 7 && perf.data.points.some((p) => p.clicks > 0), perf.data.points);

  const lb = await req('GET', '/api/v1/stats/leaderboard?limit=5');
  ok('leaderboard => 200', lb.status === 200 && Array.isArray(lb.data) && lb.data[0]?.rank === 1, lb.data);
}

section('Profile: get, update, bank, security');
{
  // Reset the demo bank row so this section is idempotent across runs.
  await req('PUT', '/api/v1/profile/bank-details', {
    token: demoToken,
    body: { bankName: 'GTBank', accountName: 'Chinedu Nwankwo', accountNumber: '0123456789', paypalEmail: 'demo@affiliatehub.com' },
  });
  const get = await req('GET', '/api/v1/profile', { token: demoToken });
  ok('profile get => 200 + bank', get.status === 200 && get.data.bank?.bankName === 'GTBank', get.data);

  const upd = await req('PUT', '/api/v1/profile/update', { token: demoToken, body: { name: 'Chinedu N. Updated', whatsapp: '+2348000000000' } });
  ok('profile update', upd.status === 200 && upd.data.user.name === 'Chinedu N. Updated', upd.data);

  const bank = await req('PUT', '/api/v1/profile/bank-details', { token: demoToken, body: { bankName: 'Access Bank', accountNumber: '0987654321', paypalEmail: 'demo@affiliatehub.com' } });
  ok('bank details upsert', bank.status === 200 && bank.data.bank.bankName === 'Access Bank', bank.data);

  // Use a dedicated user so we never mutate seed credentials.
  const email2 = `pwd_${Date.now()}@test.com`;
  const pwUser = await req('POST', '/api/v1/auth/signup', { body: { name: 'Pw User', email: email2, password: 'password123' } });
  const pwToken = pwUser.data.token;

  const badPw = await req('PUT', '/api/v1/profile/security', { token: pwToken, body: { currentPassword: 'wrong', newPassword: 'newpass123' } });
  ok('security wrong current pw => 401', badPw.status === 401, badPw.data);

  const pw = await req('PUT', '/api/v1/profile/security', { token: pwToken, body: { currentPassword: 'password123', newPassword: 'newpass123' } });
  ok('password change => 200', pw.status === 200, pw.data);

  const relogin = await req('POST', '/api/v1/auth/login', { body: { email: email2, password: 'newpass123' } });
  ok('login with new password', relogin.status === 200 && !!relogin.data.token, relogin.data);
}

section('Engagement: notifications, achievements, streak');
{
  const notifs = await req('GET', '/api/v1/notifications', { token: demoToken });
  ok('notifications => 200', notifs.status === 200 && Array.isArray(notifs.data.items) && notifs.data.unread > 0, notifs.data);

  const nid = notifs.data.items.find((n) => !n.read)?._id;
  const mark = await req('PUT', `/api/v1/notifications/${nid}/read`, { token: demoToken });
  ok('mark read => 200', mark.status === 200 && mark.data.notification.read === true, mark.data);

  const all = await req('PUT', '/api/v1/notifications/read-all', { token: demoToken });
  ok('mark all read => 200', all.status === 200);

  const ach = await req('GET', '/api/v1/achievements', { token: demoToken });
  ok('achievements => 200', ach.status === 200 && ach.data.items.length > 0, ach.data);
  ok('first_sale unlocked', ach.data.items.find((a) => a.code === 'first_sale')?.unlocked === true);

  const streak = await req('GET', '/api/v1/achievements/streak', { token: demoToken });
  ok('streak => 200 + current >= 1', streak.status === 200 && streak.data.current >= 1, streak.data);
}

section('Referrals & support');
{
  const ref = await req('GET', '/api/v1/referrals/me', { token: demoToken });
  ok('referrals me => 200 + code + link', ref.status === 200 && !!ref.data.code && ref.data.link.startsWith('http'), ref.data);

  const email2 = `ref_${Date.now()}@test.com`;
  const refUser = await req('POST', '/api/v1/auth/signup', { body: { name: 'Ref Target', email: email2, password: 'password123' } });
  const applyRes = await req('POST', '/api/v1/referrals/apply', { token: refUser.data.token, body: { code: ref.data.code } });
  ok('referral apply => ok', applyRes.status === 200 && applyRes.data.ok === true, applyRes.data);
  const applyAgain = await req('POST', '/api/v1/referrals/apply', { token: refUser.data.token, body: { code: ref.data.code } });
  ok('referral apply blocked when already referred', applyAgain.status === 200 && applyAgain.data.ok === false, applyAgain.data);
  const selfApply = await req('POST', '/api/v1/referrals/apply', { token: demoToken, body: { code: ref.data.code } });
  ok('self referral blocked', selfApply.status === 200 && selfApply.data.ok === false, selfApply.data);

  const ticket = await req('POST', '/api/v1/support/tickets', { token: demoToken, body: { subject: 'Bug report', message: 'Something broke' } });
  ok('support ticket => 201', ticket.status === 201 && ticket.data.ticket.status === 'open', ticket.data);

  const adminTickets = await req('GET', '/api/v1/admin/tickets', { token: adminToken });
  ok('admin tickets => 200', adminTickets.status === 200 && adminTickets.data.items.length >= 1, adminTickets.data);

  const resolve = await req('PATCH', `/api/v1/admin/tickets/${ticket.data.ticket._id}`, { token: adminToken, body: { status: 'resolved' } });
  ok('admin resolve ticket', resolve.status === 200);
}

section('Cleanup: remove smoke user (admin)');
{
  const users = await req('GET', '/api/v1/admin/users?limit=100', { token: adminToken });
  const smoke = users.data.items.find((u) => u.email.startsWith('smoke_'));
  if (smoke) {
    const del = await req('DELETE', `/api/v1/admin/users/${smoke._id}`, { token: adminToken });
    ok('admin delete user => 200', del.status === 200, del.data);
  } else {
    ok('smoke user found for cleanup', false, users.data.items.map((u) => u.email));
  }
}

console.log(`\n${passed}/${requestCount} assertions passed${failures.length ? ` — ${failures.length} FAILED` : ' — ALL PASSED'}`);
if (failures.length) process.exit(1);
