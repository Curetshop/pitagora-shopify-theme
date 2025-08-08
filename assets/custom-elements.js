/**
 * Pitagora Theme - Custom Elements
 * Modern Web Components for enhanced functionality and performance
 * Based on Shopify best practices and accessibility standards
 */

/**
 * Enhanced Base Custom Element Class
 * Modern Web Components with performance optimizations
 */
class PitagoraElement extends HTMLElement {
  constructor() {
    super();
    this.debug = window.PitagoraTheme?.config?.debug || false;
    this.boundEventListeners = new Map();
    this.scheduledTasks = new Set();
    this.isConnected = false;
    this.performanceMarker = `${this.constructor.name}-${Date.now()}`;
    
    // Performance monitoring
    if (this.debug && 'performance' in window) {
      performance.mark(`${this.performanceMarker}-construct-start`);
    }
  }

  connectedCallback() {
    if (this.isConnected) return; // Prevent double initialization
    
    try {
      this.isConnected = true;
      
      if (this.debug && 'performance' in window) {
        performance.mark(`${this.performanceMarker}-connect-start`);
      }
      
      // Use requestIdleCallback for non-critical setup
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => this.setup(), { timeout: 2000 });
      } else {
        // Fallback for browsers without requestIdleCallback
        setTimeout(() => this.setup(), 0);
      }
      
      if (this.debug) {
        console.log(`✅ ${this.constructor.name} connected`);
        
        if ('performance' in window) {
          performance.mark(`${this.performanceMarker}-connect-end`);
          performance.measure(
            `${this.constructor.name} connection time`,
            `${this.performanceMarker}-connect-start`,
            `${this.performanceMarker}-connect-end`
          );
        }
      }
    } catch (error) {
      console.error(`Error connecting ${this.constructor.name}:`, error);
    }
  }

  disconnectedCallback() {
    if (!this.isConnected) return;
    
    try {
      this.isConnected = false;
      this.cleanup();
      
      if (this.debug) {
        console.log(`♻️ ${this.constructor.name} disconnected`);
      }
    } catch (error) {
      console.error(`Error disconnecting ${this.constructor.name}:`, error);
    }
  }

  setup() {
    // Override in child classes
    if (this.debug) {
      console.log(`🔧 ${this.constructor.name} setup completed`);
    }
  }

  cleanup() {
    // Cancel scheduled tasks
    this.scheduledTasks.forEach(taskId => {
      if (typeof taskId === 'number') {
        clearTimeout(taskId);
        clearInterval(taskId);
      }
    });
    this.scheduledTasks.clear();
    
    // Remove all bound event listeners
    this.boundEventListeners.forEach((listeners, element) => {
      listeners.forEach(({ event, handler, options }) => {
        try {
          element.removeEventListener(event, handler, options);
        } catch (error) {
          console.warn('Error removing event listener:', error);
        }
      });
    });
    this.boundEventListeners.clear();
  }

  // Enhanced event listener management
  addListener(element, event, handler, options = {}) {
    if (!element || typeof handler !== 'function') return;
    
    // Auto-detect passive events for better performance
    const defaultOptions = {
      passive: ['scroll', 'touchstart', 'touchmove', 'wheel', 'mousewheel'].includes(event),
      once: false,
      capture: false,
      ...options
    };
    
    try {
      element.addEventListener(event, handler, defaultOptions);
      
      // Store listener info for cleanup
      if (!this.boundEventListeners.has(element)) {
        this.boundEventListeners.set(element, []);
      }
      this.boundEventListeners.get(element).push({ event, handler, options: defaultOptions });
      
    } catch (error) {
      console.error('Error adding event listener:', error);
    }
  }

  // Schedule a task and track it for cleanup
  scheduleTask(callback, delay = 0, isInterval = false) {
    const taskId = isInterval ? 
      setInterval(callback, delay) : 
      setTimeout(callback, delay);
    
    this.scheduledTasks.add(taskId);
    
    // Auto-remove from tracking after execution (for timeouts)
    if (!isInterval) {
      setTimeout(() => this.scheduledTasks.delete(taskId), delay + 100);
    }
    
    return taskId;
  }

  // Utility methods for child classes
  query(selector) {
    return this.querySelector(selector);
  }

  queryAll(selector) {
    return Array.from(this.querySelectorAll(selector));
  }

  // Safe attribute getting/setting
  getAttr(name, fallback = null) {
    return this.getAttribute(name) || fallback;
  }

  setAttr(name, value) {
    if (value === null || value === undefined) {
      this.removeAttribute(name);
    } else {
      this.setAttribute(name, String(value));
    }
  }

  // Custom event dispatch
  dispatch(eventName, detail = {}, options = {}) {
    const event = new CustomEvent(eventName, {
      detail,
      bubbles: options.bubbles !== false,
      cancelable: options.cancelable !== false,
      composed: options.composed !== false
    });
    
    return this.dispatchEvent(event);
  }

  // Performance measurement helpers
  startPerformanceMeasure(name) {
    if (this.debug && 'performance' in window) {
      performance.mark(`${this.constructor.name}-${name}-start`);
    }
  }

  endPerformanceMeasure(name) {
    if (this.debug && 'performance' in window) {
      performance.mark(`${this.constructor.name}-${name}-end`);
      try {
        performance.measure(
          `${this.constructor.name} ${name}`,
          `${this.constructor.name}-${name}-start`,
          `${this.constructor.name}-${name}-end`
        );
      } catch (error) {
        console.warn('Performance measurement failed:', error);
      }
    }
  }
}

