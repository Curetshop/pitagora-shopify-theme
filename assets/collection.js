/**
 * Collection JavaScript - Pitagora Theme
 * Sistema completo de custom elements para collection grid, filtros y funcionalidad avanzada
 * Basado en Focal v4 + mejoras modernas con AJAX y UX optimizada
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

const updateURLWithoutReload = (url) => {
  if (window.history && window.history.replaceState) {
    window.history.replaceState(null, null, url);
  }
};

/**
 * Collection Provider - Main Controller
 * Coordina todos los componentes de collection
 */
if (!customElements.get('collection-provider')) {
  class CollectionProvider extends HTMLElement {
    constructor() {
      super();
      this.collectionHandle = this.dataset.collectionHandle;
      this.collectionId = this.dataset.collectionId;
      this.productsCount = parseInt(this.dataset.productsCount) || 0;
      this.isLoading = false;
      this.currentFilters = new Map();
      this.currentSort = '';
      this.currentPage = 1;
    }

    connectedCallback() {
      this.initializeComponents();
      this.bindEvents();
      
      // Listen for popstate (back/forward buttons)
      window.addEventListener('popstate', this.handlePopState.bind(this));
    }

    initializeComponents() {
      this.productGrid = this.querySelector('collection-product-grid');
      this.toolbar = this.querySelector('collection-toolbar');
      this.filters = this.querySelector('collection-filters');
      this.filtersDrawer = this.querySelector('collection-filters-drawer');
      this.pagination = this.querySelector('collection-pagination');
    }

    bindEvents() {
      // Collection events
      document.addEventListener('collection:filter-changed', this.handleFilterChange.bind(this));
      document.addEventListener('collection:sort-changed', this.handleSortChange.bind(this));
      document.addEventListener('collection:view-changed', this.handleViewChange.bind(this));
      document.addEventListener('collection:clear-all-filters', this.handleClearAllFilters.bind(this));
      document.addEventListener('collection:load-more', this.handleLoadMore.bind(this));
    }

    async handleFilterChange(event) {
      if (this.isLoading) return;
      
      const { filterName, filterValue, isActive } = event.detail;
      
      if (isActive) {
        this.currentFilters.set(filterName, filterValue);
      } else {
        this.currentFilters.delete(filterName);
      }
      
      this.currentPage = 1; // Reset to first page
      await this.updateCollection();
    }

    async handleSortChange(event) {
      if (this.isLoading) return;
      
      this.currentSort = event.detail.sortBy;
      this.currentPage = 1; // Reset to first page
      await this.updateCollection();
    }

    handleViewChange(event) {
      const { view } = event.detail;
      if (this.productGrid) {
        this.productGrid.setView(view);
      }
      
      // Save view preference
      localStorage.setItem('collection-view-preference', view);
    }

    async handleClearAllFilters(event) {
      if (this.isLoading) return;
      
      this.currentFilters.clear();
      this.currentPage = 1;
      await this.updateCollection();
    }

    async handleLoadMore(event) {
      if (this.isLoading) return;
      
      this.currentPage += 1;
      await this.updateCollection(true); // true = append results
    }

    handlePopState(event) {
      // Handle browser back/forward buttons
      location.reload();
    }

    async updateCollection(append = false) {
      this.isLoading = true;
      this.showLoadingState();

      try {
        const url = this.buildCollectionURL();
        const response = await fetch(url, {
          headers: {
            'X-Requested-With': 'XMLHttpRequest'
          }
        });

        if (!response.ok) {
          throw new Error('Network response was not ok');
        }

        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        if (append) {
          this.appendProducts(doc);
        } else {
          this.replaceCollectionContent(doc);
        }
        
        // Update URL without reload
        updateURLWithoutReload(url);
        
        dispatchCustomEvent('collection:updated', {
          filtersCount: this.currentFilters.size,
          resultsCount: this.getResultsCount(doc)
        });
        
      } catch (error) {
        console.error('Collection update failed:', error);
        this.showErrorState();
      } finally {
        this.isLoading = false;
        this.hideLoadingState();
      }
    }

    buildCollectionURL() {
      const url = new URL(window.location.href);
      const searchParams = new URLSearchParams();

      // Add filters
      this.currentFilters.forEach((value, key) => {
        searchParams.append(key, value);
      });

      // Add sort
      if (this.currentSort) {
        searchParams.append('sort_by', this.currentSort);
      }

      // Add page
      if (this.currentPage > 1) {
        searchParams.append('page', this.currentPage);
      }

      url.search = searchParams.toString();
      return url.toString();
    }

    replaceCollectionContent(doc) {
      // Update product grid
      const newProductGrid = doc.querySelector('collection-product-grid');
      if (newProductGrid && this.productGrid) {
        this.productGrid.innerHTML = newProductGrid.innerHTML;
      }

      // Update filters
      const newFilters = doc.querySelector('collection-filters');
      if (newFilters && this.filters) {
        this.filters.innerHTML = newFilters.innerHTML;
      }

      // Update pagination
      const newPagination = doc.querySelector('collection-pagination');
      if (this.pagination) {
        if (newPagination) {
          this.pagination.innerHTML = newPagination.innerHTML;
        } else {
          this.pagination.innerHTML = '';
        }
      }

      // Re-initialize components
      this.initializeNewComponents();
    }

    appendProducts(doc) {
      const newProducts = doc.querySelectorAll('.product-grid__item');
      const currentGrid = this.productGrid?.querySelector('.product-grid');
      
      if (currentGrid && newProducts.length > 0) {
        newProducts.forEach(product => {
          currentGrid.appendChild(product.cloneNode(true));
        });
      }

      // Update load more button
      const newLoadMore = doc.querySelector('.collection-load-more');
      const currentLoadMore = this.querySelector('.collection-load-more');
      
      if (currentLoadMore) {
        if (newLoadMore) {
          currentLoadMore.outerHTML = newLoadMore.outerHTML;
        } else {
          currentLoadMore.remove();
        }
      }
    }

    initializeNewComponents() {
      // Re-initialize any components that need it after DOM update
      const newCards = this.querySelectorAll('product-card');
      newCards.forEach(card => {
        if (!customElements.get('product-card')) return;
        customElements.upgrade(card);
      });
    }

    showLoadingState() {
      this.classList.add('collection-provider--loading');
      
      // Show skeleton loading
      const loadingOverlay = document.createElement('div');
      loadingOverlay.className = 'collection-loading-overlay';
      loadingOverlay.innerHTML = `
        <div class="collection-loading-spinner">
          <div class="spinner"></div>
        </div>
      `;
      this.appendChild(loadingOverlay);
    }

    hideLoadingState() {
      this.classList.remove('collection-provider--loading');
      
      const loadingOverlay = this.querySelector('.collection-loading-overlay');
      if (loadingOverlay) {
        loadingOverlay.remove();
      }
    }

    showErrorState() {
      // Show error message to user
      const errorDiv = document.createElement('div');
      errorDiv.className = 'collection-error';
      // Create error content securely
      const errorMsg = document.createElement('p');
      errorMsg.textContent = 'Sorry, there was an error loading the products. Please try again.';
      
      const retryButton = document.createElement('button');
      retryButton.className = 'button button--secondary';
      retryButton.textContent = 'Retry';
      retryButton.addEventListener('click', () => location.reload());
      
      errorDiv.appendChild(errorMsg);
      errorDiv.appendChild(retryButton);
      
      const main = this.querySelector('.collection-main');
      if (main) {
        main.prepend(errorDiv);
        setTimeout(() => errorDiv.remove(), 5000);
      }
    }

    getResultsCount(doc) {
      const products = doc.querySelectorAll('.product-grid__item');
      return products.length;
    }
  }

  customElements.define('collection-provider', CollectionProvider);
}

