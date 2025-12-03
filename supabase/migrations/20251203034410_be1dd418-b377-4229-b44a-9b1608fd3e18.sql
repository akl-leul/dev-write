-- Create categories table
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Categories are viewable by everyone
CREATE POLICY "Categories are viewable by everyone"
ON public.categories
FOR SELECT
USING (true);

-- Add new columns to posts table
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS views INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS read_time INTEGER NOT NULL DEFAULT 5,
ADD COLUMN IF NOT EXISTS featured_image TEXT,
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(id);

-- Insert some default categories
INSERT INTO public.categories (name, slug) VALUES
('Technology', 'technology'),
('Lifestyle', 'lifestyle'),
('Business', 'business'),
('Health', 'health'),
('Travel', 'travel'),
('Food', 'food'),
('Entertainment', 'entertainment'),
('Education', 'education');