/**
 * Store Header Component
 * Handles navigation, search, cart, and mobile menu
 */
/**
 * Enhanced Store Header Component
 * Handles navigation, search, cart, mobile menu with performance optimizations
 */
class StoreHeader extends PitagoraElement {
  setup() {
    this.startPerformanceMeasure('header-setup');
    
    // Cache DOM elements
    this.menuToggle = this.query('[data-mobile-menu-toggle]');
    this.mobileMenu = this.query('[data-mobile-menu]');
    this.searchToggle = this.query('[data-search-toggle]');
    this.searchForm = this.query('[data-search-form]');
    this.cartIcon = this.query('[data-cart-icon]');
    this.cartCount = this.query('[data-cart-count]');
    
    // Initialize features
    this.initMobileMenu();
    this.initSearch();
    this.initStickyHeader();
    this.initCartUpdates();
    
    this.endPerformanceMeasure('header-setup');
  }
  
  initMobileMenu() {
    if (!this.menuToggle || !this.mobileMenu) return;
    
    this.addListener(this.menuToggle, 'click', (e) => {
      e.preventDefault();
      const isExpanded = this.menuToggle.getAttribute('aria-expanded') === 'true';
      
      this.menuToggle.setAttribute('aria-expanded', !isExpanded);
      this.mobileMenu.classList.toggle('is-open', !isExpanded);
      document.body.classList.toggle('menu-open', !isExpanded);
      
      // Dispatch custom event
      this.dispatch('mobile-menu-toggle', { isOpen: !isExpanded });
    });
    
    // Close menu on escape key
    this.addListener(document, 'keydown', (e) => {
      if (e.key === 'Escape' && this.mobileMenu.classList.contains('is-open')) {
        this.closeMobileMenu();
      }
    });
    
    // Close menu when clicking outside
    this.addListener(document, 'click', (e) => {
      if (!this.contains(e.target) && this.mobileMenu.classList.contains('is-open')) {
        this.closeMobileMenu();
      }
    });
  }
  
  closeMobileMenu() {
    this.menuToggle?.setAttribute('aria-expanded', 'false');
    this.mobileMenu?.classList.remove('is-open');
    document.body.classList.remove('menu-open');
    this.dispatch('mobile-menu-close');
  }
  
  initSearch() {
    if (!this.searchToggle || !this.searchForm) return;
    
    this.addListener(this.searchToggle, 'click', (e) => {
      e.preventDefault();
      const isExpanded = this.searchForm.classList.contains('is-expanded');
      
      this.searchForm.classList.toggle('is-expanded', !isExpanded);
      
      if (!isExpanded) {
        const searchInput = this.searchForm.querySelector('input[type="search"]');
        searchInput?.focus();
      }
      
      this.dispatch('search-toggle', { isExpanded: !isExpanded });
    });
  }
  
  initStickyHeader() {
    let lastScrollY = window.scrollY;
    let isStuck = false;
    
    const stickyHandler = PitagoraTheme.utils.throttle(() => {
      const currentScrollY = window.scrollY;
      const shouldStick = currentScrollY > 100;
      
      if (shouldStick !== isStuck) {
        isStuck = shouldStick;
        this.classList.toggle('header--stuck', isStuck);
        this.dispatch('header-sticky-change', { isStuck });
      }
      
      // Hide/show header on scroll
      if (currentScrollY > lastScrollY && currentScrollY > 200) {
        this.classList.add('header--hidden');
      } else {
        this.classList.remove('header--hidden');
      }
      
      lastScrollY = currentScrollY;
    }, 16, { passive: true }); // ~60fps throttling
    
    this.addListener(window, 'scroll', stickyHandler, { passive: true });
  }
  
