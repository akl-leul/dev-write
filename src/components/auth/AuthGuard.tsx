import React from 'react';
import { useRoleBasedAccess } from '@/hooks/useRoleBasedAccess';
import { Shield, AlertTriangle, UserX, Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ 
  children, 
  fallback 
}) => {
  const { hasRole, hasAnyPermission, userRole, loading } = useRoleBasedAccess();

  // Show loading state
  if (loading) {
    return React.createElement('div', {
      className: 'flex items-center justify-center min-h-screen bg-background'
    }, React.createElement('div', {
      className: 'text-center space-y-4'
    }, [
      React.createElement(Loader2, {
        key: 'loader',
        className: 'h-12 w-12 animate-spin text-primary mx-auto'
      }),
      React.createElement('div', {
        key: 'text'
      }, [
        React.createElement('h2', {
          key: 'title',
          className: 'text-lg font-semibold'
        }, 'Loading'),
        React.createElement('p', {
          key: 'message',
          className: 'text-muted-foreground'
        }, 'Verifying your credentials...')
      ])
    ]));
  }

  // Show fallback if not authenticated
  if (!userRole) {
    if (fallback) {
      return React.createElement(React.Fragment, {}, fallback);
    }

    return React.createElement('div', {
      className: 'flex items-center justify-center min-h-screen bg-background'
    }, React.createElement('div', {
      className: 'text-center space-y-6 max-w-md mx-auto p-6'
    }, [
      React.createElement('div', {
        key: 'icon',
        className: 'space-y-2'
      }, [
        React.createElement(UserX, {
          key: 'userx',
          className: 'h-16 w-16 text-destructive mx-auto'
        }),
        React.createElement('h1', {
          key: 'title',
          className: 'text-2xl font-bold'
        }, 'Authentication Required'),
        React.createElement('p', {
          key: 'message',
          className: 'text-muted-foreground'
        }, 'You need to be signed in to access this page.')
      ])
    ]));
  }

  // User is authenticated
  return React.createElement(React.Fragment, {}, children);
};

// Higher-order component for protecting routes
export const withRoleCheck = <P extends object>(
  Component: React.ComponentType<P>,
  requiredRole?: string,
  requiredPermissions?: string[]
) => {
  return function ProtectedComponent(props: P) {
    const { hasRole, hasAnyPermission, userRole, loading } = useRoleBasedAccess();

    if (loading) {
      return React.createElement('div', {}, 'Loading...');
    }

    // Check role requirement
    if (requiredRole && !hasRole(requiredRole as any)) {
      return React.createElement('div', {
        className: 'flex items-center justify-center min-h-screen'
      }, React.createElement('div', {
        className: 'text-center'
      }, [
        React.createElement('h2', {
          key: 'title',
          className: 'text-2xl font-bold text-red-600 mb-2'
        }, 'Access Denied'),
        React.createElement('p', {
          key: 'message',
          className: 'text-gray-600'
        }, `You need ${requiredRole} role to access this page. Your current role: ${userRole || 'none'}`)
      ]));
    }

    // Check permissions requirement
    if (requiredPermissions && !hasAnyPermission(requiredPermissions as any)) {
      return React.createElement('div', {
        className: 'flex items-center justify-center min-h-screen'
      }, React.createElement('div', {
        className: 'text-center'
      }, [
        React.createElement('h2', {
          key: 'title',
          className: 'text-2xl font-bold text-red-600 mb-2'
        }, 'Access Denied'),
        React.createElement('p', {
          key: 'message',
          className: 'text-gray-600'
        }, 'You don\'t have the required permissions to access this page.')
      ]));
    }

    return React.createElement(Component, props);
  };
};
