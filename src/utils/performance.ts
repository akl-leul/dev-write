// Performance monitoring utilities

export const measurePageLoad = () => {
  if (typeof window === 'undefined') return;
  
  try {
    // Try to use Navigation Timing API
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    if (navigation && navigation.loadEventEnd && navigation.fetchStart) {
      // Calculate total page load time from fetch start to load event end
      const totalLoadTime = navigation.loadEventEnd - navigation.fetchStart;
      
      // Validate that we have a reasonable load time (should be more than 100ms for real pages)
      if (totalLoadTime > 100 && totalLoadTime < 60000) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`Page load time: ${totalLoadTime.toFixed(2)}ms`);
        }
        
        // Log detailed timing with validation
        const metrics = {
          dns: Math.max(0, navigation.domainLookupEnd - navigation.domainLookupStart),
          tcp: Math.max(0, navigation.connectEnd - navigation.connectStart),
          request: Math.max(0, navigation.responseStart - navigation.requestStart),
          response: Math.max(0, navigation.responseEnd - navigation.responseStart),
          dom: Math.max(0, navigation.domContentLoadedEventStart - navigation.responseEnd),
          domInteractive: Math.max(0, navigation.domInteractive - navigation.fetchStart),
          load: totalLoadTime,
        };
        
        if (process.env.NODE_ENV === 'development') {
          console.table(metrics);
        }
        
        // Report to analytics if needed
        reportMetric('page_load_time', totalLoadTime);
        reportMetric('dns_time', metrics.dns);
        reportMetric('tcp_time', metrics.tcp);
        reportMetric('request_time', metrics.request);
        reportMetric('response_time', metrics.response);
        reportMetric('dom_time', metrics.dom);
        reportMetric('dom_interactive_time', metrics.domInteractive);
        return;
      }
    }
    
    // Fallback: Use performance.now() for timing measurement
    if (process.env.NODE_ENV === 'development') {
      console.warn('Navigation timing not available or invalid, using fallback measurement');
    }
    measurePageLoadFallback();
    
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error measuring page load:', error);
    }
    measurePageLoadFallback();
  }
};

// Fallback timing measurement using performance.now()
export const measurePageLoadFallback = () => {
  if (typeof window === 'undefined') return;
  
  // Use window.performance.timing as fallback
  const timing = (window.performance as any).timing;
  if (timing && timing.loadEventEnd && timing.navigationStart) {
    const totalLoadTime = timing.loadEventEnd - timing.navigationStart;
    
    // Validate that we have a reasonable load time
    if (totalLoadTime > 100 && totalLoadTime < 60000) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`Fallback page load time: ${totalLoadTime.toFixed(2)}ms`);
      }
      
      const metrics = {
        dns: Math.max(0, timing.domainLookupEnd - timing.domainLookupStart),
        tcp: Math.max(0, timing.connectEnd - timing.connectStart),
        request: Math.max(0, timing.requestStart - timing.requestStart),
        response: Math.max(0, timing.responseEnd - timing.responseStart),
        dom: Math.max(0, timing.domContentLoadedEventStart - timing.responseEnd),
        domInteractive: Math.max(0, timing.domInteractive - timing.navigationStart),
        load: totalLoadTime,
      };
      
      if (process.env.NODE_ENV === 'development') {
        console.table(metrics);
      }
      reportMetric('fallback_page_load_time', totalLoadTime);
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Invalid fallback timing detected');
      }
      reportMetric('invalid_fallback_timing', totalLoadTime || 0);
    }
  } else {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Performance timing completely unavailable');
    }
    reportMetric('timing_unavailable', 1);
  }
};

export const measureComponentRender = (componentName: string) => {
  const start = performance.now();
  
  return {
    end: () => {
      const end = performance.now();
      if (process.env.NODE_ENV === 'development') {
        console.log(`${componentName} render time: ${(end - start).toFixed(2)}ms`);
      }
      reportMetric(`${componentName}_render_time`, end - start);
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
  
  if (process.env.NODE_ENV === 'development') {
    console.log('Memory usage (MB):', usage);
  }
  
  // Report memory usage in production for monitoring
  reportMetric('memory_used_mb', parseFloat(usage.used));
  reportMetric('memory_total_mb', parseFloat(usage.total));
  reportMetric('memory_limit_mb', parseFloat(usage.limit));
  
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
      if (process.env.NODE_ENV === 'development') {
        console.log('LCP:', lastEntry.startTime);
      }
      reportMetric('lcp', lastEntry.startTime);
    }).observe({ entryTypes: ['largest-contentful-paint'] });
  } catch (e) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('LCP tracking not supported');
    }
  }

  // First Input Delay (FID)
  try {
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      entries.forEach((entry) => {
        const fid = (entry as any).processingStart - entry.startTime;
        if (process.env.NODE_ENV === 'development') {
          console.log('FID:', fid);
        }
        reportMetric('fid', fid);
      });
    }).observe({ entryTypes: ['first-input'] });
  } catch (e) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('FID tracking not supported');
    }
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
      if (process.env.NODE_ENV === 'development') {
        console.log('CLS:', clsValue);
      }
      reportMetric('cls', clsValue);
    }).observe({ entryTypes: ['layout-shift'] });
  } catch (e) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('CLS tracking not supported');
    }
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

// Initialize performance tracking (optimized for faster loads)
export const initPerformanceTracking = () => {
  if (typeof window !== 'undefined') {
    // Only track page load, skip heavy web vitals and memory monitoring
    const measureLoad = () => {
      setTimeout(() => {
        measurePageLoad();
      }, 100);
    };
    
    if (document.readyState === 'complete') {
      measureLoad();
    } else {
      window.addEventListener('load', measureLoad);
    }
    
    // Only enable detailed tracking in development
    if (process.env.NODE_ENV === 'development') {
      // Track web vitals with reduced frequency
      setTimeout(trackWebVitals, 1000);
      
      // Check memory usage less frequently
      setInterval(checkMemoryUsage, 60000); // Every 60 seconds instead of 30
    }
  }
};

// Cache management utilities
export const clearCache = () => {
  if (typeof window === 'undefined') return;
  
  // Clear service worker cache
  if ('caches' in window) {
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
    });
  }
  
  // Clear localStorage and sessionStorage
  localStorage.clear();
  sessionStorage.clear();
  
  if (process.env.NODE_ENV === 'development') {
    console.log('Cache cleared successfully');
  }
};

export const forceReload = () => {
  clearCache();
  // Add timestamp to prevent caching
  const timestamp = new Date().getTime();
  const url = new URL(window.location.href);
  url.searchParams.set('t', timestamp.toString());
  window.location.href = url.toString();
};

// Check if cache is stale and needs refresh
export const checkCacheFreshness = (maxAge: number = 3600000) => { // 1 hour default
  if (typeof window === 'undefined') return false;
  
  const cacheTimestamp = localStorage.getItem('cache_timestamp');
  if (!cacheTimestamp) return true;
  
  const now = new Date().getTime();
  const cacheAge = now - parseInt(cacheTimestamp);
  
  return cacheAge > maxAge;
};

// Set cache timestamp
export const setCacheTimestamp = () => {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem('cache_timestamp', new Date().getTime().toString());
};

// Auto-refresh cache if stale (disabled for better performance)
export const autoRefreshCache = () => {
  // Disabled to prevent forced reloads that cause slow performance
  // if (checkCacheFreshness()) {
  //   if (process.env.NODE_ENV === 'development') {
  //     console.log('Cache is stale, refreshing...');
  //   }
  //   forceReload();
  // }
};
