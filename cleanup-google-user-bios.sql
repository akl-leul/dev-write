-- Clean up existing Google user profiles that have default "Google user -" bios
-- This will remove the generic bios and set them to NULL so users can add their own

UPDATE profiles 
SET bio = NULL 
WHERE bio LIKE 'Google user - %' 
   OR bio = 'Google user';

-- Also clean up any profiles with gender set to 'other' as default
UPDATE profiles 
SET gender = NULL 
WHERE gender = 'other' AND id IN (
    SELECT id FROM auth.users 
    WHERE identities::jsonb @> '[{"provider": "google"}]'
);

-- Add a comment for documentation
COMMENT ON COLUMN profiles.bio IS 'User bio - NULL for Google users until they set their own';
