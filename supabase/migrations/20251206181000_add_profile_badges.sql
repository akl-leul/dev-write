-- Add badge field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN badge TEXT DEFAULT NULL;

-- Add comment to explain the badge field
COMMENT ON COLUMN public.profiles.badge IS 'Profile badge icon name (e.g., "star", "verified", "trophy", etc.)';

-- Create index for faster queries if needed
CREATE INDEX idx_profiles_badge ON public.profiles(badge) WHERE badge IS NOT NULL;
