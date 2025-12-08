-- Temporary bypass for RLS to allow anonymous posting
-- This should be removed in production and replaced with proper authentication

-- Disable RLS temporarily for posts table
ALTER TABLE public.posts DISABLE ROW LEVEL SECURITY;

-- Re-enable with a permissive policy for testing
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Create a bypass policy for testing
CREATE POLICY "Bypass RLS for testing" ON public.posts
FOR ALL USING (true);

-- Drop any existing restrictive policies
DROP POLICY IF EXISTS "Allow anonymous user posts" ON public.posts;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.posts;
