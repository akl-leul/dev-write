import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Bell, Check, FileText, Heart, MessageCircle, UserPlus, Sparkles } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export const NotificationDropdown = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [hasNewNotification, setHasNewNotification] = useState(false);

  const { data: notifications } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          from_user:from_user_id (full_name, profile_image_url),
          posts:post_id (title, slug)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Real-time subscription for notifications
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('New notification:', payload);
          setHasNewNotification(true);
          queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
          
          // Show toast for new notification
          const notification = payload.new as any;
          toast(notification.title, {
            description: notification.message,
            action: notification.post_id ? {
              label: 'View',
              onClick: () => navigate(`/post/${notification.posts?.slug}`),
            } : undefined,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient, navigate]);

  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
      setHasNewNotification(false);
    },
  });

  const unreadCount = notifications?.filter((n: any) => !n.read).length || 0;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_post':
        return (
          <div className="p-2 bg-purple-50 text-purple-600 rounded-full shrink-0">
            <FileText className="h-4 w-4" />
          </div>
        );
      case 'like':
        return (
          <div className="p-2 bg-red-50 text-red-500 rounded-full shrink-0">
            <Heart className="h-4 w-4 fill-current" />
          </div>
        );
      case 'comment':
        return (
          <div className="p-2 bg-blue-50 text-blue-600 rounded-full shrink-0">
            <MessageCircle className="h-4 w-4" />
          </div>
        );
      case 'follow':
        return (
          <div className="p-2 bg-green-50 text-green-600 rounded-full shrink-0">
            <UserPlus className="h-4 w-4" />
          </div>
        );
      default:
        return (
          <div className="p-2 bg-slate-100 text-slate-600 rounded-full shrink-0">
            <Bell className="h-4 w-4" />
          </div>
        );
    }
  };

  const handleNotificationClick = (notification: any) => {
    // Only mark as read when the notification is actually clicked
    // and it's not already read
    if (!notification.read) {
      markAsRead.mutate(notification.id);
    }
    
    // Navigate based on notification type
    if (notification.type === 'follow' && notification.from_user_id) {
      navigate(`/author/${notification.from_user_id}`);
    } else if (notification.posts?.slug) {
      navigate(`/post/${notification.posts.slug}`);
    }
  };

  const handleDropdownOpen = () => {
    // We no longer mark notifications as read just by opening the dropdown
    // Only update the UI state to stop the bell animation
    setHasNewNotification(false);
  };

  if (!user) return null;

  return (
    <DropdownMenu onOpenChange={(open) => {
      if (open) {
        handleDropdownOpen();
      }
    }}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl w-10 h-10 transition-colors">
          <Bell className={`h-5 w-5 ${hasNewNotification ? 'animate-bounce' : ''}`} />
          {unreadCount > 0 && (
            <span className={`absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-red-500 border-2 border-white text-[10px] text-white font-bold flex items-center justify-center ${hasNewNotification ? 'animate-pulse' : ''}`}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-80 sm:w-96 max-h-[85vh] overflow-y-auto rounded-2xl border-slate-100 shadow-xl p-0 bg-white">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-slate-100 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900">Notifications</span>
            {unreadCount > 0 && (
              <span className="bg-blue-50 text-blue-600 text-xs font-bold px-2 py-0.5 rounded-full">
                {unreadCount} new
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
              onClick={(e) => {
                e.preventDefault();
                markAllAsRead.mutate();
              }}
            >
              <Check className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        
        <div className="py-2">
          {notifications?.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
                <Sparkles className="h-6 w-6" />
              </div>
              <p className="text-slate-900 font-medium">No notifications yet</p>
              <p className="text-sm text-slate-500">We'll let you know when something arrives.</p>
            </div>
          ) : (
            notifications?.map((notification: any) => (
              <DropdownMenuItem
                key={notification.id}
                className={`flex items-start gap-4 px-4 py-3 cursor-pointer focus:bg-slate-400 transition-colors border-l-2 ${
                  !notification.read 
                    ? 'border-blue-500 bg-blue-50/30' 
                    : 'border-transparent'
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                {getNotificationIcon(notification.type)}
                
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="text-sm text-slate-900 leading-snug">
                    {notification.type === 'follow' && (
                      <p><span className="font-semibold">{notification.from_user?.full_name || 'Someone'}</span> started following you</p>
                    )}
                    {notification.type === 'like' && (
                      <p><span className="font-semibold">{notification.from_user?.full_name || 'Someone'}</span> liked your post</p>
                    )}
                    {notification.type === 'comment' && (
                      <p><span className="font-semibold">{notification.from_user?.full_name || 'Someone'}</span> commented on your post</p>
                    )}
                    {notification.type === 'new_post' && notification.from_user?.full_name && (
                      <p><span className="font-semibold">{notification.from_user.full_name}</span> posted something new</p>
                    )}
                    {notification.type === 'new_post' && !notification.from_user?.full_name && (
                      <p>New post from <span className="font-semibold">{notification.from_user?.full_name || 'a user'}</span></p>
                    )}
                    {!['follow', 'like', 'comment', 'new_post'].includes(notification.type) && (
                      <p>{notification.message}</p>
                    )}
                  </div>
                  
                  {notification.message && !['follow', 'like', 'comment', 'new_post'].includes(notification.type) && (
                    <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">
                      {notification.message}
                    </p>
                  )}
                  
                  <p className="text-xs text-slate-400 font-medium pt-1">
                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                  </p>
                </div>
                
                {!notification.read && (
                  <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 self-center animate-pulse" />
                )}
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
