# Affiliate Hub API — Cloudflare Workers + D1

Serverless API for Affiliate Hub, built with **Hono** on **Cloudflare Workers** and **D1** (SQLite).
Deployable in seconds, zero servers to maintain, globally distributed.

## Stack
- [Hono](https://hono.dev) — Web-standard router/middleware (CORS, JWT, validation via Zod)
- [Cloudflare Workers](https://workers.cloudflare.com/) — edge runtime
- [D1](https://developers.cloudflare.com/d1/) — SQLite at the edge
- PBKDF2-SHA256 password hashing via WebCrypto (no native deps)
- HS256 JWTs (`hono/jwt`), rate-limited auth routes

## Quick start (local)

```bash
cd backend
npm install
cp .dev.vars.example .dev.vars        # fill in JWT_SECRET at minimum

# 1) create the D1 database on Cloudflare (one time)
npx wrangler d1 create affiliate-hub
#    → copy the printed database_id into wrangler.toml

# 2) create + seed local tables
npm run db:local:init
npm run db:local:seed

# 3) run the API
npm run dev                            # http://localhost:8787
```

Demo accounts (seeded):
- `demo@affiliatehub.com` / `password123` (affiliate)
- `admin@affiliatehub.com` / `admin1234` (admin)

Smoke-test the running API:

```bash
node scripts/smoke.mjs                 # 59 assertions
```

## Deploy to Cloudflare (production)

```bash
cd backend

# One-time database setup
npx wrangler d1 create affiliate-hub
# paste database_id into wrangler.toml

# Migrations (apply to remote D1)
npm run db:init
npm run db:seed                        # optional demo data

# Secrets — never commit these
npx wrangler secret put JWT_SECRET
npx wrangler secret put CORS_ORIGIN            # e.g. https://your-app.vercel.app
npx wrangler secret put PUBLIC_FRONTEND_URL    # your Vercel URL
npx wrangler secret put PUBLIC_API_URL         # e.g. https://affiliate-hub-api.<account>.workers.dev
npx wrangler secret put AFFILIATE_WEBHOOK_SECRET   # protects the conversion webhook
# Optional OAuth
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put APPLE_CLIENT_ID
npx wrangler secret put APPLE_CLIENT_SECRET

# Deploy
npm run deploy
```

Then set `VITE_API_BASE_URL` on Vercel to `https://<your-worker>.workers.dev/api/v1` and redeploy the frontend.
(CI: `.github/workflows/backend-deploy.yml` deploys automatically on pushes to `main` that touch `backend/`.)

## API overview

All routes are prefixed with `/api/v1` (short-link redirects live at `/r/:code`).

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/signup`, `POST /auth/login`, `GET /auth/me`, `POST /auth/onboarding`, `GET /auth/oauth/{google\|apple}[/callback]` |
| Products | `GET /products`, `GET /products/search?q=`, `GET /products/categories`, `GET /products/:id` |
| Affiliate | `GET /affiliate/links`, `POST /affiliate/generate-link`, `GET /affiliate/assets?productId=`, `GET /affiliate/r/:code` (JSON), `GET /r/:code` (302), `POST /affiliate/r/:code/convert` (webhook) |
| Wallet | `GET /wallet/balance`, `GET /wallet/transactions`, `GET /wallet/withdraw-methods`, `POST /wallet/withdraw` |
| Stats | `GET /stats/dashboard`, `GET /stats/performance?period=`, `GET /stats/leaderboard` |
| Profile | `GET /profile`, `PUT /profile/update`, `PUT /profile/bank-details`, `PUT /profile/security` |
| Engagement | `GET /notifications`, `PUT /notifications/:id/read`, `PUT /notifications/read-all`, `DELETE /notifications/:id`, `GET /achievements`, `GET /achievements/streak` |
| Referrals | `GET /referrals/me`, `POST /referrals/apply` |
| Support | `POST /support/tickets` |
| Admin | `GET/PUT/DELETE /admin/users`, `POST/PUT/DELETE /admin/products`, `GET/PUT /admin/withdrawals`, `GET /admin/metrics`, `GET/PATCH /admin/tickets` |

### Conversion webhook (vendor integration)

`POST /api/v1/affiliate/r/:code/convert` requires the `AFFILIATE_WEBHOOK_SECRET` header value in
`x-affiliate-wh-secret` (or `x-webhook-secret`). The JSON body **must** include
`{ "eventId": "<unique id>" }` — `eventId` is required so duplicate events (retries) are ignored and
affiliates are never double-credited. The vendor should capture the `ref` query param (the affiliate
code) from the redirected URL and use it as the `:code` in this endpoint.

## Notes
- Withdrawals debit the wallet only when completed; in-flight withdrawals lock the balance so users can't over-withdraw.
- Product deletes are soft (deactivate); historical affiliate links keep resolving.
- The wallet accrues by **completed** credit transactions; `pending` shows the unsettled amount.
