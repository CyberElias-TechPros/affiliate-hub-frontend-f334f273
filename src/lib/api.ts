import axios, {
  AxiosInstance,
  AxiosResponse,
  AxiosError,
  InternalAxiosRequestConfig,
  AxiosHeaders,
} from 'axios';
import type {
  User,
  Product,
  AffiliateLink,
  Transaction,
  Withdrawal,
  BalanceResponse,
  DashboardStats,
  Notification,
  Achievement,
  BankDetails,
  LeaderboardEntry,
  ReferralStats,
} from '@/types';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1';

const TOKEN_KEY = 'affiliate_token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStore.get();
  if (token) {
    config.headers = config.headers || new AxiosHeaders();
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    const status = error.response?.status;
    if (status === 401 && typeof window !== 'undefined') {
      const path = window.location.pathname;
      // Only redirect to /auth from authenticated pages, not from /auth itself.
      if (
        !path.startsWith('/auth') &&
        !path.startsWith('/onboarding') &&
        path !== '/'
      ) {
        tokenStore.clear();
        window.location.href = '/auth';
      }
    }
    return Promise.reject(error);
  }
);

const unwrap = <T,>(p: Promise<AxiosResponse<T>>) => p.then((r) => r.data);

// ---------- AUTH ----------
export const AuthAPI = {
  signup: (data: {
    name: string;
    email: string;
    password: string;
    country?: string;
    whatsapp?: string;
    referralCode?: string;
  }) => unwrap<{ token: string; user: User }>(api.post('/auth/signup', data)),
  login: (email: string, password: string) =>
    unwrap<{ token: string; user: User }>(api.post('/auth/login', { email, password })),
  socialAuth: (provider: 'google' | 'apple', email: string, name?: string) =>
    unwrap<{ token: string; user: User }>(
      api.post('/auth/social-auth', { provider, email, name })
    ),
  me: () => unwrap<{ user: User }>(api.get('/auth/me')),
  completeOnboarding: (data: {
    country?: string;
    niche?: string;
    niches?: string[];
    whatsapp?: string;
  }) => unwrap<{ user: User }>(api.post('/auth/onboarding', data)),
};

// ---------- PRODUCTS ----------
export const ProductAPI = {
  list: (params?: { category?: string; sort?: string; page?: number; limit?: number; q?: string }) =>
    unwrap<{ items: Product[]; total: number; page: number; limit: number }>(
      api.get('/products', { params })
    ),
  detail: (id: string) => unwrap<Product>(api.get(`/products/${id}`)),
  search: (q: string) => unwrap<{ items: Product[]; total: number }>(api.get('/products/search', { params: { q } })),
  categories: () => unwrap<string[]>(api.get('/products/categories')),
};

// ---------- AFFILIATE ----------
export const AffiliateAPI = {
  list: () => unwrap<{ items: AffiliateLink[] }>(api.get('/affiliate/links')),
  generate: (productId: string) =>
    unwrap<{ link: AffiliateLink; product: Product }>(
      api.post('/affiliate/generate-link', { productId })
    ),
  assets: (productId: string) =>
    unwrap<{ images: string[]; swipeCopy: string }>(
      api.get('/affiliate/assets', { params: { productId } })
    ),
  // Test helper
  simulateConversion: (code: string) =>
    unwrap<{ ok: boolean; earned: number }>(api.post(`/affiliate/r/${code}/convert`)),
};

// ---------- WALLET ----------
export const WalletAPI = {
  balance: () => unwrap<BalanceResponse>(api.get('/wallet/balance')),
  transactions: (params?: { page?: number; limit?: number; status?: string }) =>
    unwrap<{ items: Transaction[]; total: number; page: number; limit: number }>(
      api.get('/wallet/transactions', { params })
    ),
  withdraw: (data: { amount: number; method: 'bank' | 'usdt' | 'paypal'; details: Record<string, any> }) =>
    unwrap<{ withdrawal: Withdrawal; transaction: Transaction }>(api.post('/wallet/withdraw', data)),
  methods: () =>
    unwrap<Array<{ id: string; label: string; minAmount: number; fee: number }>>(
      api.get('/wallet/withdraw-methods')
    ),
};

// ---------- STATS ----------
export const StatsAPI = {
  dashboard: () => unwrap<DashboardStats>(api.get('/stats/dashboard')),
  performance: (period: '7d' | '30d' | '90d' = '7d') =>
    unwrap<{ period: string; points: Array<{ date: string; clicks: number; earnings: number; conversions: number }> }>(
      api.get('/stats/performance', { params: { period } })
    ),
  leaderboard: (limit = 10) =>
    unwrap<LeaderboardEntry[]>(api.get('/stats/leaderboard', { params: { limit } })),
};

// ---------- PROFILE ----------
export const ProfileAPI = {
  get: () => unwrap<{ user: User; bank: BankDetails | null }>(api.get('/profile')),
  update: (data: Partial<User>) => unwrap<{ user: User }>(api.put('/profile/update', data)),
  updateBank: (data: BankDetails) => unwrap<{ bank: BankDetails }>(api.put('/profile/bank-details', data)),
  updateSecurity: (currentPassword: string, newPassword: string) =>
    unwrap<{ message: string }>(api.put('/profile/security', { currentPassword, newPassword })),
};

// ---------- NOTIFICATIONS ----------
export const NotificationAPI = {
  list: (unreadOnly = false) =>
    unwrap<{ items: Notification[]; unread: number }>(
      api.get('/notifications', { params: { unreadOnly } })
    ),
  markRead: (id: string) => unwrap(api.put(`/notifications/${id}/read`)),
  markAllRead: () => unwrap(api.put('/notifications/read-all')),
  remove: (id: string) => unwrap(api.delete(`/notifications/${id}`)),
};

// ---------- ACHIEVEMENTS ----------
export const AchievementAPI = {
  list: () => unwrap<{ items: Achievement[] }>(api.get('/achievements')),
  streak: () =>
    unwrap<{ current: number; longest: number; lastActiveDate: string }>(
      api.get('/achievements/streak')
    ),
};

// ---------- REFERRALS ----------
export const ReferralAPI = {
  me: () => unwrap<ReferralStats>(api.get('/referrals/me')),
};

// ---------- ADMIN ----------
export const AdminAPI = {
  metrics: () =>
    unwrap<{ users: number; products: number; totalEarnings: number; pendingWithdrawals: number }>(
      api.get('/admin/metrics')
    ),
  listUsers: (params?: { page?: number; limit?: number; q?: string }) =>
    unwrap<{ items: User[]; total: number; page: number }>(api.get('/admin/users', { params })),
  updateUserRole: (id: string, role: 'user' | 'admin') =>
    unwrap<{ user: User }>(api.put(`/admin/users/${id}/role`, { role })),
  deleteUser: (id: string) => unwrap(api.delete(`/admin/users/${id}`)),

  createProduct: (data: Partial<Product>) => unwrap<Product>(api.post('/admin/products', data)),
  updateProduct: (id: string, data: Partial<Product>) =>
    unwrap<Product>(api.put(`/admin/products/${id}`, data)),
  deleteProduct: (id: string) => unwrap(api.delete(`/admin/products/${id}`)),

  listWithdrawals: (status?: string) =>
    unwrap<{ items: Withdrawal[] }>(api.get('/admin/withdrawals', { params: { status } })),
  updateWithdrawal: (id: string, status: Withdrawal['status']) =>
    unwrap<{ withdrawal: Withdrawal }>(api.put(`/admin/withdrawals/${id}`, { status })),
};

export default api;
