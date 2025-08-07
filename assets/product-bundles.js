/**
 * Product Bundles System
 * Advanced bundle functionality with dynamic pricing and variant selection
 */

class ProductBundles {
  constructor(container) {
    this.container = container;
    this.sectionId = container.dataset.sectionId;
    this.bundleDiscountType = container.dataset.bundleDiscountType || 'none';
    this.bundleDiscountValue = parseFloat(container.dataset.bundleDiscountValue) || 0;
    
    // Elements
    this.bundleContainer = container.querySelector('[data-bundle-container]');
    this.bundleProducts = container.querySelector('[data-bundle-products]');
    this.bundleSummary = container.querySelector('[data-bundle-summary]');
    this.selectAllCheckbox = container.querySelector('[data-select-all]');
    this.bundleForm = container.querySelector('[data-bundle-form]');
    this.addButton = container.querySelector('[data-add-bundle]');
    this.modalEl = container.querySelector('[data-bundle-modal]');
    
    // Price elements
    this.originalPriceEl = container.querySelector('[data-original-price]');
    this.bundlePriceEl = container.querySelector('[data-bundle-price]');
    
    // State
    this.products = new Map();
    this.selectedProducts = new Set();
    this.isLoading = false;
    
    this.init();
  }
  
  init() {
    this.collectProducts();
    this.setupEventListeners();
    this.updatePricing();
    this.updateSelectAllState();
    
    console.log('📦 Product Bundles initialized');
  }
  
  collectProducts() {
    const productItems = this.container.querySelectorAll('.product-bundles__item');
    
    productItems.forEach(item => {
      const productId = item.dataset.productId;
      const price = parseFloat(item.dataset.productPrice);
      const quantity = parseInt(item.dataset.productQuantity) || 1;
      const isRequired = item.dataset.productRequired === 'true';
      const checkbox = item.querySelector('[data-product-checkbox]');
      
      this.products.set(productId, {
        element: item,
        price: price,
        quantity: quantity,
        isRequired: isRequired,
        checkbox: checkbox,
        isSelected: checkbox.checked
      });
      
      if (checkbox.checked) {
        this.selectedProducts.add(productId);
      }
    });
  }
  
