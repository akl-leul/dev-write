const CACHE_NAME = 'chronicle-v1';
const STATIC_CACHE = 'chronicle-static-v1';
const DYNAMIC_CACHE = 'chronicle-dynamic-v1';

// Static assets to cache
const STATIC_ASSETS = [
  '/',
  '/src/main.tsx',
  '/src/index.css',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/apple-touch-icon.png',
  '/manifest.json'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Service Worker: Static assets cached');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Service Worker: Failed to cache static assets', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip external requests (API calls, CDN, etc.)
  if (!request.url.startsWith(self.location.origin)) {
    return;
  }
  
  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {
        // Return cached version if available
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Otherwise fetch from network
        return fetch(request)
          .then(response => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200) {
              return response;
            }
            
            // Clone the response since it can only be used once
            const responseToCache = response.clone();
            
            // Cache the response for future use
            caches.open(DYNAMIC_CACHE)
              .then(cache => {
                cache.put(request, responseToCache);
              })
              .catch(error => {
                console.error('Service Worker: Failed to cache dynamic content', error);
              });
            
            return response;
          })
          .catch(error => {
            console.error('Service Worker: Network request failed', error);
            
            // Return offline page for navigation requests
            if (request.destination === 'document') {
              return caches.match('/');
            }
            
            // For other requests, return a basic offline response
            return new Response('Offline - Please check your internet connection', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: {
                'Content-Type': 'text/plain'
              }
            });
          });
      })
  );
});

// Background sync for offline actions (optional)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-posts') {
    event.waitUntil(syncOfflinePosts());
  }
});

// Push notifications - Enhanced handler
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push event received');
  
  let notificationData = {
    title: 'Chronicle',
    body: 'New notification from Chronicle',
    icon: '/favicon-32x32.png',
    badge: '/favicon-16x16.png',
    tag: 'general',
    data: {},
    actions: [],
    requireInteraction: false,
    silent: false
  };

  // Parse push data
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = { ...notificationData, ...data };
      
      // Customize based on notification type
      switch (data.type) {
        case 'like':
          notificationData.icon = '/icons/like-notification.png';
          notificationData.actions = [
            {
              action: 'view-post',
              title: 'View Post',
              icon: '/icons/eye.png'
            }
          ];
          break;
          
        case 'comment':
          notificationData.icon = '/icons/comment-notification.png';
          notificationData.actions = [
            {
              action: 'view-comment',
              title: 'View Comment',
              icon: '/icons/eye.png'
            },
            {
              action: 'reply',
              title: 'Reply',
              icon: '/icons/reply.png'
            }
          ];
          break;
          
        case 'follow':
          notificationData.icon = '/icons/follow-notification.png';
          notificationData.actions = [
            {
              action: 'view-profile',
              title: 'View Profile',
              icon: '/icons/user.png'
            }
          ];
          break;
          
        case 'system':
          notificationData.icon = '/icons/system-notification.png';
          notificationData.requireInteraction = true;
          break;
          
        case 'publish':
          notificationData.icon = '/icons/publish-notification.png';
          notificationData.actions = [
            {
              action: 'view-post',
              title: 'View Post',
              icon: '/icons/eye.png'
            },
            {
              action: 'share',
              title: 'Share',
              icon: '/icons/share.png'
            }
          ];
          break;
      }
    } catch (error) {
      console.error('Service Worker: Failed to parse push data', error);
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      data: notificationData.data,
      actions: notificationData.actions,
      requireInteraction: notificationData.requireInteraction,
      silent: notificationData.silent,
      vibrate: [200, 100, 200],
      timestamp: Date.now(),
      renotify: true
    })
  );
});

// Enhanced notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification click received', event.action);
  
  event.notification.close();
  
  const notificationData = event.notification.data || {};
  
  // Handle different notification actions
  switch (event.action) {
    case 'view-post':
    case 'view-comment':
      if (notificationData.postId) {
        event.waitUntil(
          clients.openWindow(`/post/${notificationData.postId}`)
        );
      } else {
        event.waitUntil(
          clients.openWindow('/feed')
        );
      }
      break;
      
    case 'view-profile':
      if (notificationData.fromUser) {
        event.waitUntil(
          clients.openWindow(`/author/${notificationData.fromUser}`)
        );
      } else {
        event.waitUntil(
          clients.openWindow('/profile')
        );
      }
      break;
      
    case 'reply':
      if (notificationData.postId) {
        event.waitUntil(
          clients.openWindow(`/post/${notificationData.postId}#reply`)
        );
      }
      break;
      
    case 'share':
      if (notificationData.postId) {
        event.waitUntil(
          clients.openWindow(`/post/${notificationData.postId}`)
        );
      }
      break;
      
    case 'explore':
    case 'close':
    default:
      event.waitUntil(
        clients.matchAll({ type: 'window' })
          .then(clientList => {
            for (const client of clientList) {
              if (client.url === '/' || client.url.includes('/feed')) {
                return client.focus();
              }
            }
            return clients.openWindow('/');
          })
      );
      break;
  }
});

// Handle notification close events
self.addEventListener('notificationclose', (event) => {
  console.log('Service Worker: Notification closed', event.notification.data);
  
  const notificationData = event.notification.data || {};
  
  if (notificationData.id) {
    console.log('Marking notification as read:', notificationData.id);
  }
});

// Helper function for syncing offline posts
async function syncOfflinePosts() {
  try {
    // Implementation for syncing offline posts when back online
    console.log('Service Worker: Syncing offline posts...');
  } catch (error) {
    console.error('Service Worker: Failed to sync offline posts', error);
  }
}
