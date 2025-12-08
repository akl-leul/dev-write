// Performance monitoring utilities

export const measurePageLoad = () => {
  if (typeof window === 'undefined') return;
  
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  const loadTime = navigation.loadEventEnd - navigation.loadEventStart;
  
  console.log(`Page load time: ${loadTime.toFixed(2)}ms`);
  
  // Log detailed timing
  const metrics = {
    dns: navigation.domainLookupEnd - navigation.domainLookupStart,
    tcp: navigation.connectEnd - navigation.connectStart,
    request: navigation.responseStart - navigation.requestStart,
    response: navigation.responseEnd - navigation.responseStart,
    dom: navigation.domContentLoadedEventStart - navigation.responseEnd,
    load: loadTime,
  };
  
  console.table(metrics);
};

export const measureComponentRender = (componentName: string) => {
  const start = performance.now();
  
  return {
    end: () => {
      const end = performance.now();
      console.log(`${componentName} render time: ${(end - start).toFixed(2)}ms`);
    }
  };
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Intersection Observer for lazy loading
export const createIntersectionObserver = (
  callback: IntersectionObserverCallback,
  options?: IntersectionObserverInit
) => {
  if (typeof window === 'undefined') return null;
  
  return new IntersectionObserver(callback, {
    rootMargin: '50px',
    threshold: 0.1,
    ...options,
  });
};

// Memory usage monitoring (development only)
export const checkMemoryUsage = () => {
  if (typeof window === 'undefined' || !('memory' in performance)) return;
  
  const memory = (performance as any).memory;
  const usage = {
    used: (memory.usedJSHeapSize / 1048576).toFixed(2),
    total: (memory.totalJSHeapSize / 1048576).toFixed(2),
    limit: (memory.jsHeapSizeLimit / 1048576).toFixed(2),
  };
  
  console.log('Memory usage (MB):', usage);
  return usage;
};

// Core Web Vitals tracking
export const trackWebVitals = () => {
  if (typeof window === 'undefined' || !('performance' in window)) return;

  // Largest Contentful Paint (LCP)
  try {
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      console.log('LCP:', lastEntry.startTime);
    }).observe({ entryTypes: ['largest-contentful-paint'] });
  } catch (e) {
    console.warn('LCP tracking not supported');
  }

  // First Input Delay (FID)
  try {
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      entries.forEach((entry) => {
        console.log('FID:', (entry as any).processingStart - entry.startTime);
      });
    }).observe({ entryTypes: ['first-input'] });
  } catch (e) {
    console.warn('FID tracking not supported');
  }

  // Cumulative Layout Shift (CLS)
  try {
    let clsValue = 0;
    new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
        }
      }
      console.log('CLS:', clsValue);
    }).observe({ entryTypes: ['layout-shift'] });
  } catch (e) {
    console.warn('CLS tracking not supported');
  }
};

// Lazy load images with fallback
export const lazyLoadImage = (img: HTMLImageElement, src: string) => {
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          img.src = src;
          observer.unobserve(img);
        }
      });
    });
    observer.observe(img);
  } else {
    // Fallback for older browsers
    img.src = src;
  }
};

// Preload critical resources
export const preloadResource = (url: string, as: string) => {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = url;
  link.as = as;
  document.head.appendChild(link);
};

// Report performance metrics to analytics (placeholder)
export const reportMetric = (name: string, value: number) => {
  // Send to your analytics service
  if (process.env.NODE_ENV === 'production') {
    // Example: gtag('event', name, { value });
    console.log(`Metric: ${name} = ${value}`);
  }
};

// Initialize performance tracking
export const initPerformanceTracking = () => {
  if (typeof window !== 'undefined') {
    // Track page load
    window.addEventListener('load', () => {
      measurePageLoad();
    });
    
    // Track web vitals
    trackWebVitals();
    
    // Check memory usage periodically in development
    if (process.env.NODE_ENV === 'development') {
      setInterval(checkMemoryUsage, 30000); // Every 30 seconds
    }
  }
};
