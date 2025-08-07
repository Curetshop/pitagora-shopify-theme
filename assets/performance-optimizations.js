/**
 * Performance Optimizations
 * Advanced performance enhancements for premium theme
 */

class PerformanceOptimizer {
  constructor() {
    this.observers = new Map();
    this.scheduledTasks = new Map();
    this.performanceMetrics = {
      startTime: performance.now(),
      resources: new Map(),
      interactions: new Map(),
      layoutShifts: [],
      longTasks: []
    };
    
    this.init();
  }
  
  init() {
    this.setupIntersectionObserver();
    this.setupPerformanceObserver();
    this.optimizeImages();
    this.setupResourceHints();
    this.deferNonCriticalCSS();
    this.setupTaskScheduler();
    this.monitorWebVitals();
    this.optimizeAnimations();
    
    console.log('⚡ Performance Optimizer initialized');
  }
  
  // ==========================================
  // INTERSECTION OBSERVER OPTIMIZATIONS
  // ==========================================
  
  setupIntersectionObserver() {
    // Lazy loading observer for images
    if ('IntersectionObserver' in window) {
      this.observers.set('lazyImages', new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.loadImage(entry.target);
            this.observers.get('lazyImages').unobserve(entry.target);
          }
        });
      }, {
        rootMargin: '50px 0px',
        threshold: 0.01
      }));
      
      // Observe lazy images
      this.observeLazyImages();
    }
    
    // Content visibility observer for sections
    if ('IntersectionObserver' in window) {
      this.observers.set('contentVisibility', new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          const target = entry.target;
          if (entry.isIntersecting) {
            target.style.contentVisibility = 'visible';
            this.initializeSectionComponents(target);
          } else if (entry.boundingClientRect.top > window.innerHeight) {
            target.style.contentVisibility = 'auto';
          }
        });
      }, {
        rootMargin: '100px 0px',
        threshold: 0
      }));
      
      // Observe sections with heavy content
      this.observeHeavySections();
    }
  }
  
  observeLazyImages() {
    const lazyImages = document.querySelectorAll('img[data-src], img[loading="lazy"]');
    const observer = this.observers.get('lazyImages');
    
    lazyImages.forEach(img => {
      if (observer) observer.observe(img);
    });
  }
  
  observeHeavySections() {
    const heavySections = document.querySelectorAll('.cart-upsells, .product-bundles, .store-locator, .product-comparison');
    const observer = this.observers.get('contentVisibility');
    
    heavySections.forEach(section => {
      if (observer) observer.observe(section);
    });
  }
  
  loadImage(img) {
    if (img.dataset.src) {
      img.src = img.dataset.src;
      img.removeAttribute('data-src');
    }
    
    if (img.dataset.srcset) {
      img.srcset = img.dataset.srcset;
      img.removeAttribute('data-srcset');
    }
    
    img.classList.add('loaded');
    
    // Track image load performance
    img.addEventListener('load', () => {
      this.trackResourceLoad('image', img.src, performance.now());
    }, { once: true });
  }
  
  initializeSectionComponents(section) {
    // Initialize heavy components only when they become visible
    if (section.classList.contains('cart-upsells') && !section.cartUpsells) {
      this.scheduleTask('initCartUpsells', () => {
        if (window.CartUpsells) {
          section.cartUpsells = new window.CartUpsells(section);
        }
      });
    }
    
    if (section.classList.contains('store-locator') && !section.storeLocator) {
      this.scheduleTask('initStoreLocator', () => {
        if (window.StoreLocator) {
          section.storeLocator = new window.StoreLocator(section);
        }
      });
    }
    
    if (section.classList.contains('product-comparison') && !section.productComparison) {
      this.scheduleTask('initProductComparison', () => {
        if (window.ProductComparison) {
          section.productComparison = new window.ProductComparison(section);
        }
      });
    }
  }
  
  // ==========================================
  // PERFORMANCE MONITORING
  // ==========================================
  
  setupPerformanceObserver() {
    if ('PerformanceObserver' in window) {
      // Monitor long tasks
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.performanceMetrics.longTasks.push({
              duration: entry.duration,
              startTime: entry.startTime,
              name: entry.name
            });
            
            if (entry.duration > 50) {
              console.warn(`Long task detected: ${entry.duration}ms`);
            }
          }
        });
        longTaskObserver.observe({ entryTypes: ['longtask'] });
      } catch (e) {
        console.log('Long task observer not supported');
      }
      
      // Monitor layout shifts
      try {
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              this.performanceMetrics.layoutShifts.push({
                value: entry.value,
                sources: entry.sources,
                startTime: entry.startTime
              });
            }
          }
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (e) {
        console.log('Layout shift observer not supported');
      }
      
      // Monitor largest contentful paint
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.performanceMetrics.lcp = lastEntry.startTime;
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (e) {
        console.log('LCP observer not supported');
      }
      
      // Monitor first input delay
      try {
        const fidObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.performanceMetrics.fid = entry.processingStart - entry.startTime;
          }
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
      } catch (e) {
        console.log('FID observer not supported');
      }
    }
  }
  
  // ==========================================
  // RESOURCE OPTIMIZATIONS
  // ==========================================
  
  optimizeImages() {
    // Add loading attributes to images
    const images = document.querySelectorAll('img');
    images.forEach((img, index) => {
      if (index < 3) {
        // First few images load eagerly
        img.loading = 'eager';
      } else {
        img.loading = 'lazy';
      }
      
      // Add decode hint
      img.decoding = 'async';
    });
    
    // Create WebP versions if supported
    if (this.supportsWebP()) {
      this.convertToWebP();
    }
  }
  
  supportsWebP() {
    return new Promise(resolve => {
      const webP = new Image();
      webP.onload = webP.onerror = () => {
        resolve(webP.height === 2);
      };
      webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
    });
  }
  
  async convertToWebP() {
    const isWebPSupported = await this.supportsWebP();
    
    if (isWebPSupported) {
      document.body.classList.add('webp');
      
      // Replace JPG/PNG sources with WebP where available
      const images = document.querySelectorAll('img[src*=".jpg"], img[src*=".png"]');
      images.forEach(img => {
        const webpSrc = img.src.replace(/\.(jpg|png)/, '.webp');
        
        // Test if WebP version exists
        this.testImageExists(webpSrc).then(exists => {
          if (exists) {
            img.src = webpSrc;
          }
        });
      });
    } else {
      document.body.classList.add('no-webp');
    }
  }
  
  testImageExists(src) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = src;
    });
  }
  
  setupResourceHints() {
    // Preload critical resources
    this.preloadResource('/assets/app.css', 'style');
    this.preloadResource('/assets/app.js', 'script');
    
    // Prefetch likely next pages
    this.prefetchResource('/collections/all');
    this.prefetchResource('/cart');
    
    // DNS prefetch for external resources
    this.dnsPrefetch('https://fonts.googleapis.com');
    this.dnsPrefetch('https://www.google-analytics.com');
    this.dnsPrefetch('https://maps.googleapis.com');
  }
  
  preloadResource(href, as) {
    if (document.querySelector(`link[href="${href}"]`)) return;
    
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    link.as = as;
    
    if (as === 'font') {
      link.crossOrigin = 'anonymous';
    }
    
    document.head.appendChild(link);
  }
  
  prefetchResource(href) {
    if (document.querySelector(`link[href="${href}"]`)) return;
    
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = href;
    document.head.appendChild(link);
  }
  
  dnsPrefetch(href) {
    if (document.querySelector(`link[href="${href}"]`)) return;
    
    const link = document.createElement('link');
    link.rel = 'dns-prefetch';
    link.href = href;
    document.head.appendChild(link);
  }
  
  deferNonCriticalCSS() {
    const nonCriticalCSS = document.querySelectorAll('link[rel="stylesheet"][data-defer]');
    
    nonCriticalCSS.forEach(link => {
      const href = link.href;
      link.remove();
      
      // Load after page load
      window.addEventListener('load', () => {
        const newLink = document.createElement('link');
        newLink.rel = 'stylesheet';
        newLink.href = href;
        document.head.appendChild(newLink);
      });
    });
  }
  
  // ==========================================
  // TASK SCHEDULING
  // ==========================================
  
  setupTaskScheduler() {
    // Use requestIdleCallback when available
    this.scheduleIdleCallback = window.requestIdleCallback || 
      ((callback) => setTimeout(callback, 1));
    
    this.cancelIdleCallback = window.cancelIdleCallback || clearTimeout;
  }
  
  scheduleTask(name, task, options = {}) {
    const { priority = 'normal', delay = 0 } = options;
    
    if (this.scheduledTasks.has(name)) {
      this.cancelIdleCallback(this.scheduledTasks.get(name));
    }
    
    const scheduleCallback = priority === 'high' ? 
      requestAnimationFrame : this.scheduleIdleCallback;
    
    const taskId = setTimeout(() => {
      scheduleCallback(() => {
        try {
          task();
          this.scheduledTasks.delete(name);
        } catch (error) {
          console.error(`Task ${name} failed:`, error);
        }
      });
    }, delay);
    
    this.scheduledTasks.set(name, taskId);
  }
  
  cancelTask(name) {
    if (this.scheduledTasks.has(name)) {
      clearTimeout(this.scheduledTasks.get(name));
      this.scheduledTasks.delete(name);
    }
  }
  
  // ==========================================
  // WEB VITALS MONITORING
  // ==========================================
  
  monitorWebVitals() {
    // Monitor Core Web Vitals
    this.scheduleTask('webVitalsReport', () => {
      this.reportWebVitals();
    }, { delay: 5000 });
  }
  
  reportWebVitals() {
    const vitals = {
      lcp: this.performanceMetrics.lcp,
      fid: this.performanceMetrics.fid,
      cls: this.calculateCLS(),
      longTasks: this.performanceMetrics.longTasks.length,
      totalBlockingTime: this.calculateTBT()
    };
    
    console.log('Web Vitals Report:', vitals);
    
    // Send to analytics if needed
    if (window.gtag) {
      Object.entries(vitals).forEach(([metric, value]) => {
        if (value !== undefined) {
          gtag('event', 'web_vital', {
            metric_name: metric,
            metric_value: Math.round(value),
            custom_parameter: 'performance_optimization'
          });
        }
      });
    }
  }
  
  calculateCLS() {
    return this.performanceMetrics.layoutShifts.reduce((sum, shift) => {
      return sum + shift.value;
    }, 0);
  }
  
  calculateTBT() {
    return this.performanceMetrics.longTasks.reduce((sum, task) => {
      return sum + Math.max(0, task.duration - 50);
    }, 0);
  }
  
  // ==========================================
  // ANIMATION OPTIMIZATIONS
  // ==========================================
  
  optimizeAnimations() {
    // Check user preferences
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (prefersReducedMotion) {
      document.body.classList.add('reduce-motion');
      this.disableNonEssentialAnimations();
    }
    
    // Optimize animation performance
    this.setupAnimationFrame();
    this.throttleScrollAnimations();
  }
  
  disableNonEssentialAnimations() {
    const animatedElements = document.querySelectorAll('[class*="animate"], [class*="transition"]');
    
    animatedElements.forEach(element => {
      element.style.animationDuration = '0.01ms';
      element.style.transitionDuration = '0.01ms';
    });
  }
  
  setupAnimationFrame() {
    let animationFrameId;
    const animationQueue = [];
    
    const processAnimationQueue = () => {
      if (animationQueue.length > 0) {
        const task = animationQueue.shift();
        task();
        
        if (animationQueue.length > 0) {
          animationFrameId = requestAnimationFrame(processAnimationQueue);
        }
      }
    };
    
    window.queueAnimation = (callback) => {
      animationQueue.push(callback);
      
      if (!animationFrameId) {
        animationFrameId = requestAnimationFrame(processAnimationQueue);
      }
    };
  }
  
  throttleScrollAnimations() {
    let scrollTimeout;
    const scrollElements = document.querySelectorAll('[data-scroll-animate]');
    
    const handleScroll = () => {
      if (scrollTimeout) return;
      
      scrollTimeout = setTimeout(() => {
        scrollElements.forEach(element => {
          this.updateScrollAnimation(element);
        });
        scrollTimeout = null;
      }, 16); // ~60fps
    };
    
    if (scrollElements.length > 0) {
      window.addEventListener('scroll', handleScroll, { passive: true });
    }
  }
  
  updateScrollAnimation(element) {
    const rect = element.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    const elementHeight = rect.height;
    
    // Calculate scroll progress
    const scrollProgress = Math.max(0, Math.min(1, 
      (windowHeight - rect.top) / (windowHeight + elementHeight)
    ));
    
    // Apply transform based on scroll progress
    const animationType = element.dataset.scrollAnimate;
    
    switch (animationType) {
      case 'fadeIn':
        element.style.opacity = scrollProgress;
        break;
      case 'slideUp':
        element.style.transform = `translateY(${(1 - scrollProgress) * 50}px)`;
        break;
      case 'scale':
        element.style.transform = `scale(${0.8 + (scrollProgress * 0.2)})`;
        break;
    }
  }
  
  // ==========================================
  // MEMORY MANAGEMENT
  // ==========================================
  
  cleanupObservers() {
    this.observers.forEach(observer => {
      observer.disconnect();
    });
    this.observers.clear();
  }
  
  cleanupTasks() {
    this.scheduledTasks.forEach((taskId, name) => {
      this.cancelTask(name);
    });
  }
  
  trackResourceLoad(type, url, loadTime) {
    this.performanceMetrics.resources.set(url, {
      type,
      loadTime: loadTime - this.performanceMetrics.startTime,
      timestamp: loadTime
    });
  }
  
  // ==========================================
  // PUBLIC API
  // ==========================================
  
  getPerformanceReport() {
    return {
      ...this.performanceMetrics,
      cls: this.calculateCLS(),
      tbt: this.calculateTBT(),
      resourceCount: this.performanceMetrics.resources.size
    };
  }
  
  preloadNextPage(href) {
    this.scheduleTask('preloadPage', () => {
      this.prefetchResource(href);
    }, { priority: 'low', delay: 1000 });
  }
  
  // ==========================================
  // DESTRUCTION
  // ==========================================
  
  destroy() {
    this.cleanupObservers();
    this.cleanupTasks();
    
    // Remove event listeners
    window.removeEventListener('scroll', this.handleScroll);
    
    console.log('⚡ Performance Optimizer destroyed');
  }
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

// Debounce function for performance
function debounce(func, wait, immediate) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func(...args);
  };
}

// Throttle function for performance
function throttle(func, limit) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Enhanced event listener with performance optimizations
function addOptimizedEventListener(element, event, callback, options = {}) {
  const optimizedOptions = {
    passive: true,
    capture: false,
    ...options
  };
  
  // Use passive listeners for touch and scroll events
  if (['touchstart', 'touchmove', 'scroll', 'wheel'].includes(event)) {
    optimizedOptions.passive = true;
  }
  
  element.addEventListener(event, callback, optimizedOptions);
}

// ==========================================
// INITIALIZATION
// ==========================================

// Initialize performance optimizer when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.performanceOptimizer = new PerformanceOptimizer();
  });
} else {
  window.performanceOptimizer = new PerformanceOptimizer();
}

// Handle page unload
window.addEventListener('beforeunload', () => {
  if (window.performanceOptimizer) {
    window.performanceOptimizer.destroy();
  }
});

// Export for external use
window.PerformanceOptimizer = PerformanceOptimizer;
window.addOptimizedEventListener = addOptimizedEventListener;
window.debounce = debounce;
window.throttle = throttle;