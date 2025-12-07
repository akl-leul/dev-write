-- Add social media columns to profiles table
ALTER TABLE profiles 
ADD COLUMN twitter TEXT,
ADD COLUMN facebook TEXT,
ADD COLUMN linkedin TEXT,
ADD COLUMN instagram TEXT,
ADD COLUMN github TEXT,
ADD COLUMN youtube TEXT,
ADD COLUMN website TEXT,
ADD COLUMN show_phone BOOLEAN DEFAULT FALSE;

-- Add indexes for better performance (optional)
CREATE INDEX idx_profiles_twitter ON profiles(twitter) WHERE twitter IS NOT NULL;
CREATE INDEX idx_profiles_facebook ON profiles(facebook) WHERE facebook IS NOT NULL;
CREATE INDEX idx_profiles_linkedin ON profiles(linkedin) WHERE linkedin IS NOT NULL;
CREATE INDEX idx_profiles_instagram ON profiles(instagram) WHERE instagram IS NOT NULL;
CREATE INDEX idx_profiles_github ON profiles(github) WHERE github IS NOT NULL;
CREATE INDEX idx_profiles_youtube ON profiles(youtube) WHERE youtube IS NOT NULL;
CREATE INDEX idx_profiles_website ON profiles(website) WHERE website IS NOT NULL;
CREATE INDEX idx_profiles_show_phone ON profiles(show_phone) WHERE show_phone = TRUE;
