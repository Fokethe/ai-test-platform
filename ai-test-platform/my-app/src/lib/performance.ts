/**
 * Performance Monitoring - 性能监控工具
 */

export const performanceMonitor = {
  /**
   * 标记时间点
   */
  mark(name: string) {
    if (typeof performance !== 'undefined') {
      performance.mark(name);
    }
  },

  /**
   * 测量时间间隔
   */
  measure(name: string, startMark: string, endMark: string) {
    if (typeof performance !== 'undefined') {
      try {
        const measure = performance.measure(name, startMark, endMark);
        const duration = Math.round(measure.duration);
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`[Performance] ${name}: ${duration}ms`);
        }
        
        // 慢操作警告
        if (duration > 1000) {
          console.warn(`[Performance] Slow operation detected: ${name} took ${duration}ms`);
        }
        
        return duration;
      } catch (e) {
        // 标记可能不存在
        return 0;
      }
    }
    return 0;
  },

  /**
   * 监控页面加载性能
   */
  observePageLoad() {
    if (typeof window === 'undefined') return;
    
    // Web Vitals
    if ('web-vitals' in window) {
      // @ts-ignore
      const { getCLS, getFID, getFCP, getLCP, getTTFB } = window.webVitals;
      
      // @ts-ignore
      getCLS(console.log);
      // @ts-ignore
      getFID(console.log);
      // @ts-ignore
      getFCP(console.log);
      // @ts-ignore
      getLCP(console.log);
      // @ts-ignore
      getTTFB(console.log);
    }
    
    // 基础性能指标
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
   * API 响应时间监控
   */
  async monitorApi<T>(name: string, promise: Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      const result = await promise;
      const duration = Math.round(performance.now() - start);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Performance] API ${name}: ${duration}ms`);
      }
      
      // 慢API警告
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
   * 组件渲染时间监控
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
 * React Hook: 使用性能监控
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
