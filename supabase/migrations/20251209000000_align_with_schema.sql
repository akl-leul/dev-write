-- Comprehensive migration to align database with provided schema
-- This migration fixes foreign key relationships and adds missing columns

-- ============================================================================
-- 1. Fix bookmarks table foreign key relationship
-- ============================================================================
-- Drop existing foreign key constraint if it references auth.users
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'bookmarks_user_id_fkey' 
        AND table_name = 'bookmarks'
        AND constraint_schema = 'public'
    ) THEN
        -- Check if it references auth.users
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu 
                ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage ccu 
                ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_name = 'bookmarks_user_id_fkey'
            AND ccu.table_schema = 'auth'
            AND ccu.table_name = 'users'
        ) THEN
            ALTER TABLE public.bookmarks DROP CONSTRAINT bookmarks_user_id_fkey;
        END IF;
    END IF;
END $$;

-- Add proper foreign key constraint referencing profiles
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'bookmarks_user_id_fkey' 
        AND table_name = 'bookmarks'
        AND constraint_schema = 'public'
    ) THEN
        ALTER TABLE public.bookmarks 
        ADD CONSTRAINT bookmarks_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Update RLS policies for bookmarks to work with profiles reference
-- Drop all existing bookmark policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own bookmarks" ON public.bookmarks;
DROP POLICY IF EXISTS "Users can insert their own bookmarks" ON public.bookmarks;
DROP POLICY IF EXISTS "Users can delete their own bookmarks" ON public.bookmarks;
DROP POLICY IF EXISTS "Users can manage their own bookmarks" ON public.bookmarks;
DROP POLICY IF EXISTS "Enable bookmark operations" ON public.bookmarks;

-- Create new policies that work with profiles reference
CREATE POLICY "Users can view their own bookmarks" ON public.bookmarks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bookmarks" ON public.bookmarks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bookmarks" ON public.bookmarks
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- 2. Create tags table if it doesn't exist
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tags (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  color text DEFAULT '#3B82F6',
  CONSTRAINT tags_pkey PRIMARY KEY (id)
);

-- Enable RLS on tags if not already enabled
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- Tags are viewable by everyone
DROP POLICY IF EXISTS "Tags are viewable by everyone" ON public.tags;
CREATE POLICY "Tags are viewable by everyone"
ON public.tags
FOR SELECT
USING (true);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_tags_name ON public.tags(name);
CREATE INDEX IF NOT EXISTS idx_tags_slug ON public.tags(slug);

-- ============================================================================
-- 3. Add missing columns to posts table
-- ============================================================================
-- Add is_published column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'posts' 
        AND column_name = 'is_published'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.posts ADD COLUMN is_published boolean DEFAULT true;
    END IF;
END $$;

-- Add views_count column if it doesn't exist (note: views already exists, views_count is redundant but in schema)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'posts' 
        AND column_name = 'views_count'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.posts ADD COLUMN views_count integer DEFAULT 0;
        -- Sync existing views to views_count
        UPDATE public.posts SET views_count = views WHERE views_count IS NULL;
    END IF;
END $$;

-- ============================================================================
-- 4. Add approved column to comments table
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'comments' 
        AND column_name = 'approved'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.comments ADD COLUMN approved boolean NOT NULL DEFAULT false;
    END IF;
END $$;

-- ============================================================================
-- 5. Add updated_at column to notifications table
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'updated_at'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.notifications ADD COLUMN updated_at timestamp with time zone DEFAULT now();
    END IF;
END $$;

-- Add trigger to update updated_at on notifications
DROP TRIGGER IF EXISTS set_notifications_updated_at ON public.notifications;
CREATE TRIGGER set_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 6. Add blocked column to profiles table
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'blocked'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN blocked boolean DEFAULT false;
    END IF;
END $$;

-- ============================================================================
-- 7. Ensure post_tags table uses uuid_generate_v4() for id default
-- ============================================================================
-- Update post_tags id default if needed (schema shows uuid_generate_v4)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'post_tags' 
        AND column_name = 'id'
        AND table_schema = 'public'
        AND column_default != 'uuid_generate_v4()'
    ) THEN
        ALTER TABLE public.post_tags 
        ALTER COLUMN id SET DEFAULT uuid_generate_v4();
    END IF;
END $$;

-- ============================================================================
-- 8. Ensure all tables use consistent UUID generation
-- ============================================================================
-- Update bookmarks to use gen_random_uuid() (as per schema)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bookmarks' 
        AND column_name = 'id'
        AND table_schema = 'public'
        AND column_default != 'gen_random_uuid()'
    ) THEN
        ALTER TABLE public.bookmarks 
        ALTER COLUMN id SET DEFAULT gen_random_uuid();
    END IF;
END $$;

