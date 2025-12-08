import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

// Cache to prevent redundant sync operations
const syncCache = new Map<string, number>();
const SYNC_COOLDOWN = 30000; // 30 seconds

/**
 * Sync Google user data to the profiles table
 * This ensures that Google OAuth users have their profile data properly stored
 * 
 * IMPORTANT: This function ALWAYS preserves user-edited fields (like full_name/username).
 * Users can set their own custom username/name in their profile, and this sync will
 * NEVER overwrite their custom choice. It only updates fields that:
 * - Are empty/missing
 * - Match Google's default values exactly
 * - Haven't been manually edited by the user
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

    // First, fetch the existing profile to check if user has manually edited fields
    const { data: existingProfileData } = await supabase
      .from('profiles')
      .select('full_name, profile_image_url, phone, bio, age, gender, badge')
      .eq('id', user.id)
      .single();

    const existingProfile = existingProfileData as any; // Type assertion for Supabase query result
    const userMetadata = user.user_metadata || {};
    
    // Extract Google's full name
    const googleFullName = userMetadata.full_name || userMetadata.name || 'Google User';
    const googleName = userMetadata.name || 'Google User';
    
    // Determine if we should update the name/username
    // NEVER overwrite if user has set a custom name that differs from Google's
    const currentName = existingProfile?.full_name;
    const isDefaultName = !currentName || 
                         currentName === 'Google User' || 
                         currentName === 'User' ||
                         currentName.trim() === '';
    
    // Only update name if:
    // 1. Profile doesn't exist (new user)
    // 2. Name is empty/missing
    // 3. Name matches Google's name exactly (user hasn't customized it)
    // 4. Name is a default value
    const shouldUpdateName = !existingProfile || 
                            isDefaultName ||
                            currentName === googleFullName ||
                            currentName === googleName;
    
    // Prepare profile data from Google metadata
    // Only update fields that haven't been manually edited by the user
    const profileData: any = {
      id: user.id,
      updated_at: new Date().toISOString()
    };

    // Only update full_name (username) if user hasn't customized it
    // This preserves the user's custom username/name choice
    if (shouldUpdateName) {
      profileData.full_name = googleFullName;
    }
    // Otherwise, preserve the user's custom username/name (don't include it in the update)

    // Only update profile_image_url if it's missing or matches Google's exactly
    // This preserves the user's custom profile picture if they've uploaded their own
    const googleImageUrl = userMetadata.avatar_url || userMetadata.picture || userMetadata.image_url;
    const currentImageUrl = existingProfile?.profile_image_url;
    if (googleImageUrl && (!currentImageUrl || currentImageUrl === googleImageUrl)) {
      profileData.profile_image_url = googleImageUrl;
    }
    // If user has a custom profile image (different from Google's), preserve it

    // Only update phone if it's missing (preserve user's custom phone number)
    if (!existingProfile?.phone && (userMetadata.phone || user.phone)) {
      profileData.phone = userMetadata.phone || user.phone;
    }

    // Only update bio if it's missing or is the default "Google user" bio
    // Preserve user's custom bio if they've written one
    const googleBio = userMetadata.bio;
    const currentBio = existingProfile?.bio;
    if (googleBio && !googleBio.startsWith('Google user -')) {
      if (!currentBio || 
          currentBio === 'Google user' || 
          currentBio?.startsWith('Google user -') ||
          currentBio.trim() === '') {
        profileData.bio = googleBio;
      }
    }
    // If user has a custom bio, preserve it

    // Only update age/gender if they're missing (preserve user's custom values)
    if (!existingProfile?.age && userMetadata.age) {
      profileData.age = parseInt(userMetadata.age);
    }
    if (!existingProfile?.gender && userMetadata.gender) {
      profileData.gender = userMetadata.gender;
    }

    // Add a star badge for Google users (only if they don't have a badge already)
    // This is a one-time assignment and won't overwrite if user has a different badge
    if (!existingProfile || !existingProfile.badge) {
      profileData.badge = 'star';
    }

    // Ensure full_name is always present (required field)
    // Only set default if user hasn't customized it
    if (!profileData.full_name && (!currentName || isDefaultName)) {
      profileData.full_name = googleFullName || 'User';
    }

    // Only perform update if there are fields to update
    if (Object.keys(profileData).length > 2) { // More than just id and updated_at
      // Check if profile exists first
      if (existingProfile) {
        // Profile exists - perform update
        const { error } = await supabase
          .from('profiles')
          .update(profileData)
          .eq('id', user.id);

        if (error) {
          // Handle common database errors gracefully
          if (error.code === 'PGRST116' || error.code === '42501' || error.code === '400') {
            // Profile not found, permission denied, or bad request - user might not be properly set up
            console.warn('Profile sync skipped - user setup incomplete:', error.message);
            return;
          }
          console.error('Error syncing Google user to profile:', error);
        }
      } else {
        // Profile doesn't exist - perform insert (new user, first time sync)
        // For new users, we can safely use Google's data
        // Users can customize their profile later, and future syncs will preserve their choices
        const insertData = {
          ...profileData,
          full_name: profileData.full_name || googleFullName || 'User',
          created_at: new Date().toISOString()
        };

        const { error } = await supabase
          .from('profiles')
          .insert(insertData);

        if (error) {
          // Handle common database errors gracefully
          if (error.code === 'PGRST116' || error.code === '42501' || error.code === '400') {
            // Profile not found, permission denied, or bad request - user might not be properly set up
            console.warn('Profile sync skipped - user setup incomplete:', error.message);
            return;
          }
          console.error('Error syncing Google user to profile:', error);
        }
      }
    }
  } catch (error) {
    // Don't log unexpected errors for invalid auth states
    if (error instanceof Error && !error.message.includes('Invalid')) {
      console.error('Unexpected error during Google user sync:', error);
    }
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