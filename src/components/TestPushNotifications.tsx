import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { 
  Bell, 
  BellOff, 
  Send,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { pushNotificationManager, showLikeNotification, showCommentNotification, showFollowNotification, showSystemNotification, showPostPublishedNotification } from '@/utils/pushNotifications';

export const TestPushNotifications: React.FC = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    checkSupport();
  }, []);

  const checkSupport = async () => {
    const supported = await pushNotificationManager.checkSupport();
    setIsSupported(supported);
    
    if (supported) {
      const currentPermission = Notification.permission;
      setPermission(currentPermission);
      
      const subscription = await pushNotificationManager.getSubscription();
      setIsSubscribed(!!subscription);
    }
  };

  const handleRequestPermission = async () => {
    setIsLoading(true);
    try {
      const result = await pushNotificationManager.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        toast.success('Notification permission granted!');
        await handleSubscribe();
      } else if (result === 'denied') {
        toast.error('Notification permission denied.');
      }
    } catch (error) {
      console.error('Failed to request permission:', error);
      toast.error('Failed to request notification permission');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubscribe = async () => {
    setIsLoading(true);
    try {
      const subscription = await pushNotificationManager.subscribeToPush();
      if (subscription) {
        setIsSubscribed(true);
        toast.success('Successfully subscribed to push notifications!');
        console.log('Subscription:', subscription);
      } else {
        toast.error('Failed to subscribe to push notifications');
      }
    } catch (error) {
      console.error('Failed to subscribe:', error);
      toast.error('Failed to subscribe to push notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setIsLoading(true);
    try {
      await pushNotificationManager.unsubscribeFromPush();
      setIsSubscribed(false);
      toast.success('Successfully unsubscribed from push notifications');
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
      toast.error('Failed to unsubscribe from push notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const testNotifications = async () => {
    if (!pushNotificationManager.isPermissionGranted()) {
      toast.error('Please grant notification permission first');
      return;
    }

    // Test different notification types
    await showLikeNotification('John Doe', 'My Awesome Post');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await showCommentNotification('Jane Smith', 'My Awesome Post', 'Great article! Really enjoyed reading it.');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await showFollowNotification('Mike Johnson');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await showSystemNotification('System Update', 'Your account has been successfully updated');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await showPostPublishedNotification('My New Article');
    
    toast.success('Test notifications sent!');
  };

  const getPermissionStatus = () => {
    if (!isSupported) {
      return { icon: XCircle, text: 'Not Supported', color: 'text-gray-500' };
    }
    
    switch (permission) {
      case 'granted':
        return { icon: CheckCircle, text: 'Granted', color: 'text-green-600' };
      case 'denied':
        return { icon: XCircle, text: 'Denied', color: 'text-red-600' };
      default:
        return { icon: AlertTriangle, text: 'Not Requested', color: 'text-yellow-600' };
    }
  };

  const permissionStatus = getPermissionStatus();
  const StatusIcon = permissionStatus.icon;

  return (
    <div className="space-y-6 max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Push Notification Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <StatusIcon className={`h-5 w-5 ${permissionStatus.color}`} />
              <div>
                <p className="font-medium">Permission: {permissionStatus.text}</p>
                <p className="text-sm text-muted-foreground">
                  {isSubscribed ? 'Subscribed to push notifications' : 'Not subscribed'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {permission === 'default' && (
                <Button
                  onClick={handleRequestPermission}
                  disabled={isLoading}
                  className="gap-2"
                >
                  <Bell className="h-4 w-4" />
                  Enable Notifications
                </Button>
              )}
              
              {permission === 'granted' && !isSubscribed && (
                <Button
                  onClick={handleSubscribe}
                  disabled={isLoading}
                  className="gap-2"
                >
                  <Bell className="h-4 w-4" />
                  Subscribe
                </Button>
              )}
              
              {permission === 'granted' && isSubscribed && (
                <Button
                  onClick={handleUnsubscribe}
                  disabled={isLoading}
                  variant="outline"
                  className="gap-2"
                >
                  <BellOff className="h-4 w-4" />
                  Unsubscribe
                </Button>
              )}
            </div>
          </div>
          
          {permission === 'denied' && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">
                Notifications are blocked in your browser. To enable notifications, 
                go to your browser settings and allow notifications for this site.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {isSubscribed && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Test Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={testNotifications}
              className="w-full gap-2"
              disabled={!pushNotificationManager.isPermissionGranted()}
            >
              <Send className="h-4 w-4" />
              Send Test Notifications
            </Button>
            <p className="text-sm text-muted-foreground mt-2">
              This will send 5 different types of test notifications to verify the system works.
            </p>
          </CardContent>
        </Card>
      )}

      {!isSupported && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-gray-500">
              <XCircle className="h-5 w-5" />
              <p>Push notifications are not supported in this browser.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TestPushNotifications;
