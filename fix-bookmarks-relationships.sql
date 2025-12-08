-- Fix bookmarks table relationships
-- First, drop existing constraints if they exist
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'bookmarks_user_id_fkey' 
        AND table_name = 'bookmarks'
    ) THEN
        ALTER TABLE bookmarks DROP CONSTRAINT bookmarks_user_id_fkey;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'bookmarks_post_id_fkey' 
        AND table_name = 'bookmarks'
    ) THEN
        ALTER TABLE bookmarks DROP CONSTRAINT bookmarks_post_id_fkey;
    END IF;
END $$;

-- Add proper foreign key constraints
ALTER TABLE bookmarks 
ADD CONSTRAINT bookmarks_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE bookmarks 
ADD CONSTRAINT bookmarks_post_id_fkey 
FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;
