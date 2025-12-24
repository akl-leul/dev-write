import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initPerformanceTracking } from "./utils/performance";

// Register Service Worker for PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
        
        // Check for updates periodically
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000); // Check every hour
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

// Clear stale cache before app loads to prevent slow performance
if (typeof window !== 'undefined') {
  // Clear service worker cache if it exists
  if ('caches' in window) {
    caches.keys().then(cacheNames => {
      // Only clear caches older than 1 hour
      const CACHE_MAX_AGE = 60 * 60 * 1000;
      const now = Date.now();
      
      cacheNames.forEach(cacheName => {
        // Check if cache is stale (this is a simple check)
        // In production, you might want more sophisticated cache management
        const cacheTimestamp = localStorage.getItem(`cache_${cacheName}_timestamp`);
        if (cacheTimestamp) {
          const cacheAge = now - parseInt(cacheTimestamp);
          if (cacheAge > CACHE_MAX_AGE) {
            caches.delete(cacheName);
            localStorage.removeItem(`cache_${cacheName}_timestamp`);
          }
        }
      });
    }).catch(() => {
      // Silently fail if cache clearing fails
    });
  }
  
  // Clear very old localStorage items (keep only essential ones)
  try {
    const keysToKeep = ['theme', 'user_email', 'query_cache_timestamp'];
    const allKeys = Object.keys(localStorage);
    
    allKeys.forEach(key => {
      // Keep essential keys and Supabase auth keys
      if (!keysToKeep.includes(key) && !key.startsWith('sb-')) {
        const item = localStorage.getItem(key);
        if (item) {
          // Check if item is too large (> 1MB)
          const size = new Blob([item]).size;
          if (size > 1024 * 1024) {
            localStorage.removeItem(key);
          }
        }
      }
    });
  } catch (error) {
    // Silently fail if localStorage cleanup fails
    console.warn('Failed to clean localStorage:', error);
  }
}

// Initialize performance tracking (reduced overhead)
initPerformanceTracking();

createRoot(document.getElementById("root")!).render(<App />);
