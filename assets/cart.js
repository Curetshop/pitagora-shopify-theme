/**
 * Cart JavaScript - Pitagora Theme
 * Modern cart functionality with accessibility and error handling
 * Based on Shopify Online Store 2.0 standards
 */

class CartManager {
  constructor() {
    this.cart = null;
    this.selectors = {
      cartItems: '[data-cart-items]',
      cartItemsContainer: '#main-cart-items',
      cartCount: '[data-cart-count]',
      cartTotal: '[data-cart-total]',
      cartNote: '#Cart-note',
      cartForm: '#cart',
      loadingOverlay: '.loading-overlay',
      removeButton: 'cart-remove-button',
      quantityInput: 'quantity-input'
    };
    
    this.classes = {
      loading: 'loading',
      hidden: 'hidden',
      error: 'error'
    };

    this.init();
  }

  init() {
    this.bindEvents();
    this.getCurrentCart();
  }

  bindEvents() {
    // Quantity input events
    document.addEventListener('change', (event) => {
      if (event.target.matches('.quantity__input')) {
        this.handleQuantityChange(event);
      }
    });

    // Quantity button events
    document.addEventListener('click', (event) => {
      if (event.target.closest('.quantity__button')) {
        this.handleQuantityButton(event);
      }
    });

    // Remove item events
    document.addEventListener('click', (event) => {
      if (event.target.closest('cart-remove-button a')) {
        event.preventDefault();
        this.handleRemoveItem(event);
      }
    });

    // Cart note events
    const cartNote = document.querySelector(this.selectors.cartNote);
    if (cartNote) {
      let noteTimeout;
      cartNote.addEventListener('input', () => {
        clearTimeout(noteTimeout);
        noteTimeout = setTimeout(() => {
          this.updateCartNote(cartNote.value);
        }, 1000);
      });
    }

    // Form submission
    const cartForm = document.querySelector(this.selectors.cartForm);
    if (cartForm) {
      cartForm.addEventListener('submit', (event) => {
        this.handleCartUpdate(event);
      });
    }
  }

  async getCurrentCart() {
    try {
      const response = await fetch(`${window.Shopify.routes.root}cart.js`);
      this.cart = await response.json();
      this.updateCartUI();
    } catch (error) {
      console.error('Error fetching cart:', error);
    }
  }

  async handleQuantityChange(event) {
    const input = event.target;
    const itemKey = input.dataset.quantityVariantId;
    const quantity = parseInt(input.value);
    const cartItem = input.closest('.cart-item');
    
    // Validate quantity
    const min = parseInt(input.min) || 1;
    const max = parseInt(input.max) || Infinity;
    
    if (quantity < min || quantity > max) {
      input.value = Math.max(min, Math.min(max, quantity));
      this.showError('Invalid quantity');
      return;
    }

    await this.updateCartItem(itemKey, quantity, cartItem);
  }

  async handleQuantityButton(event) {
    event.preventDefault();
    const button = event.target.closest('.quantity__button');
    const quantityInput = button.closest('.quantity').querySelector('.quantity__input');
    const currentQuantity = parseInt(quantityInput.value);
    const min = parseInt(quantityInput.min) || 1;
    const max = parseInt(quantityInput.max) || Infinity;
    const step = parseInt(quantityInput.step) || 1;
    
    let newQuantity = currentQuantity;
    
    if (button.name === 'plus') {
      newQuantity = Math.min(max, currentQuantity + step);
    } else if (button.name === 'minus') {
      newQuantity = Math.max(min, currentQuantity - step);
    }
    
    if (newQuantity !== currentQuantity) {
      quantityInput.value = newQuantity;
      const event = new Event('change', { bubbles: true });
      quantityInput.dispatchEvent(event);
    }
  }

  async handleRemoveItem(event) {
    const removeButton = event.target.closest('cart-remove-button');
    const cartItem = removeButton.closest('.cart-item');
    const itemIndex = removeButton.dataset.index;
    
    await this.updateCartItem(null, 0, cartItem, parseInt(itemIndex));
  }

