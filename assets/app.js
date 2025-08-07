// Pitagora Theme - Main JavaScript

// Theme utilities
window.PitagoraTheme = window.PitagoraTheme || {
  config: {
    mediaQueries: {
      mobile: 'screen and (max-width: 767px)',
      tablet: 'screen and (min-width: 768px) and (max-width: 1023px)',
      desktop: 'screen and (min-width: 1024px)'
    }
  },

  // Security utilities
  security: {
    // HTML sanitization to prevent XSS
    sanitizeHTML(str) {
      if (typeof str !== 'string') return '';
      
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    },

    // Safe HTML insertion
    setInnerHTML(element, html) {
      if (!element) return;
      
      // Sanitize the HTML content
      const sanitizedHTML = this.sanitizeHTML(html);
      element.innerHTML = sanitizedHTML;
    },

    // Safe attribute setting
    setAttribute(element, attribute, value) {
      if (!element || !attribute) return;
      
      // Sanitize attribute value
      const sanitizedValue = this.sanitizeHTML(value);
      element.setAttribute(attribute, sanitizedValue);
    },

    // Validate URL to prevent open redirects
    isValidURL(url) {
      try {
        const urlObj = new URL(url, window.location.origin);
        return urlObj.origin === window.location.origin;
      } catch {
        return false;
      }
    }
  },

  // Utility functions
  utils: {
    debounce(func, wait, immediate) {
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
    },

    throttle(func, limit) {
      let inThrottle;
      return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
          func.apply(context, args);
          inThrottle = true;
          setTimeout(() => inThrottle = false, limit);
        }
      }
    },

    formatPrice(cents) {
      return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR'
      }).format(cents / 100);
    },

    dispatchCustomEvent(name, data = {}) {
      document.dispatchEvent(new CustomEvent(name, {
        detail: data,
        bubbles: true
      }));
    },

    // Safe logging for production
    log(message, type = 'info') {
      if (window.location.hostname === 'localhost' || window.location.hostname.includes('myshopify.com')) {
        switch(type) {
          case 'error':
            console.error(message);
            break;
          case 'warn':
            console.warn(message);
            break;
          default:
            console.log(message);
        }
      }
    }
  },

  // Error handling system
  errors: {
    // Error types
    types: {
      NETWORK: 'NETWORK_ERROR',
      VALIDATION: 'VALIDATION_ERROR',
      PERMISSION: 'PERMISSION_ERROR',
      NOT_FOUND: 'NOT_FOUND_ERROR',
      SERVER: 'SERVER_ERROR',
      UNKNOWN: 'UNKNOWN_ERROR'
    },

    // Error handler
    handle(error, context = '') {
      const errorInfo = {
        message: error.message || 'An error occurred',
        type: this.getErrorType(error),
        context: context,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent
      };

      // Log error
      this.utils.log(`Error in ${context}: ${errorInfo.message}`, 'error');

      // Track error in analytics
      if (this.analytics) {
        this.analytics.trackEvent('error', errorInfo);
      }

      // Show user-friendly message
      this.showErrorMessage(errorInfo);

      return errorInfo;
    },

    // Determine error type
    getErrorType(error) {
      if (error.name === 'NetworkError' || error.message.includes('fetch')) {
        return this.errors.types.NETWORK;
      }
      if (error.name === 'ValidationError') {
        return this.errors.types.VALIDATION;
      }
      if (error.status === 403) {
        return this.errors.types.PERMISSION;
      }
      if (error.status === 404) {
        return this.errors.types.NOT_FOUND;
      }
      if (error.status >= 500) {
        return this.errors.types.SERVER;
      }
      return this.errors.types.UNKNOWN;
    },

    // Show user-friendly error message
    showErrorMessage(errorInfo) {
      const messages = {
        [this.errors.types.NETWORK]: 'Connection error. Please check your internet connection.',
        [this.errors.types.VALIDATION]: 'Invalid data provided. Please check your input.',
        [this.errors.types.PERMISSION]: 'You don\'t have permission to perform this action.',
        [this.errors.types.NOT_FOUND]: 'The requested resource was not found.',
        [this.errors.types.SERVER]: 'Server error. Please try again later.',
        [this.errors.types.UNKNOWN]: 'An unexpected error occurred. Please try again.'
      };

      const message = messages[errorInfo.type] || messages[this.errors.types.UNKNOWN];
      
      // Create toast notification
      this.showToast(message, 'error');
    },

    // Toast notification system
    showToast(message, type = 'info', duration = 5000) {
      const toast = document.createElement('div');
      toast.className = `toast toast--${type}`;
      // Create toast content securely
      const toastContent = document.createElement('div');
      toastContent.className = 'toast__content';
      
      const messageSpan = document.createElement('span');
      messageSpan.className = 'toast__message';
      messageSpan.textContent = message;
      
      const closeButton = document.createElement('button');
      closeButton.className = 'toast__close';
      closeButton.setAttribute('aria-label', 'Close notification');
      closeButton.textContent = '×';
      
      toastContent.appendChild(messageSpan);
      toastContent.appendChild(closeButton);
      toast.appendChild(toastContent);

      // Add to page
      document.body.appendChild(toast);

      // Auto remove
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, duration);

      // Close button
      toast.querySelector('.toast__close').addEventListener('click', () => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      });
    }
  },

  // Component system
  components: {
    // Component registry
    registry: new Map(),

    // Register a component
    register(name, componentClass) {
      if (this.registry.has(name)) {
        this.utils.log(`Component ${name} already registered`, 'warn');
        return;
      }
      
      this.registry.set(name, componentClass);
      
      // Auto-register custom element if it's a class
      if (componentClass.prototype && componentClass.prototype.constructor) {
        if (!customElements.get(name)) {
          customElements.define(name, componentClass);
        }
      }
    },

    // Get a component
    get(name) {
      return this.registry.get(name);
    },

    // Initialize all components on page
    init() {
      this.registry.forEach((componentClass, name) => {
        const elements = document.querySelectorAll(name);
        elements.forEach(element => {
          if (!element.componentInstance) {
            element.componentInstance = new componentClass(element);
          }
        });
      });
    },

    // Base component class
    BaseComponent: class {
      constructor(element, options = {}) {
        this.element = element;
        this.options = { ...this.defaultOptions, ...options };
        this.init();
      }

      get defaultOptions() {
        return {};
      }

      init() {
        // Override in subclasses
      }

      destroy() {
        // Override in subclasses
      }
    }
  },

  // Initialize theme
  init() {
    this.initAccessibility();
    this.initAnalytics();
    this.utils.log('🎯 Pitagora Theme initialized');
  },

  // Accessibility features
  initAccessibility() {
    // Skip to content link
    const skipLink = document.querySelector('.skip-link');
    if (skipLink) {
      skipLink.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.querySelector('#main-content');
        if (target) {
          target.focus();
          target.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }

    // Focus trap for modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const openModal = document.querySelector('.modal[open]');
        const openDrawer = document.querySelector('.drawer[aria-expanded="true"]');
        
        if (openModal) {
          openModal.close();
        }
        
        if (openDrawer) {
          openDrawer.setAttribute('aria-expanded', 'false');
        }
      }
    });
  },

  // Analytics initialization
  initAnalytics() {
    // Google Analytics 4 events
    this.analytics = {
      trackEvent(eventName, parameters = {}) {
        if (typeof gtag !== 'undefined') {
          gtag('event', eventName, parameters);
        }
      },

      trackPurchase(transactionData) {
        this.trackEvent('purchase', transactionData);
      },

      trackAddToCart(itemData) {
        this.trackEvent('add_to_cart', {
          currency: 'EUR',
          value: itemData.price,
          items: [itemData]
        });
      }
    };
  }
};

// Cart functionality
window.PitagoraTheme.cart = {
  async get() {
    try {
      const response = await fetch('/cart.js');
      return await response.json();
    } catch (error) {
      console.error('Error fetching cart:', error);
      return null;
    }
  },

  async add(variantId, quantity = 1) {
    try {
      const response = await fetch('/cart/add.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: variantId,
          quantity: quantity
        })
      });
      
      const result = await response.json();
      
      // Dispatch cart updated event
      PitagoraTheme.utils.dispatchCustomEvent('cart:updated', { cart: await this.get() });
      
      return result;
    } catch (error) {
      console.error('Error adding to cart:', error);
      throw error;
    }
  },

  async update(variantId, quantity) {
    try {
      const response = await fetch('/cart/change.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: variantId,
          quantity: quantity
        })
      });
      
      const result = await response.json();
      
      // Dispatch cart updated event
      PitagoraTheme.utils.dispatchCustomEvent('cart:updated', { cart: result });
      
      return result;
    } catch (error) {
      console.error('Error updating cart:', error);
      throw error;
    }
  }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.PitagoraTheme.init();
});

// Initialize immediately for any sync code
window.PitagoraTheme.init();