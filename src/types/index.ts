// Shared types mirroring backend DTOs.
export interface User {
  _id: string;
  id?: string;
  name: string;
  email: string;
  phone?: string;
  whatsapp?: string;
  country?: string;
  niche?: string;
  niches?: string[];
  avatarUrl?: string;
  role: 'user' | 'admin';
  onboardingComplete: boolean;
  referralCode?: string;
  referredBy?: string | null;
  createdAt?: string;
}

export interface Product {
  _id: string;
  id?: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  commission: number;
  commissionAmount: number;
  category: string;
  tags?: string[];
  image: string;
  gallery?: string[];
  vendor?: string;
  cookieDays?: number;
  whyPromote?: string[];
  swipeCopy?: string;
  isActive?: boolean;
  createdAt?: string;
}

export interface AffiliateLink {
  _id: string;
  user: string;
  product: Product | string;
  code: string;
  url: string;
  clicks: number;
  conversions: number;
  earnings: number;
  createdAt: string;
}

export interface Transaction {
  _id: string;
  user: string;
  type: 'commission' | 'withdrawal' | 'bonus' | 'refund' | 'adjustment';
  direction: 'credit' | 'debit';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  description: string;
  reference?: string;
  createdAt: string;
}

export interface Withdrawal {
  _id: string;
  user: string | { _id: string; name: string; email: string };
  amount: number;
  method: 'bank' | 'usdt' | 'paypal';
  details: Record<string, any>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
}

export interface BalanceResponse {
  ngnBalance: number;
  usdBalance: number;
  pending: number;
  currency: string;
  fxRate: number;
}

export interface DashboardStats {
  totalLinks: number;
  totalClicks: number;
  totalConversions: number;
  totalEarnings: number;
  conversionRate: number;
  recentTransactions: Transaction[];
}

export interface Notification {
  _id: string;
  type: 'sale' | 'withdrawal' | 'system' | 'achievement' | 'referral' | 'click_milestone';
  title: string;
  message: string;
  icon: string;
  link: string;
  read: boolean;
  createdAt: string;
}

export interface Achievement {
  code: string;
  title: string;
  description: string;
  icon: string;
  target: number;
  progress: number;
  unlocked: boolean;
  unlockedAt: string | null;
}

export interface BankDetails {
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  usdtAddress?: string;
  paypalEmail?: string;
}

export interface LeaderboardEntry {
  rank: number;
  earnings: number;
  user: { _id: string; name: string; avatarUrl?: string } | null;
}

export interface ReferralStats {
  code: string;
  link: string;
  referrals: Array<{
    _id: string;
    referred: { name: string; email: string } | null;
    status: 'pending' | 'qualified' | 'rewarded';
    rewardAmount: number;
    createdAt: string;
  }>;
  stats: { total: number; qualified: number; earned: number };
}
