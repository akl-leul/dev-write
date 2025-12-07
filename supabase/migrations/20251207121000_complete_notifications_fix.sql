-- Complete fix for notifications RLS and testing
-- This migration fixes the RLS policy and adds a test notification

-- First, ensure RLS is enabled
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;

-- Create comprehensive RLS policies for notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert notifications for others" ON public.notifications
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND 
    user_id != auth.uid()
  );

CREATE POLICY "Service role can insert any notifications" ON public.notifications
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications" ON public.notifications
  FOR DELETE USING (auth.uid() = user_id);

-- Create a function to test notification creation
CREATE OR REPLACE FUNCTION public.test_notification_creation()
RETURNS TABLE(
  notification_id uuid,
  user_id uuid,
  title text,
  message text,
  type text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert a test notification
  INSERT INTO public.notifications (user_id, title, message, type, post_id, from_user_id)
  VALUES (
    '02a9f764-2096-4fa3-bd38-1558195c554a', -- Replace with actual user ID
    'Test Notification',
    'This is a test notification to verify the system works',
    'mention',
    null,
    null
  )
  RETURNING id, user_id, title, message, type, created_at;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.test_notification_creation TO authenticated;

-- Create a helper function to check notifications for a user
CREATE OR REPLACE FUNCTION public.get_user_notifications(user_uuid uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  title text,
  message text,
  type text,
  post_id uuid,
  from_user_id uuid,
  read boolean,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    n.id,
    n.user_id,
    n.title,
    n.message,
    n.type,
    n.post_id,
    n.from_user_id,
    n.read,
    n.created_at
  FROM public.notifications n
  WHERE n.user_id = user_uuid
  ORDER BY n.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_notifications TO authenticated;
