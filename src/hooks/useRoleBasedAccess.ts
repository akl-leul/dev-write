import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

// Permission constants for better type safety
export const PERMISSIONS = {
  // Post permissions
  CAN_READ_POSTS: 'can_read_posts',
  CAN_CREATE_POSTS: 'can_create_posts',
  CAN_EDIT_OWN_POSTS: 'can_edit_own_posts',
  CAN_DELETE_OWN_POSTS: 'can_delete_own_posts',
  CAN_EDIT_OTHERS_POSTS: 'can_edit_others_posts',
  CAN_DELETE_OTHERS_POSTS: 'can_delete_others_posts',
  CAN_PUBLISH_POSTS: 'can_publish_posts',
  CAN_UNPUBLISH_POSTS: 'can_unpublish_posts',
  CAN_FEATURE_POSTS: 'can_feature_posts',
  
  // Comment permissions
  CAN_COMMENT: 'can_comment',
  CAN_MODERATE_COMMENTS: 'can_moderate_comments',
  
  // Interaction permissions
  CAN_LIKE: 'can_like',
  CAN_BOOKMARK: 'can_bookmark',
  CAN_FOLLOW: 'can_follow',
  
  // Profile permissions
  CAN_EDIT_PROFILE: 'can_edit_profile',
  CAN_UPLOAD_IMAGES: 'can_upload_images',
  
  // Moderation permissions
  CAN_MODERATE_POSTS: 'can_moderate_posts',
  CAN_VIEW_REPORTS: 'can_view_reports',
  CAN_BAN_USERS: 'can_ban_users',
  
  // Analytics and management
  CAN_VIEW_ANALYTICS: 'can_view_analytics',
  CAN_MANAGE_CATEGORIES: 'can_manage_categories',
  CAN_MANAGE_TAGS: 'can_manage_tags',
  CAN_MANAGE_USERS: 'can_manage_users',
  CAN_MANAGE_ROLES: 'can_manage_roles',
  CAN_MANAGE_SYSTEM: 'can_manage_system',
  
  // Admin-specific
  CAN_ACCESS_ADMIN_PANEL: 'can_access_admin_panel',
  CAN_VIEW_SENSITIVE_DATA: 'can_view_sensitive_data',
} as const;

// Role constants
export const ROLES = {
  USER: 'user',
  MODERATOR: 'moderator',
  EDITOR: 'editor',
  ADMIN: 'admin',
} as const;

export interface UseRoleBasedAccessReturn {
  // Permission checking
  hasPermission: (permission: keyof typeof PERMISSIONS) => boolean;
  hasAnyPermission: (permissions: (keyof typeof PERMISSIONS)[]) => boolean;
  hasAllPermissions: (permissions: (keyof typeof PERMISSIONS)[]) => boolean;
  
  // Role checking
  hasRole: (role: keyof typeof ROLES) => boolean;
  hasAnyRole: (roles: (keyof typeof ROLES)[]) => boolean;
  isAdmin: () => boolean;
  isModerator: () => boolean;
  isEditor: () => boolean;
  isUser: () => boolean;
  
  // User info
  userRole: string | null;
  userPermissions: Record<string, boolean>;
  isActive: boolean;
  loading: boolean;
  
  // Quick checks for common scenarios
  canEditPost: (postAuthorId?: string) => boolean;
  canDeletePost: (postAuthorId?: string) => boolean;
  canModerateContent: () => boolean;
  canAccessAdmin: () => boolean;
  canManageUsers: () => boolean;
}

