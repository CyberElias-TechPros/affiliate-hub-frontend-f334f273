// Cloudflare Worker environment bindings & configuration.
export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  JWT_EXPIRES_IN?: string;
  CORS_ORIGIN?: string;
  PUBLIC_FRONTEND_URL?: string;
  PUBLIC_API_URL?: string;
  AFFILIATE_WEBHOOK_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  APPLE_CLIENT_ID?: string;
  APPLE_CLIENT_SECRET?: string;
  FX_NGN_PER_USD?: string;
  AUTH_RATE_LIMIT_MAX?: string;
}

export type Role = 'user' | 'admin';

// ---- Row types (camelCase column names in D1) ----
export interface UserRow {
  _id: string;
  name: string;
  email: string;
  password_hash: string;
  phone: string;
  whatsapp: string;
  country: string;
  niche: string;
  niches: string; // JSON string[]
  avatar_url: string;
  role: Role;
  onboarding_complete: number; // 0 | 1
  provider: 'local' | 'google' | 'apple';
  referral_code: string | null;
  referred_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductRow {
  _id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  commission: number;
  category: string;
  tags: string; // JSON string[]
  image: string;
  gallery: string; // JSON string[]
  vendor: string;
  cookie_days: number;
  why_promote: string; // JSON string[]
  swipe_copy: string;
  is_active: number; // 0 | 1
  created_at: string;
  updated_at: string;
}

export interface AffiliateLinkRow {
  _id: string;
  user: string;
  product: string;
  code: string;
  clicks: number;
  conversions: number;
  earnings: number;
  created_at: string;
  updated_at: string;
}

export interface AffiliateEventRow {
  _id: string;
  link: string;
  user: string;
  product: string;
  type: 'click' | 'conversion';
  amount: number;
  event_key: string | null;
  created_at: string;
}

export interface TransactionRow {
  _id: string;
  user: string;
  type: 'commission' | 'withdrawal' | 'bonus' | 'refund' | 'adjustment';
  direction: 'credit' | 'debit';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  description: string;
  reference: string | null;
  meta: string; // JSON
  created_at: string;
  updated_at: string;
}

export interface WithdrawalRow {
  _id: string;
  user: string;
  amount: number;
  currency: string;
  method: 'bank' | 'usdt' | 'paypal';
  details: string; // JSON
  status: 'pending' | 'processing' | 'completed' | 'failed';
  transaction_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface BankDetailsRow {
  _id: string;
  user: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  usdt_address: string;
  paypal_email: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationRow {
  _id: string;
  user: string;
  type: 'sale' | 'withdrawal' | 'system' | 'achievement' | 'referral' | 'click_milestone';
  title: string;
  message: string;
  icon: string;
  link: string;
  read: number; // 0 | 1
  meta: string;
  created_at: string;
  updated_at: string;
}

export interface AchievementRow {
  _id: string;
  user: string;
  code: string;
  title: string;
  description: string;
  icon: string;
  progress: number;
  target: number;
  unlocked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface StreakRow {
  _id: string;
  user: string;
  current: number;
  longest: number;
  last_active_date: string;
  created_at: string;
  updated_at: string;
}

export interface ReferralRow {
  _id: string;
  referrer: string;
  referred: string;
  code: string;
  status: 'pending' | 'qualified' | 'rewarded';
  reward_amount: number;
  created_at: string;
  updated_at: string;
}

export interface SupportTicketRow {
  _id: string;
  user: string;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  created_at: string;
  updated_at: string;
}