/**
 * Collection Filters Custom Element
 */
if (!customElements.get('collection-filters')) {
  class CollectionFilters extends HTMLElement {
    constructor() {
      super();
      this.position = this.dataset.position || 'sidebar';
    }

    connectedCallback() {
      this.bindEvents();
      this.initializePriceSliders();
    }

    bindEvents() {
      // Filter inputs
      this.addEventListener('change', this.handleFilterChange.bind(this));
      this.addEventListener('input', debounce(this.handleFilterInput.bind(this), 300));
      
      // Clear all filters
      const clearAllButton = this.querySelector('[data-clear-all-filters]');
      if (clearAllButton) {
        clearAllButton.addEventListener('click', this.clearAllFilters.bind(this));
      }

      // Show more/less buttons
      this.querySelectorAll('[data-filter-show-more]').forEach(button => {
        button.addEventListener('click', this.handleShowMore.bind(this));
      });

      // Filter search
      this.querySelectorAll('[data-filter-search]').forEach(input => {
        input.addEventListener('input', debounce(this.handleFilterSearch.bind(this), 200));
      });
    }

    handleFilterChange(event) {
      const input = event.target;
      if (!input.matches('[data-filter-input]')) return;

      const filterName = input.name;
      const filterValue = input.value;
      const isActive = input.checked;

      dispatchCustomEvent('collection:filter-changed', {
        filterName,
        filterValue,
        isActive
      });
    }

    handleFilterInput(event) {
      const input = event.target;
      if (!input.matches('[data-price-min], [data-price-max]')) return;

      // Handle price range inputs
      this.updatePriceSliderFromInput(input);
      this.debouncePriceFilter();
    }

    debouncePriceFilter = debounce(() => {
      const minInput = this.querySelector('[data-price-min]');
      const maxInput = this.querySelector('[data-price-max]');
      
      if (minInput && maxInput) {
        dispatchCustomEvent('collection:filter-changed', {
          filterName: 'price',
          filterValue: `${minInput.value}-${maxInput.value}`,
          isActive: true
        });
      }
    }, 500);

    clearAllFilters(event) {
      event.preventDefault();
      
      // Uncheck all checkboxes
      this.querySelectorAll('input[type="checkbox"]').forEach(input => {
        input.checked = false;
      });
      
      // Reset price inputs
      this.querySelectorAll('[data-price-min], [data-price-max]').forEach(input => {
        input.value = input.placeholder || '';
      });
      
      // Reset price sliders
      this.resetPriceSliders();
      
      dispatchCustomEvent('collection:clear-all-filters');
    }

    handleShowMore(event) {
      event.preventDefault();
      
      const button = event.currentTarget;
      const filterId = button.dataset.filterShowMore;
      const filterOptions = this.querySelector(`[data-filter-search="${filterId}"]`)
        ?.closest('.collection-filter-list')
        ?.querySelector('.collection-filter-options');
      
      if (filterOptions) {
        filterOptions.classList.toggle('collection-filter-options--expanded');
        
        const showText = button.querySelector('.collection-filter-show-more__text-show');
        const hideText = button.querySelector('.collection-filter-show-more__text-hide');
        
        if (filterOptions.classList.contains('collection-filter-options--expanded')) {
          showText.style.display = 'none';
          hideText.style.display = 'inline';
        } else {
          showText.style.display = 'inline';
          hideText.style.display = 'none';
        }
      }
    }

    handleFilterSearch(event) {
      const searchInput = event.target;
      const searchTerm = searchInput.value.toLowerCase();
      const filterId = searchInput.dataset.filterSearch;
      const filterOptions = searchInput.closest('.collection-filter-list')
        ?.querySelector('.collection-filter-options');
      
      if (filterOptions) {
        const options = filterOptions.querySelectorAll('.collection-filter-option');
        
        options.forEach(option => {
          const text = option.querySelector('.collection-filter-option__text')?.textContent.toLowerCase() || '';
          const shouldShow = text.includes(searchTerm);
          option.style.display = shouldShow ? 'block' : 'none';
        });
      }
    }

    initializePriceSliders() {
      this.querySelectorAll('[data-price-range-slider]').forEach(slider => {
        this.setupPriceSlider(slider);
      });
    }

    setupPriceSlider(sliderContainer) {
      const minSlider = sliderContainer.querySelector('[data-price-slider-min]');
      const maxSlider = sliderContainer.querySelector('[data-price-slider-max]');
      const minInput = this.querySelector('[data-price-min]');
      const maxInput = this.querySelector('[data-price-max]');
      const minDisplay = this.querySelector('[data-price-display-min]');
      const maxDisplay = this.querySelector('[data-price-display-max]');
      const rangeFill = sliderContainer.querySelector('[data-price-range-fill]');

      if (!minSlider || !maxSlider) return;

      const updateSlider = () => {
        const minVal = parseFloat(minSlider.value);
        const maxVal = parseFloat(maxSlider.value);
        const minRange = parseFloat(minSlider.min);
        const maxRange = parseFloat(minSlider.max);

        // Prevent crossing
        if (minVal >= maxVal) {
          if (minSlider === event.target) {
            maxSlider.value = minVal;
          } else {
            minSlider.value = maxVal;
          }
        }

        // Update inputs
        if (minInput) minInput.value = minSlider.value;
        if (maxInput) maxInput.value = maxSlider.value;

        // Update displays
        if (minDisplay) minDisplay.textContent = minSlider.value;
        if (maxDisplay) maxDisplay.textContent = maxSlider.value;

        // Update visual range
        if (rangeFill) {
          const leftPercent = ((minSlider.value - minRange) / (maxRange - minRange)) * 100;
          const rightPercent = ((maxSlider.value - minRange) / (maxRange - minRange)) * 100;
          
          rangeFill.style.left = `${leftPercent}%`;
          rangeFill.style.width = `${rightPercent - leftPercent}%`;
        }
      };

      minSlider.addEventListener('input', updateSlider);
      maxSlider.addEventListener('input', updateSlider);
      minSlider.addEventListener('change', () => this.debouncePriceFilter());
      maxSlider.addEventListener('change', () => this.debouncePriceFilter());

      // Initialize
      updateSlider();
    }

    updatePriceSliderFromInput(input) {
      const isMin = input.matches('[data-price-min]');
      const sliderSelector = isMin ? '[data-price-slider-min]' : '[data-price-slider-max]';
      const slider = this.querySelector(sliderSelector);
      
      if (slider) {
        slider.value = input.value;
        // Trigger slider update
        slider.dispatchEvent(new Event('input'));
      }
    }

    resetPriceSliders() {
      this.querySelectorAll('[data-price-slider-min]').forEach(slider => {
        slider.value = slider.min;
      });
      
      this.querySelectorAll('[data-price-slider-max]').forEach(slider => {
        slider.value = slider.max;
      });
      
      // Update displays
      this.querySelectorAll('[data-price-range-slider]').forEach(slider => {
        const event = new Event('input');
        slider.querySelector('[data-price-slider-min]')?.dispatchEvent(event);
      });
    }
  }

  customElements.define('collection-filters', CollectionFilters);
}

