import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, Profile } from '../lib/supabase';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { makeRedirectUri } from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string, age?: string, gender?: string, phone?: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any; user?: any }>;
  signUpWithGoogle: (user: any, fullName: string, age: string, gender: string, phone: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for remembered credentials and attempt auto-login first
    attemptAutoLogin();
  }, []);

  const attemptAutoLogin = async () => {
    try {
      const rememberedEmail = await SecureStore.getItemAsync('rememberedEmail');
      const rememberedPassword = await SecureStore.getItemAsync('rememberedPassword');

      if (rememberedEmail && rememberedPassword) {
        // Attempt to sign in with remembered credentials
        const { error } = await supabase.auth.signInWithPassword({
          email: rememberedEmail,
          password: rememberedPassword,
        });

        if (error) {
          console.error('Auto-login failed:', error);
          // Clear invalid credentials
          await SecureStore.deleteItemAsync('rememberedEmail');
          await SecureStore.deleteItemAsync('rememberedPassword');
        }
        // If successful, the onAuthStateChange listener will handle the rest
      } else {
        // No remembered credentials, just get current session
        getCurrentSession();
      }
    } catch (error) {
      console.error('Error during auto-login:', error);
      getCurrentSession();
    }
  };

  const getCurrentSession = () => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });
  };

  // Listen for auth changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string, session: Session | null) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchProfile(session.user.id);

          // Check if this is a new Google user without a profile
          if (event === 'SIGNED_IN' && session.user.app_metadata.provider === 'google') {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', session.user.id)
              .single();

            if (!profile) {
              // New Google user, trigger additional fields flow
              // This will be handled by the AuthScreen component
              console.log('New Google user detected, additional fields required');
            }
          }
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string, age?: string, gender?: string, phone?: string) => {
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (!error && data.user) {
      // Create profile with all fields
      await supabase.from('profiles').insert({
        id: data.user.id,
        full_name: fullName,
        age: age ? parseInt(age) : null,
        gender: gender || null,
        phone: phone || null,
        show_phone: false,
        role: 'user',
        is_active: true,
        login_count: 0,
        blocked: false,
      });
    }

    return { error };
  };

  const signInWithGoogle = async () => {
    try {
      const redirectUri = makeRedirectUri({
        scheme: 'Chronicle',
        path: 'auth/callback',
      });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;

      if (data.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);

        if (result.type === 'success' && result.url) {
          // Parse the URL to get the session parameters
          const { queryParams } = Linking.parse(result.url);
          if (queryParams?.access_token && queryParams?.refresh_token) {
            const accessToken = (Array.isArray(queryParams.access_token) ? queryParams.access_token[0] : queryParams.access_token) as string;
            const refreshToken = (Array.isArray(queryParams.refresh_token) ? queryParams.refresh_token[0] : queryParams.refresh_token) as string;

            if (accessToken && refreshToken) {
              const { error: sessionError } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });
              if (sessionError) throw sessionError;
            }
          }
        }
      }

      return { error: null };
    } catch (error) {
      console.error('Google Sign-In Error:', error);
      return { error };
    }
  };

  const signUpWithGoogle = async (user: any, fullName: string, age: string, gender: string, phone: string) => {
    // Update the user's profile with additional information
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      full_name: fullName,
      age: parseInt(age),
      gender: gender,
      phone: phone,
      show_phone: false,
      role: 'user',
      is_active: true,
      login_count: 1,
      last_login_at: new Date().toISOString(),
      blocked: false,
    });

    return { error };
  };

  const signOut = async () => {
    // Clear remembered credentials when user explicitly logs out
    try {
      await SecureStore.deleteItemAsync('rememberedEmail');
      await SecureStore.deleteItemAsync('rememberedPassword');
    } catch (error) {
      console.error('Error clearing remembered credentials:', error);
    }

    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error('No user logged in') };

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (!error) {
      setProfile((prev: Profile | null) => prev ? { ...prev, ...updates } : null);
    }

    return { error };
  };

  const value = {
    user,
    session,
    profile,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signUpWithGoogle,
    signOut,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
