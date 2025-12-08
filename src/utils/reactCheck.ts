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
    // Check if React is already available
    if (typeof window !== 'undefined' && (window as any).React?.createContext) {
      resolve();
      return;
    }

    // Wait for React to be available (max 5 seconds)
    const timeout = setTimeout(() => {
      reject(new Error('React failed to load within timeout'));
    }, 5000);

    const checkInterval = setInterval(() => {
      if (typeof window !== 'undefined' && (window as any).React?.createContext) {
        clearTimeout(timeout);
        clearInterval(checkInterval);
        resolve();
      }
    }, 100);
  });

  return reactCheckPromise;
};

export const isReactAvailable = (): boolean => {
  return typeof window !== 'undefined' && (window as any).React?.createContext;
};
