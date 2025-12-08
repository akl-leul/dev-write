import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { syncGoogleUserToProfile } from '@/utils/googleAuthSync';

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  is_active: boolean;
  permissions: Record<string, boolean>;
  last_login_at: string | null;
  login_count: number;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isBlocked: boolean;
  signUp: (email: string, password: string, fullName: string, phone: string, age: number, gender: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  loading: boolean;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  isAdmin: () => boolean;
  isModerator: () => boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch user profile with role and permissions
  const fetchProfile = async (userId: string) => {
    if (!userId) return null;
    
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
          login_count,
          blocked
        `)
        .eq('id', userId)
        .single();
      
      if (error) {
        // Don't log error for invalid user IDs, just return null
        if (error.code === 'PGRST116') {
          // Profile not found, user might not exist in profiles table
          return null;
        }
        console.error('Error fetching profile:', error);
        return null;
      }
      
      if (data) {
        // Get user permissions
        const { data: permissions } = await supabase
          .rpc('get_user_permissions', { user_id: userId });
        
        const userProfile: UserProfile = {
          id: data.id,
          full_name: data.full_name,
          email: data.email,
          role: data.role,
          is_active: data.is_active,
          permissions: permissions || {},
          last_login_at: data.last_login_at,
          login_count: data.login_count || 0
        };
        
        setProfile(userProfile);
        setIsBlocked(data.blocked || false);
        return userProfile;
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
    return null;
  };

  // Update login information
  const updateLoginInfo = async (userId: string) => {
    if (!userId) return;
    
    try {
      await supabase.rpc('update_user_login', { 
        user_id: userId,
        ip_address: null, // You can get this from request headers if needed
        user_agent: navigator.userAgent
      });
    } catch (error) {
      console.error('Error updating login info:', error);
    }
  };

  // Permission checking functions
  const hasPermission = (permission: string): boolean => {
    if (!profile) return false;
    return profile.permissions[permission] || false;
  };

  const hasRole = (role: string): boolean => {
    if (!profile) return false;
    return profile.role === role;
  };

  const isAdmin = (): boolean => hasRole('admin');
  const isModerator = (): boolean => hasRole('moderator') || hasRole('admin');

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const checkIfUserBlocked = async (userId: string) => {
    if (!userId) return false;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('blocked')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('Error checking blocked status:', error);
        return false;
      }
      
      return data?.blocked || false;
    } catch (error) {
      console.error('Error checking blocked status:', error);
      return false;
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          setSession(session);
          const currentUser = session?.user ?? null;
          setUser(currentUser);
          
          if (currentUser) {
            // Fetch user profile with permissions
            await fetchProfile(currentUser.id);
            
            // Update login info on sign in
            if (event === 'SIGNED_IN') {
              await updateLoginInfo(currentUser.id);
            }
            
            // Store email for support contact
            if (currentUser.email) {
              localStorage.setItem('user_email', currentUser.email);
            }
          } else {
            setProfile(null);
            setIsBlocked(false);
          }
          
          // Sync Google user data only when user signs in (not on token refresh)
          if (currentUser && event === 'SIGNED_IN') {
            // Defer sync to avoid blocking UI
            setTimeout(() => syncGoogleUserToProfile(currentUser), 0);
          }
        } catch (error) {
          console.error('Error in auth state change:', error);
          // Reset state on error
          setUser(null);
          setSession(null);
          setProfile(null);
          setIsBlocked(false);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      try {
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        
        if (currentUser) {
          fetchProfile(currentUser.id);
          if (currentUser.email) {
            localStorage.setItem('user_email', currentUser.email);
          }
        } else {
          setProfile(null);
          setIsBlocked(false);
        }
      } catch (error) {
        console.error('Error getting session:', error);
        setUser(null);
        setSession(null);
        setProfile(null);
        setIsBlocked(false);
      }
      
      setLoading(false);
    }).catch(error => {
      console.error('Error in getSession:', error);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string, phone: string, age: number, gender: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone,
            age,
            gender,
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });
      
      if (error) {
        toast.error(error.message);
        return { error };
      }
      
      toast.success('Account created successfully!');
      return { error: null };
    } catch (error: any) {
      toast.error('An error occurred during sign up');
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        toast.error(error.message);
        return { error };
      }
      
      toast.success('Welcome back!');
      return { error: null };
    } catch (error: any) {
      toast.error('An error occurred during sign in');
      return { error };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          // Include additional scopes to get more user data
          scopes: 'email profile',
        },
      });
      
      if (error) {
        toast.error(error.message);
        return { error };
      }
      
      toast.success('Redirecting to Google...');
      return { error: null };
    } catch (error: any) {
      toast.error('An error occurred during Google sign in');
      return { error };
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

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      profile,
      isBlocked, 
      signUp, 
      signIn, 
      signInWithGoogle, 
      signOut, 
      loading,
      hasPermission,
      hasRole,
      isAdmin,
      isModerator,
      refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
