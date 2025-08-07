/**
 * Product Comparison System
 * Advanced comparison functionality with local storage persistence
 */

class ProductComparison {
  constructor(container) {
    this.container = container;
    this.sectionId = container.dataset.sectionId;
    this.maxProducts = parseInt(container.dataset.maxProducts) || 4;
    this.storageKey = 'shopify_product_comparison';
    
    // Elements
    this.emptyState = container.querySelector('[data-comparison-empty]');
    this.tableWrapper = container.querySelector('[data-comparison-table]');
    this.table = container.querySelector('.product-comparison__table tbody');
    this.stickyBar = container.querySelector('[data-comparison-sticky-bar]');
    this.stickyProducts = container.querySelector('[data-comparison-sticky-products]');
    this.stickyCount = container.querySelector('[data-comparison-count]');
    
    // Templates
    this.templates = {
      product: container.querySelector('[data-comparison-product-template]'),
      image: container.querySelector('[data-comparison-image-template]'),
      price: container.querySelector('[data-comparison-price-template]'),
      rating: container.querySelector('[data-comparison-rating-template]'),
      availability: container.querySelector('[data-comparison-availability-template]'),
      description: container.querySelector('[data-comparison-description-template]'),
      action: container.querySelector('[data-comparison-action-template]'),
      stickyProduct: container.querySelector('[data-comparison-sticky-product-template]')
    };
    
    // State
    this.comparedProducts = this.loadFromStorage();
    this.isLoading = false;
    
    this.init();
  }
  
  init() {
    this.setupEventListeners();
    this.updateDisplay();
    this.setupGlobalTriggers();
    
    console.log('🔗 Product Comparison initialized');
  }
  
