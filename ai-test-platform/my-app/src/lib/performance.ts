/**
 * Performance Monitoring - 鎬ц兘鐩戞帶宸ュ叿
 */

export const performanceMonitor = {
  /**
   * 鏍囪鏃堕棿鐐?   */
  mark(name: string) {
    if (typeof performance !== 'undefined') {
      performance.mark(name);
    }
  },

  /**
   * 娴嬮噺鏃堕棿闂撮殧
   */
  measure(name: string, startMark: string, endMark: string) {
    if (typeof performance !== 'undefined') {
      try {
        const measure = performance.measure(name, startMark, endMark);
        const duration = Math.round(measure.duration);
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`[Performance] ${name}: ${duration}ms`);
        }
        
        // 鎱㈡搷浣滆鍛?
        if (duration > 1000) {
          console.warn(`[Performance] Slow operation detected: ${name} took ${duration}ms`);
        }
        
        return duration;
      } catch (e) {
        // 鏍囪鍙兘涓嶅瓨鍦?
        return 0;
      }
    }
    return 0;
  },

  /**
   * 鐩戞帶椤甸潰鍔犺浇鎬ц兘
   */
  observePageLoad() {
    if (typeof window === 'undefined') return;
    
    // Web Vitals
    if ('web-vitals' in window) {
      // @ts-expect-error
      const { getCLS, getFID, getFCP, getLCP, getTTFB } = window.webVitals;
      
      // @ts-expect-error
      getCLS(console.log);
      // @ts-expect-error
      getFID(console.log);
      // @ts-expect-error
      getFCP(console.log);
      // @ts-expect-error
      getLCP(console.log);
      // @ts-expect-error
      getTTFB(console.log);
    }
    
    // 鍩虹鎬ц兘鎸囨爣
    window.addEventListener('load', () => {
      setTimeout(() => {
        const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (perfData) {
          console.log('[Performance] Page Load:', {
            DNS: Math.round(perfData.domainLookupEnd - perfData.domainLookupStart),
            TCP: Math.round(perfData.connectEnd - perfData.connectStart),
            TTFB: Math.round(perfData.responseStart - perfData.requestStart),
            DOM: Math.round(perfData.domComplete - perfData.domInteractive),
            Load: Math.round(perfData.loadEventEnd - perfData.loadEventStart),
          });
        }
      }, 0);
    });
  },

  /**
   * API 鍝嶅簲鏃堕棿鐩戞帶
   */
  async monitorApi<T>(name: string, promise: Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      const result = await promise;
      const duration = Math.round(performance.now() - start);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Performance] API ${name}: ${duration}ms`);
      }
      
      // 鎱PI璀﹀憡
      if (duration > 2000) {
        console.warn(`[Performance] Slow API detected: ${name} took ${duration}ms`);
      }
      
      return result;
    } catch (error) {
      const duration = Math.round(performance.now() - start);
      console.error(`[Performance] API ${name} failed after ${duration}ms`);
      throw error;
    }
  },

  /**
   * 缁勪欢娓叉煋鏃堕棿鐩戞帶
   */
  monitorRender(componentName: string) {
    const start = performance.now();
    
    return () => {
      const duration = Math.round(performance.now() - start);
      if (process.env.NODE_ENV === 'development' && duration > 50) {
        console.log(`[Performance] Render ${componentName}: ${duration}ms`);
      }
    };
  },
};

/**
 * React Hook: 浣跨敤鎬ц兘鐩戞帶
 */
export function usePerformance(componentName: string) {
  if (typeof window === 'undefined') return { end: () => {} };
  
  const start = performance.now();
  
  return {
    end() {
      const duration = Math.round(performance.now() - start);
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Performance] ${componentName}: ${duration}ms`);
      }
    }
  };
}

