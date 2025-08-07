/**
 * Product Siblings System - Advanced Interactive Features
 * 
 * Features:
 * - Smart tooltip positioning
 * - Keyboard navigation support
 * - Touch gesture handling
 * - Analytics tracking
 * - Performance optimization
 * - Accessibility enhancements
 */

class ProductSiblingsManager {
  constructor() {
    this.containers = document.querySelectorAll('[data-product-siblings]');
    this.isTouch = 'ontouchstart' in window;
    this.activeTooltip = null;
    this.hoverTimeout = null;
    
    if (this.containers.length > 0) {
      this.init();
    }
  }
  
  init() {
    this.containers.forEach(container => {
      this.setupContainer(container);
    });
    
    // Global event listeners
    this.setupGlobalEvents();
    
    console.log('🎨 Product Siblings System initialized:', this.containers.length, 'containers');
  }
  
  setupContainer(container) {
    const siblings = container.querySelectorAll('.product-sibling');
    const viewAllButton = container.querySelector('.product-siblings__view-all');
    
    siblings.forEach(sibling => {
      this.setupSibling(sibling);
    });
    
    if (viewAllButton) {
      this.setupViewAllButton(viewAllButton);
    }
    
    // Keyboard navigation
    this.setupKeyboardNavigation(container);
    
    // Add container-specific data
    container.setAttribute('data-siblings-count', siblings.length);
  }
  
  setupSibling(sibling) {
    const link = sibling.querySelector('.product-sibling__link');
    const tooltip = sibling.querySelector('.product-sibling__tooltip');
    
    if (!link) return;
    
    // Mouse events
    if (!this.isTouch) {
      link.addEventListener('mouseenter', (e) => this.handleSiblingHover(e, sibling, tooltip));
      link.addEventListener('mouseleave', (e) => this.handleSiblingLeave(e, sibling, tooltip));
    }
    
    // Touch events for mobile
    if (this.isTouch) {
      link.addEventListener('touchstart', (e) => this.handleTouchStart(e, sibling, tooltip), { passive: true });
      link.addEventListener('touchend', (e) => this.handleTouchEnd(e, sibling, tooltip), { passive: true });
    }
    
    // Click events with analytics
    link.addEventListener('click', (e) => this.handleSiblingClick(e, sibling));
    
    // Focus events for accessibility
    link.addEventListener('focus', (e) => this.handleSiblingFocus(e, sibling, tooltip));
    link.addEventListener('blur', (e) => this.handleSiblingBlur(e, sibling, tooltip));
    
    // Enhanced data attributes for tracking
    const siblingData = {
      handle: link.dataset.siblingHandle,
      id: link.dataset.siblingId,
      color: link.dataset.color
    };
    
    link.addEventListener('mouseenter', () => {
      this.trackSiblingInteraction('hover', siblingData);
    });
  }
  
  handleSiblingHover(event, sibling, tooltip) {
    clearTimeout(this.hoverTimeout);
    
    // Hide any active tooltips
    this.hideActiveTooltip();
    
    // Show current tooltip with delay
    this.hoverTimeout = setTimeout(() => {
      this.showTooltip(tooltip, sibling);
      this.activeTooltip = tooltip;
    }, 300);
    
    // Visual hover effects
    this.addHoverEffects(sibling);
  }
  
  handleSiblingLeave(event, sibling, tooltip) {
    clearTimeout(this.hoverTimeout);
    
    // Hide tooltip with delay
    setTimeout(() => {
      if (this.activeTooltip === tooltip) {
        this.hideTooltip(tooltip);
        this.activeTooltip = null;
      }
    }, 100);
    
    // Remove hover effects
    this.removeHoverEffects(sibling);
  }
  
  handleTouchStart(event, sibling, tooltip) {
    // Prevent default to avoid unwanted behaviors
    if (this.activeTooltip && this.activeTooltip !== tooltip) {
      this.hideActiveTooltip();
    }
  }
  
