/**
 * Cart Drawer JavaScript - Pitagora Theme
 * Custom Elements System basado en Shrine Pro + Focal v4
 * Manejo completo del carrito lateral
 */

// Utility functions
const debounce = (fn, wait) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
};

const dispatchCustomEvent = (eventName, data = {}) => {
  const event = new CustomEvent(eventName, {
    detail: data,
    bubbles: true
  });
  document.dispatchEvent(event);
};

/**
 * Cart Drawer Main Custom Element
 */
if (!customElements.get('cart-drawer')) {
  class CartDrawer extends HTMLElement {
    constructor() {
      super();
      this.overlay = document.querySelector('.cart-drawer-overlay');
      this.closeButton = this.querySelector('.cart-drawer__close');
      this.checkoutButton = this.querySelector('.cart-drawer__checkout');
      
      this.bindEvents();
      this.loadConfiguration();
    }

    connectedCallback() {
      // Listen for cart updates
      document.addEventListener('cart:updated', this.handleCartUpdate.bind(this));
      document.addEventListener('variant:added', this.handleVariantAdded.bind(this));
    }

    bindEvents() {
      // Close button
      this.closeButton?.addEventListener('click', this.close.bind(this));
      
      // Overlay click
      this.overlay?.addEventListener('click', this.close.bind(this));
      
      // Escape key
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && this.isOpen()) {
          this.close();
        }
      });

      // Checkout button
      this.checkoutButton?.addEventListener('click', this.handleCheckout.bind(this));

      // Cart note
      const cartNote = this.querySelector('#cart-note');
      if (cartNote) {
        cartNote.addEventListener('change', debounce(this.updateCartNote.bind(this), 500));
      }
    }

    loadConfiguration() {
      const configScript = document.querySelector('[data-cart-drawer-config]');
      if (configScript) {
        this.config = JSON.parse(configScript.textContent);
      }
    }

    isOpen() {
      return this.hasAttribute('open');
    }

    open() {
      this.setAttribute('open', '');
      document.body.style.overflow = 'hidden';
      
      // Focus management
      this.setAttribute('tabindex', '-1');
      this.focus();
      
      dispatchCustomEvent('cart-drawer:opened');
    }

    close() {
      this.removeAttribute('open');
      document.body.style.overflow = '';
      
      dispatchCustomEvent('cart-drawer:closed');
    }

    handleCartUpdate(event) {
      const cart = event.detail.cart;
      this.renderContents(cart);
    }

    handleVariantAdded(event) {
      // Auto-open drawer when item added
      this.open();
      this.fetchCartAndRender();
    }

    handleCheckout(event) {
      event.preventDefault();
      
      // Set loading state
      this.checkoutButton.setAttribute('disabled', 'true');
      this.checkoutButton.textContent = 'Processing...';
      
      // Redirect to checkout
      window.location.href = '/checkout';
    }

    async fetchCartAndRender() {
      try {
        const response = await fetch(`${this.config.routes.cart_url}.js`);
        const cart = await response.json();
        
        this.renderContents(cart);
        dispatchCustomEvent('cart:updated', { cart });
      } catch (error) {
        console.error('Failed to fetch cart:', error);
      }
    }

    renderContents(cart) {
      // Update cart count in title
      const title = this.querySelector('.cart-drawer__title');
      if (title) {
        title.textContent = `Cart (${cart.item_count})`;
      }

      // Update subtotal
      const subtotal = this.querySelector('.cart-subtotal span:last-child');
      if (subtotal) {
        subtotal.textContent = this.formatMoney(cart.total_price);
      }

      // Toggle empty state
      this.classList.toggle('is-empty', cart.item_count === 0);

      // Re-initialize components if cart has items
      if (cart.item_count > 0) {
        this.initializeCartItems();
      }
    }

    initializeCartItems() {
      // Re-initialize quantity inputs and remove buttons
      this.querySelectorAll('quantity-input').forEach(element => {
        if (!element.initialized) {
          element.initialized = true;
        }
      });

      this.querySelectorAll('cart-remove-button').forEach(element => {
        if (!element.initialized) {
          element.initialized = true;
        }
      });
    }

    async updateCartNote(event) {
      const note = event.target.value;
      
      try {
        const response = await fetch(`${this.config.routes.cart_url}.js`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          },
          body: JSON.stringify({ note })
        });
        
        const cart = await response.json();
        dispatchCustomEvent('cart:updated', { cart });
      } catch (error) {
        console.error('Failed to update cart note:', error);
      }
    }

    formatMoney(cents) {
      if (this.config?.money_format) {
        return Shopify.formatMoney(cents, this.config.money_format);
      }
      return `$${(cents / 100).toFixed(2)}`;
    }
  }

  customElements.define('cart-drawer', CartDrawer);
}

/**
 * Cart Drawer Items Container
 */