  async updateCartItem(variantId, quantity, cartItemElement, lineIndex = null) {
    const loadingOverlay = cartItemElement.querySelector(this.selectors.loadingOverlay);
    
    try {
      this.showLoading(cartItemElement, true);
      
      let body;
      if (lineIndex) {
        // Remove item using line index
        body = JSON.stringify({
          line: lineIndex,
          quantity: 0
        });
      } else {
        // Update item using variant ID
        body = JSON.stringify({
          id: variantId,
          quantity: quantity
        });
      }

      const response = await fetch(`${window.Shopify.routes.root}cart/change.js`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: body
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      this.cart = await response.json();
      
      if (quantity === 0 || lineIndex) {
        // Remove item from DOM
        this.removeCartItemFromDOM(cartItemElement);
      } else {
        // Update item in DOM
        await this.updateCartItemInDOM(cartItemElement, variantId);
      }
      
      this.updateCartUI();
      this.announceCartChange(
        quantity === 0 ? 'Item removed from cart' : 'Cart updated'
      );
      
    } catch (error) {
      console.error('Error updating cart:', error);
      this.showError('Unable to update cart. Please try again.');
    } finally {
      this.showLoading(cartItemElement, false);
    }
  }

  async updateCartNote(note) {
    try {
      const response = await fetch(`${window.Shopify.routes.root}cart/update.js`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          note: note
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      this.cart = await response.json();
      
    } catch (error) {
      console.error('Error updating cart note:', error);
    }
  }

  async updateCartItemInDOM(cartItemElement, variantId) {
    // Find the updated item in the cart
    const updatedItem = this.cart.items.find(item => item.variant_id.toString() === variantId.toString());
    
    if (updatedItem) {
      // Update line total
      const priceWrapper = cartItemElement.querySelector('.cart-item__price-wrapper');
      if (priceWrapper) {
        const formattedPrice = this.formatMoney(updatedItem.final_line_price);
        priceWrapper.querySelector('.price').textContent = formattedPrice;
      }
    }
  }

  removeCartItemFromDOM(cartItemElement) {
    cartItemElement.style.opacity = '0.5';
    cartItemElement.style.transform = 'translateX(-100%)';
    
    setTimeout(() => {
      cartItemElement.remove();
      this.checkEmptyCart();
    }, 300);
  }

  checkEmptyCart() {
    const cartItemsContainer = document.querySelector(this.selectors.cartItemsContainer);
    const cartItems = cartItemsContainer?.querySelectorAll('.cart-item');
    
    if (!cartItems || cartItems.length === 0) {
      this.showEmptyCart();
    }
  }

  showEmptyCart() {
    const cartContainer = document.querySelector('.cart-items');
    if (cartContainer) {
      cartContainer.classList.add('cart-items--empty');
      cartContainer.innerHTML = `
        <div class="cart-empty">
          <div class="cart-empty__content">
            <h2>Your cart is empty</h2>
            <p>Continue shopping to explore more products</p>
            <a href="/collections" class="button button--primary">
              Continue Shopping
            </a>
          </div>
        </div>
      `;
    }
  }

  updateCartUI() {
    // Update cart count
    const cartCountElements = document.querySelectorAll(this.selectors.cartCount);
    cartCountElements.forEach(element => {
      element.textContent = this.cart.item_count;
    });

    // Update cart total
    const cartTotalElements = document.querySelectorAll(this.selectors.cartTotal);
    cartTotalElements.forEach(element => {
      element.textContent = this.formatMoney(this.cart.total_price);
    });

    // Update subtotal
    const subtotalElement = document.querySelector('.totals__subtotal-value');
    if (subtotalElement) {
      subtotalElement.textContent = this.formatMoney(this.cart.total_price);
    }
  }

  showLoading(element, show) {
    const loadingOverlay = element.querySelector(this.selectors.loadingOverlay);
    if (loadingOverlay) {
      if (show) {
        loadingOverlay.classList.remove(this.classes.hidden);
        element.style.pointerEvents = 'none';
      } else {
        loadingOverlay.classList.add(this.classes.hidden);
        element.style.pointerEvents = '';
      }
    }
  }

  showError(message) {
    this.announceCartChange(message);
    
    // You could also show a toast notification here
    console.error(message);
  }

  announceCartChange(message) {
    const liveRegion = document.getElementById('cart-live-region-text');
    if (liveRegion) {
      liveRegion.textContent = message;
      setTimeout(() => {
        liveRegion.textContent = '';
      }, 3000);
    }
  }

  formatMoney(cents) {
    if (window.theme && window.theme.settings && window.theme.settings.money_format) {
      return this.formatMoneyWithFormat(cents, window.theme.settings.money_format);
    }
    
    // Fallback formatting
    return '$' + (cents / 100).toFixed(2);
  }

  formatMoneyWithFormat(cents, format) {
    if (typeof cents === 'string') cents = cents.replace('.', '');
    
    const value = (parseInt(cents, 10) / 100).toFixed(2);
    const formatString = format || '${{amount}}';
    
    return formatString.replace(/\{\{\s*amount\s*\}\}/, value);
  }
}

// Custom Elements
class QuantityInput extends HTMLElement {
  constructor() {
    super();
    this.input = this.querySelector('.quantity__input');
    this.changeEvent = new Event('change', { bubbles: true });
    this.input.addEventListener('change', this.onInputChange.bind(this));
    this.querySelectorAll('.quantity__button').forEach(button =>
      button.addEventListener('click', this.onButtonClick.bind(this))
    );
  }

  onInputChange() {
    this.validateQuantity();
  }

  onButtonClick(event) {
    event.preventDefault();
    const previousValue = this.input.value;
    const button = event.target.closest('.quantity__button');
    
    if (button.name === 'plus') {
      this.input.stepUp();
    } else {
      this.input.stepDown();
    }
    
    if (previousValue !== this.input.value) {
      this.input.dispatchEvent(this.changeEvent);
    }
  }

  validateQuantity() {
    const value = parseInt(this.input.value);
    const min = parseInt(this.input.min) || 1;
    const max = parseInt(this.input.max) || Infinity;
    
    if (value < min) {
      this.input.value = min;
    } else if (value > max) {
      this.input.value = max;
    }
    
    // Update button states
    this.updateButtonStates();
  }

  updateButtonStates() {
    const value = parseInt(this.input.value);
    const min = parseInt(this.input.min) || 1;
    const max = parseInt(this.input.max) || Infinity;
    
    const minusButton = this.querySelector('[name="minus"]');
    const plusButton = this.querySelector('[name="plus"]');
    
    if (minusButton) {
      minusButton.disabled = value <= min;
    }
    
    if (plusButton) {
      plusButton.disabled = value >= max;
    }
  }
}

class CartRemoveButton extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('click', (event) => {
      event.preventDefault();
      this.closest('.cart-item')?.style.setProperty('opacity', '0.5');
    });
  }
}

