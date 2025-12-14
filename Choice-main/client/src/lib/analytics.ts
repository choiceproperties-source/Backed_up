// Performance monitoring & analytics integration prep
export function trackEvent(event: string, data?: Record<string, any>) {
  try {
    if (window.gtag) {
      window.gtag('event', event, data);
    }
  } catch (e) {
    console.debug('Analytics tracking:', event);
  }
}

export function trackPageView(path: string) {
  try {
    if (window.gtag) {
      window.gtag('config', 'GA_MEASUREMENT_ID', {
        page_path: path,
        page_title: document.title,
      });
    }
  } catch (e) {
    console.debug('Page view tracked:', path);
  }
}

export function trackPerformance() {
  if ('PerformanceObserver' in window) {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        console.debug('Performance metric:', {
          name: entry.name,
          duration: entry.duration,
          startTime: entry.startTime,
        });
      }
    });
    observer.observe({ entryTypes: ['navigation', 'resource'] });
  }
}

declare global {
  interface Window {
    gtag?: (command: string, id: string, config?: any) => void;
  }
}
