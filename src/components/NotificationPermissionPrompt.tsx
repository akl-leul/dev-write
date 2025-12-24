import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Bell, BellOff, X, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { pushNotificationManager } from '@/utils/pushNotifications';

export const NotificationPermissionPrompt: React.FC = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    const checkNotificationStatus = async () => {
      const isSupported = await pushNotificationManager.checkSupport();
      
      if (!isSupported) {
        return; // Don't show if not supported
      }

      const currentPermission = Notification.permission;
      setPermission(currentPermission);

      // Show prompt if permission is default and user hasn't dismissed recently
      const dismissedTime = localStorage.getItem('notification-permission-dismissed');
      const wasRecentlyDismissed = dismissedTime && Date.now() - parseInt(dismissedTime) < 3 * 24 * 60 * 60 * 1000; // 3 days

      if (currentPermission === 'default' && !wasRecentlyDismissed) {
        // Show after 10 seconds of user activity
        setTimeout(() => {
          setShowPrompt(true);
        }, 10000);
      }
    };

    checkNotificationStatus();
  }, []);

  const handleEnableNotifications = async () => {
    setIsLoading(true);
    try {
      const result = await pushNotificationManager.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        toast.success('Notifications enabled! You\'ll receive updates about your activity.');
        setShowPrompt(false);
        
        // Try to subscribe to push notifications
        const subscription = await pushNotificationManager.subscribeToPush();
        if (subscription) {
          toast.success('Push notifications activated!');
        }
      } else if (result === 'denied') {
        toast.error('Notifications denied. You can enable them in browser settings anytime.');
        setShowPrompt(false);
      }
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      toast.error('Failed to enable notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('notification-permission-dismissed', Date.now().toString());
  };

  if (!showPrompt || permission !== 'default') {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-4 z-40 animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <div className="flex-shrink-0">
            <Bell className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
              Enable Notifications
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Stay updated with likes, comments, and mentions. Get real-time notifications for your activity.
            </p>
            <div className="mt-3 flex space-x-2">
              <Button 
                onClick={handleEnableNotifications}
                size="sm"
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isLoading ? (
                  <>
                    <Smartphone className="h-4 w-4 mr-2 animate-pulse" />
                    Enabling...
                  </>
                ) : (
                  <>
                    <Bell className="h-4 w-4 mr-2" />
                    Enable
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleDismiss}
                className="border-slate-300 dark:border-slate-600"
                disabled={isLoading}
              >
                Not Now
              </Button>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="ml-2 -mr-1 h-8 w-8 p-0"
          disabled={isLoading}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default NotificationPermissionPrompt;