/**
 * Collection Filters Drawer (Mobile)
 */
if (!customElements.get('collection-filters-drawer')) {
  class CollectionFiltersDrawer extends HTMLElement {
    constructor() {
      super();
      this.overlay = this.querySelector('.collection-filters-drawer__overlay');
      this.closeButton = this.querySelector('.collection-filters-drawer__close');
      this.applyButton = this.querySelector('[data-filters-apply]');
      this.isOpenState = false;
    }

    connectedCallback() {
      this.bindEvents();
      
      // Bind toggle buttons
      document.querySelectorAll('[data-filters-toggle]').forEach(button => {
        button.addEventListener('click', this.toggle.bind(this));
      });
    }

    bindEvents() {
      if (this.overlay) {
        this.overlay.addEventListener('click', this.close.bind(this));
      }
      
      if (this.closeButton) {
        this.closeButton.addEventListener('click', this.close.bind(this));
      }
      
      if (this.applyButton) {
        this.applyButton.addEventListener('click', this.close.bind(this));
      }
      
      // Handle escape key
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && this.isOpen()) {
          this.close();
        }
      });
    }

    isOpen() {
      return this.isOpenState;
    }

    open() {
      this.isOpenState = true;
      this.classList.add('collection-filters-drawer--open');
      document.body.classList.add('collection-filters-drawer-open');
      
      // Update toggle button
      const toggleButton = document.querySelector('[data-filters-toggle]');
      if (toggleButton) {
        toggleButton.setAttribute('aria-expanded', 'true');
      }
      
      // Focus management
      this.setAttribute('aria-hidden', 'false');
      this.focus();
      
      dispatchCustomEvent('collection-filters-drawer:opened');
    }

    close() {
      this.isOpenState = false;
      this.classList.remove('collection-filters-drawer--open');
      document.body.classList.remove('collection-filters-drawer-open');
      
      // Update toggle button
      const toggleButton = document.querySelector('[data-filters-toggle]');
      if (toggleButton) {
        toggleButton.setAttribute('aria-expanded', 'false');
        toggleButton.focus();
      }
      
      // ARIA
      this.setAttribute('aria-hidden', 'true');
      
      dispatchCustomEvent('collection-filters-drawer:closed');
    }

    toggle() {
      if (this.isOpen()) {
        this.close();
      } else {
        this.open();
      }
    }
  }

  customElements.define('collection-filters-drawer', CollectionFiltersDrawer);
}

