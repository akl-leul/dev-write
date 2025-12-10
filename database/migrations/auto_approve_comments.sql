-- Migration to auto-approve comments by default
-- This changes the default value of the approved column from false to true

-- First, update existing unapproved comments to be approved
UPDATE public.comments 
SET approved = true 
WHERE approved = false;

-- Then change the default value for new comments
ALTER TABLE public.comments 
ALTER COLUMN approved SET DEFAULT true;

-- Optional: Add a comment to document the change
COMMENT ON COLUMN public.comments.approved IS 'Comments are approved by default for better user experience';
