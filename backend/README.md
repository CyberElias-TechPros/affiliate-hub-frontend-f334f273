# Affiliate Hub — Backend (Express + MongoDB)

Production-ready scaffold using Express, Mongoose, JWT auth, and a clean MVC structure.

## Stack
- Node.js + Express 4
- MongoDB via Mongoose 8
- JWT auth (bcryptjs)
- Helmet, CORS, rate limiting, request logging

## Structure
```
backend/
├── src/
│   ├── server.js              # Boot + DB connect
│   ├── app.js                 # Express app + middleware + routes
│   ├── config/db.js           # Mongo connection
│   ├── models/                # Mongoose models
│   │   ├── User.js
│   │   ├── Product.js
│   │   ├── AffiliateLink.js
│   │   ├── Transaction.js
│   │   ├── Withdrawal.js
│   │   └── BankDetails.js
│   ├── controllers/           # Route handlers (business logic)
│   ├── routes/                # Express routers
│   ├── middleware/            # auth, validate, errorHandler, notFound, requireRole
│   └── utils/                 # jwt, asyncHandler, ApiError, seed
├── .env.example
└── package.json
```

## Setup

1. Install MongoDB locally (or use MongoDB Atlas).
2. Install deps:
   ```bash
   cd backend
   npm install
   ```
3. Copy env file and edit:
   ```bash
   cp .env.example .env
   ```
4. Seed the database (optional but recommended):
   ```bash
   npm run seed
   ```
5. Run dev server:
   ```bash
   npm run dev
   ```

Server starts on `http://localhost:3001`. Health check at `/health`.

Demo credentials after seeding:
- `demo@affiliatehub.com` / `password123`
- `admin@affiliatehub.com` / `admin1234`

## API (v1)

All routes are prefixed with `/api/v1`.

### Auth
| Method | Path | Auth | Body |
|---|---|---|---|
| POST | `/auth/signup` | — | `{ name, email, password, country?, whatsapp? }` |
| POST | `/auth/login` | — | `{ email, password }` |
| POST | `/auth/social-auth` | — | `{ provider, email, name? }` |
| GET  | `/auth/me` | ✅ | — |
| POST | `/auth/onboarding` | ✅ | `{ country, niche, whatsapp }` |

### Products
| GET | `/products` | `?category=&sort=&page=&limit=&q=` |
| GET | `/products/search?q=` |
| GET | `/products/categories` |
| GET | `/products/:id` |

### Wallet (auth required unless noted)
| GET  | `/wallet/balance` |
| GET  | `/wallet/transactions?status=&page=&limit=` |
| GET  | `/wallet/withdraw-methods` *(public)* |
| POST | `/wallet/withdraw` `{ amount, method, details }` |

### Stats
| GET | `/stats/dashboard` ✅ |
| GET | `/stats/performance?period=7d|30d|90d` ✅ |
| GET | `/stats/leaderboard?limit=` *(public)* |

### Profile (auth required)
| GET | `/profile` |
| PUT | `/profile/update` |
| PUT | `/profile/bank-details` |
| PUT | `/profile/security` `{ currentPassword, newPassword }` |

### Affiliate
| GET  | `/affiliate/links` ✅ |
| POST | `/affiliate/generate-link` ✅ `{ productId }` |
| GET  | `/affiliate/assets?productId=` ✅ |
| GET  | `/affiliate/r/:code` *(public — redirects, tracks click)* |
| POST | `/affiliate/r/:code/convert` *(public — records conversion)* |

## Frontend connection

The React frontend reads `VITE_API_BASE_URL`. Set it in your frontend `.env`:
```
VITE_API_BASE_URL=http://localhost:3001/api/v1
```

CORS is controlled by `CORS_ORIGIN` in `backend/.env` (comma-separated allowed origins).

## Production notes
- Replace `JWT_SECRET` with a long random string.
- Run behind HTTPS (e.g. nginx, Render, Railway, Fly.io).
- Use MongoDB Atlas for managed DB.
- Add monitoring (PM2, Sentry) and structured logging.
