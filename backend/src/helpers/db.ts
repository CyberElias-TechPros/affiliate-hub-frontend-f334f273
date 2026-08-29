import type { Env, UserRow, ProductRow, AffiliateLinkRow, TransactionRow, WithdrawalRow, BankDetailsRow, NotificationRow, ReferralRow } from '../env';

// ---------- D1 helpers ----------

export async function all<T = Record<string, unknown>>(db: D1Database, sql: string, ...params: unknown[]): Promise<T[]> {
  const res = await db.prepare(sql).bind(...params).all<T>();
  return (res.results ?? []) as T[];
}

export async function get<T = Record<string, unknown>>(db: D1Database, sql: string, ...params: unknown[]): Promise<T | null> {
  const res = await db.prepare(sql).bind(...params).first<T>();
  return (res as T | null) ?? null;
}

export async function run(db: D1Database, sql: string, ...params: unknown[]): Promise<D1Result> {
  return db.prepare(sql).bind(...params).run();
}

export async function exists(db: D1Database, sql: string, ...params: unknown[]): Promise<boolean> {
  const row = await get<{ c: number }>(db, sql, ...params);
  return !!row && row.c > 0;
}

// ---------- Ids ----------

const ID_ALPHABET = '0123456789abcdef';
export function newId(len = 24): string {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  let out = '';
  for (let i = 0; i < len; i++) out += ID_ALPHABET[bytes[i] % 16];
  return out;
}

export function newCode(len = 10): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  let out = '';
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

/** Generate a random code that doesn't already exist in `table.column`. */
export async function uniqueCode(db: D1Database, table: string, column: string, len = 8): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = newCode(len);
    const row = await get<{ c: number }>(db, `SELECT COUNT(*) AS c FROM ${table} WHERE ${column} = ?`, candidate);
    if (!row || row.c === 0) return candidate;
  }
  // Extremely unlikely fallback: keep trying with a longer code.
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = newCode(len + 4);
    const row = await get<{ c: number }>(db, `SELECT COUNT(*) AS c FROM ${table} WHERE ${column} = ?`, candidate);
    if (!row || row.c === 0) return candidate;
  }
  throw new Error(`Could not generate unique ${table}.${column}`);
}

export const now = () => new Date().toISOString();
export const todayKey = () => new Date().toISOString().slice(0, 10);
export function daysAgoKey(days: number): string {
  return new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
}

// ---------- JSON helpers ----------

export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export const asBool = (v: number | boolean) => (v === true || v === 1 ? true : false);

// ---------- Serializers (DB row -> API DTO) ----------

export function toUser(user: UserRow) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone || undefined,
    whatsapp: user.whatsapp || undefined,
    country: user.country,
    niche: user.niche || undefined,
    niches: parseJson<string[]>(user.niches, []),
    avatarUrl: user.avatar_url || undefined,
    role: user.role,
    onboardingComplete: asBool(user.onboarding_complete),
    provider: user.provider,
    referralCode: user.referral_code || undefined,
    referredBy: user.referred_by || null,
    createdAt: user.created_at,
  };
}

export function toProduct(p: ProductRow) {
  return {
    _id: p._id,
    title: p.title,
    description: p.description,
    price: p.price,
    currency: p.currency,
    commission: p.commission,
    // Matches the Mongoose virtual from the original API.
    commissionAmount: Math.round(p.price * (p.commission / 100)),
    category: p.category,
    tags: parseJson<string[]>(p.tags, []),
    image: p.image,
    gallery: parseJson<string[]>(p.gallery, []),
    vendor: p.vendor,
    cookieDays: p.cookie_days,
    whyPromote: parseJson<string[]>(p.why_promote, []),
    swipeCopy: p.swipe_copy,
    isActive: asBool(p.is_active),
    createdAt: p.created_at,
  };
}

export function toTransaction(t: TransactionRow) {
  return {
    _id: t._id,
    user: t.user,
    type: t.type,
    direction: t.direction,
    amount: t.amount,
    currency: t.currency,
    status: t.status,
    description: t.description,
    reference: t.reference || undefined,
    createdAt: t.created_at,
  };
}

export function toWithdrawal(w: WithdrawalRow) {
  return {
    _id: w._id,
    user: w.user,
    amount: w.amount,
    currency: w.currency,
    method: w.method,
    details: parseJson<Record<string, unknown>>(w.details, {}),
    status: w.status,
    createdAt: w.created_at,
  };
}

export function toBankDetails(b: BankDetailsRow) {
  return {
    _id: b._id,
    user: b.user,
    bankName: b.bank_name,
    accountName: b.account_name,
    accountNumber: b.account_number,
    usdtAddress: b.usdt_address,
    paypalEmail: b.paypal_email,
    createdAt: b.created_at,
  };
}

export function toNotification(n: NotificationRow) {
  return {
    _id: n._id,
    user: n.user,
    type: n.type,
    title: n.title,
    message: n.message,
    icon: n.icon,
    link: n.link,
    read: asBool(n.read),
    createdAt: n.created_at,
  };
}

export function toReferral(r: ReferralRow, referred?: { name: string; email: string } | null) {
  return {
    _id: r._id,
    referrer: r.referrer,
    referred: referred ?? null,
    code: r.code,
    status: r.status,
    rewardAmount: r.reward_amount,
    createdAt: r.created_at,
  };
}

export function toLink(l: AffiliateLinkRow, url: string, product?: ReturnType<typeof toProduct>) {
  return {
    _id: l._id,
    user: l.user,
    product: product ?? l.product,
    code: l.code,
    url,
    clicks: l.clicks,
    conversions: l.conversions,
    earnings: l.earnings,
    createdAt: l.created_at,
  };
}