-- Update followers to use gen_random_uuid() (as per schema)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'followers' 
        AND column_name = 'id'
        AND table_schema = 'public'
        AND column_default != 'gen_random_uuid()'
    ) THEN
        ALTER TABLE public.followers 
        ALTER COLUMN id SET DEFAULT gen_random_uuid();
    END IF;
END $$;

-- Update notifications to use gen_random_uuid() (as per schema)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'id'
        AND table_schema = 'public'
        AND column_default != 'gen_random_uuid()'
    ) THEN
        ALTER TABLE public.notifications 
        ALTER COLUMN id SET DEFAULT gen_random_uuid();
    END IF;
END $$;

-- ============================================================================
-- 9. Ensure post_tags has proper primary key constraint name
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'post_tags_pkey' 
        AND table_name = 'post_tags'
        AND constraint_schema = 'public'
    ) THEN
        -- Check if there's a different primary key constraint
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_type = 'PRIMARY KEY'
            AND table_name = 'post_tags'
            AND constraint_schema = 'public'
        ) THEN
            -- Drop existing primary key and recreate with proper name
            ALTER TABLE public.post_tags DROP CONSTRAINT IF EXISTS post_tags_pkey;
            ALTER TABLE public.post_tags ADD CONSTRAINT post_tags_pkey PRIMARY KEY (id);
        ELSE
            ALTER TABLE public.post_tags ADD CONSTRAINT post_tags_pkey PRIMARY KEY (id);
        END IF;
    END IF;
END $$;

-- ============================================================================
-- 10. Add missing unique constraint on bookmarks (user_id, post_id)
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'bookmarks_user_id_post_id_key' 
        AND table_name = 'bookmarks'
        AND constraint_schema = 'public'
    ) THEN
        -- Check if unique constraint exists with different name
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu 
                ON tc.constraint_name = kcu.constraint_name
            WHERE tc.table_name = 'bookmarks'
            AND tc.constraint_type = 'UNIQUE'
            AND kcu.column_name IN ('user_id', 'post_id')
        ) THEN
            ALTER TABLE public.bookmarks 
            ADD CONSTRAINT bookmarks_user_id_post_id_key UNIQUE (user_id, post_id);
        END IF;
    END IF;
END $$;

-- ============================================================================
-- 11. Ensure notifications has proper foreign key constraints
-- ============================================================================
-- Ensure notifications.post_id references posts(id) with SET NULL on delete
DO $$
BEGIN
    -- Drop existing constraint if it has wrong ON DELETE action
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'notifications_post_id_fkey' 
        AND table_name = 'notifications'
        AND constraint_schema = 'public'
    ) THEN
        -- Check if it's CASCADE and needs to be changed to SET NULL
        ALTER TABLE public.notifications 
        DROP CONSTRAINT IF EXISTS notifications_post_id_fkey;
    END IF;
    
    -- Add constraint with SET NULL (post_id is nullable in schema)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'notifications_post_id_fkey' 
        AND table_name = 'notifications'
        AND constraint_schema = 'public'
    ) THEN
        ALTER TABLE public.notifications 
        ADD CONSTRAINT notifications_post_id_fkey 
        FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Ensure notifications.from_user_id references profiles(id) with SET NULL on delete
DO $$
BEGIN
    -- Drop existing constraint if it has wrong ON DELETE action
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'notifications_from_user_id_fkey' 
        AND table_name = 'notifications'
        AND constraint_schema = 'public'
    ) THEN
        ALTER TABLE public.notifications 
        DROP CONSTRAINT IF EXISTS notifications_from_user_id_fkey;
    END IF;
    
    -- Add constraint with SET NULL (from_user_id is nullable in schema)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'notifications_from_user_id_fkey' 
        AND table_name = 'notifications'
        AND constraint_schema = 'public'
    ) THEN
        ALTER TABLE public.notifications 
        ADD CONSTRAINT notifications_from_user_id_fkey 
        FOREIGN KEY (from_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ============================================================================
-- 12. Create indexes for performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON public.bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_post_id ON public.bookmarks(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_approved ON public.comments(approved) WHERE approved = false;
CREATE INDEX IF NOT EXISTS idx_profiles_blocked ON public.profiles(blocked) WHERE blocked = true;
CREATE INDEX IF NOT EXISTS idx_notifications_updated_at ON public.notifications(updated_at);

-- ============================================================================
-- 13. Comments on schema alignment
-- ============================================================================
COMMENT ON COLUMN public.posts.is_published IS 'Legacy field for backward compatibility, use status instead';
COMMENT ON COLUMN public.posts.views_count IS 'Redundant with views column, kept for schema compatibility';
COMMENT ON COLUMN public.comments.approved IS 'Whether the comment has been approved by a moderator';
COMMENT ON COLUMN public.profiles.blocked IS 'Whether the user profile is blocked';
COMMENT ON COLUMN public.notifications.updated_at IS 'Timestamp when notification was last updated';