  initCartUpdates() {
    if (!this.cartIcon || !this.cartCount) return;
    
    // Listen for cart updates
    this.addListener(document, 'cart:updated', (e) => {
      const { itemCount } = e.detail;
      this.updateCartCount(itemCount);
    });
    
    // Update cart count with animation
    this.updateCartCount(window.theme?.cart?.item_count || 0);
  }
  
  updateCartCount(count) {
    if (!this.cartCount) return;
    
    const currentCount = parseInt(this.cartCount.textContent) || 0;
    
    if (count !== currentCount) {
      this.cartCount.textContent = count;
      
      // Add animation class
      this.cartCount.classList.add('cart-count--updated');
      
      this.scheduleTask(() => {
        this.cartCount?.classList.remove('cart-count--updated');
      }, 300);
      
      // Update visibility
      this.cartIcon.classList.toggle('has-items', count > 0);
    }
  }
  
  connectedCallback() {
    this.searchToggle = this.querySelector('[data-search-toggle]');
    this.searchDrawer = this.querySelector('[data-search-drawer]');
    this.cartToggle = this.querySelector('[data-cart-toggle]');
    
    this.setupMobileMenu();
    this.setupSearch();
    this.setupStickyHeader();
    this.setupAccessibility();
  }

  setupMobileMenu() {
    if (!this.menuToggle || !this.mobileMenu) return;

    this.addListener(this.menuToggle, 'click', (e) => {
      e.preventDefault();
      const isOpen = this.mobileMenu.classList.contains('active');
      
      if (isOpen) {
        this.closeMobileMenu();
      } else {
        this.openMobileMenu();
      }
    });

    // Close menu on escape
    this.addListener(document, 'keydown', (e) => {
      if (e.key === 'Escape' && this.mobileMenu.classList.contains('active')) {
        this.closeMobileMenu();
      }
    });

    // Close menu when clicking outside
    this.addListener(document, 'click', (e) => {
      if (!this.contains(e.target) && this.mobileMenu.classList.contains('active')) {
        this.closeMobileMenu();
      }
    });
  }

  openMobileMenu() {
    this.mobileMenu.classList.add('active');
    this.menuToggle.setAttribute('aria-expanded', 'true');
    document.body.classList.add('no-scroll');
    
    // Focus first menu item
    const firstMenuItem = this.mobileMenu.querySelector('a, button');
    if (firstMenuItem) firstMenuItem.focus();
  }

  closeMobileMenu() {
    this.mobileMenu.classList.remove('active');
    this.menuToggle.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('no-scroll');
    this.menuToggle.focus();
  }

  setupSearch() {
    if (!this.searchToggle) return;

    this.addListener(this.searchToggle, 'click', (e) => {
      e.preventDefault();
      this.toggleSearch();
    });
  }

  toggleSearch() {
    if (this.searchDrawer) {
      const isOpen = this.searchDrawer.classList.contains('active');
      
      if (isOpen) {
        this.searchDrawer.classList.remove('active');
        this.searchToggle.setAttribute('aria-expanded', 'false');
      } else {
        this.searchDrawer.classList.add('active');
        this.searchToggle.setAttribute('aria-expanded', 'true');
        
        // Focus search input
        const searchInput = this.searchDrawer.querySelector('input[type="search"]');
        if (searchInput) searchInput.focus();
      }
    }
  }

  setupStickyHeader() {
    if (!this.hasAttribute('data-sticky')) return;

    let lastScrollY = window.scrollY;
    let isScrollingUp = false;

    this.addListener(window, 'scroll', () => {
      const currentScrollY = window.scrollY;
      isScrollingUp = currentScrollY < lastScrollY;
      
      if (currentScrollY > 100) {
        this.classList.toggle('header--hidden', !isScrollingUp && currentScrollY > lastScrollY);
        this.classList.add('header--scrolled');
      } else {
        this.classList.remove('header--hidden', 'header--scrolled');
      }
      
      lastScrollY = currentScrollY;
    }, { passive: true });
  }

  setupAccessibility() {
    // Set proper ARIA attributes
    if (this.menuToggle && this.mobileMenu) {
      this.menuToggle.setAttribute('aria-expanded', 'false');
      this.menuToggle.setAttribute('aria-controls', this.mobileMenu.id || 'mobile-menu');
    }

    if (this.searchToggle && this.searchDrawer) {
      this.searchToggle.setAttribute('aria-expanded', 'false');
      this.searchToggle.setAttribute('aria-controls', this.searchDrawer.id || 'search-drawer');
    }
  }
}

