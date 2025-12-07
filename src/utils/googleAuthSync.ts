import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

// Cache to prevent redundant sync operations
const syncCache = new Map<string, number>();
const SYNC_COOLDOWN = 30000; // 30 seconds

/**
 * Sync Google user data to the profiles table
 * This ensures that Google OAuth users have their profile data properly stored
 */
export const syncGoogleUserToProfile = async (user: User): Promise<void> => {
  try {
    // Check if user is a Google OAuth user
    const isGoogleUser = user.identities?.some(identity => identity.provider === 'google');
    
    if (!isGoogleUser) {
      return; // Not a Google user, no sync needed
    }

    // Prevent redundant syncs with cooldown
    const now = Date.now();
    const lastSync = syncCache.get(user.id);
    if (lastSync && now - lastSync < SYNC_COOLDOWN) {
      return; // Skip sync due to cooldown
    }
    syncCache.set(user.id, now);

    const userMetadata = user.user_metadata || {};
    
    // Extract first and last name from full name
    const fullName = userMetadata.full_name || userMetadata.name || 'Google User';
    const nameParts = fullName.split(' ');
    const firstName = userMetadata.given_name || nameParts[0] || '';
    const lastName = userMetadata.family_name || nameParts.slice(1).join(' ') || '';
    
    // Prepare profile data from Google metadata
    const profileData = {
      id: user.id,
      full_name: fullName,
      first_name: firstName,
      last_name: lastName,
      email: user.email,
      profile_image_url: userMetadata.avatar_url || userMetadata.picture || userMetadata.image_url,
      phone: userMetadata.phone || user.phone,
      bio: userMetadata.bio || `Google user - ${fullName}`,
      age: userMetadata.age ? parseInt(userMetadata.age) : null,
      gender: userMetadata.gender || 'other',
      // Add a star badge for Google users
      badge: 'star',
      // Additional Google-specific data
      locale: userMetadata.locale,
      google_domain: userMetadata.hd,
      verified: user.email_confirmed_at ? true : false,
      updated_at: new Date().toISOString()
    };

    // Upsert the profile data
    const { error } = await supabase
      .from('profiles')
      .upsert(profileData, {
        onConflict: 'id',
        ignoreDuplicates: false
      });

    if (error) {
      console.error('Error syncing Google user to profile:', error);
    }
  } catch (error) {
    console.error('Unexpected error during Google user sync:', error);
  }
};

/**
 * Check if profile exists and create/update if needed
 */
export const ensureProfileExists = async (user: User): Promise<void> => {
  try {
    // Check if profile exists
    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error checking profile:', fetchError);
      return;
    }

    // If profile doesn't exist, create it
    if (!existingProfile) {
      await syncGoogleUserToProfile(user);
    }
  } catch (error) {
    console.error('Error ensuring profile exists:', error);
  }
};