export const useRoleBasedAccess = (): UseRoleBasedAccessReturn => {
  const { profile, user, loading: authLoading, hasPermission: checkPermission, hasRole: checkRole } = useAuth();

  const hasPermission = (permission: keyof typeof PERMISSIONS): boolean => {
    return checkPermission(PERMISSIONS[permission]);
  };

  const hasAnyPermission = (permissions: (keyof typeof PERMISSIONS)[]): boolean => {
    return permissions.some(permission => hasPermission(permission));
  };

  const hasAllPermissions = (permissions: (keyof typeof PERMISSIONS)[]): boolean => {
    return permissions.every(permission => hasPermission(permission));
  };

  const hasRole = (role: keyof typeof ROLES): boolean => {
    return checkRole(ROLES[role]);
  };

  const hasAnyRole = (roles: (keyof typeof ROLES)[]): boolean => {
    return roles.some(role => hasRole(role));
  };

  const isAdmin = (): boolean => hasRole('ADMIN');
  const isModerator = (): boolean => hasRole('MODERATOR') || isAdmin();
  const isEditor = (): boolean => hasRole('EDITOR') || isAdmin();
  const isUser = (): boolean => hasRole('USER') || !profile; // Default to user if no profile

  // Quick checks for common scenarios
  const canEditPost = (postAuthorId?: string): boolean => {
    if (!user || !profile) return false;
    
    // Can edit own posts
    if (postAuthorId === user.id && hasPermission('CAN_EDIT_OWN_POSTS')) {
      return true;
    }
    
    // Can edit others' posts
    return hasPermission('CAN_EDIT_OTHERS_POSTS');
  };

  const canDeletePost = (postAuthorId?: string): boolean => {
    if (!user || !profile) return false;
    
    // Can delete own posts
    if (postAuthorId === user.id && hasPermission('CAN_DELETE_OWN_POSTS')) {
      return true;
    }
    
    // Can delete others' posts
    return hasPermission('CAN_DELETE_OTHERS_POSTS');
  };

  const canModerateContent = (): boolean => {
    return hasAnyPermission([
      'CAN_MODERATE_COMMENTS',
      'CAN_MODERATE_POSTS',
      'CAN_BAN_USERS'
    ]);
  };

  const canAccessAdmin = (): boolean => {
    return hasPermission('CAN_ACCESS_ADMIN_PANEL');
  };

  const canManageUsers = (): boolean => {
    return hasPermission('CAN_MANAGE_USERS');
  };

  return {
    // Permission checking
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    
    // Role checking
    hasRole,
    hasAnyRole,
    isAdmin,
    isModerator,
    isEditor,
    isUser,
    
    // User info
    userRole: profile?.role || null,
    userPermissions: profile?.permissions || {},
    isActive: profile?.is_active || false,
    loading: authLoading,
    
    // Quick checks
    canEditPost,
    canDeletePost,
    canModerateContent,
    canAccessAdmin,
    canManageUsers,
  };
};

// Higher-order component for protecting routes
export const withRoleCheck = <P extends object>(
  Component: React.ComponentType<P>,
  requiredRole?: keyof typeof ROLES,
  requiredPermissions?: (keyof typeof PERMISSIONS)[]
) => {
  return function ProtectedComponent(props: P) {
    const { hasRole, hasAnyPermission, userRole, loading } = useRoleBasedAccess();

    if (loading) {
      return React.createElement('div', {}, 'Loading...');
    }

    // Check role requirement
    if (requiredRole && !hasRole(requiredRole)) {
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
    if (requiredPermissions && !hasAnyPermission(requiredPermissions)) {
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

// Hook for conditional rendering based on permissions
export const useConditionalRender = () => {
  const { hasPermission, hasRole, isAdmin, isModerator } = useRoleBasedAccess();

  const renderIf = (condition: boolean, component: React.ReactNode) => {
    return condition ? component : null;
  };

  const renderIfPermission = (permission: keyof typeof PERMISSIONS, component: React.ReactNode) => {
    return renderIf(hasPermission(permission), component);
  };

  const renderIfRole = (role: keyof typeof ROLES, component: React.ReactNode) => {
    return renderIf(hasRole(role), component);
  };

  const renderIfAdmin = (component: React.ReactNode) => {
    return renderIf(isAdmin(), component);
  };

  const renderIfModerator = (component: React.ReactNode) => {
    return renderIf(isModerator(), component);
  };

  return {
    renderIf,
    renderIfPermission,
    renderIfRole,
    renderIfAdmin,
    renderIfModerator,
  };
};
