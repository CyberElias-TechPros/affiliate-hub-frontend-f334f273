# Affiliate Hub

Affiliate marketing platform: affiliates generate tracking links, promote products, and get paid via bank transfer, USDT, or PayPal. Admins manage products, users, withdrawals, and support tickets.

## Architecture

| Layer   | Stack                                                               | Target host        |
|---------|---------------------------------------------------------------------|--------------------|
| Frontend| Vite + React 18 + TypeScript + shadcn/ui + TanStack Query + RR v7 | **Vercel**          |
| Backend | Hono (Web-standard) on **Cloudflare Workers** + **D1** (SQLite), Zod validation, HS256 JWTs, WebCrypto (PBKDF2 password hashing, RS256 OIDC id_token verification) | **Cloudflare** |

There is **no Node/Express server and no MongoDB** anywhere — the backend runs entirely on Cloudflare's edge (see [backend/README.md](backend/README.md) for the full API docs).

## Local development

You need Node.js 20+ and npm.

```bash
# 1) Frontend
npm install
npm run dev            # http://localhost:8080 (proxies /api → :8787)

# 2) Backend (separate terminal)
cd backend
npm install
cp .dev.vars.example .dev.vars    # fill in JWT_SECRET (required)
npm run db:local:init             # create local D1 tables
npm run db:local:seed             # demo products/users (optional)
npm run dev                       # http://localhost:8787
```

Demo accounts (seeded):

- `demo@affiliatehub.com` / `password123` (affiliate)
- `admin@affiliatehub.com` / `admin1234` (admin)

Smoke-test the API (59 assertions, requires the worker running):

```bash
cd backend && node scripts/smoke.mjs
```

## Deployment

### Backend → Cloudflare Workers + D1

1. `cd backend && npx wrangler d1 create affiliate-hub` and paste the printed `database_id` into `wrangler.toml`.
2. Apply schema + seed (optional): `npm run db:init`, `npm run db:seed`.
3. Set secrets: `npx wrangler secret put JWT_SECRET`, plus `CORS_ORIGIN`, `PUBLIC_FRONTEND_URL`, `PUBLIC_API_URL`, `AFFILIATE_WEBHOOK_SECRET` (see [backend/README.md](backend/README.md)).
4. `npm run deploy` (or push to `main` — `.github/workflows/backend-deploy.yml` deploys automatically when `backend/` changes).

### Frontend → Vercel

Import this repo in Vercel (framework: Vite). Set the environment variable:

- `VITE_API_BASE_URL` → your deployed worker, e.g. `https://affiliate-hub-api.<account>.workers.dev/api/v1`

`vercel.json` rewrites all non-`api/` paths to `index.html` for client-side routing, so OAuth callbacks and `/r/:code` deep links work.

> Do **not** set `VITE_API_BASE_URL` to a relative `/api/v1` in production — Vercel has no proxy to your Worker. (It is only used by the local Vite dev proxy.)

## Feature highlights

- Auth: email/password (PBKDF2), Google/Apple Sign-in via full OAuth code flow (RS256 id_token verification against provider JWKS, issuer + audience checks).
- Affiliate short links (`/r/:code`) with click/conversion analytics and a secret-protected, idempotent conversion webhook (`eventId` required).
- Wallet: NGN + USD balances, pending/locked funds, withdrawal flow (bank/USDT/PayPal) with per-method validation, fees, and admin review.
- Dashboard/stats: clicks, conversions, conversion rate, monthly earnings vs ₦500k goal, 7/30/90-day chart, leaderboard, achievements, streaks.
- Referrals: shareable code/link, referral bonuses (10% of first referee sale), referral list + rewards.
- Support: in-app ticket creation (contact + help pages) and an admin ticket queue.
- AdSense/GA hooks, dark mode, accessible mobile navigation.

## Environment variables (frontend)

| Variable | Purpose | Default |
|---|---|---|
| `VITE_API_BASE_URL` | API base URL (include `/api/v1`) | `/api/v1` (dev proxy) |

Backend environment is configured via `wrangler.toml` `[vars]` + secrets — see [backend/.dev.vars.example](backend/.dev.vars.example) for the full list.
