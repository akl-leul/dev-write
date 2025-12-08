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
    
    // Debug: Log what we're getting from Google
    console.log('Google user metadata:', userMetadata);
    console.log('Available fields:', Object.keys(userMetadata));
    
    // Extract first and last name from full name
    const fullName = userMetadata.full_name || userMetadata.name || 'Google User';
    const nameParts = fullName.split(' ');
    const firstName = userMetadata.given_name || nameParts[0] || '';
    const lastName = userMetadata.family_name || nameParts.slice(1).join(' ') || '';
    
    // Prepare profile data from Google metadata (only include fields that exist in the database)
    const profileData = {
      id: user.id,
      full_name: fullName,
      profile_image_url: userMetadata.avatar_url || userMetadata.picture || userMetadata.image_url,
      phone: userMetadata.phone || user.phone,
      bio: userMetadata.bio && !userMetadata.bio.startsWith('Google user -') ? userMetadata.bio : null, // Clean up existing "Google user -" bios
      age: userMetadata.age ? parseInt(userMetadata.age) : null,
      gender: userMetadata.gender || null,
      // Add a star badge for Google users
      badge: 'star',
      // Note: email, first_name, last_name, locale, google_domain, verified, updated_at are not in the current schema
    };

    // Upsert the profile data
    const { error } = await supabase
      .from('profiles')
      .upsert(profileData as any, {
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
