-- Fix notifications RLS policy to allow users to create notifications
-- This allows authenticated users to insert notifications for other users

CREATE POLICY "Users can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND 
    user_id != auth.uid()  -- Users can create notifications for others but not themselves
  );

-- Also enable RLS on notifications table (in case it's not enabled)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