/**
 * Collection Toolbar
 */
if (!customElements.get('collection-toolbar')) {
  class CollectionToolbar extends HTMLElement {
    constructor() {
      super();
    }

    connectedCallback() {
      this.bindEvents();
    }

    bindEvents() {
      // Sort selector
      const sortSelect = this.querySelector('[data-sort-by]');
      if (sortSelect) {
        sortSelect.addEventListener('change', this.handleSortChange.bind(this));
      }
      
      // View switcher
      this.querySelectorAll('[data-view]').forEach(button => {
        button.addEventListener('click', this.handleViewChange.bind(this));
      });
    }

    handleSortChange(event) {
      const sortBy = event.target.value;
      
      dispatchCustomEvent('collection:sort-changed', {
        sortBy
      });
    }

    handleViewChange(event) {
      const button = event.currentTarget;
      const view = button.dataset.view;
      
      // Update button states
      this.querySelectorAll('[data-view]').forEach(btn => {
        btn.classList.remove('collection-view-switcher__button--active');
      });
      
      button.classList.add('collection-view-switcher__button--active');
      
      dispatchCustomEvent('collection:view-changed', {
        view
      });
    }
  }

  customElements.define('collection-toolbar', CollectionToolbar);
}

/**
 * Collection Product Grid
 */
