-- Add background_image_url column to profiles table
ALTER TABLE profiles 
ADD COLUMN background_image_url TEXT;

-- Create index for background_image_url for faster queries
CREATE INDEX idx_profiles_background_image_url ON profiles(background_image_url);

-- Add social media columns (if not already added)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS twitter TEXT,
ADD COLUMN IF NOT EXISTS facebook TEXT,
ADD COLUMN IF NOT EXISTS linkedin TEXT,
ADD COLUMN IF NOT EXISTS instagram TEXT,
ADD COLUMN IF NOT EXISTS github TEXT,
ADD COLUMN IF NOT EXISTS youtube TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS show_phone BOOLEAN DEFAULT FALSE;

-- Create indexes for social media columns
CREATE INDEX IF NOT EXISTS idx_profiles_twitter ON profiles(twitter);
CREATE INDEX IF NOT EXISTS idx_profiles_facebook ON profiles(facebook);
CREATE INDEX IF NOT EXISTS idx_profiles_linkedin ON profiles(linkedin);
CREATE INDEX IF NOT EXISTS idx_profiles_instagram ON profiles(instagram);
CREATE INDEX IF NOT EXISTS idx_profiles_github ON profiles(github);
CREATE INDEX IF NOT EXISTS idx_profiles_youtube ON profiles(youtube);
CREATE INDEX IF NOT EXISTS idx_profiles_website ON profiles(website);
CREATE INDEX IF NOT EXISTS idx_profiles_show_phone ON profiles(show_phone);