  handleTouchEnd(event, sibling, tooltip) {
    const touch = event.changedTouches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    
    // Check if touch ended on the same element
    if (sibling.contains(element)) {
      if (this.activeTooltip === tooltip) {
        // Second tap - navigate
        return true;
      } else {
        // First tap - show tooltip
        event.preventDefault();
        this.hideActiveTooltip();
        this.showTooltip(tooltip, sibling);
        this.activeTooltip = tooltip;
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
          if (this.activeTooltip === tooltip) {
            this.hideTooltip(tooltip);
            this.activeTooltip = null;
          }
        }, 3000);
      }
    }
  }
  
  handleSiblingClick(event, sibling) {
    const link = sibling.querySelector('.product-sibling__link');
    if (!link) return;
    
    const siblingData = {
      handle: link.dataset.siblingHandle,
      id: link.dataset.siblingId,
      color: link.dataset.color,
      currentProduct: window.location.pathname.split('/products/')[1]?.split('/')[0]
    };
    
    // Track click event
    this.trackSiblingInteraction('click', siblingData);
    
    // Add loading state
    this.addLoadingState(sibling);
    
    // Store in recently viewed
    this.updateRecentlyViewed(siblingData);
  }
  
  handleSiblingFocus(event, sibling, tooltip) {
    this.hideActiveTooltip();
    this.showTooltip(tooltip, sibling);
    this.activeTooltip = tooltip;
  }
  
  handleSiblingBlur(event, sibling, tooltip) {
    setTimeout(() => {
      if (this.activeTooltip === tooltip) {
        this.hideTooltip(tooltip);
        this.activeTooltip = null;
      }
    }, 100);
  }
  
  showTooltip(tooltip, sibling) {
    if (!tooltip) return;
    
    // Position tooltip smartly
    this.positionTooltip(tooltip, sibling);
    
    // Show with animation
    tooltip.style.opacity = '1';
    tooltip.style.visibility = 'visible';
    tooltip.setAttribute('aria-hidden', 'false');
    
    // Add show class for additional styling
    tooltip.classList.add('product-sibling__tooltip--show');
  }
  
  hideTooltip(tooltip) {
    if (!tooltip) return;
    
    tooltip.style.opacity = '0';
    tooltip.style.visibility = 'hidden';
    tooltip.setAttribute('aria-hidden', 'true');
    tooltip.classList.remove('product-sibling__tooltip--show');
  }
  
  hideActiveTooltip() {
    if (this.activeTooltip) {
      this.hideTooltip(this.activeTooltip);
      this.activeTooltip = null;
    }
  }
  
  positionTooltip(tooltip, sibling) {
    if (!tooltip) return;
    
    const siblingRect = sibling.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };
    
    // Reset positioning
    tooltip.style.left = '50%';
    tooltip.style.transform = 'translateX(-50%) translateY(calc(-100% - 0.8rem))';
    
    // Check if tooltip would overflow viewport
    const tooltipLeft = siblingRect.left + siblingRect.width / 2 - tooltipRect.width / 2;
    const tooltipRight = tooltipLeft + tooltipRect.width;
    
    // Adjust horizontal position if needed
    if (tooltipLeft < 10) {
      tooltip.style.left = `${10 - siblingRect.left}px`;
      tooltip.style.transform = 'translateX(0) translateY(calc(-100% - 0.8rem))';
    } else if (tooltipRight > viewport.width - 10) {
      tooltip.style.left = `${viewport.width - 10 - siblingRect.left - tooltipRect.width}px`;
      tooltip.style.transform = 'translateX(0) translateY(calc(-100% - 0.8rem))';
    }
    
    // Check vertical position
    if (siblingRect.top - tooltipRect.height < 10) {
      // Show below instead of above
      tooltip.style.transform = tooltip.style.transform.replace('translateY(calc(-100% - 0.8rem))', 'translateY(calc(100% + 0.8rem))');
      
      // Flip arrow
      const arrow = tooltip.querySelector('.product-sibling__tooltip-arrow');
      if (arrow) {
        arrow.style.bottom = 'auto';
        arrow.style.top = '-0.6rem';
        arrow.style.borderTop = 'none';
        arrow.style.borderBottom = '0.6rem solid rgb(var(--color-foreground))';
      }
    }
  }
  
  addHoverEffects(sibling) {
    sibling.classList.add('product-sibling--hovering');
  }
  
  removeHoverEffects(sibling) {
    sibling.classList.remove('product-sibling--hovering');
  }
  
  addLoadingState(sibling) {
    sibling.classList.add('product-sibling--loading');
    
    // Add loading indicator
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'product-sibling__loading';
    loadingIndicator.innerHTML = `
      <div class="loading-spinner"></div>
    `;
    
    sibling.appendChild(loadingIndicator);
  }
  
  setupViewAllButton(button) {
    button.addEventListener('click', (e) => {
      this.trackSiblingInteraction('view_all', {
        collection_url: button.href,
        sibling_count: button.closest('[data-product-siblings]').dataset.siblingsCount
      });
    });
  }
  
  setupKeyboardNavigation(container) {
    const siblings = container.querySelectorAll('.product-sibling__link');
    
    siblings.forEach((link, index) => {
      link.addEventListener('keydown', (e) => {
        switch (e.key) {
          case 'ArrowRight':
            e.preventDefault();
            const nextIndex = (index + 1) % siblings.length;
            siblings[nextIndex].focus();
            break;
            
          case 'ArrowLeft':
            e.preventDefault();
            const prevIndex = (index - 1 + siblings.length) % siblings.length;
            siblings[prevIndex].focus();
            break;
            
          case 'Home':
            e.preventDefault();
            siblings[0].focus();
            break;
            
          case 'End':
            e.preventDefault();
            siblings[siblings.length - 1].focus();
            break;
            
          case 'Escape':
            e.preventDefault();
            this.hideActiveTooltip();
            break;
        }
      });
    });
  }
  
  setupGlobalEvents() {
    // Hide tooltips on scroll
    let scrollTimeout;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        this.hideActiveTooltip();
      }, 100);
    }, { passive: true });
    
    // Hide tooltips on resize
    window.addEventListener('resize', () => {
      this.hideActiveTooltip();
    });
    
    // Hide tooltips on click outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('[data-product-siblings]')) {
        this.hideActiveTooltip();
      }
    });
    
    // Handle escape key globally
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hideActiveTooltip();
      }
    });
  }
  
  trackSiblingInteraction(action, data = {}) {
    // Google Analytics 4
    if (typeof gtag !== 'undefined') {
      gtag('event', 'product_sibling_interaction', {
        event_category: 'Product Discovery',
        event_label: action,
        interaction_type: action,
        sibling_data: JSON.stringify(data)
      });
    }
    
    // Data Layer for other platforms
    if (typeof dataLayer !== 'undefined') {
      dataLayer.push({
        event: 'product_sibling_interaction',
        action: action,
        ...data
      });
    }
    
    // Custom events for theme integrations
    document.dispatchEvent(new CustomEvent('product:sibling:interaction', {
      detail: { action, data }
    }));
    
    // Debug logging
    console.log('🎯 Sibling interaction tracked:', action, data);
  }
  
  updateRecentlyViewed(siblingData) {
    try {
      const storageKey = 'pitagora_recently_viewed_siblings';
      let recentSiblings = JSON.parse(localStorage.getItem(storageKey) || '[]');
      
      // Remove if already exists
      recentSiblings = recentSiblings.filter(item => item.id !== siblingData.id);
      
      // Add to beginning
      recentSiblings.unshift({
        id: siblingData.id,
        handle: siblingData.handle,
        color: siblingData.color,
        timestamp: Date.now()
      });
      
      // Keep only last 10
      recentSiblings = recentSiblings.slice(0, 10);
      
      localStorage.setItem(storageKey, JSON.stringify(recentSiblings));
    } catch (error) {
      console.warn('Could not update recently viewed siblings:', error);
    }
  }
  
  // Public API methods
  showSiblingTooltip(siblingIndex, containerIndex = 0) {
    const container = this.containers[containerIndex];
    if (!container) return;
    
    const siblings = container.querySelectorAll('.product-sibling');
    const sibling = siblings[siblingIndex];
    if (!sibling) return;
    
    const tooltip = sibling.querySelector('.product-sibling__tooltip');
    this.hideActiveTooltip();
    this.showTooltip(tooltip, sibling);
    this.activeTooltip = tooltip;
  }
  
  hideSiblingTooltips() {
    this.hideActiveTooltip();
  }
  
  getSiblingData(containerIndex = 0) {
    const container = this.containers[containerIndex];
    if (!container) return [];
    
    const siblings = container.querySelectorAll('.product-sibling__link');
    return Array.from(siblings).map(link => ({
      handle: link.dataset.siblingHandle,
      id: link.dataset.siblingId,
      color: link.dataset.color,
      url: link.href
    }));
  }
}

