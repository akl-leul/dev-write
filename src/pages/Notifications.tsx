import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Bell, Check, CheckCircle, AlertTriangle, Heart, MessageSquare, Users, FileText, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  post_id?: string;
  from_user_id?: string;
  read: boolean;
  created_at: string;
  updated_at?: string;
}

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAsRead, setMarkingAsRead] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please login to view notifications");
        return;
      }

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      setMarkingAsRead(prev => new Set(prev).add(notificationId));
      
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );
      
      toast.success("Notification marked as read");
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark as read');
    } finally {
      setMarkingAsRead(prev => {
        const newSet = new Set(prev);
        newSet.delete(notificationId);
        return newSet;
      });
    }
  };

  const markAllAsRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(notif => ({ ...notif, read: true }))
      );
      
      toast.success("All notifications marked as read");
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to mark all as read');
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
      toast.success("Notification deleted");
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'info':
      case 'system':
        return <Bell className="h-5 w-5" />;
      case 'like':
        return <Heart className="h-5 w-5" />;
      case 'comment':
        return <MessageSquare className="h-5 w-5" />;
      case 'follow':
        return <Users className="h-5 w-5" />;
      case 'post':
        return <FileText className="h-5 w-5" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5" />;
      default:
        return <Bell className="h-5 w-5" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'info':
      case 'system':
        return 'bg-blue-100 text-blue-600 border-blue-200';
      case 'like':
        return 'bg-red-100 text-red-600 border-red-200';
      case 'comment':
        return 'bg-green-100 text-green-600 border-green-200';
      case 'follow':
        return 'bg-purple-100 text-purple-600 border-purple-200';
      case 'post':
        return 'bg-orange-100 text-orange-600 border-orange-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-600 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Notifications - DevWrite</title>
        <meta name="description" content="View your notifications and updates" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">Notifications</h1>
                <p className="text-muted-foreground">
                  {unreadCount > 0 
                    ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
                    : 'All caught up! No new notifications.'
                  }
                </p>
              </div>
              
              {unreadCount > 0 && (
                <Button onClick={markAllAsRead} variant="outline" className="gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Mark All as Read
                </Button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          {notifications.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No notifications yet</h3>
                <p className="text-muted-foreground text-center">
                  When you receive notifications, they'll appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {notifications.map((notification) => (
                  <Card 
                    key={notification.id} 
                    className={`transition-all ${
                      !notification.read 
                        ? 'border-l-4 border-l-primary bg-primary/5' 
                        : 'border-l-4 border-l-transparent'
                    }`}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        {/* Icon */}
                        <div className={`p-2 rounded-full ${getNotificationColor(notification.type)}`}>
                          {getNotificationIcon(notification.type)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold text-foreground mb-1">
                                {notification.title}
                              </h3>
                              <p className="text-muted-foreground mb-2">
                                {notification.message}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(notification.created_at).toLocaleString()}
                              </p>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 ml-4">
                              {!notification.read && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => markAsRead(notification.id)}
                                  disabled={markingAsRead.has(notification.id)}
                                  className="gap-1"
                                >
                                  <Check className="h-3 w-3" />
                                  {markingAsRead.has(notification.id) ? '...' : 'Read'}
                                </Button>
                              )}
                              
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteNotification(notification.id)}
                                className="gap-1 text-muted-foreground hover:text-destructive"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>

                          {/* Special alerts for blocked/unblocked users */}
                          {notification.type === 'system' && (
                            <Alert className="mt-3">
                              <AlertTriangle className="h-4 w-4" />
                              <AlertDescription>
                                {notification.title === 'Account Blocked' ? (
                                  <>
                                    <strong>Account Access Restricted</strong><br />
                                    Your account has been blocked. Please contact our support team at 
                                    <a href="mailto:chronicle.ethiopia@gmail.com" className="text-primary underline ml-1">
                                      chronicle.ethiopia@gmail.com
                                    </a> for assistance.
                                  </>
                                ) : notification.title === 'Account Unblocked' ? (
                                  <>
                                    <strong>Welcome Back!</strong><br />
                                    Your account has been unblocked. You can now access all features normally.
                                  </>
                                ) : (
                                  notification.message
                                )}
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>
    </>
  );
}