class CartNote extends HTMLElement {
  constructor() {
    super();
    this.textarea = this.querySelector('textarea');
    
    if (this.textarea) {
      this.textarea.addEventListener('input', this.debounce(() => {
        this.saveNote();
      }, 1000));
    }
  }

  saveNote() {
    const note = this.textarea.value;
    
    fetch(`${window.Shopify.routes.root}cart/update.js`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ note: note })
    }).catch(error => {
      console.error('Error saving cart note:', error);
    });
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
}

class ProductRecommendations extends HTMLElement {
  constructor() {
    super();
    const handleIntersection = (entries, observer) => {
      if (!entries[0].isIntersecting) return;
      observer.unobserve(this);
      
      fetch(this.dataset.url)
        .then(response => response.text())
        .then(text => {
          const html = document.createElement('div');
          html.innerHTML = text;
          const recommendations = html.querySelector('product-recommendations');
          if (recommendations && recommendations.innerHTML.trim().length) {
            this.innerHTML = recommendations.innerHTML;
          }
        })
        .catch(e => {
          console.error(e);
        });
    };

    new IntersectionObserver(handleIntersection.bind(this), { rootMargin: '0px 0px 400px 0px' }).observe(this);
  }
}

// Register custom elements
customElements.define('quantity-input', QuantityInput);
customElements.define('cart-remove-button', CartRemoveButton);
customElements.define('cart-note', CartNote);
customElements.define('product-recommendations', ProductRecommendations);

