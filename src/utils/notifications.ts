import { supabase } from '@/integrations/supabase/client';

export interface NotificationData {
  user_id: string;
  title: string;
  message: string;
  type: 'mention' | 'like' | 'comment' | 'follow';
  post_id?: string;
  from_user_id?: string;
}

export const createNotification = async (notification: NotificationData) => {
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      ...notification,
      read: false,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating notification:', error);
    return null;
  }

  return data;
};

export const createMentionNotifications = async (
  mentionedUserIds: string[],
  postId: string,
  postTitle: string,
  fromUserId: string
) => {
  const notifications = mentionedUserIds.map(userId => ({
    user_id: userId,
    title: 'You were mentioned in a post',
    message: `You were tagged in "${postTitle}"`,
    type: 'mention' as const,
    post_id: postId,
    from_user_id: fromUserId,
  }));

  if (notifications.length === 0) return [];

  const { data, error } = await supabase
    .from('notifications')
    .insert(notifications)
    .select();

  if (error) {
    console.error('Error creating mention notifications:', error);
    return [];
  }

  return data || [];
};

export const getUnreadNotifications = async (userId: string) => {
  const { data, error } = await supabase
    .from('notifications')
    .select(`
      *,
      from_user:profiles!notifications_from_user_id_fkey (
        full_name,
        profile_image_url
      )
    `)
    .eq('user_id', userId)
    .eq('read', false)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }

  return data || [];
};

export const markNotificationAsRead = async (notificationId: string) => {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId);

  if (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }

  return true;
};

export const markAllNotificationsAsRead = async (userId: string) => {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);

  if (error) {
    console.error('Error marking all notifications as read:', error);
    return false;
  }

  return true;
};
