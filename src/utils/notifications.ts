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
  if (mentionedUserIds.length === 0) return [];

  try {
    const { data, error } = await supabase.rpc('create_mention_notifications', {
      user_ids: mentionedUserIds,
      post_uuid: postId,
      post_name: postTitle,
      sender_uuid: fromUserId,
    });

    if (error) {
      console.error('Error creating mention notifications:', error);
      return [];
    }

    console.log('Successfully created notifications:', data);
    return data || [];
  } catch (error) {
    console.error('Network error creating notifications:', error);
    return [];
  }
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
    .order('created_at', { ascending: false })
    .limit(50); // Limit to prevent huge queries

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

export const deleteNotification = async (notificationId: string) => {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId);

  if (error) {
    console.error('Error deleting notification:', error);
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