// Lazy loading support
class ProductSiblingsLazyLoader {
  constructor() {
    this.observer = new IntersectionObserver(
      (entries) => this.handleIntersection(entries),
      { 
        rootMargin: '100px 0px',
        threshold: 0.1
      }
    );
    
    this.init();
  }
  
  init() {
    const containers = document.querySelectorAll('[data-product-siblings]:not([data-siblings-loaded])');
    containers.forEach(container => {
      this.observer.observe(container);
    });
  }
  
  handleIntersection(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        this.loadSiblingsContainer(entry.target);
        this.observer.unobserve(entry.target);
      }
    });
  }
  
  loadSiblingsContainer(container) {
    container.setAttribute('data-siblings-loaded', 'true');
    
    // Load images with intersection observer
    const images = container.querySelectorAll('.product-sibling__image[data-src]');
    images.forEach(img => {
      if (img.dataset.src) {
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
      }
    });
    
    // Initialize manager for this container
    if (window.productSiblingsManager) {
      window.productSiblingsManager.setupContainer(container);
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Initialize main manager
  window.productSiblingsManager = new ProductSiblingsManager();
  
  // Initialize lazy loader if supported
  if ('IntersectionObserver' in window) {
    window.productSiblingsLazyLoader = new ProductSiblingsLazyLoader();
  }
});

// Re-initialize on AJAX page loads (for SPA themes)
document.addEventListener('page:loaded', () => {
  if (window.productSiblingsManager) {
    window.productSiblingsManager = new ProductSiblingsManager();
  }
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ProductSiblingsManager, ProductSiblingsLazyLoader };
}