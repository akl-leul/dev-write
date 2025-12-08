-- Migration to ensure users can update their profile information
-- This is especially important for Google OAuth users who need to edit their profiles
-- Created: 2025-12-10

-- ============================================================================
-- 1. Ensure RLS is enabled on profiles table
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. Drop existing update policies to recreate them with proper permissions
-- ============================================================================
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile with all fields" ON public.profiles;

-- ============================================================================
-- 3. Create comprehensive update policy that allows users to update all profile fields
-- ============================================================================
-- This policy allows users to update ALL fields in their own profile, including:
-- - full_name (so Google OAuth users can change their name)
-- - profile_image_url (so users can change their profile picture)
-- - phone, bio, age, gender (all user-editable fields)
-- - badge (for Google OAuth users)
-- - All other profile fields
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- 4. Ensure insert policy allows users to create their own profile
-- ============================================================================
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- 5. Ensure select policy allows users to view all profiles (for public display)
-- ============================================================================
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles
  FOR SELECT
  USING (true);

-- ============================================================================
-- 6. Create or replace function to handle profile updates with validation
-- ============================================================================
CREATE OR REPLACE FUNCTION public.validate_profile_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure updated_at is always set
  NEW.updated_at = now();
  
  -- Ensure full_name is not empty (required field)
  IF NEW.full_name IS NULL OR TRIM(NEW.full_name) = '' THEN
    RAISE EXCEPTION 'full_name cannot be empty';
  END IF;
  
  -- Validate age if provided
  IF NEW.age IS NOT NULL AND (NEW.age < 13 OR NEW.age > 120) THEN
    RAISE EXCEPTION 'age must be between 13 and 120';
  END IF;
  
  -- Ensure user can only update their own profile
  IF NEW.id != auth.uid() THEN
    RAISE EXCEPTION 'Users can only update their own profile';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. Create trigger to validate profile updates
-- ============================================================================
DROP TRIGGER IF EXISTS validate_profile_update_trigger ON public.profiles;
CREATE TRIGGER validate_profile_update_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_profile_update();

-- ============================================================================
-- 8. Create function to allow Google OAuth users to sync their profile
-- ============================================================================
-- This function can be called by the application to sync Google user data
-- It respects user edits and only updates fields that haven't been manually changed
CREATE OR REPLACE FUNCTION public.sync_google_profile(
  p_user_id UUID,
  p_full_name TEXT DEFAULT NULL,
  p_profile_image_url TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_bio TEXT DEFAULT NULL,
  p_age INTEGER DEFAULT NULL,
  p_gender TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  existing_profile RECORD;
BEGIN
  -- Get existing profile
  SELECT * INTO existing_profile
  FROM public.profiles
  WHERE id = p_user_id;
  
  -- Only proceed if user is updating their own profile
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Users can only sync their own profile';
  END IF;
  
  -- Update profile only if fields are provided and haven't been manually edited
  -- This logic matches the client-side logic in googleAuthSync.ts
  UPDATE public.profiles
  SET
    full_name = COALESCE(
      CASE 
        WHEN existing_profile.full_name IS NULL 
          OR existing_profile.full_name = 'Google User' 
          OR existing_profile.full_name = 'User'
        THEN p_full_name
        ELSE existing_profile.full_name
      END,
      existing_profile.full_name
    ),
    profile_image_url = COALESCE(
      CASE 
        WHEN existing_profile.profile_image_url IS NULL 
          OR existing_profile.profile_image_url = p_profile_image_url
        THEN p_profile_image_url
        ELSE existing_profile.profile_image_url
      END,
      existing_profile.profile_image_url
    ),
    phone = COALESCE(
      CASE 
        WHEN existing_profile.phone IS NULL 
        THEN p_phone
        ELSE existing_profile.phone
      END,
      existing_profile.phone
    ),
    bio = COALESCE(
      CASE 
        WHEN existing_profile.bio IS NULL 
          OR existing_profile.bio = 'Google user'
          OR existing_profile.bio LIKE 'Google user -%'
        THEN p_bio
        ELSE existing_profile.bio
      END,
      existing_profile.bio
    ),
    age = COALESCE(
      CASE 
        WHEN existing_profile.age IS NULL 
        THEN p_age
        ELSE existing_profile.age
      END,
      existing_profile.age
    ),
    gender = COALESCE(
      CASE 
        WHEN existing_profile.gender IS NULL 
        THEN p_gender
        ELSE existing_profile.gender
      END,
      existing_profile.gender
    ),
    updated_at = now()
  WHERE id = p_user_id;
  
  -- If profile doesn't exist, create it
  IF NOT FOUND THEN
    INSERT INTO public.profiles (
      id,
      full_name,
      profile_image_url,
      phone,
      bio,
      age,
      gender,
      badge,
      created_at,
      updated_at
    ) VALUES (
      p_user_id,
      COALESCE(p_full_name, 'User'),
      p_profile_image_url,
      p_phone,
      p_bio,
      p_age,
      p_gender,
      'star',
      now(),
      now()
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 9. Grant necessary permissions
-- ============================================================================
-- Ensure authenticated users can update their own profiles
GRANT UPDATE ON public.profiles TO authenticated;
GRANT INSERT ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;

-- ============================================================================
-- 10. Create index on profiles.id for better performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);

-- ============================================================================
-- 11. Add comments for documentation
-- ============================================================================
COMMENT ON POLICY "Users can update their own profile" ON public.profiles IS 
  'Allows users to update all fields in their own profile, including full_name, profile_image_url, phone, bio, age, gender, and badge. This is essential for Google OAuth users who need to edit their profile information.';

COMMENT ON FUNCTION public.sync_google_profile IS 
  'Syncs Google OAuth user data to the profiles table. Respects user edits and only updates fields that haven''t been manually changed. This function matches the client-side logic in googleAuthSync.ts.';

-- ============================================================================
-- Migration complete
-- ============================================================================
-- This migration ensures that:
-- 1. Users can update all fields in their own profile
-- 2. Google OAuth users can edit their profile information
-- 3. Profile updates are validated (full_name required, age range, etc.)
-- 4. A helper function exists for syncing Google profiles while respecting user edits
-- ============================================================================

