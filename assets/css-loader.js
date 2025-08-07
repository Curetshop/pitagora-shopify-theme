/**
 * CSS Loader Optimization
 * Handles progressive loading of CSS files based on viewport and interaction
 */

class CSSLoader {
  constructor() {
    this.loadedStyles = new Set();
    this.intersectionObserver = null;
    this.init();
  }

  init() {
    // Load critical styles immediately
    this.loadCriticalStyles();
    
    // Setup intersection observer for lazy loading
    this.setupIntersectionObserver();
    
    // Setup interaction-based loading
    this.setupInteractionLoading();
    
    // Preload styles on user interaction
    this.preloadOnInteraction();
  }

  loadCriticalStyles() {
    // Critical styles are already loaded inline
    console.log('📄 Critical CSS loaded inline for optimal performance');
  }

  setupIntersectionObserver() {
    if (!('IntersectionObserver' in window)) return;

    this.intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const element = entry.target;
          const cssFile = element.dataset.cssFile;
          
          if (cssFile && !this.loadedStyles.has(cssFile)) {
            this.loadStylesheet(cssFile);
            this.intersectionObserver.unobserve(element);
          }
        }
      });
    }, {
      rootMargin: '50px 0px',
      threshold: 0.1
    });

    // Observe elements that need specific CSS
    this.observeElements();
  }

  observeElements() {
    // Observe testimonials section
    const testimonials = document.querySelector('.testimonials');
    if (testimonials && !this.loadedStyles.has('testimonials.css')) {
      testimonials.dataset.cssFile = 'testimonials.css';
      this.intersectionObserver.observe(testimonials);
    }

    // Observe Instagram feed
    const instagramFeed = document.querySelector('.instagram-feed');
    if (instagramFeed && !this.loadedStyles.has('instagram-feed.css')) {
      instagramFeed.dataset.cssFile = 'instagram-feed.css';
      this.intersectionObserver.observe(instagramFeed);
    }

    // Observe AI recommendations
    const aiRecommendations = document.querySelector('.ai-recommendations');
    if (aiRecommendations && !this.loadedStyles.has('ai-recommendations.css')) {
      aiRecommendations.dataset.cssFile = 'ai-recommendations.css';
      this.intersectionObserver.observe(aiRecommendations);
    }

    // Observe voice search
    const voiceSearch = document.querySelector('.voice-search');
    if (voiceSearch && !this.loadedStyles.has('voice-search.css')) {
      voiceSearch.dataset.cssFile = 'voice-search.css';
      this.intersectionObserver.observe(voiceSearch);
    }
  }

  setupInteractionLoading() {
    // Load cart styles when cart is accessed
    document.addEventListener('click', (e) => {
      if (e.target.matches('[data-cart-toggle]') || e.target.closest('[data-cart-toggle]')) {
        this.loadStylesheet('cart-drawer.css');
      }
    });

    // Load search styles when search is accessed
    document.addEventListener('click', (e) => {
      if (e.target.matches('[data-search-toggle]') || e.target.closest('[data-search-toggle]')) {
        this.loadStylesheet('search.css');
      }
    });

    // Load newsletter styles when newsletter is focused
    document.addEventListener('focusin', (e) => {
      if (e.target.matches('.newsletter input') || e.target.closest('.newsletter')) {
        this.loadStylesheet('newsletter.css');
      }
    });
  }

  preloadOnInteraction() {
    // Preload additional styles on first user interaction
    const preloadOnInteraction = () => {
      this.loadStylesheet('rich-text.css');
      this.loadStylesheet('image-with-text.css');
      this.loadStylesheet('multicolumn.css');
      
      // Remove event listeners after first interaction
      document.removeEventListener('mousedown', preloadOnInteraction);
      document.removeEventListener('touchstart', preloadOnInteraction);
      document.removeEventListener('keydown', preloadOnInteraction);
    };

    // Listen for first user interaction
    document.addEventListener('mousedown', preloadOnInteraction, { once: true });
    document.addEventListener('touchstart', preloadOnInteraction, { once: true });
    document.addEventListener('keydown', preloadOnInteraction, { once: true });
  }

  loadStylesheet(filename) {
    if (this.loadedStyles.has(filename)) return;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = window.theme?.urls?.assets ? `${window.theme.urls.assets}${filename}` : `/assets/${filename}`;
    link.media = 'print';
    link.onload = function() {
      this.media = 'all';
    };

    // Add to head
    document.head.appendChild(link);
    
    // Mark as loaded
    this.loadedStyles.add(filename);
    
    console.log(`🎨 Loaded ${filename} stylesheet`);
  }

  // Public method to load specific stylesheet
  load(filename) {
    this.loadStylesheet(filename);
  }

  // Get loading status
  getLoadedStyles() {
    return Array.from(this.loadedStyles);
  }
}

// Initialize CSS Loader
document.addEventListener('DOMContentLoaded', () => {
  window.cssLoader = new CSSLoader();
  
  // Make available globally
  if (window.theme) {
    window.theme.cssLoader = window.cssLoader;
  }
});

// Fallback for browsers without IntersectionObserver
if (!('IntersectionObserver' in window)) {
  // Load all styles after page load for older browsers
  window.addEventListener('load', () => {
    const stylesheets = [
      'testimonials.css',
      'instagram-feed.css',
      'ai-recommendations.css',
      'voice-search.css',
      'newsletter.css',
      'rich-text.css',
      'image-with-text.css'
    ];
    
    stylesheets.forEach(stylesheet => {
      if (window.cssLoader) {
        window.cssLoader.load(stylesheet);
      }
    });
  });
}