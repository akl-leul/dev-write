-- Create post_views table for view deduplication
CREATE TABLE public.post_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id),
  UNIQUE(post_id, session_id)
);

-- Enable RLS
ALTER TABLE public.post_views ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Post views are insertable by anyone"
ON public.post_views
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Post views are viewable by post authors"
ON public.post_views
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.posts 
    WHERE posts.id = post_views.post_id 
    AND posts.author_id = auth.uid()
  )
);

-- Create index for faster lookups
CREATE INDEX idx_post_views_post_id ON public.post_views(post_id);
CREATE INDEX idx_post_views_user_id ON public.post_views(user_id);

-- Create tags table for post tagging
CREATE TABLE public.tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for tags
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tags are viewable by everyone"
ON public.tags
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create tags"
ON public.tags
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Create post_tags junction table
CREATE TABLE public.post_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, tag_id)
);

-- Enable RLS for post_tags
ALTER TABLE public.post_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Post tags are viewable by everyone"
ON public.post_tags
FOR SELECT
USING (true);

CREATE POLICY "Users can add tags to their own posts"
ON public.post_tags
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.posts 
    WHERE posts.id = post_tags.post_id 
    AND posts.author_id = auth.uid()
  )
);

CREATE POLICY "Users can remove tags from their own posts"
ON public.post_tags
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.posts 
    WHERE posts.id = post_tags.post_id 
    AND posts.author_id = auth.uid()
  )
);

-- Create reposts table
CREATE TABLE public.reposts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original_post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  quote_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, original_post_id)
);

-- Enable RLS for reposts
ALTER TABLE public.reposts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reposts are viewable by everyone"
ON public.reposts
FOR SELECT
USING (true);

CREATE POLICY "Users can create their own reposts"
ON public.reposts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reposts"
ON public.reposts
FOR DELETE
USING (auth.uid() = user_id);

-- Create indexes for reposts
CREATE INDEX idx_reposts_user_id ON public.reposts(user_id);
CREATE INDEX idx_reposts_original_post_id ON public.reposts(original_post_id);