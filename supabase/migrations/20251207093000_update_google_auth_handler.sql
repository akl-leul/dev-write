-- Update Google OAuth user handling
-- This migration updates the handle_new_user function to properly handle Google OAuth users

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Recreate handle_new_user with Google OAuth support
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Handle Google OAuth users
  IF NEW.raw_user_meta_data IS NOT NULL THEN
    INSERT INTO public.profiles (
      id, 
      full_name, 
      phone, 
      profile_image_url, 
      badge,
      bio,
      age,
      gender
    )
    VALUES (
      NEW.id,
      COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        'User'
      ),
      COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone),
      COALESCE(
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'picture',
        NEW.raw_user_meta_data->>'image_url'
      ),
      CASE 
        WHEN NEW.raw_user_meta_data->>'provider' = 'google' THEN 'star'
        ELSE NULL
      END,
      COALESCE(NEW.raw_user_meta_data->>'bio', 'Google user'),
      CASE 
        WHEN NEW.raw_user_meta_data->>'age' ~ '^[0-9]+$' THEN (NEW.raw_user_meta_data->>'age')::integer
        ELSE NULL
      END,
      COALESCE(NEW.raw_user_meta_data->>'gender', 'other')
    );
  ELSE
    -- Handle regular email users
    INSERT INTO public.profiles (id, full_name, phone)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
      NEW.phone
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
