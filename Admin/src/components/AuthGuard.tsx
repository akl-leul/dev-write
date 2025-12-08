import React from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { Shield, AlertTriangle, UserX, Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ 
  children, 
  fallback 
}) => {
  const { user, profile, loading, canAccessAdmin } = useAdminAuth();
  const location = useLocation();

  // Don't guard the signin, signup, and forgot password pages
  if (location.pathname === '/signin' || location.pathname === '/signup' || location.pathname === '/forgot-password') {
    return <>{children}</>;
  }

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <div>
            <h2 className="text-lg font-semibold">Loading Admin Panel</h2>
            <p className="text-muted-foreground">Verifying your credentials...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show fallback if not authenticated
  if (!user) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-6 max-w-md mx-auto p-6">
          <div className="space-y-2">
            <UserX className="h-16 w-16 text-destructive mx-auto" />
            <h1 className="text-2xl font-bold">Authentication Required</h1>
            <p className="text-muted-foreground">
              You need to be signed in to access the admin panel.
            </p>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={() => window.location.href = '/login'}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="w-full px-4 py-2 border border-border rounded-md hover:bg-muted transition-colors"
            >
              Back to Main Site
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show access denied if user doesn't have admin permissions
  if (!canAccessAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-6 max-w-md mx-auto p-6">
          <div className="space-y-2">
            <AlertTriangle className="h-16 w-16 text-destructive mx-auto" />
            <h1 className="text-2xl font-bold">Access Denied</h1>
            <p className="text-muted-foreground">
              You don't have permission to access the admin panel.
            </p>
            <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
              <p>Your current role: <span className="font-semibold">{profile?.role || 'unknown'}</span></p>
              <p>Required role: <span className="font-semibold">admin</span></p>
            </div>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={() => window.location.href = '/'}
              className="w-full px-4 py-2 border border-border rounded-md hover:bg-muted transition-colors"
            >
              Back to Main Site
            </button>
            <button
              onClick={() => {
                // Sign out and redirect
                supabase.auth.signOut();
                window.location.href = '/login';
              }}
              className="w-full px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign Out and Try Different Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show access denied if user is not active
  if (profile && !profile.is_active) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-6 max-w-md mx-auto p-6">
          <div className="space-y-2">
            <Shield className="h-16 w-16 text-destructive mx-auto" />
            <h1 className="text-2xl font-bold">Account Inactive</h1>
            <p className="text-muted-foreground">
              Your admin account has been deactivated. Please contact the system administrator.
            </p>
          </div>
          
          <button
            onClick={() => supabase.auth.signOut()}
            className="w-full px-4 py-2 border border-border rounded-md hover:bg-muted transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // User is authenticated and has admin access
  return <>{children}</>;
};

// Higher-order component for protecting admin routes
export const withAdminAuth = <P extends object>(
  Component: React.ComponentType<P>
) => {
  return function AdminProtectedComponent(props: P) {
    return (
      <AuthGuard>
        <Component {...props} />
      </AuthGuard>
    );
  };
};

// Permission-based guard for specific admin features
interface PermissionGuardProps {
  children: React.ReactNode;
  permission: string;
  fallback?: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({ 
  children, 
  permission,
  fallback 
}) => {
  const { hasPermission } = useAdminAuth();

  if (!hasPermission(permission)) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex items-center justify-center min-h-64 bg-muted/20 rounded-lg border border-dashed border-border">
        <div className="text-center space-y-2">
          <Shield className="h-8 w-8 text-muted-foreground mx-auto" />
          <h3 className="font-semibold">Permission Required</h3>
          <p className="text-sm text-muted-foreground">
            You need the "{permission}" permission to access this feature.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
