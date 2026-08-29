import * as React from 'react';
import { AuthAPI, tokenStore } from '@/lib/api';
import type { User } from '@/types';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<User>;
  signup: (data: {
    name: string;
    email: string;
    password: string;
    country?: string;
    whatsapp?: string;
    referralCode?: string;
  }) => Promise<User>;
  refresh: () => Promise<void>;
  logout: () => void;
  setUser: (u: User | null) => void;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = React.useState<User | null>(null);
  const [isLoading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    const token = tokenStore.get();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const { user } = await AuthAPI.me();
      setUser(user);
    } catch {
      tokenStore.clear();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const login = async (email: string, password: string) => {
    const { token, user } = await AuthAPI.login(email, password);
    tokenStore.set(token);
    setUser(user);
    return user;
  };

  const signup: AuthContextValue['signup'] = async (data) => {
    const { token, user } = await AuthAPI.signup(data);
    tokenStore.set(token);
    setUser(user);
    return user;
  };

  const logout = () => {
    tokenStore.clear();
    setUser(null);
    window.location.href = '/auth';
  };

  const value: AuthContextValue = {
    user,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    login,
    signup,
    refresh,
    logout,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
