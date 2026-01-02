import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { 
  Bell, 
  BellOff, 
  Settings, 
  Heart, 
  MessageSquare, 
  Users, 
  FileText,
  AlertTriangle,
  Smartphone,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { pushNotificationManager } from '@/utils/pushNotifications';

interface NotificationPreferences {
  likes: boolean;
  comments: boolean;
  follows: boolean;
  posts: boolean;
  system: boolean;
  marketing: boolean;
}

export const PushNotificationSettings: React.FC = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    likes: true,
    comments: true,
    follows: true,
    posts: true,
    system: true,
    marketing: false
  });

  useEffect(() => {
    checkSupport();
    loadPreferences();
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

  const loadPreferences = () => {
    try {
      const saved = localStorage.getItem('notificationPreferences');
      if (saved) {
        setPreferences(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
    }
  };

  const savePreferences = (newPreferences: NotificationPreferences) => {
    try {
      localStorage.setItem('notificationPreferences', JSON.stringify(newPreferences));
      setPreferences(newPreferences);
    } catch (error) {
      console.error('Failed to save notification preferences:', error);
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
        toast.error('Notification permission denied. You can enable notifications in your browser settings.');
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

  const handlePreferenceChange = (key: keyof NotificationPreferences, value: boolean) => {
    const newPreferences = { ...preferences, [key]: value };
    savePreferences(newPreferences);
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

  if (!isSupported) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 text-gray-500">
            <Smartphone className="h-5 w-5" />
            <p>Push notifications are not supported in this browser.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Push Notification Status
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
                  <Smartphone className="h-4 w-4" />
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
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Notifications are blocked in your browser. To enable notifications, 
                go to your browser settings and allow notifications for this site.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      {isSubscribed && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              {/* Likes */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Heart className="h-4 w-4 text-red-500" />
                  <div>
                    <p className="font-medium">Likes</p>
                    <p className="text-sm text-muted-foreground">
                      When someone likes your posts
                    </p>
                  </div>
                </div>
                <Switch
                  checked={preferences.likes}
                  onCheckedChange={(checked) => handlePreferenceChange('likes', checked)}
                />
              </div>

              {/* Comments */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="font-medium">Comments</p>
                    <p className="text-sm text-muted-foreground">
                      When someone comments on your posts
                    </p>
                  </div>
                </div>
                <Switch
                  checked={preferences.comments}
                  onCheckedChange={(checked) => handlePreferenceChange('comments', checked)}
                />
              </div>

              {/* Follows */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-purple-500" />
                  <div>
                    <p className="font-medium">Everyone follows you</p>
                  </div>
                </div>
                <Switch
                  checked={preferences.follows}
                  onCheckedChange={(checked) => handlePreferenceChange('follows', checked)}
                />
              </div>

              {/* Posts */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-orange-500" />
                  <div>
                    <p className="font-medium">Post Updates</p>
                    <p className="text-sm text-muted-foreground">
                      When your posts are published or updated
                    </p>
                  </div>
                </div>
                <Switch
                  checked={preferences.posts}
                  onCheckedChange={(checked) => handlePreferenceChange('posts', checked)}
                />
              </div>

              {/* System */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <div>
                    <p className="font-medium">System Notifications</p>
                    <p className="text-sm text-muted-foreground">
                      Important account and system updates
                    </p>
                  </div>
                </div>
                <Switch
                  checked={preferences.system}
                  onCheckedChange={(checked) => handlePreferenceChange('system', checked)}
                />
              </div>

              {/* Marketing */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="font-medium">Marketing</p>
                    <p className="text-sm text-muted-foreground">
                      Promotional content and feature updates
                    </p>
                  </div>
                </div>
                <Switch
                  checked={preferences.marketing}
                  onCheckedChange={(checked) => handlePreferenceChange('marketing', checked)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PushNotificationSettings;
