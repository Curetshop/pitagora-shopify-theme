/**
 * Product JavaScript - Pitagora Theme
 * Custom Elements System inspirado en Focal v4
 * Manejo de variants, media gallery y add to cart
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
 * Variant Selects Custom Element
 * Maneja la selección de variantes y actualización de precios/disponibilidad
 */
if (!customElements.get('variant-selects')) {
  class VariantSelects extends HTMLElement {
    constructor() {
      super();
      this.addEventListener('change', this.onVariantChange.bind(this));
      this.currentVariant = this.getVariantData().find(
        (variant) => variant.available
      );
    }

    connectedCallback() {
      this.updateOptions();
      this.updateMasterId();
      this.updateMedia();
      this.updatePrice();
      this.updateBuyButton();
    }

    onVariantChange(event) {
      this.updateOptions();
      this.updateMasterId();
      this.updateMedia();
      this.updatePrice();
      this.updateBuyButton();
      this.updatePickupAvailability();
      this.updateInventoryNotice();
      
      if (this.dataset.updateUrl === 'true') {
        this.updateURL();
      }

      // Dispatch custom event for other components
      dispatchCustomEvent('variant:changed', {
        variant: this.currentVariant,
        sectionId: this.dataset.section
      });
    }

    updateOptions() {
      const fieldsets = Array.from(this.querySelectorAll('fieldset'));
      this.options = fieldsets.map(fieldset => {
        return Array.from(fieldset.querySelectorAll('input:checked, select')).find(
          input => input.type !== 'hidden'
        )?.value;
      });
    }

    updateMasterId() {
      this.currentVariant = this.getVariantData().find(variant => {
        return !variant.options.map((option, index) => {
          return this.options[index] === option;
        }).includes(false);
      });
    }

    updateMedia() {
      if (!this.currentVariant || !this.currentVariant.featured_media) return;
      
      const mediaGallery = document.querySelector('product-media');
      if (mediaGallery) {
        mediaGallery.setActiveMedia(this.currentVariant.featured_media.id);
      }
    }

    updatePrice() {
      const priceContainer = document.getElementById(`price-${this.dataset.section}`);
      if (!priceContainer) return;

      if (this.currentVariant) {
        priceContainer.classList.remove('visibility-hidden');
        this.renderPrices(priceContainer);
      } else {
        priceContainer.classList.add('visibility-hidden');
      }
    }

    renderPrices(container) {
      const price = this.currentVariant.price;
      const compareAtPrice = this.currentVariant.compare_at_price;
      
      let priceHTML = `<span class="price-current">${Shopify.formatMoney(price)}</span>`;
      
      if (compareAtPrice && compareAtPrice > price) {
        priceHTML += `<span class="price-compare">${Shopify.formatMoney(compareAtPrice)}</span>`;
        priceHTML += `<span class="price-badge">Sale</span>`;
      }
      
      container.innerHTML = priceHTML;
    }

    updateBuyButton() {
      const productForm = document.querySelector('product-form');
      const addButton = productForm?.querySelector('[name="add"]');
      const priceContainer = document.getElementById(`price-${this.dataset.section}`);
      
      if (!addButton) return;

      if (this.currentVariant) {
        if (this.currentVariant.available) {
          addButton.removeAttribute('disabled');
          addButton.querySelector('.btn-text').textContent = theme.strings.addToCart;
        } else {
          addButton.setAttribute('disabled', true);
          addButton.querySelector('.btn-text').textContent = theme.strings.soldOut;
        }
      } else {
        addButton.setAttribute('disabled', true);
        addButton.querySelector('.btn-text').textContent = theme.strings.unavailable;
      }
    }

    updatePickupAvailability() {
      const pickupAvailability = document.querySelector('pickup-availability');
      if (pickupAvailability && this.currentVariant) {
        pickupAvailability.fetchAvailability(this.currentVariant.id);
      }
    }

    updateInventoryNotice() {
      const inventoryNotice = document.getElementById(`inventory-notice-${this.dataset.section}`);
      if (!inventoryNotice || !this.currentVariant) return;

      const inventory = this.currentVariant.inventory_quantity;
      const policy = this.currentVariant.inventory_policy;
      
      if (inventory <= 10 && inventory > 0 && policy === 'deny') {
        // Secure creation of inventory notice
        const span = document.createElement('span');
        span.className = 'inventory-low';
        span.textContent = `¡Solo quedan ${inventory} disponibles!`;
        inventoryNotice.replaceChildren(span);
        inventoryNotice.style.display = 'block';
      } else {
        inventoryNotice.style.display = 'none';
      }
    }

    updateURL() {
      if (!this.currentVariant) return;
      window.history.replaceState({}, '', `${this.dataset.url}?variant=${this.currentVariant.id}`);
    }

    getVariantData() {
      return JSON.parse(this.querySelector('[type="application/json"]')?.textContent || '[]');
    }
  }

  customElements.define('variant-selects', VariantSelects);
}

