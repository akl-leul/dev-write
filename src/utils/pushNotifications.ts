interface NotificationSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface PushNotificationData {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  requireInteraction?: boolean;
  silent?: boolean;
}

class PushNotificationManager {
  private subscription: PushSubscription | null = null;
  private isSupported: boolean = false;

  constructor() {
    this.isSupported = 'serviceWorker' in navigator && 'PushManager' in navigator && 'Notification' in window;
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported) {
      console.warn('Push notifications are not supported in this browser');
      return 'denied';
    }

    const permission = await Notification.requestPermission();
    console.log('Notification permission:', permission);
    return permission;
  }

  async subscribeToPush(): Promise<PushSubscription | null> {
    if (!this.isSupported) {
      console.warn('Push notifications are not supported');
      return null;
    }

    try {
      // Register service worker
      const registration = await navigator.serviceWorker.ready;
      
      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(
          import.meta.env.VITE_VAPID_PUBLIC_KEY || 'BLqWY1tC7UmsPRXt4J8e8XqB9J3A6R5S2T8V7N4M1K9P6Q3W2E5R8T1Y4U7I0O3'
        ) as BufferSource
      });

      this.subscription = subscription;
      
      // Store subscription in database (you'll need to implement this)
      await this.storeSubscription(subscription);
      
      console.log('Successfully subscribed to push notifications');
      return this.subscription;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return null;
    }
  }

  async unsubscribeFromPush(): Promise<void> {
    if (!this.subscription) {
      console.warn('No active subscription to unsubscribe from');
      return;
    }

    try {
      await this.subscription.unsubscribe();
      
      // Remove subscription from database
      await this.removeSubscription(this.subscription);
      
      this.subscription = null;
      console.log('Successfully unsubscribed from push notifications');
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
    }
  }

  async showNotification(data: PushNotificationData): Promise<void> {
    if (!this.isSupported) {
      console.warn('Notifications are not supported');
      return;
    }

    const permission = Notification.permission;
    if (permission !== 'granted') {
      console.warn('Notification permission not granted');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(data.title, {
        body: data.body,
        icon: data.icon,
        badge: data.badge,
        tag: data.tag,
        requireInteraction: data.requireInteraction,
        silent: data.silent
      });
    } catch (error) {
      console.error('Failed to show notification:', error);
      
      // Fallback to browser notification
      new Notification(data.title, {
        body: data.body,
        icon: data.icon || '/favicon-32x32.png',
        badge: data.badge || '/favicon-16x16.png',
        tag: data.tag,
        data: data.data,
        requireInteraction: data.requireInteraction || false,
        silent: data.silent || false,
      });
    }
  }

  async getSubscription(): Promise<PushSubscription | null> {
    if (!this.isSupported) return null;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      return subscription;
    } catch (error) {
      console.error('Failed to get subscription:', error);
      return null;
    }
  }

  private async storeSubscription(subscription: PushSubscription): Promise<void> {
    // Store subscription in your database
    // This is where you'd send the subscription to your server
    console.log('Storing subscription:', subscription);
    
    // Example implementation:
    // await fetch('/api/push-subscriptions', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(subscription)
    // });
  }

  private async removeSubscription(subscription: PushSubscription): Promise<void> {
    // Remove subscription from your database
    console.log('Removing subscription:', subscription);
    
    // Example implementation:
    // await fetch(`/api/push-subscriptions/${subscription.endpoint}`, {
    //   method: 'DELETE'
    // });
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  isPermissionGranted(): boolean {
    return Notification.permission === 'granted';
  }

  isPermissionDenied(): boolean {
    return Notification.permission === 'denied';
  }

  async checkSupport(): Promise<boolean> {
    return this.isSupported;
  }
}

// Create singleton instance
export const pushNotificationManager = new PushNotificationManager();

// Utility functions for different notification types
export const showLikeNotification = async (fromUser: string, postTitle: string) => {
  await pushNotificationManager.showNotification({
    title: 'New Like!',
    body: `${fromUser} liked your post "${postTitle}"`,
    icon: '/icons/like-notification.png',
    tag: 'like',
    data: { type: 'like', fromUser, postTitle }
  });
};

export const showCommentNotification = async (fromUser: string, postTitle: string, comment: string) => {
  await pushNotificationManager.showNotification({
    title: 'New Comment!',
    body: `${fromUser} commented on "${postTitle}": "${comment.substring(0, 50)}..."`,
    icon: '/icons/comment-notification.png',
    tag: 'comment',
    data: { type: 'comment', fromUser, postTitle, comment }
  });
};

export const showFollowNotification = async (fromUser: string) => {
  await pushNotificationManager.showNotification({
    title: 'New Follower!',
    body: `${fromUser} started following you`,
    icon: '/icons/follow-notification.png',
    tag: 'follow',
    data: { type: 'follow', fromUser }
  });
};

export const showSystemNotification = async (title: string, message: string) => {
  await pushNotificationManager.showNotification({
    title,
    body: message,
    icon: '/icons/system-notification.png',
    tag: 'system',
    data: { type: 'system' },
    requireInteraction: true
  });
};

export const showPostPublishedNotification = async (postTitle: string) => {
  await pushNotificationManager.showNotification({
    title: 'Post Published!',
    body: `Your post "${postTitle}" has been published successfully`,
    icon: '/icons/publish-notification.png',
    tag: 'publish',
    data: { type: 'publish', postTitle }
  });
};

export default pushNotificationManager;
