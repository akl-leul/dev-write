-- SQL code to assign 'user' role to all existing profiles
-- This ensures all current users have the basic user role

-- Update all profiles that don't have a role or have NULL role
UPDATE profiles 
SET role = 'user' 
WHERE role IS NULL OR role = '';

-- Alternative: Update all profiles regardless of current role (use with caution)
-- UPDATE profiles SET role = 'user';

-- Verify the update
SELECT 
    role,
    COUNT(*) as user_count
FROM profiles 
GROUP BY role 
ORDER BY user_count DESC;

-- Show profiles that were updated (if you want to see the changes)
-- SELECT id, full_name, email, role, updated_at
-- FROM profiles 
-- WHERE role = 'user'
-- ORDER BY updated_at DESC;
