import * as React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  children: React.ReactNode;
  requireAdmin?: boolean;
  /** If true, redirects authenticated users to /onboarding if not yet onboarded. */
  requireOnboarding?: boolean;
}

export const ProtectedRoute: React.FC<Props> = ({
  children,
  requireAdmin = false,
  requireOnboarding = true,
}) => {
  const { user, isLoading, isAuthenticated, isAdmin } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (
    requireOnboarding &&
    !user?.onboardingComplete &&
    location.pathname !== '/onboarding' &&
    !requireAdmin // admins skip onboarding
  ) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};
