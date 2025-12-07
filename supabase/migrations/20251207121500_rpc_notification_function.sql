-- Create a database function to handle mention notifications
-- This bypasses RLS by using SECURITY DEFINER

CREATE OR REPLACE FUNCTION public.create_mention_notifications(
  user_ids UUID[],
  post_uuid UUID,
  post_name TEXT,
  sender_uuid UUID
)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  title TEXT,
  message TEXT,
  type TEXT,
  post_id UUID,
  from_user_id UUID,
  read BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert notifications for all mentioned users
  INSERT INTO public.notifications (
    user_id, 
    title, 
    message, 
    type, 
    post_id, 
    from_user_id,
    read,
    created_at
  )
  SELECT 
    user_id,
    'You were tagged in a post',
    'You were tagged in "' || post_name || '"',
    'mention',
    post_uuid,
    sender_uuid,
    false,
    NOW()
  FROM UNNEST(user_ids) AS user_id
  WHERE user_id != sender_uuid; -- Don't notify yourself
  
  -- Return the created notifications
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
  WHERE n.post_id = post_uuid 
    AND n.type = 'mention'
    AND n.from_user_id = sender_uuid
    AND n.user_id = ANY(user_ids)
  ORDER BY n.created_at DESC;
END;
$$;

-- Grant execution permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_mention_notifications TO authenticated;