  setupEventListeners() {
    // Clear all button
    const clearButton = this.container.querySelector('[data-comparison-clear]');
    if (clearButton) {
      clearButton.addEventListener('click', () => this.clearAll());
    }
    
    // Sticky bar view button
    const viewButton = this.container.querySelector('[data-comparison-view]');
    if (viewButton) {
      viewButton.addEventListener('click', () => this.scrollToComparison());
    }
    
    // Remove product buttons (delegated)
    this.container.addEventListener('click', (e) => {
      const removeButton = e.target.closest('[data-comparison-remove]');
      if (removeButton) {
        const productId = this.getProductIdFromElement(removeButton);
        if (productId) {
          this.removeProduct(productId);
        }
      }
    });
    
    // Add to cart forms (delegated)
    this.container.addEventListener('submit', (e) => {
      const form = e.target.closest('[data-product-form]');
      if (form) {
        e.preventDefault();
        this.handleAddToCart(form);
      }
    });
    
    // Handle page visibility to update sticky bar
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.updateStickyBarVisibility();
      }
    });
    
    // Scroll handler for sticky bar
    let scrollTimeout;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        this.updateStickyBarVisibility();
      }, 100);
    });
  }
  
  setupGlobalTriggers() {
    // Listen for global comparison events
    document.addEventListener('product:addToComparison', (e) => {
      this.addProduct(e.detail.productId);
    });
    
    document.addEventListener('product:removeFromComparison', (e) => {
      this.removeProduct(e.detail.productId);
    });
    
    document.addEventListener('product:toggleComparison', (e) => {
      this.toggleProduct(e.detail.productId);
    });
    
    // Add comparison buttons to existing product cards
    this.addComparisonButtonsToProducts();
  }
  
  addComparisonButtonsToProducts() {
    const productCards = document.querySelectorAll('[data-product-id]');
    
    productCards.forEach(card => {
      const productId = card.dataset.productId;
      if (!productId || card.querySelector('[data-comparison-toggle]')) return;
      
      const button = document.createElement('button');
      button.className = 'product-card__compare-button';
      button.setAttribute('data-comparison-toggle', '');
      button.setAttribute('aria-label', 'Add to comparison');
      button.innerHTML = `
        <svg class="icon icon--compare" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z"/>
        </svg>
      `;
      
      button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.toggleProduct(productId);
        this.updateComparisonButton(button, productId);
      });
      
      // Add to appropriate location in product card
      const actionsContainer = card.querySelector('.product-card__actions') || card.querySelector('.card__content');
      if (actionsContainer) {
        actionsContainer.appendChild(button);
        this.updateComparisonButton(button, productId);
      }
    });
  }
  
  updateComparisonButton(button, productId) {
    const isCompared = this.comparedProducts.some(p => p.id === productId);
    button.classList.toggle('is-active', isCompared);
    button.setAttribute('aria-label', isCompared ? 'Remove from comparison' : 'Add to comparison');
  }
  
  async addProduct(productId) {
    if (this.isLoading) return;
    
    // Check if already exists
    if (this.comparedProducts.some(p => p.id === productId)) {
      this.showMessage('Product already in comparison', 'info');
      return;
    }
    
    // Check max limit
    if (this.comparedProducts.length >= this.maxProducts) {
      this.showMessage(`Maximum ${this.maxProducts} products allowed in comparison`, 'warning');
      return;
    }
    
    this.isLoading = true;
    this.showLoading();
    
    try {
      const productData = await this.fetchProductData(productId);
      this.comparedProducts.push(productData);
      this.saveToStorage();
      this.updateDisplay();
      this.showMessage('Product added to comparison', 'success');
      
      // Update global comparison buttons
      this.updateGlobalComparisonButtons();
      
    } catch (error) {
      console.error('Error adding product to comparison:', error);
      this.showMessage('Error adding product to comparison', 'error');
    } finally {
      this.isLoading = false;
      this.hideLoading();
    }
  }
  
  removeProduct(productId) {
    const index = this.comparedProducts.findIndex(p => p.id === productId);
    if (index === -1) return;
    
    this.comparedProducts.splice(index, 1);
    this.saveToStorage();
    this.updateDisplay();
    this.updateGlobalComparisonButtons();
    
    this.showMessage('Product removed from comparison', 'info');
  }
  
  toggleProduct(productId) {
    const exists = this.comparedProducts.some(p => p.id === productId);
    if (exists) {
      this.removeProduct(productId);
    } else {
      this.addProduct(productId);
    }
  }
  
  clearAll() {
    if (this.comparedProducts.length === 0) return;
    
    this.comparedProducts = [];
    this.saveToStorage();
    this.updateDisplay();
    this.updateGlobalComparisonButtons();
    
    this.showMessage('All products removed from comparison', 'info');
  }
  
  async fetchProductData(productId) {
    const response = await fetch(`${window.Shopify.routes.root}products/${productId}.js`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const product = await response.json();
    
    // Process and structure the data we need
    return {
      id: product.id.toString(),
      handle: product.handle,
      title: product.title,
      description: this.truncateText(product.description, 150),
      price: product.price,
      compare_at_price: product.compare_at_price,
      available: product.available,
      image: product.featured_image,
      url: `/products/${product.handle}`,
      variants: product.variants,
      vendor: product.vendor,
      type: product.type,
      tags: product.tags,
      // Mock rating data (replace with actual rating system if available)
      rating: this.generateMockRating(),
      reviews_count: Math.floor(Math.random() * 100) + 1
    };
  }
  
  generateMockRating() {
    return {
      value: (Math.random() * 2 + 3).toFixed(1), // 3.0 - 5.0
      stars: Math.floor(Math.random() * 2 + 3) // 3-5 full stars
    };
  }
  
  truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substr(0, maxLength).replace(/\s+\S*$/, '') + '...';
  }
  
  updateDisplay() {
    if (this.comparedProducts.length === 0) {
      this.showEmptyState();
    } else {
      this.showComparisonTable();
    }
    
    this.updateStickyBar();
  }
  
  showEmptyState() {
    this.emptyState.style.display = 'block';
    this.tableWrapper.style.display = 'none';
  }
  
  showComparisonTable() {
    this.emptyState.style.display = 'none';
    this.tableWrapper.style.display = 'block';
    this.renderComparisonTable();
  }
  
  renderComparisonTable() {
    // Clear existing product columns
    const existingHeaders = this.container.querySelectorAll('.product-comparison__cell--product');
    existingHeaders.forEach(cell => cell.remove());
    
    // Add product headers
    const headerRow = this.container.querySelector('.product-comparison__row--header');
    this.comparedProducts.forEach(product => {
      const cell = this.createProductHeaderCell(product);
      headerRow.appendChild(cell);
    });
    
    // Update each data row
    this.updateImageRow();
    this.updatePriceRow();
    this.updateRatingRow();
    this.updateAvailabilityRow();
    this.updateDescriptionRow();
    this.updateActionRow();
  }
  
  createProductHeaderCell(product) {
    const template = this.templates.product.content.cloneNode(true);
    const cell = template.querySelector('.product-comparison__cell--product');
    
    cell.setAttribute('data-product-id', product.id);
    
    return cell;
  }
  
  updateImageRow() {
    const row = this.container.querySelector('[data-comparison-row="images"]');
    const existingCells = row.querySelectorAll('.product-comparison__cell--product');
    existingCells.forEach(cell => cell.remove());
    
    this.comparedProducts.forEach(product => {
      const template = this.templates.image.content.cloneNode(true);
      const cell = template.querySelector('.product-comparison__cell--product');
      
      const link = cell.querySelector('.product-comparison__image-link');
      const image = cell.querySelector('.product-comparison__image');
      const title = cell.querySelector('.product-comparison__product-title a');
      
      link.href = product.url;
      image.src = product.image || '/assets/placeholder.svg';
      image.alt = product.title;
      title.href = product.url;
      title.textContent = product.title;
      
      row.appendChild(cell);
    });
  }
  
  updatePriceRow() {
    const row = this.container.querySelector('[data-comparison-row="price"]');
    const existingCells = row.querySelectorAll('.product-comparison__cell--product');
    existingCells.forEach(cell => cell.remove());
    
    this.comparedProducts.forEach(product => {
      const template = this.templates.price.content.cloneNode(true);
      const cell = template.querySelector('.product-comparison__cell--product');
      
      const price = cell.querySelector('.product-comparison__price');
      const comparePrice = cell.querySelector('.product-comparison__compare-price');
      
      price.textContent = this.formatMoney(product.price);
      
      if (product.compare_at_price && product.compare_at_price > product.price) {
        comparePrice.textContent = this.formatMoney(product.compare_at_price);
        comparePrice.style.display = 'block';
      } else {
        comparePrice.style.display = 'none';
      }
      
      row.appendChild(cell);
    });
  }
  
  updateRatingRow() {
    const row = this.container.querySelector('[data-comparison-row="rating"]');
    const existingCells = row.querySelectorAll('.product-comparison__cell--product');
    existingCells.forEach(cell => cell.remove());
    
    this.comparedProducts.forEach(product => {
      const template = this.templates.rating.content.cloneNode(true);
      const cell = template.querySelector('.product-comparison__cell--product');
      
      const stars = cell.querySelectorAll('.product-comparison__star');
      const ratingCount = cell.querySelector('.product-comparison__rating-count');
      const starsContainer = cell.querySelector('.product-comparison__stars');
      
      // Fill stars based on rating
      const rating = parseInt(product.rating.stars);
      stars.forEach((star, index) => {
        if (index < rating) {
          star.classList.add('filled');
        }
      });
      
      starsContainer.setAttribute('aria-label', `${product.rating.value} out of 5 stars`);
      ratingCount.textContent = `(${product.reviews_count})`;
      
      row.appendChild(cell);
    });
  }
  
  updateAvailabilityRow() {
    const row = this.container.querySelector('[data-comparison-row="availability"]');
    const existingCells = row.querySelectorAll('.product-comparison__cell--product');
    existingCells.forEach(cell => cell.remove());
    
    this.comparedProducts.forEach(product => {
      const template = this.templates.availability.content.cloneNode(true);
      const cell = template.querySelector('.product-comparison__cell--product');
      
      const badge = cell.querySelector('.product-comparison__availability-badge');
      
      if (product.available) {
        badge.textContent = 'In Stock';
        badge.classList.add('product-comparison__availability-badge--available');
      } else {
        badge.textContent = 'Out of Stock';
        badge.classList.add('product-comparison__availability-badge--unavailable');
      }
      
      row.appendChild(cell);
    });
  }
  
  updateDescriptionRow() {
    const row = this.container.querySelector('[data-comparison-row="description"]');
    const existingCells = row.querySelectorAll('.product-comparison__cell--product');
    existingCells.forEach(cell => cell.remove());
    
    this.comparedProducts.forEach(product => {
      const template = this.templates.description.content.cloneNode(true);
      const cell = template.querySelector('.product-comparison__cell--product');
      
      const description = cell.querySelector('.product-comparison__description');
      description.textContent = product.description;
      
      row.appendChild(cell);
    });
  }
  
  updateActionRow() {
    const row = this.container.querySelector('[data-comparison-row="actions"]');
    const existingCells = row.querySelectorAll('.product-comparison__cell--product');
    existingCells.forEach(cell => cell.remove());
    
    this.comparedProducts.forEach(product => {
      const template = this.templates.action.content.cloneNode(true);
      const cell = template.querySelector('.product-comparison__cell--product');
      
      const form = cell.querySelector('[data-product-form]');
      const input = form.querySelector('input[name="id"]');
      const button = form.querySelector('[data-add-to-cart]');
      
      // Use first available variant or first variant
      const availableVariant = product.variants.find(v => v.available) || product.variants[0];
      
      input.value = availableVariant.id;
      
      if (!product.available) {
        button.disabled = true;
        button.textContent = 'Out of Stock';
        button.classList.add('button--disabled');
      }
      
      row.appendChild(cell);
    });
  }
  
  updateStickyBar() {
    if (!this.stickyBar) return;
    
    if (this.comparedProducts.length > 0) {
      this.renderStickyProducts();
      this.stickyCount.textContent = this.comparedProducts.length;
      this.updateStickyBarVisibility();
    } else {
      this.stickyBar.classList.remove('is-visible');
    }
  }
  
  renderStickyProducts() {
    this.stickyProducts.innerHTML = '';
    
    this.comparedProducts.forEach(product => {
      const template = this.templates.stickyProduct.content.cloneNode(true);
      const productEl = template.querySelector('.product-comparison__sticky-product');
      const image = productEl.querySelector('.product-comparison__sticky-image');
      
      productEl.setAttribute('data-product-id', product.id);
      image.src = product.image || '/assets/placeholder.svg';
      image.alt = product.title;
      
      this.stickyProducts.appendChild(productEl);
    });
  }
  
  updateStickyBarVisibility() {
    if (!this.stickyBar || this.comparedProducts.length === 0) return;
    
    const comparisonSection = this.container;
    const rect = comparisonSection.getBoundingClientRect();
    const isVisible = rect.bottom < window.innerHeight;
    
    this.stickyBar.classList.toggle('is-visible', isVisible);
  }
  
  updateGlobalComparisonButtons() {
    const buttons = document.querySelectorAll('[data-comparison-toggle]');
    buttons.forEach(button => {
      const productCard = button.closest('[data-product-id]');
      if (productCard) {
        const productId = productCard.dataset.productId;
        this.updateComparisonButton(button, productId);
      }
    });
  }
  
  async handleAddToCart(form) {
    const formData = new FormData(form);
    const button = form.querySelector('[data-add-to-cart]');
    const originalText = button.textContent;
    
    button.disabled = true;
    button.textContent = 'Adding...';
    
    try {
      const response = await fetch('/cart/add.js', {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        button.textContent = 'Added!';
        this.showMessage('Product added to cart', 'success');
        
        // Dispatch cart update event
        document.dispatchEvent(new CustomEvent('cart:update'));
      } else {
        throw new Error('Failed to add to cart');
      }
    } catch (error) {
      console.error('Add to cart error:', error);
      this.showMessage('Error adding to cart', 'error');
    } finally {
      setTimeout(() => {
        button.disabled = false;
        button.textContent = originalText;
      }, 2000);
    }
  }
  
  scrollToComparison() {
    this.container.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }
  
  getProductIdFromElement(element) {
    const productEl = element.closest('[data-product-id]');
    return productEl ? productEl.dataset.productId : null;
  }
  
  formatMoney(cents) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: window.Shopify?.currency?.active || 'USD'
    }).format(cents / 100);
  }
  
  showMessage(message, type = 'info') {
    // Create or update notification
    let notification = document.querySelector('.product-comparison__notification');
    
    if (!notification) {
      notification = document.createElement('div');
      notification.className = 'product-comparison__notification';
      document.body.appendChild(notification);
    }
    
    notification.textContent = message;
    notification.className = `product-comparison__notification product-comparison__notification--${type}`;
    notification.style.cssText = `
      position: fixed;
      top: 2rem;
      right: 2rem;
      background: rgba(var(--color-base-background-1), 0.95);
      color: rgb(var(--color-base-text));
      padding: 1rem 1.5rem;
      border-radius: 0.8rem;
      box-shadow: 0 4px 16px rgba(var(--color-base-text), 0.15);
      backdrop-filter: blur(10px);
      z-index: 1000;
      transform: translateX(100%);
      transition: transform 0.3s ease;
    `;
    
    // Show notification
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);
    
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
  
  showLoading() {
    // Could show loading state in comparison area
  }
  
  hideLoading() {
    // Hide loading state
  }
  
  // Storage methods
  loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading comparison from storage:', error);
      return [];
    }
  }
  
  saveToStorage() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.comparedProducts));
    } catch (error) {
      console.error('Error saving comparison to storage:', error);
    }
  }
  
  // Public API
  getComparedProducts() {
    return [...this.comparedProducts];
  }
  
  hasProduct(productId) {
    return this.comparedProducts.some(p => p.id === productId);
  }
  
  getComparedCount() {
    return this.comparedProducts.length;
  }
}

// Auto-initialize product comparison
document.addEventListener('DOMContentLoaded', () => {
  const comparisonContainers = document.querySelectorAll('.product-comparison');
  
  comparisonContainers.forEach(container => {
    container.productComparison = new ProductComparison(container);
  });
});

// Handle dynamic content loading
document.addEventListener('shopify:section:load', (e) => {
  const comparisonContainer = e.target.querySelector('.product-comparison');
  if (comparisonContainer && !comparisonContainer.productComparison) {
    comparisonContainer.productComparison = new ProductComparison(comparisonContainer);
  }
});

document.addEventListener('shopify:section:unload', (e) => {
  const comparisonContainer = e.target.querySelector('.product-comparison');
  if (comparisonContainer && comparisonContainer.productComparison) {
    // Clean up if needed
    delete comparisonContainer.productComparison;
  }
});

// Export for external use
window.ProductComparison = ProductComparison;