  setupEventListeners() {
    // Select all checkbox
    if (this.selectAllCheckbox) {
      this.selectAllCheckbox.addEventListener('change', (e) => {
        this.handleSelectAll(e.target.checked);
      });
    }
    
    // Individual product checkboxes
    this.container.addEventListener('change', (e) => {
      const productCheckbox = e.target.closest('[data-product-checkbox]');
      if (productCheckbox) {
        this.handleProductSelection(productCheckbox);
      }
    });
    
    // Quantity selectors
    this.container.addEventListener('click', (e) => {
      const quantityBtn = e.target.closest('[data-quantity-increase], [data-quantity-decrease]');
      if (quantityBtn) {
        this.handleQuantityChange(quantityBtn);
      }
    });
    
    // Variant selectors
    this.container.addEventListener('change', (e) => {
      const variantSelect = e.target.closest('[data-variant-option]');
      if (variantSelect) {
        this.handleVariantChange(variantSelect);
      }
    });
    
    // Bundle form submission
    if (this.bundleForm) {
      this.bundleForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleAddBundle();
      });
    }
    
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
  }
  
  handleSelectAll(selectAll) {
    this.products.forEach((product, productId) => {
      if (!product.isRequired) {
        product.checkbox.checked = selectAll;
        this.handleProductSelection(product.checkbox, false);
      }
    });
    
    this.updatePricing();
    this.updateAddButton();
  }
  
  handleProductSelection(checkbox, updatePricing = true) {
    const productId = checkbox.dataset.productId;
    const product = this.products.get(productId);
    
    if (!product) return;
    
    product.isSelected = checkbox.checked;
    
    // Update selected products set
    if (checkbox.checked) {
      this.selectedProducts.add(productId);
    } else {
      this.selectedProducts.delete(productId);
    }
    
    // Update visual state
    product.element.classList.toggle('is-unchecked', !checkbox.checked);
    
    if (updatePricing) {
      this.updatePricing();
      this.updateSelectAllState();
      this.updateAddButton();
    }
  }
  
  handleQuantityChange(button) {
    const item = button.closest('.product-bundles__item');
    const productId = item.dataset.productId;
    const product = this.products.get(productId);
    
    if (!product) return;
    
    const quantityInput = item.querySelector('[data-quantity-input]');
    const quantityHiddenInput = item.querySelector('[data-quantity-hidden-input]');
    const isIncrease = button.dataset.quantityIncrease !== undefined;
    
    let currentQuantity = parseInt(quantityInput.value) || 1;
    let newQuantity;
    
    if (isIncrease) {
      newQuantity = Math.min(currentQuantity + 1, 10);
    } else {
      newQuantity = Math.max(currentQuantity - 1, 1);
    }
    
    if (newQuantity !== currentQuantity) {
      quantityInput.value = newQuantity;
      if (quantityHiddenInput) {
        quantityHiddenInput.value = newQuantity;
      }
      
      // Update product data
      product.quantity = newQuantity;
      item.dataset.productQuantity = newQuantity;
      
      // Update quantity price display
      this.updateQuantityPrice(item, product, newQuantity);
      
      // Update bundle pricing
      this.updatePricing();
    }
    
    // Update button states
    const decreaseBtn = item.querySelector('[data-quantity-decrease]');
    const increaseBtn = item.querySelector('[data-quantity-increase]');
    
    if (decreaseBtn) decreaseBtn.disabled = newQuantity <= 1;
    if (increaseBtn) increaseBtn.disabled = newQuantity >= 10;
  }
  
  updateQuantityPrice(item, product, quantity) {
    const quantityPriceEl = item.querySelector('[data-quantity-price]');
    if (quantityPriceEl) {
      if (quantity > 1) {
        quantityPriceEl.innerHTML = `
          ${quantity} × ${this.formatMoney(product.price)} = 
          <strong>${this.formatMoney(product.price * quantity)}</strong>
        `;
        quantityPriceEl.style.display = 'block';
      } else {
        quantityPriceEl.style.display = 'none';
      }
    }
  }
  
  async handleVariantChange(select) {
    const item = select.closest('.product-bundles__item');
    const productId = item.dataset.productId;
    const product = this.products.get(productId);
    
    if (!product) return;
    
    try {
      // Get selected options
      const options = Array.from(item.querySelectorAll('[data-variant-option]'))
        .map(sel => sel.value);
      
      // Find matching variant
      const variantId = await this.findVariantByOptions(productId, options);
      
      if (variantId) {
        // Update hidden form input
        const variantInput = item.querySelector('[data-variant-id-input]');
        if (variantInput) {
          variantInput.value = variantId;
        }
        
        // Update pricing (if variant has different price)
        // This would require fetching variant data
        // For now, we'll keep the original price
      }
      
    } catch (error) {
      console.error('Error handling variant change:', error);
    }
  }
  
  async findVariantByOptions(productId, options) {
    try {
      // This would typically call Shopify's variant API
      // For now, we'll return the first available variant
      const response = await fetch(`/products/${productId}.js`);
      const productData = await response.json();
      
      // Find variant matching options
      const matchingVariant = productData.variants.find(variant => {
        return variant.options.every((option, index) => option === options[index]);
      });
      
      return matchingVariant ? matchingVariant.id : null;
      
    } catch (error) {
      console.error('Error finding variant:', error);
      return null;
    }
  }
  
  updatePricing() {
    let originalTotal = 0;
    let bundleTotal = 0;
    
    // Calculate totals for selected products
    this.selectedProducts.forEach(productId => {
      const product = this.products.get(productId);
      if (product) {
        const productTotal = product.price * product.quantity;
        originalTotal += productTotal;
        bundleTotal += productTotal;
      }
    });
    
    // Apply bundle discount
    if (this.bundleDiscountType === 'percentage' && this.bundleDiscountValue > 0) {
      const discountAmount = bundleTotal * (this.bundleDiscountValue / 100);
      bundleTotal = bundleTotal - discountAmount;
    } else if (this.bundleDiscountType === 'fixed' && this.bundleDiscountValue > 0) {
      bundleTotal = bundleTotal - this.bundleDiscountValue;
    }
    
    // Ensure bundle total doesn't go below 0
    bundleTotal = Math.max(bundleTotal, 0);
    
    // Update display
    if (this.originalPriceEl) {
      this.originalPriceEl.textContent = this.formatMoney(originalTotal);
    }
    
    if (this.bundlePriceEl) {
      this.bundlePriceEl.textContent = this.formatMoney(bundleTotal);
    }
    
    // Update savings display
    const savingsEl = this.container.querySelector('.product-bundles__savings-text');
    if (savingsEl && bundleTotal < originalTotal) {
      const savings = originalTotal - bundleTotal;
      const savingsPercentage = originalTotal > 0 ? Math.round((savings / originalTotal) * 100) : 0;
      savingsEl.textContent = `Save ${this.formatMoney(savings)} (${savingsPercentage}%)`;
    }
  }
  
  updateSelectAllState() {
    if (!this.selectAllCheckbox) return;
    
    const totalProducts = Array.from(this.products.values()).filter(p => !p.isRequired).length;
    const selectedNonRequired = Array.from(this.products.values())
      .filter(p => !p.isRequired && p.isSelected).length;
    
    if (selectedNonRequired === 0) {
      this.selectAllCheckbox.checked = false;
      this.selectAllCheckbox.indeterminate = false;
    } else if (selectedNonRequired === totalProducts) {
      this.selectAllCheckbox.checked = true;
      this.selectAllCheckbox.indeterminate = false;
    } else {
      this.selectAllCheckbox.checked = false;
      this.selectAllCheckbox.indeterminate = true;
    }
  }
  
  updateAddButton() {
    if (!this.addButton) return;
    
    const selectedCount = this.selectedProducts.size;
    const buttonText = this.addButton.querySelector('.product-bundles__add-text');
    
    if (selectedCount === 0) {
      this.addButton.disabled = true;
      buttonText.textContent = 'Select products to continue';
    } else {
      this.addButton.disabled = false;
      buttonText.textContent = `Add ${selectedCount} item${selectedCount !== 1 ? 's' : ''} to cart`;
    }
  }
  
  async handleAddBundle() {
    if (this.isLoading || this.selectedProducts.size === 0) return;
    
    this.isLoading = true;
    const buttonText = this.addButton.querySelector('.product-bundles__add-text');
    const buttonLoading = this.addButton.querySelector('.product-bundles__add-loading');
    const originalText = buttonText.textContent;
    
    // Show loading state
    this.addButton.disabled = true;
    buttonText.style.opacity = '0';
    buttonLoading.style.display = 'flex';
    
    try {
      // Prepare bundle data
      const bundleItems = [];
      
      this.selectedProducts.forEach(productId => {
        const product = this.products.get(productId);
        if (product) {
          const item = product.element;
          const variantInput = item.querySelector('[data-variant-id-input]');
          const quantityInput = item.querySelector('[data-quantity-input]');
          
          bundleItems.push({
            id: variantInput ? variantInput.value : productId,
            quantity: quantityInput ? parseInt(quantityInput.value) : product.quantity,
            properties: {
              '_bundle_id': this.sectionId,
              '_bundle_item': 'true',
              '_bundle_title': this.container.querySelector('.product-bundles__title')?.textContent || 'Bundle'
            }
          });
        }
      });
      
      // Add all items to cart
      const response = await fetch('/cart/add.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ items: bundleItems })
      });
      
      if (response.ok) {
        const result = await response.json();
        
        // Success feedback
        buttonText.textContent = 'Added to Cart!';
        buttonText.style.opacity = '1';
        buttonLoading.style.display = 'none';
        
        // Dispatch cart update event
        document.dispatchEvent(new CustomEvent('cart:updated', {
          detail: { items: result.items }
        }));
        
        // Show success notification
        this.showNotification(`Bundle added to cart! (${bundleItems.length} items)`, 'success');
        
        // Reset form after delay
        setTimeout(() => {
          this.resetBundle();
        }, 2000);
        
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to add bundle to cart');
      }
      
    } catch (error) {
      console.error('Add bundle error:', error);
      this.showNotification('Error adding bundle to cart', 'error');
      
      buttonText.textContent = 'Error - Try Again';
      buttonText.style.opacity = '1';
      buttonLoading.style.display = 'none';
      
      // Reset button after delay
      setTimeout(() => {
        buttonText.textContent = originalText;
        this.addButton.disabled = false;
      }, 3000);
    }
    
    this.isLoading = false;
  }
  
  resetBundle() {
    // Uncheck all non-required products
    this.products.forEach((product, productId) => {
      if (!product.isRequired) {
        product.checkbox.checked = false;
        this.handleProductSelection(product.checkbox, false);
      }
    });
    
    // Reset quantities to 1
    this.container.querySelectorAll('[data-quantity-input]').forEach(input => {
      input.value = '1';
      const hiddenInput = input.closest('.product-bundles__item').querySelector('[data-quantity-hidden-input]');
      if (hiddenInput) hiddenInput.value = '1';
    });
    
    // Update everything
    this.collectProducts();
    this.updatePricing();
    this.updateSelectAllState();
    this.updateAddButton();
  }
  
  openModal() {
    if (!this.modalEl) return;
    
    this.modalEl.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    requestAnimationFrame(() => {
      this.modalEl.classList.add('is-visible');
    });
  }
  
  closeModal() {
    if (!this.modalEl) return;
    
    this.modalEl.classList.remove('is-visible');
    document.body.style.overflow = '';
    
    setTimeout(() => {
      this.modalEl.style.display = 'none';
    }, 300);
  }
  
  formatMoney(cents) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: window.Shopify?.currency?.active || 'USD'
    }).format(cents / 100);
  }
  
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `product-bundles__notification product-bundles__notification--${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 2rem;
      right: 2rem;
      background: rgba(var(--color-base-background-1), 0.95);
      color: rgb(var(--color-base-text));
      padding: 1.5rem 2rem;
      border-radius: 1rem;
      box-shadow: 0 8px 32px rgba(var(--color-base-text), 0.15);
      backdrop-filter: blur(20px);
      z-index: 1000;
      transform: translateX(100%);
      transition: transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
      max-width: 35rem;
      font-weight: 500;
    `;
    
    if (type === 'success') {
      notification.style.borderLeft = '4px solid #4CAF50';
    } else if (type === 'error') {
      notification.style.borderLeft = '4px solid #F44336';
    }
    
    document.body.appendChild(notification);
    
    requestAnimationFrame(() => {
      notification.style.transform = 'translateX(0)';
    });
    
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 4000);
  }
  
  // Public API
  getSelectedProducts() {
    return Array.from(this.selectedProducts);
  }
  
  getBundleTotal() {
    let total = 0;
    this.selectedProducts.forEach(productId => {
      const product = this.products.get(productId);
      if (product) {
        total += product.price * product.quantity;
      }
    });
    return total;
  }
  
  selectProduct(productId) {
    const product = this.products.get(productId);
    if (product && !product.isRequired) {
      product.checkbox.checked = true;
      this.handleProductSelection(product.checkbox);
    }
  }
  
  deselectProduct(productId) {
    const product = this.products.get(productId);
    if (product && !product.isRequired) {
      product.checkbox.checked = false;
      this.handleProductSelection(product.checkbox);
    }
  }
}

// Custom Element for Modal
class BundleModal extends HTMLElement {
  connectedCallback() {
    this.setAttribute('role', 'dialog');
    this.setAttribute('aria-modal', 'true');
    this.setAttribute('aria-labelledby', 'bundle-modal-title');
  }
}

if (!customElements.get('bundle-modal')) {
  customElements.define('bundle-modal', BundleModal);
}

// Auto-initialize
document.addEventListener('DOMContentLoaded', () => {
  const bundleContainers = document.querySelectorAll('.product-bundles');
  
  bundleContainers.forEach(container => {
    container.productBundles = new ProductBundles(container);
  });
});

// Handle dynamic content loading
document.addEventListener('shopify:section:load', (e) => {
  const bundleContainer = e.target.querySelector('.product-bundles');
  if (bundleContainer && !bundleContainer.productBundles) {
    bundleContainer.productBundles = new ProductBundles(bundleContainer);
  }
});

document.addEventListener('shopify:section:unload', (e) => {
  const bundleContainer = e.target.querySelector('.product-bundles');
  if (bundleContainer && bundleContainer.productBundles) {
    delete bundleContainer.productBundles;
  }
});

// Export for external use
window.ProductBundles = ProductBundles;