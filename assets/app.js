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
    }
  },

  // Initialize theme
  init() {
    this.initAccessibility();
    this.initAnalytics();
    console.log('🎯 Pitagora Theme initialized');
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