/**
 * Product Media Custom Element
 * Maneja la galería de medios del producto
 */
if (!customElements.get('product-media')) {
  class ProductMedia extends HTMLElement {
    constructor() {
      super();
      this.setupMediaSwitching();
      this.setupZoom();
    }

    connectedCallback() {
      this.initializeThumbnails();
      this.initializeMediaHandlers();
    }

    setupMediaSwitching() {
      this.addEventListener('click', (event) => {
        if (event.target.matches('.product-media-thumb')) {
          event.preventDefault();
          const mediaId = event.target.dataset.mediaId;
          this.setActiveMedia(mediaId);
        }
      });
    }

    setupZoom() {
      if (this.dataset.enableZoom === 'true') {
        this.addEventListener('click', (event) => {
          if (event.target.matches('.product-media-zoom-trigger')) {
            event.preventDefault();
            this.openZoom(event.target.dataset.zoomImage);
          }
        });
      }
    }

    setActiveMedia(mediaId) {
      // Hide all media items
      this.querySelectorAll('.product-media-item').forEach(item => {
        item.style.display = item.dataset.mediaId === mediaId ? 'block' : 'none';
      });

      // Update thumbnail states
      this.querySelectorAll('.product-media-thumb').forEach(thumb => {
        thumb.classList.toggle('product-media-thumb--active', thumb.dataset.mediaId === mediaId);
      });
    }

    initializeThumbnails() {
      const firstMedia = this.querySelector('.product-media-item');
      if (firstMedia) {
        this.setActiveMedia(firstMedia.dataset.mediaId);
      }
    }

    initializeMediaHandlers() {
      // Video handlers
      this.querySelectorAll('.product-media-video-trigger').forEach(trigger => {
        trigger.addEventListener('click', (event) => {
          event.preventDefault();
          this.playVideo(trigger.dataset.videoId);
        });
      });

      // 3D Model handlers  
      this.querySelectorAll('.product-media-model-trigger').forEach(trigger => {
        trigger.addEventListener('click', (event) => {
          event.preventDefault();
          this.load3DModel(trigger.dataset.modelId);
        });
      });
    }

    playVideo(videoId) {
      const videoContainer = this.querySelector(`[data-video-container]`);
      const video = videoContainer?.querySelector('video');
      
      if (video) {
        videoContainer.style.display = 'block';
        video.play();
      }
    }

    load3DModel(modelId) {
      const modelViewer = this.querySelector('[data-model-viewer]');
      if (modelViewer) {
        modelViewer.style.display = 'block';
      }
    }

    openZoom(imageUrl) {
      // Implement zoom modal functionality
      const modal = document.createElement('div');
      modal.className = 'product-zoom-modal';
      modal.innerHTML = `
        <div class="product-zoom-overlay">
          <button class="product-zoom-close">&times;</button>
          <img src="${imageUrl}" alt="Product zoom">
        </div>
      `;
      
      document.body.appendChild(modal);
      document.body.style.overflow = 'hidden';

      modal.addEventListener('click', (event) => {
        if (event.target.matches('.product-zoom-overlay, .product-zoom-close')) {
          document.body.removeChild(modal);
          document.body.style.overflow = '';
        }
      });
    }
  }

  customElements.define('product-media', ProductMedia);
}

/**
 * Quantity Input Custom Element
 */
