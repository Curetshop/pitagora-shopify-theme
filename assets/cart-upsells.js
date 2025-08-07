/**
 * Cart Upsells System
 * Advanced cross-selling with intelligent recommendations
 */

class CartUpsells {
  constructor(container) {
    this.container = container;
    this.sectionId = container.dataset.sectionId;
    this.upsellType = container.dataset.upsellType || 'related';
    this.productsLimit = parseInt(container.dataset.productsLimit) || 4;
    this.showInDrawer = container.dataset.showInDrawer === 'true';
    
    // Elements
    this.loadingEl = container.querySelector('[data-upsells-loading]');
    this.gridEl = container.querySelector('[data-upsells-grid]');
    this.emptyEl = container.querySelector('[data-upsells-empty]');
    this.fallbackEl = container.querySelector('[data-upsells-fallback]');
    this.modalEl = container.querySelector('[data-upsells-modal]');
    
    // Templates
    this.cardTemplate = container.querySelector('[data-upsell-card-template]');
    this.variantTemplate = container.querySelector('[data-variant-option-template]');
    
    // State
    this.currentCart = null;
    this.recommendedProducts = [];
    this.isLoading = false;
    this.recentlyViewed = this.getRecentlyViewed();
    
    this.init();
  }
  
  init() {
    this.setupEventListeners();
    this.loadRecommendations();
    
    console.log('🛒 Cart Upsells initialized');
  }
  
  setupEventListeners() {
    // Form submissions
    this.container.addEventListener('submit', (e) => {
      const form = e.target.closest('[data-product-form]');
      if (form) {
        e.preventDefault();
        this.handleAddToCart(form);
      }
    });
    
    // Quick view buttons
    this.container.addEventListener('click', (e) => {
      const quickViewBtn = e.target.closest('[data-quick-view]');
      if (quickViewBtn) {
        e.preventDefault();
        this.handleQuickView(quickViewBtn);
      }
    });
    
    // Variant swatches
    this.container.addEventListener('click', (e) => {
      const swatch = e.target.closest('.cart-upsells__swatch');
      if (swatch && swatch.dataset.variantAvailable === 'true') {
        this.handleVariantChange(swatch);
      }
    });
    
    // Modal events
    if (this.modalEl) {
      const overlay = this.modalEl.querySelector('[data-modal-overlay]');
      const closeBtn = this.modalEl.querySelector('[data-modal-close]');
      
      if (overlay) {
        overlay.addEventListener('click', () => this.closeModal());
      }
      
      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.closeModal());
      }
      