if (!customElements.get('collection-product-grid')) {
  class CollectionProductGrid extends HTMLElement {
    constructor() {
      super();
      this.currentView = this.dataset.view || 'grid';
      this.productsPerPage = parseInt(this.dataset.productsPerPage) || 24;
    }

    connectedCallback() {
      this.bindEvents();
      this.initializeView();
    }

    bindEvents() {
      // Load more button
      const loadMoreButton = this.querySelector('[data-load-more]');
      if (loadMoreButton) {
        loadMoreButton.addEventListener('click', this.handleLoadMore.bind(this));
      }
    }

    initializeView() {
      // Restore saved view preference
      const savedView = localStorage.getItem('collection-view-preference');
      if (savedView && savedView !== this.currentView) {
        this.setView(savedView);
      }
    }

    setView(view) {
      this.currentView = view;
      this.dataset.view = view;
      this.className = this.className.replace(/collection-product-grid--\w+/, `collection-product-grid--${view}`);
      
      // Update CSS classes
      this.classList.remove('collection-product-grid--grid', 'collection-product-grid--list');
      this.classList.add(`collection-product-grid--${view}`);
    }

    handleLoadMore(event) {
      event.preventDefault();
      
      const button = event.currentTarget;
      const loadingText = button.querySelector('.collection-load-more__loader');
      const normalText = button.querySelector('.collection-load-more__text');
      
      // Show loading state
      button.disabled = true;
      normalText.style.display = 'none';
      loadingText.style.display = 'inline';
      
      dispatchCustomEvent('collection:load-more');
      
      // Reset button state after some time (will be handled by collection update)
      setTimeout(() => {
        button.disabled = false;
        normalText.style.display = 'inline';
        loadingText.style.display = 'none';
      }, 3000);
    }
  }

  customElements.define('collection-product-grid', CollectionProductGrid);
}