if (!customElements.get('quantity-input')) {
  class QuantityInput extends HTMLElement {
    constructor() {
      super();
      this.input = this.querySelector('.quantity-input-field');
      this.minusButton = this.querySelector('.quantity-input-button--minus');
      this.plusButton = this.querySelector('.quantity-input-button--plus');
      
      this.setupEventListeners();
    }

    setupEventListeners() {
      this.minusButton?.addEventListener('click', () => this.changeQuantity(-1));
      this.plusButton?.addEventListener('click', () => this.changeQuantity(1));
      
      this.input?.addEventListener('change', () => this.validateQuantity());
    }

    changeQuantity(change) {
      const currentValue = parseInt(this.input.value) || 1;
      const newValue = Math.max(1, currentValue + change);
      
      if (this.input.max && newValue > parseInt(this.input.max)) return;
      
      this.input.value = newValue;
      this.input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    validateQuantity() {
      const value = parseInt(this.input.value) || 1;
      const min = parseInt(this.input.min) || 1;
      const max = parseInt(this.input.max) || Infinity;
      
      this.input.value = Math.max(min, Math.min(max, value));
    }
  }

  customElements.define('quantity-input', QuantityInput);
}

/**
 * Product Form Custom Element
 */
if (!customElements.get('product-form')) {
  class ProductForm extends HTMLElement {
    constructor() {
      super();
      this.form = this.querySelector('form');
      this.form?.addEventListener('submit', this.onSubmitHandler.bind(this));
    }

    onSubmitHandler(event) {
      event.preventDefault();
      
      const submitButton = this.form.querySelector('[type="submit"]');
      const formData = new FormData(this.form);
      
      // Show loading state
      submitButton.setAttribute('disabled', true);
      submitButton.classList.add('loading');

      fetch(`${theme.routes.cart_add_url}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify(Object.fromEntries(formData))
      })
      .then(response => response.json())
      .then(data => {
        if (data.status) {
          this.handleErrorMessage(data.description);
          return;
        }
        
        // Success - dispatch event and refresh cart
        dispatchCustomEvent('variant:added', {
          variant: data,
          quantity: formData.get('quantity')
        });
        
        this.fetchCartAndRender();
      })
      .catch(error => {
        console.error('Error:', error);
        this.handleErrorMessage('Something went wrong. Please try again.');
      })
      .finally(() => {
        // Remove loading state
        submitButton.removeAttribute('disabled');
        submitButton.classList.remove('loading');
      });
    }

    handleErrorMessage(message) {
      // Show error message to user
      const errorDiv = document.createElement('div');
      errorDiv.className = 'product-form-error';
      errorDiv.textContent = message;
      
      this.form.appendChild(errorDiv);
      setTimeout(() => errorDiv.remove(), 5000);
    }

    fetchCartAndRender() {
      fetch(`${theme.routes.cart_url}.js`)
        .then(response => response.json())
        .then(cart => {
          dispatchCustomEvent('cart:updated', { cart });
          
          // Update cart drawer if it exists
          const cartDrawer = document.querySelector('cart-drawer');
          if (cartDrawer) {
            cartDrawer.renderContents(cart);
          }
        });
    }
  }

  customElements.define('product-form', ProductForm);
}

// Initialize Shopify money formatting if not available
if (typeof Shopify === 'undefined') {
  window.Shopify = {};
}

if (!Shopify.formatMoney) {
  Shopify.formatMoney = function(cents, format) {
    if (typeof cents === 'string') cents = cents.replace('.','');
    let value = '';
    const placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
    const formatString = (format || theme.settings.money_format);

    function formatWithDelimiters(number, precision, thousands, decimal) {
      precision = precision || 2;
      thousands = thousands || ',';
      decimal = decimal || '.';

      if (isNaN(number) || number == null) return 0;

      number = (number / 100.0).toFixed(precision);

      const parts = number.split('.');
      const dollarsAmount = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1' + thousands);
      const centsAmount = parts[1] ? (decimal + parts[1]) : '';

      return dollarsAmount + centsAmount;
    }

    switch(formatString.match(placeholderRegex)[1]) {
      case 'amount':
        value = formatWithDelimiters(cents, 2);
        break;
      case 'amount_no_decimals':
        value = formatWithDelimiters(cents, 0);
        break;
      case 'amount_with_comma_separator':
        value = formatWithDelimiters(cents, 2, '.', ',');
        break;
      case 'amount_no_decimals_with_comma_separator':
        value = formatWithDelimiters(cents, 0, '.', ',');
        break;
    }

    return formatString.replace(placeholderRegex, value);
  };
}

// Product-specific initialization
document.addEventListener('DOMContentLoaded', function() {
  // Initialize any additional product functionality here
  console.log('Pitagora Product System Loaded');
});