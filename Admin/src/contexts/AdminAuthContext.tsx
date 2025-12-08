import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AdminProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  is_active: boolean;
  permissions: Record<string, boolean>;
  last_login_at: string | null;
  login_count: number;
}

interface AdminAuthContextType {
  user: User | null;
  session: Session | null;
  profile: AdminProfile | null;
  loading: boolean;
  isAdmin: boolean;
  canAccessAdmin: boolean;
  hasPermission: (permission: string) => boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const AdminAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch admin profile with role and permissions
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          role,
          is_active,
          last_login_at,
          login_count
        `)
        .eq('id', userId)
        .single() as any;
      
      if (error) {
        console.error('Error fetching admin profile:', error);
        // Set basic profile to prevent infinite loading
        setProfile({
          id: userId,
          full_name: 'Admin User',
          email: null,
          role: 'admin',
          is_active: true,
          permissions: { can_access_admin_panel: true },
          last_login_at: null,
          login_count: 0
        });
        return null;
      }
      
      if (data) {
        // Get user permissions - using fallback since function may not exist in admin DB
        let permissions = { can_access_admin_panel: true }; // Default fallback
        try {
          const permissionsData = await (supabase.rpc as any)('get_user_permissions', { user_id: userId });
          permissions = permissionsData?.data || permissions;
        } catch (permError) {
          console.warn('Permissions RPC failed, using default:', permError);
        }
        
        const adminProfile: AdminProfile = {
          id: data.id,
          full_name: data.full_name,
          email: data.email,
          role: data.role,
          is_active: data.is_active,
          permissions: permissions,
          last_login_at: data.last_login_at,
          login_count: data.login_count || 0
        };
        
        setProfile(adminProfile);
        return adminProfile;
      }
    } catch (error) {
      console.error('Error fetching admin profile:', error);
      // Set basic profile to prevent infinite loading
      setProfile({
        id: userId,
        full_name: 'Admin User',
        email: null,
        role: 'admin',
        is_active: true,
        permissions: { can_access_admin_panel: true },
        last_login_at: null,
        login_count: 0
      });
    }
    return null;
  };

  // Update login information for admin
  const updateLoginInfo = async (userId: string) => {
    try {
      await (supabase.rpc as any)('update_user_login', { 
        user_id: userId,
        ip_address: null,
        user_agent: navigator.userAgent
      });
    } catch (error) {
      console.error('Error updating admin login info:', error);
    }
  };

  // Permission checking functions
  const hasPermission = (permission: string): boolean => {
    if (!profile) return false;
    return profile.permissions[permission] || false;
  };

  const isAdmin = (): boolean => profile?.role === 'admin';
  const canAccessAdmin = (): boolean => hasPermission('can_access_admin_panel');

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.success('Signed out successfully');
    } catch (error) {
      toast.error('Error signing out');
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        
        if (currentUser) {
          // Fetch user profile with permissions
          const userProfile = await fetchProfile(currentUser.id);
          
          // Update login info on sign in
          if (event === 'SIGNED_IN') {
            await updateLoginInfo(currentUser.id);
          }
          
          // Check if user can access admin panel
          if (!userProfile?.permissions?.can_access_admin_panel) {
            toast.error('Access denied. You do not have admin privileges.');
            // Redirect to main app or show access denied
            setTimeout(() => {
              window.location.href = '/';
            }, 2000);
          }
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      if (currentUser) {
        fetchProfile(currentUser.id);
      } else {
        setProfile(null);
      }
      
      setLoading(false); // This was missing!
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AdminAuthContext.Provider value={{ 
      user, 
      session, 
      profile,
      loading,
      isAdmin: profile?.role === 'admin',
      canAccessAdmin: profile?.permissions?.can_access_admin_panel || false,
      hasPermission,
      signOut,
      refreshProfile
    }}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};