/**
 * Product Color Swatches
 */
if (!customElements.get('product-color-swatches')) {
  class ProductColorSwatches extends HTMLElement {
    constructor() {
      super();
      this.productHandle = this.dataset.productHandle;
    }

    connectedCallback() {
      this.bindEvents();
    }

    bindEvents() {
      this.addEventListener('click', this.handleColorChange.bind(this));
    }

    handleColorChange(event) {
      const swatch = event.target.closest('.color-swatch');
      if (!swatch) return;
      
      event.preventDefault();
      
      // Update active state
      this.querySelectorAll('.color-swatch').forEach(s => {
        s.classList.remove('color-swatch--active');
      });
      swatch.classList.add('color-swatch--active');
      
      // Update product image if available
      const imageUrl = swatch.dataset.imageSrc;
      if (imageUrl) {
        this.updateProductImage(imageUrl);
      }
      
      dispatchCustomEvent('product-color:changed', {
        color: swatch.dataset.color,
        variantId: swatch.dataset.variantId,
        productHandle: this.productHandle
      });
    }

    updateProductImage(imageUrl) {
      const productCard = this.closest('product-card');
      if (!productCard) return;
      
      const primaryImage = productCard.querySelector('.product-card__image--primary');
      if (primaryImage) {
        // Create new image element
        const newImage = primaryImage.cloneNode(true);
        newImage.src = imageUrl;
        newImage.addEventListener('load', () => {
          primaryImage.src = imageUrl;
        });
      }
    }
  }

  customElements.define('product-color-swatches', ProductColorSwatches);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  console.log('Pitagora Collection System Loaded');
  
  // Initialize any additional collection functionality
  initializeCollectionAnalytics();
});

// Collection Analytics
function initializeCollectionAnalytics() {
  // Track filter usage
  document.addEventListener('collection:filter-changed', function(event) {
    if (typeof gtag !== 'undefined') {
      gtag('event', 'collection_filter_used', {
        event_category: 'Collection',
        filter_name: event.detail.filterName,
        filter_value: event.detail.filterValue,
        is_active: event.detail.isActive
      });
    }
  });
  
  // Track sort changes
  document.addEventListener('collection:sort-changed', function(event) {
    if (typeof gtag !== 'undefined') {
      gtag('event', 'collection_sort_changed', {
        event_category: 'Collection',
        sort_by: event.detail.sortBy
      });
    }
  });
  
  // Track view changes
  document.addEventListener('collection:view-changed', function(event) {
    if (typeof gtag !== 'undefined') {
      gtag('event', 'collection_view_changed', {
        event_category: 'Collection',
        view: event.detail.view
      });
    }
  });
}