      // ESC key
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.modalEl.style.display !== 'none') {
          this.closeModal();
        }
      });
    }
    
    // Listen for cart updates
    document.addEventListener('cart:updated', () => {
      this.refreshRecommendations();
    });
    
    // Listen for product views (for recently viewed tracking)
    document.addEventListener('product:viewed', (e) => {
      this.trackRecentlyViewed(e.detail.productId);
    });
  }
  
  async loadRecommendations() {
    if (this.isLoading) return;
    
    this.isLoading = true;
    this.showLoading();
    
    try {
      // Get current cart
      this.currentCart = await this.fetchCart();
      
      // Get recommendations based on type
      let products = [];
      
      switch (this.upsellType) {
        case 'related':
          products = await this.getRelatedProducts();
          break;
        case 'complementary':
          products = await this.getComplementaryProducts();
          break;
        case 'recently_viewed':
          products = await this.getRecentlyViewedProducts();
          break;
        case 'trending':
          products = await this.getTrendingProducts();
          break;
        case 'manual':
          products = this.getManualProducts();
          break;
        default:
          products = await this.getRelatedProducts();
      }
      
      // Filter out products already in cart
      products = this.filterCartProducts(products);
      
      // Limit results
      products = products.slice(0, this.productsLimit);
      
      this.recommendedProducts = products;
      this.renderProducts(products);
      
    } catch (error) {
      console.error('Error loading cart upsells:', error);
      this.showFallback();
    } finally {
      this.isLoading = false;
      this.hideLoading();
    }
  }
  
  async fetchCart() {
    const response = await fetch('/cart.js');
    return response.json();
  }
  
  async getRelatedProducts() {
    if (!this.currentCart || this.currentCart.items.length === 0) {
      return this.getTrendingProducts();
    }
    
    // Get products from the same collections as cart items
    const collections = new Set();
    const productTypes = new Set();
    const vendors = new Set();
    
    // Analyze cart items
    for (const item of this.currentCart.items) {
      try {
        const productData = await this.fetchProductData(item.product_id);
        productData.product_type && productTypes.add(productData.product_type);
        productData.vendor && vendors.add(productData.vendor);
        // Note: Collections would need to be added via metafields or API
      } catch (error) {
        console.warn('Error fetching product data:', error);
      }
    }
    
    // For now, use trending products with some filtering
    const trending = await this.getTrendingProducts();
    
    // Prioritize products with matching types or vendors
    return trending.sort((a, b) => {
      const aScore = (productTypes.has(a.product_type) ? 2 : 0) + (vendors.has(a.vendor) ? 1 : 0);
      const bScore = (productTypes.has(b.product_type) ? 2 : 0) + (vendors.has(b.vendor) ? 1 : 0);
      return bScore - aScore;
    });
  }
  
  async getComplementaryProducts() {
    // This would typically use Shopify's recommendations API or a custom algorithm
    // For now, we'll simulate with related products
    return this.getRelatedProducts();
  }
  
  async getRecentlyViewedProducts() {
    const recentIds = this.recentlyViewed.slice(0, this.productsLimit * 2);
    const products = [];
    
    for (const productId of recentIds) {
      try {
        const product = await this.fetchProductData(productId);
        products.push(product);
      } catch (error) {
        console.warn('Error fetching recently viewed product:', error);
      }
    }
    
    return products;
  }
  
  async getTrendingProducts() {
    // This would typically come from analytics or a curated collection
    // For demo purposes, we'll fetch from a trending collection or recent products
    try {
      const response = await fetch('/collections/trending/products.json?limit=' + (this.productsLimit * 2));
      const data = await response.json();
      return data.products || [];
    } catch (error) {
      // Fallback to fetching some random products
      return this.getRandomProducts();
    }
  }
  
  async getRandomProducts() {
    // Fetch some products from all products
    try {
      const response = await fetch('/products.json?limit=' + (this.productsLimit * 2));
      const data = await response.json();
      
      // Shuffle and return
      const products = data.products || [];
      return this.shuffleArray(products);
    } catch (error) {
      console.error('Error fetching random products:', error);
      return [];
    }
  }
  
  getManualProducts() {
    // Use fallback products from section blocks
    if (this.fallbackEl) {
      const cards = this.fallbackEl.querySelectorAll('[data-product-id]');
      return Array.from(cards).map(card => ({
        id: parseInt(card.dataset.productId),
        // This would be populated from the existing card data
      }));
    }
    return [];
  }
  
  async fetchProductData(productId) {
    const response = await fetch(`/products/${productId}.js`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }
  
  filterCartProducts(products) {
    if (!this.currentCart) return products;
    
    const cartProductIds = new Set(this.currentCart.items.map(item => item.product_id));
    return products.filter(product => !cartProductIds.has(product.id));
  }
  
  renderProducts(products) {
    if (products.length === 0) {
      this.showEmpty();
      return;
    }
    
    this.gridEl.innerHTML = '';
    
    products.forEach((product, index) => {
      const card = this.createProductCard(product, index);
      this.gridEl.appendChild(card);
    });
    
    this.showGrid();
  }
  
  createProductCard(product, index) {
    if (!this.cardTemplate) {
      console.error('Card template not found');
      return document.createElement('div');
    }
    
    const template = this.cardTemplate.content.cloneNode(true);
    const card = template.querySelector('.cart-upsells__card');
    
    // Set product ID
    card.setAttribute('data-product-id', product.id);
    
    // Set animation delay
    card.style.animationDelay = `${index * 0.1}s`;
    
    // Image and link
    const imageLink = card.querySelector('.cart-upsells__image-link');
    const image = card.querySelector('.cart-upsells__image');
    const hoverImage = card.querySelector('.cart-upsells__image-hover');
    const titleLink = card.querySelector('.cart-upsells__title-link');
    
    const productUrl = `/products/${product.handle}`;
    
    imageLink.href = productUrl;
    titleLink.href = productUrl;
    titleLink.textContent = product.title;
    
    if (product.featured_image) {
      image.src = product.featured_image;
      image.alt = product.title;
    }
    
    if (product.images && product.images.length > 1) {
      hoverImage.src = product.images[1];
      hoverImage.alt = product.title;
    } else {
      hoverImage.remove();
    }
    
    // Sale badge
    if (product.compare_at_price && product.compare_at_price > product.price) {
      const badge = card.querySelector('.cart-upsells__badge--sale');
      const discount = Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100);
      const discountEl = badge.querySelector('.cart-upsells__badge-discount');
      discountEl.textContent = `-${discount}%`;
      badge.style.display = 'flex';
    }
    
    // Quick view
    const quickViewBtn = card.querySelector('[data-quick-view]');
    if (quickViewBtn) {
      quickViewBtn.setAttribute('data-product-handle', product.handle);
    }
    
    // Price
    const priceEl = card.querySelector('.cart-upsells__price');
    priceEl.innerHTML = this.formatPrice(product.price);
    
    if (product.compare_at_price && product.compare_at_price > product.price) {
      const comparePriceEl = card.querySelector('.cart-upsells__compare-price');
      if (comparePriceEl) {
        comparePriceEl.innerHTML = this.formatPrice(product.compare_at_price);
        comparePriceEl.style.display = 'block';
      }
    }
    
    // Variants
    if (product.variants && product.variants.length > 1) {
      this.setupVariants(card, product);
    }
    
    // Form
    const form = card.querySelector('[data-product-form]');
    const variantInput = form.querySelector('input[name="id"]');
    const addButton = form.querySelector('[data-add-to-cart]');
    
    const availableVariant = product.variants.find(v => v.available) || product.variants[0];
    variantInput.value = availableVariant.id;
    
    if (!availableVariant.available) {
      addButton.disabled = true;
      addButton.querySelector('.cart-upsells__add-text').textContent = 'Sold Out';
    }
    
    return card;
  }
  
  setupVariants(card, product) {
    const variantsContainer = card.querySelector('.cart-upsells__variants');
    if (!variantsContainer) return;
    
    // Look for color variants
    const colorOption = product.options.find(opt => 
      opt.name.toLowerCase().includes('color') || 
      opt.name.toLowerCase().includes('colour')
    );
    
    if (colorOption && colorOption.values) {
      const swatchesHtml = this.createColorSwatches(product, colorOption);
      variantsContainer.innerHTML = swatchesHtml;
      variantsContainer.style.display = 'block';
    }
  }
  
  createColorSwatches(product, colorOption) {
    const colorIndex = product.options.indexOf(colorOption);
    const swatches = colorOption.values.slice(0, 4).map(value => {
      const variant = product.variants.find(v => v.options[colorIndex] === value);
      const isAvailable = variant && variant.available;
      const isActive = variant === product.variants[0];
      
      return `
        <button class="cart-upsells__swatch ${isActive ? 'is-active' : ''}"
                data-variant-id="${variant ? variant.id : ''}"
                data-variant-available="${isAvailable}"
                title="${value}"
                style="background-color: ${this.getColorValue(value)};">
          <span class="visually-hidden">${value}</span>
        </button>
      `;
    }).join('');
    
    const moreCount = colorOption.values.length - 4;
    const moreText = moreCount > 0 ? `<span class="cart-upsells__more-variants">+${moreCount}</span>` : '';
    
    return `
      <div class="cart-upsells__variant-swatches" data-option-index="${colorIndex}">
        <span class="cart-upsells__variant-label">${colorOption.name}:</span>
        <div class="cart-upsells__swatch-group">
          ${swatches}
          ${moreText}
        </div>
      </div>
    `;
  }
  
  getColorValue(colorName) {
    // Simple color mapping - in a real implementation, this would be more sophisticated
    const colorMap = {
      'black': '#000000',
      'white': '#ffffff',
      'red': '#ff0000',
      'blue': '#0000ff',
      'green': '#00ff00',
      'yellow': '#ffff00',
      'pink': '#ff69b4',
      'purple': '#800080',
      'orange': '#ffa500',
      'brown': '#a52a2a',
      'gray': '#808080',
      'grey': '#808080'
    };
    
    return colorMap[colorName.toLowerCase()] || `#${colorName.replace('#', '')}` || '#f0f0f0';
  }
  
  handleVariantChange(swatch) {
    const card = swatch.closest('.cart-upsells__card');
    const variantInput = card.querySelector('input[name="id"]');
    const addButton = card.querySelector('[data-add-to-cart]');
    const variantId = swatch.dataset.variantId;
    const isAvailable = swatch.dataset.variantAvailable === 'true';
    
    // Update active swatch
    const allSwatches = card.querySelectorAll('.cart-upsells__swatch');
    allSwatches.forEach(s => s.classList.remove('is-active'));
    swatch.classList.add('is-active');
    
    // Update form
    variantInput.value = variantId;
    
    // Update button state
    addButton.disabled = !isAvailable;
    const buttonText = addButton.querySelector('.cart-upsells__add-text');
    buttonText.textContent = isAvailable ? 'Add to Cart' : 'Sold Out';
  }
  
  async handleAddToCart(form) {
    const button = form.querySelector('[data-add-to-cart]');
    const buttonText = button.querySelector('.cart-upsells__add-text');
    const buttonLoading = button.querySelector('.cart-upsells__add-loading');
    const originalText = buttonText.textContent;
    
    button.disabled = true;
    buttonText.style.opacity = '0';
    buttonLoading.style.display = 'flex';
    
    try {
      const formData = new FormData(form);
      const response = await fetch('/cart/add.js', {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        const item = await response.json();
        
        // Success feedback
        buttonText.textContent = 'Added!';
        buttonText.style.opacity = '1';
        buttonLoading.style.display = 'none';
        
        // Dispatch cart update event
        document.dispatchEvent(new CustomEvent('cart:updated', {
          detail: { item }
        }));
        
        // Show success notification
        this.showNotification('Product added to cart!', 'success');
        
        // Update recommendations
        setTimeout(() => this.refreshRecommendations(), 1000);
        
      } else {
        throw new Error('Failed to add to cart');
      }
      
    } catch (error) {
      console.error('Add to cart error:', error);
      this.showNotification('Error adding product to cart', 'error');
      
      buttonText.textContent = 'Error';
      buttonText.style.opacity = '1';
      buttonLoading.style.display = 'none';
    }
    
    // Reset button after delay
    setTimeout(() => {
      button.disabled = false;
      buttonText.textContent = originalText;
    }, 2000);
  }
  
  async handleQuickView(button) {
    const productHandle = button.dataset.productHandle;
    if (!productHandle || !this.modalEl) return;
    
    try {
      // Load product quick view content
      const response = await fetch(`/products/${productHandle}?view=quick`);
      const html = await response.text();
      
      const modalBody = this.modalEl.querySelector('[data-modal-body]');
      modalBody.innerHTML = html;
      
      this.openModal();
      
    } catch (error) {
      console.error('Quick view error:', error);
      this.showNotification('Error loading product details', 'error');
    }
  }
  
  openModal() {
    if (!this.modalEl) return;
    
    this.modalEl.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    // Trigger animation
    requestAnimationFrame(() => {
      this.modalEl.classList.add('is-visible');
    });
  }
  
  closeModal() {
    if (!this.modalEl) return;
    
    this.modalEl.classList.remove('is-visible');
    document.body.style.overflow = '';
    
    // Hide after animation
    setTimeout(() => {
      this.modalEl.style.display = 'none';
    }, 300);
  }
  
  async refreshRecommendations() {
    // Debounce refresh calls
    clearTimeout(this.refreshTimeout);
    this.refreshTimeout = setTimeout(() => {
      this.loadRecommendations();
    }, 1000);
  }
  
  showLoading() {
    this.loadingEl.style.display = 'flex';
    this.gridEl.style.display = 'none';
    this.emptyEl.style.display = 'none';
    if (this.fallbackEl) this.fallbackEl.style.display = 'none';
  }
  
  hideLoading() {
    this.loadingEl.style.display = 'none';
  }
  
  showGrid() {
    this.gridEl.style.display = 'grid';
    this.emptyEl.style.display = 'none';
    if (this.fallbackEl) this.fallbackEl.style.display = 'none';
  }
  
  showEmpty() {
    this.gridEl.style.display = 'none';
    this.emptyEl.style.display = 'block';
    if (this.fallbackEl) this.fallbackEl.style.display = 'none';
  }
  
  showFallback() {
    if (this.fallbackEl && this.fallbackEl.children.length > 0) {
      this.gridEl.style.display = 'none';
      this.emptyEl.style.display = 'none';
      this.fallbackEl.style.display = 'block';
    } else {
      this.showEmpty();
    }
  }
  
  trackRecentlyViewed(productId) {
    let recent = this.getRecentlyViewed();
    
    // Remove if already exists
    recent = recent.filter(id => id !== productId);
    
    // Add to beginning
    recent.unshift(productId);
    
    // Limit to 20 items
    recent = recent.slice(0, 20);
    
    // Save to localStorage
    try {
      localStorage.setItem('shopify_recently_viewed', JSON.stringify(recent));
      this.recentlyViewed = recent;
    } catch (error) {
      console.warn('Error saving recently viewed:', error);
    }
  }
  
  getRecentlyViewed() {
    try {
      const stored = localStorage.getItem('shopify_recently_viewed');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.warn('Error loading recently viewed:', error);
      return [];
    }
  }
  
  formatPrice(cents) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: window.Shopify?.currency?.active || 'USD'
    }).format(cents / 100);
  }
  
  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
  
  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `cart-upsells__notification cart-upsells__notification--${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 2rem;
      right: 2rem;
      background: rgba(var(--color-base-background-1), 0.95);
      color: rgb(var(--color-base-text));
      padding: 1rem 2rem;
      border-radius: 0.8rem;
      box-shadow: 0 8px 32px rgba(var(--color-base-text), 0.15);
      backdrop-filter: blur(20px);
      z-index: 1000;
      transform: translateX(100%);
      transition: transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
    `;
    
    if (type === 'success') {
      notification.style.borderLeft = '4px solid #4CAF50';
    } else if (type === 'error') {
      notification.style.borderLeft = '4px solid #F44336';
    }
    
    document.body.appendChild(notification);
    
    // Show notification
    requestAnimationFrame(() => {
      notification.style.transform = 'translateX(0)';
    });
    
    // Hide notification
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }
}