// Initialize cart manager
document.addEventListener('DOMContentLoaded', () => {
  new CartManager();
});

// Shipping Calculator
class ShippingCalculator {
  constructor() {
    this.form = document.querySelector('.cart-shipping-calculator__form');
    this.countrySelect = document.getElementById('AddressCountry');
    this.provinceSelect = document.getElementById('AddressProvince');
    this.zipInput = document.getElementById('AddressZip');
    this.calculateButton = document.getElementById('calculate-shipping');
    this.resultsDiv = document.getElementById('shipping-results');
    this.errorDiv = document.getElementById('shipping-error');

    if (this.form) {
      this.init();
    }
  }

  init() {
    this.bindEvents();
  }

  bindEvents() {
    if (this.countrySelect) {
      this.countrySelect.addEventListener('change', this.handleCountryChange.bind(this));
    }

    if (this.calculateButton) {
      this.calculateButton.addEventListener('click', this.calculateShipping.bind(this));
    }
  }

  handleCountryChange(event) {
    const countryCode = event.target.value;
    
    this.calculateButton.disabled = !countryCode;
    this.provinceSelect.disabled = !countryCode;
    
    if (countryCode) {
      this.loadProvinces(countryCode);
    } else {
      this.clearProvinces();
    }
    
    this.hideResults();
  }

  loadProvinces(countryCode) {
    // This would typically load provinces from Shopify's API
    // For now, just enable the province select
    this.provinceSelect.disabled = false;
    
    // Clear existing options except the first one
    this.provinceSelect.innerHTML = this.provinceSelect.children[0].outerHTML;
  }

  clearProvinces() {
    this.provinceSelect.innerHTML = this.provinceSelect.children[0].outerHTML;
  }

  async calculateShipping() {
    const country = this.countrySelect.value;
    const province = this.provinceSelect.value;
    const zip = this.zipInput.value;

    if (!country) {
      this.showError('Please select a country');
      return;
    }

    this.showLoading(true);

    try {
      // This would typically make a request to Shopify's shipping API
      // For demo purposes, we'll simulate the calculation
      await this.simulateShippingCalculation();
      
      this.showResults([
        { name: 'Standard Shipping', price: 5.99 },
        { name: 'Express Shipping', price: 15.99 }
      ]);
      
    } catch (error) {
      this.showError('Unable to calculate shipping rates. Please try again.');
    } finally {
      this.showLoading(false);
    }
  }

  simulateShippingCalculation() {
    return new Promise(resolve => setTimeout(resolve, 1500));
  }

  showLoading(show) {
    const buttonText = this.calculateButton.querySelector('.button-text');
    const loadingSpinner = this.calculateButton.querySelector('.loading-spinner');
    
    this.calculateButton.disabled = show;
    
    if (buttonText) {
      buttonText.style.display = show ? 'none' : 'inline';
    }
    
    if (loadingSpinner) {
      loadingSpinner.classList.toggle('hidden', !show);
    }
  }

  showResults(rates) {
    this.hideError();
    
    const content = rates.map(rate => `
      <div class="shipping-rate">
        <span class="shipping-rate__name">${rate.name}</span>
        <span class="shipping-rate__price">$${rate.price}</span>
      </div>
    `).join('');
    
    this.resultsDiv.querySelector('.cart-shipping-results__content').innerHTML = content;
    this.resultsDiv.style.display = 'block';
  }

  showError(message) {
    this.hideResults();
    
    this.errorDiv.querySelector('.shipping-error-text').textContent = message;
    this.errorDiv.style.display = 'block';
  }

  hideResults() {
    this.resultsDiv.style.display = 'none';
  }

  hideError() {
    this.errorDiv.style.display = 'none';
  }
}

// Initialize shipping calculator
document.addEventListener('DOMContentLoaded', () => {
  new ShippingCalculator();
});