/**
 * Product Card Component
 * Interactive product display with quick actions
 */
class ProductCard extends PitagoraElement {
  setup() {
    this.productData = this.getProductData();
    this.quickViewButton = this.querySelector('[data-quick-view]');
    this.addToCartButton = this.querySelector('[data-add-to-cart]');
    this.variantSelects = this.querySelectorAll('[data-variant-select]');
    this.imageContainer = this.querySelector('[data-product-media]');
    
    this.setupQuickView();
    this.setupAddToCart();
    this.setupVariantSelection();
    this.setupImageHover();
    this.setupAccessibility();
  }

  getProductData() {
    try {
      const productDataScript = this.querySelector('[data-product-json]');
      return productDataScript ? JSON.parse(productDataScript.textContent) : null;
    } catch (error) {
      if (window.ErrorHandler) {
        window.ErrorHandler.handleError({
          message: 'Failed to parse product data',
          error: error,
          category: 'VALIDATION',
          level: 'ERROR'
        });
      }
      return null;
    }
  }

  setupQuickView() {
    if (!this.quickViewButton || !window.theme?.settings?.quick_view) return;

    this.addListener(this.quickViewButton, 'click', (e) => {
      e.preventDefault();
      this.openQuickView();
    });
  }

  openQuickView() {
    const productHandle = this.dataset.productHandle;
    if (!productHandle) return;

    // Load quick view modal
    if (window.theme?.modals?.openQuickView) {
      window.theme.modals.openQuickView(productHandle);
    }
  }

  setupAddToCart() {
    if (!this.addToCartButton) return;

    this.addListener(this.addToCartButton, 'click', async (e) => {
      e.preventDefault();
      await this.addToCart();
    });
  }

  async addToCart() {
    const variantId = this.getSelectedVariantId();
    if (!variantId) return;

    try {
      this.setLoading(true);
      
      const response = await fetch('/cart/add.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          id: variantId,
          quantity: 1
        })
      });

      if (response.ok) {
        this.showAddToCartSuccess();
        // Update cart count
        if (window.theme?.cart?.updateCount) {
          window.theme.cart.updateCount();
        }
      } else {
        throw new Error('Failed to add to cart');
      }
    } catch (error) {
      this.showAddToCartError();
      if (window.ErrorHandler) {
        window.ErrorHandler.networkError('Add to cart failed', '/cart/add.js', response?.status);
      }
    } finally {
      this.setLoading(false);
    }
  }

  getSelectedVariantId() {
    if (this.productData?.variants?.length === 1) {
      return this.productData.variants[0].id;
    }

    // Get variant based on selected options
    const selectedOptions = Array.from(this.variantSelects).map(select => select.value);
    const variant = this.productData?.variants?.find(v => 
      v.options.every((option, index) => option === selectedOptions[index])
    );

    return variant?.id || this.productData?.variants?.[0]?.id;
  }

  setupVariantSelection() {
    this.variantSelects.forEach(select => {
      this.addListener(select, 'change', () => {
        this.updateVariantDisplay();
      });
    });
  }

  updateVariantDisplay() {
    const selectedVariant = this.getSelectedVariant();
    if (!selectedVariant) return;

    // Update price
    const priceElement = this.querySelector('[data-price]');
    if (priceElement && selectedVariant.price) {
      priceElement.textContent = this.formatMoney(selectedVariant.price);
    }

    // Update availability
    const availabilityElement = this.querySelector('[data-availability]');
    if (availabilityElement) {
      availabilityElement.textContent = selectedVariant.available ? 
        window.theme?.strings?.inStock || 'In stock' : 
        window.theme?.strings?.soldOut || 'Sold out';
    }

    // Update add to cart button
    if (this.addToCartButton) {
      this.addToCartButton.disabled = !selectedVariant.available;
    }
  }

  getSelectedVariant() {
    const variantId = this.getSelectedVariantId();
    return this.productData?.variants?.find(v => v.id === variantId);
  }

  setupImageHover() {
    if (!this.imageContainer) return;

    const images = this.imageContainer.querySelectorAll('img');
    if (images.length < 2) return;

    this.addListener(this, 'mouseenter', () => {
      if (images[1]) images[1].style.opacity = '1';
    });

    this.addListener(this, 'mouseleave', () => {
      if (images[1]) images[1].style.opacity = '0';
    });
  }

  setLoading(loading) {
    this.classList.toggle('loading', loading);
    if (this.addToCartButton) {
      this.addToCartButton.disabled = loading;
    }
  }

  showAddToCartSuccess() {
    if (window.theme?.showToast) {
      window.theme.showToast(
        window.theme?.strings?.addedToCart || 'Added to cart!',
        'success'
      );
    }
  }

  showAddToCartError() {
    if (window.theme?.showToast) {
      window.theme.showToast(
        window.theme?.strings?.addToCartError || 'Could not add to cart',
        'error'
      );
    }
  }

  formatMoney(cents) {
    const format = window.theme?.settings?.money_format || '${amount}';
    const amount = (cents / 100).toFixed(2);
    return format.replace('${amount}', amount);
  }

  setupAccessibility() {
    // Ensure buttons have proper labels
    if (this.quickViewButton && !this.quickViewButton.getAttribute('aria-label')) {
      const productTitle = this.querySelector('[data-product-title]')?.textContent;
      if (productTitle) {
        this.quickViewButton.setAttribute('aria-label', `Quick view ${productTitle}`);
      }
    }

    if (this.addToCartButton && !this.addToCartButton.getAttribute('aria-label')) {
      const productTitle = this.querySelector('[data-product-title]')?.textContent;
      if (productTitle) {
        this.addToCartButton.setAttribute('aria-label', `Add ${productTitle} to cart`);
      }
    }
  }
}

