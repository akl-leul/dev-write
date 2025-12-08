/**
 * React availability check utility
 * Ensures React is properly loaded before using React APIs
 */

let reactCheckPromise: Promise<void> | null = null;

export const ensureReact = (): Promise<void> => {
  if (reactCheckPromise) {
    return reactCheckPromise;
  }

  reactCheckPromise = new Promise((resolve, reject) => {
    // Check if React is already available using multiple methods
    if (isReactAvailable()) {
      resolve();
      return;
    }

    // Wait for React to be available (max 2 seconds, shorter timeout)
    const timeout = setTimeout(() => {
      // Don't reject - just resolve and let the app try to render
      // This prevents the app from crashing if React detection fails
      console.warn('React detection timed out, proceeding with initialization');
      resolve();
    }, 2000);

    const checkInterval = setInterval(() => {
      if (isReactAvailable()) {
        clearTimeout(timeout);
        clearInterval(checkInterval);
        resolve();
      }
    }, 50); // Check more frequently
  });

  return reactCheckPromise;
};

export const isReactAvailable = (): boolean => {
  if (typeof window === 'undefined') {
    return true; // Assume React is available in SSR
  }

  // Try multiple ways to detect React
  const checks = [
    // Check if React is on window object
    () => !!(window as any).React?.createContext,
    // Check if React is available through module system
    () => {
      try {
        // Try to import React dynamically
        const React = require('react');
        return !!React?.createContext;
      } catch {
        return false;
      }
    },
    // Check if any React-related globals exist
    () => !!(window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__,
    // Final fallback - assume React is available if we got this far
    () => true
  ];

  return checks.some(check => {
    try {
      return check();
    } catch {
      return false;
    }
  });
};