if (!customElements.get('cart-drawer-items')) {
  class CartDrawerItems extends HTMLElement {
    constructor() {
      super();
      this.currentItemCount = this.querySelectorAll('.cart-item').length;
    }

    connectedCallback() {
      this.initializeQuantityInputs();
      this.initializeRemoveButtons();
    }

    initializeQuantityInputs() {
      this.querySelectorAll('.quantity-input-field').forEach(input => {
        input.addEventListener('change', debounce(this.updateQuantity.bind(this), 300));
      });
    }

    initializeRemoveButtons() {
      this.querySelectorAll('cart-remove-button').forEach(button => {
        button.addEventListener('click', this.removeItem.bind(this));
      });
    }

    async updateQuantity(event) {
      const input = event.target;
      const index = parseInt(input.dataset.index);
      const quantity = parseInt(input.value);
      const line = index;

      // Show loading state for this item
      const cartItem = input.closest('.cart-item');
      this.showItemLoading(cartItem);

      try {
        const response = await fetch(`${this.getConfig().routes.cart_change_url}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          },
          body: JSON.stringify({
            line: line,
            quantity: quantity
          })
        });

        const result = await response.json();
        
        if (result.status) {
          this.showError(result.message || result.description);
        } else {
          dispatchCustomEvent('cart:updated', { cart: result });
          
          // Remove item if quantity is 0
          if (quantity === 0) {
            this.removeItemElement(cartItem);
          }
        }
      } catch (error) {
        console.error('Failed to update quantity:', error);
        this.showError('Failed to update quantity. Please try again.');
      } finally {
        this.hideItemLoading(cartItem);
      }
    }

    async removeItem(event) {
      const button = event.currentTarget;
      const index = parseInt(button.dataset.index);
      const cartItem = button.closest('.cart-item');

      this.showItemLoading(cartItem);

      try {
        const response = await fetch(`${this.getConfig().routes.cart_change_url}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          },
          body: JSON.stringify({
            line: index,
            quantity: 0
          })
        });

        const result = await response.json();
        
        if (result.status) {
          this.showError(result.message || result.description);
        } else {
          this.removeItemElement(cartItem);
          dispatchCustomEvent('cart:updated', { cart: result });
        }
      } catch (error) {
        console.error('Failed to remove item:', error);
        this.showError('Failed to remove item. Please try again.');
      } finally {
        this.hideItemLoading(cartItem);
      }
    }

    showItemLoading(cartItem) {
      cartItem.style.opacity = '0.5';
      cartItem.style.pointerEvents = 'none';
    }

    hideItemLoading(cartItem) {
      cartItem.style.opacity = '';
      cartItem.style.pointerEvents = '';
    }

    removeItemElement(cartItem) {
      cartItem.style.transition = 'all 0.3s ease';
      cartItem.style.transform = 'translateX(100%)';
      cartItem.style.opacity = '0';
      
      setTimeout(() => {
        cartItem.remove();
        this.currentItemCount--;
        
        // Check if cart is empty
        if (this.currentItemCount === 0) {
          this.closest('cart-drawer').classList.add('is-empty');
        }
      }, 300);
    }

    showError(message) {
      // Create temporary error message
      const errorDiv = document.createElement('div');
      errorDiv.className = 'cart-drawer__error';
      errorDiv.textContent = message;
      errorDiv.style.cssText = `
        background: var(--color-error-bg, #fee);
        color: var(--color-error, #c00);
        padding: 1rem;
        margin: 1rem 0;
        border-radius: 0.5rem;
        border: 1px solid var(--color-error, #c00);
      `;
      
      this.prepend(errorDiv);
      
      setTimeout(() => errorDiv.remove(), 5000);
    }

    getConfig() {
      const configScript = document.querySelector('[data-cart-drawer-config]');
      return configScript ? JSON.parse(configScript.textContent) : {};
    }
  }

  customElements.define('cart-drawer-items', CartDrawerItems);
}

/**
 * Cart Remove Button Component
 */
if (!customElements.get('cart-remove-button')) {
  class CartRemoveButton extends HTMLElement {
    constructor() {
      super();
      this.button = this.querySelector('button');
    }

    connectedCallback() {
      if (this.button && !this.initialized) {
        this.button.addEventListener('click', this.handleClick.bind(this));
        this.initialized = true;
      }
    }

    handleClick(event) {
      event.preventDefault();
      
      // Dispatch custom event that parent will handle
      this.dispatchEvent(new CustomEvent('cart-item:remove', {
        bubbles: true,
        detail: { index: this.dataset.index }
      }));
    }
  }

  customElements.define('cart-remove-button', CartRemoveButton);
}

// Cart Drawer Global Functions
window.cartDrawer = {
  open() {
    const cartDrawer = document.querySelector('cart-drawer');
    if (cartDrawer) {
      cartDrawer.open();
    }
  },

  close() {
    const cartDrawer = document.querySelector('cart-drawer');
    if (cartDrawer) {
      cartDrawer.close();
    }
  },

  refresh() {
    const cartDrawer = document.querySelector('cart-drawer');
    if (cartDrawer) {
      cartDrawer.fetchCartAndRender();
    }
  }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  console.log('Pitagora Cart Drawer System Loaded');
});

// Handle cart drawer triggers globally
document.addEventListener('click', function(event) {
  if (event.target.matches('[data-cart-drawer-trigger]') || 
      event.target.closest('[data-cart-drawer-trigger]')) {
    event.preventDefault();
    window.cartDrawer.open();
  }
});