/**
 * Quantity Input Component
 * Enhanced quantity selector with validation
 */
class QuantityInput extends PitagoraElement {
  setup() {
    this.input = this.querySelector('input[type="number"]');
    this.decreaseButton = this.querySelector('[data-quantity-decrease]');
    this.increaseButton = this.querySelector('[data-quantity-increase]');
    this.min = parseInt(this.input?.min || '1');
    this.max = parseInt(this.input?.max || '999');
    
    this.setupControls();
    this.setupValidation();
  }

  setupControls() {
    if (this.decreaseButton) {
      this.addListener(this.decreaseButton, 'click', () => {
        this.updateQuantity(-1);
      });
    }

    if (this.increaseButton) {
      this.addListener(this.increaseButton, 'click', () => {
        this.updateQuantity(1);
      });
    }

    if (this.input) {
      this.addListener(this.input, 'change', () => {
        this.validateAndUpdate();
      });

      this.addListener(this.input, 'input', () => {
        this.updateButtonStates();
      });
    }
  }

  updateQuantity(delta) {
    if (!this.input) return;

    const currentValue = parseInt(this.input.value) || this.min;
    const newValue = Math.max(this.min, Math.min(this.max, currentValue + delta));
    
    this.input.value = newValue;
    this.input.dispatchEvent(new Event('change', { bubbles: true }));
    this.updateButtonStates();
  }

  validateAndUpdate() {
    if (!this.input) return;

    let value = parseInt(this.input.value);
    
    if (isNaN(value) || value < this.min) {
      value = this.min;
    } else if (value > this.max) {
      value = this.max;
    }

    this.input.value = value;
    this.updateButtonStates();
  }

  updateButtonStates() {
    const currentValue = parseInt(this.input?.value || this.min);

    if (this.decreaseButton) {
      this.decreaseButton.disabled = currentValue <= this.min;
    }

    if (this.increaseButton) {
      this.increaseButton.disabled = currentValue >= this.max;
    }
  }

  setupValidation() {
    this.updateButtonStates();
  }

  getValue() {
    return parseInt(this.input?.value || this.min);
  }

  setValue(value) {
    if (this.input) {
      this.input.value = Math.max(this.min, Math.min(this.max, parseInt(value) || this.min));
      this.updateButtonStates();
    }
  }
}

// Register Custom Elements
if ('customElements' in window) {
  customElements.define('store-header', StoreHeader);
  customElements.define('product-card', ProductCard);
  customElements.define('quantity-input', QuantityInput);
  
  console.log('✅ Pitagora Custom Elements registered successfully');
} else {
  // Fallback for browsers without Custom Elements support
  console.warn('⚠️ Custom Elements not supported, using fallback initialization');
  
  document.addEventListener('DOMContentLoaded', () => {
    // Initialize components manually for older browsers
    document.querySelectorAll('.header').forEach(header => {
      // Manual header initialization
    });
  });
}

// Export for use in other modules
window.PitagoraElements = {
  PitagoraElement,
  StoreHeader,
  ProductCard,
  QuantityInput
};