// Custom Element for Modal
class CartUpsellModal extends HTMLElement {
  connectedCallback() {
    this.setAttribute('role', 'dialog');
    this.setAttribute('aria-modal', 'true');
    this.setAttribute('aria-labelledby', 'modal-title');
  }
}

if (!customElements.get('cart-upsell-modal')) {
  customElements.define('cart-upsell-modal', CartUpsellModal);
}

// Auto-initialize
document.addEventListener('DOMContentLoaded', () => {
  const upsellContainers = document.querySelectorAll('.cart-upsells');
  
  upsellContainers.forEach(container => {
    container.cartUpsells = new CartUpsells(container);
  });
});

// Handle dynamic content loading
document.addEventListener('shopify:section:load', (e) => {
  const upsellContainer = e.target.querySelector('.cart-upsells');
  if (upsellContainer && !upsellContainer.cartUpsells) {
    upsellContainer.cartUpsells = new CartUpsells(upsellContainer);
  }
});

document.addEventListener('shopify:section:unload', (e) => {
  const upsellContainer = e.target.querySelector('.cart-upsells');
  if (upsellContainer && upsellContainer.cartUpsells) {
    // Clean up if needed
    delete upsellContainer.cartUpsells;
  }
});

// Export for external use
window.CartUpsells = CartUpsells;