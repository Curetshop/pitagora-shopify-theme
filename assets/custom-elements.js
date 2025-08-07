/**
 * Pitagora Theme - Custom Elements
 * Modern Web Components for enhanced functionality and performance
 * Based on Shopify best practices and accessibility standards
 */

// Base Custom Element Class
class PitagoraElement extends HTMLElement {
  constructor() {
    super();
    this.debug = window.theme?.debug || false;
    this.boundEventListeners = new Map();
  }

  connectedCallback() {
    this.setup();
    if (this.debug) console.log(`✅ ${this.constructor.name} connected`);
  }

  disconnectedCallback() {
    this.cleanup();
    if (this.debug) console.log(`♻️ ${this.constructor.name} disconnected`);
  }

  setup() {
    // Override in child classes
  }

  cleanup() {
    // Remove all bound event listeners
    this.boundEventListeners.forEach((listener, element) => {
      element.removeEventListener(listener.event, listener.handler);
    });
    this.boundEventListeners.clear();
  }

  addListener(element, event, handler) {
    element.addEventListener(event, handler);
    this.boundEventListeners.set(element, { event, handler });
  }
}

/**
 * Store Header Component
 * Handles navigation, search, cart, and mobile menu
 */
class StoreHeader extends PitagoraElement {
  setup() {
    this.menuToggle = this.querySelector('[data-mobile-menu-toggle]');
    this.mobileMenu = this.querySelector('[data-mobile-menu]');
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