/**
 * Header JavaScript - Pitagora Theme
 * Custom Elements System basado en Focal v4 con mejoras modernas
 * Manejo de sticky header, mobile menu, search drawer, localization
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
 * Store Header Custom Element
 * Maneja sticky behavior, transparent header y altura dinámica
 */
if (!customElements.get('store-header')) {
  class StoreHeader extends HTMLElement {
    constructor() {
      super();
      this.isSticky = this.hasAttribute('data-sticky');
      this.isTransparent = this.hasAttribute('data-transparent');
      this.scrollThreshold = 100;
      this.headerHeight = 0;
    }

    connectedCallback() {
      this.initializeHeader();
      this.bindEvents();
      this.updateCartCount();
      
      // Listen for cart updates
      document.addEventListener('cart:updated', this.handleCartUpdate.bind(this));
    }

    initializeHeader() {
      // Set initial header height
      this.updateHeaderHeight();
      
      // Initialize sticky behavior
      if (this.isSticky) {
        this.initializeStickyHeader();
      }
      
      // Initialize transparent header
      if (this.isTransparent) {
        this.initializeTransparentHeader();
      }
    }

    bindEvents() {
      // Window events
      window.addEventListener('scroll', debounce(this.handleScroll.bind(this), 16), { passive: true });
      window.addEventListener('resize', debounce(this.updateHeaderHeight.bind(this), 100));
      
      // Keyboard navigation
      document.addEventListener('keydown', this.handleKeyDown.bind(this));
    }

    handleScroll() {
      if (this.isSticky) {
        this.updateStickyState();
      }
      
      if (this.isTransparent) {
        this.updateTransparentState();
      }
      
      this.updateScrollDirection();
    }

    handleKeyDown(event) {
      // Close mobile menu on escape
      if (event.key === 'Escape') {
        const mobileMenu = this.querySelector('mobile-menu-drawer');
        const searchDrawer = document.querySelector('search-drawer');
        
        if (mobileMenu && mobileMenu.isOpen()) {
          mobileMenu.close();
        }
        
        if (searchDrawer && searchDrawer.isOpen()) {
          searchDrawer.close();
        }
      }
    }

    initializeStickyHeader() {
      this.classList.add('header--sticky-enabled');
    }

    updateStickyState() {
      const scrollY = window.scrollY;
      const shouldBeSticky = scrollY > this.scrollThreshold;
      
      this.classList.toggle('header--stuck', shouldBeSticky);
      
      // Update CSS custom property for other elements
      document.documentElement.style.setProperty('--header-is-stuck', shouldBeSticky ? '1' : '0');
    }

    initializeTransparentHeader() {
      this.classList.add('header--transparent-enabled');
    }

    updateTransparentState() {
      const scrollY = window.scrollY;
      const shouldBeOpaque = scrollY > this.scrollThreshold;
      
      this.classList.toggle('header--opaque', shouldBeOpaque);
    }

    updateScrollDirection() {
      const scrollY = window.scrollY;
      
      if (scrollY > this.lastScrollY && scrollY > this.headerHeight) {
        // Scrolling down
        this.classList.add('header--scroll-down');
        this.classList.remove('header--scroll-up');
      } else if (scrollY < this.lastScrollY) {
        // Scrolling up
        this.classList.add('header--scroll-up');
        this.classList.remove('header--scroll-down');
      }
      
      this.lastScrollY = scrollY;
    }

    updateHeaderHeight() {
      this.headerHeight = this.offsetHeight;
      document.documentElement.style.setProperty('--header-height', `${this.headerHeight}px`);
    }

    handleCartUpdate(event) {
      const cart = event.detail.cart;
      this.updateCartCount(cart.item_count);
    }

    updateCartCount(count = null) {
      const cartCountElement = this.querySelector('.cart-count');
      if (cartCountElement) {
        if (count === null) {
          // Fetch current cart count if not provided
          fetch('/cart.js')
            .then(response => response.json())
            .then(cart => {
              cartCountElement.textContent = cart.item_count;
              cartCountElement.classList.toggle('cart-count--empty', cart.item_count === 0);
            })
            .catch(error => console.error('Error fetching cart:', error));
        } else {
          cartCountElement.textContent = count;
          cartCountElement.classList.toggle('cart-count--empty', count === 0);
        }
      }
    }
  }

  customElements.define('store-header', StoreHeader);
}

/**
 * Mobile Menu Drawer Custom Element
 */
if (!customElements.get('mobile-menu-drawer')) {
  class MobileMenuDrawer extends HTMLElement {
    constructor() {
      super();
      this.overlay = this.querySelector('.mobile-menu-drawer__overlay');
      this.closeButton = this.querySelector('.mobile-menu-drawer__close');
      this.isOpenState = false;
    }

    connectedCallback() {
      this.bindEvents();
      this.setupAccessibility();
      
      // Find and bind mobile toggle button
      const toggleButton = document.querySelector('.mobile-menu-toggle');
      if (toggleButton) {
        toggleButton.addEventListener('click', this.toggle.bind(this));
      }
    }

    bindEvents() {
      // Close button
      if (this.closeButton) {
        this.closeButton.addEventListener('click', this.close.bind(this));
      }
      
      // Overlay click
      if (this.overlay) {
        this.overlay.addEventListener('click', this.close.bind(this));
      }
      
      // Dropdown toggles
      this.querySelectorAll('.mobile-menu-dropdown summary').forEach(summary => {
        summary.addEventListener('click', this.handleDropdownToggle.bind(this));
      });
    }

    setupAccessibility() {
      // Set initial ARIA states
      this.setAttribute('aria-hidden', 'true');
      this.setAttribute('tabindex', '-1');
    }

    isOpen() {
      return this.isOpenState;
    }

    open() {
      this.isOpenState = true;
      this.classList.add('mobile-menu-drawer--open');
      document.body.classList.add('mobile-menu-open');
      
      // Update ARIA states
      this.setAttribute('aria-hidden', 'false');
      this.removeAttribute('tabindex');
      
      // Update toggle button state
      const toggleButton = document.querySelector('.mobile-menu-toggle');
      if (toggleButton) {
        toggleButton.setAttribute('aria-expanded', 'true');
        toggleButton.classList.add('mobile-menu-toggle--active');
      }
      
      // Focus management
      this.focus();
      
      dispatchCustomEvent('mobile-menu:opened');
    }

    close() {
      this.isOpenState = false;
      this.classList.remove('mobile-menu-drawer--open');
      document.body.classList.remove('mobile-menu-open');
      
      // Update ARIA states
      this.setAttribute('aria-hidden', 'true');
      this.setAttribute('tabindex', '-1');
      
      // Update toggle button state
      const toggleButton = document.querySelector('.mobile-menu-toggle');
      if (toggleButton) {
        toggleButton.setAttribute('aria-expanded', 'false');
        toggleButton.classList.remove('mobile-menu-toggle--active');
        toggleButton.focus(); // Return focus to toggle button
      }
      
      dispatchCustomEvent('mobile-menu:closed');
    }

    toggle() {
      if (this.isOpen()) {
        this.close();
      } else {
        this.open();
      }
    }

    handleDropdownToggle(event) {
      const summary = event.currentTarget;
      const details = summary.parentElement;
      const isOpen = details.hasAttribute('open');
      
      // Close other open dropdowns
      this.querySelectorAll('.mobile-menu-dropdown[open]').forEach(otherDetails => {
        if (otherDetails !== details) {
          otherDetails.removeAttribute('open');
        }
      });
      
      // Animate the dropdown
      if (!isOpen) {
        requestAnimationFrame(() => {
          details.classList.add('mobile-menu-dropdown--opening');
        });
      }
    }
  }

  customElements.define('mobile-menu-drawer', MobileMenuDrawer);
}

/**
 * Search Drawer Custom Element
 */
if (!customElements.get('search-drawer')) {
  class SearchDrawer extends HTMLElement {
    constructor() {
      super();
      this.overlay = this.querySelector('.search-drawer__overlay');
      this.closeButton = this.querySelector('.search-drawer__close');
      this.searchInput = this.querySelector('.predictive-search__input');
      this.isOpenState = false;
    }

    connectedCallback() {
      this.bindEvents();
      this.setupAccessibility();
      
      // Find and bind search toggle buttons
      document.querySelectorAll('[data-search-toggle]').forEach(button => {
        button.addEventListener('click', this.toggle.bind(this));
      });
    }

    bindEvents() {
      // Close button
      if (this.closeButton) {
        this.closeButton.addEventListener('click', this.close.bind(this));
      }
      
      // Overlay click
      if (this.overlay) {
        this.overlay.addEventListener('click', this.close.bind(this));
      }
      
      // Search input events
      if (this.searchInput) {
        this.searchInput.addEventListener('input', debounce(this.handleSearchInput.bind(this), 300));
        this.searchInput.addEventListener('focus', this.handleSearchFocus.bind(this));
      }
    }

    setupAccessibility() {
      this.setAttribute('aria-hidden', 'true');
      this.setAttribute('role', 'dialog');
      this.setAttribute('aria-modal', 'true');
      this.setAttribute('aria-label', 'Search');
    }

    isOpen() {
      return this.isOpenState;
    }

    open() {
      this.isOpenState = true;
      this.classList.add('search-drawer--open');
      document.body.classList.add('search-drawer-open');
      
      // Update ARIA states
      this.setAttribute('aria-hidden', 'false');
      
      // Focus on search input
      if (this.searchInput) {
        setTimeout(() => this.searchInput.focus(), 100);
      }
      
      dispatchCustomEvent('search-drawer:opened');
    }

    close() {
      this.isOpenState = false;
      this.classList.remove('search-drawer--open');
      document.body.classList.remove('search-drawer-open');
      
      // Update ARIA states
      this.setAttribute('aria-hidden', 'true');
      
      dispatchCustomEvent('search-drawer:closed');
    }

    toggle() {
      if (this.isOpen()) {
        this.close();
      } else {
        this.open();
      }
    }

    handleSearchInput(event) {
      const query = event.target.value.trim();
      
      if (query.length >= 2) {
        this.performPredictiveSearch(query);
      } else {
        this.clearSearchResults();
      }
    }

    handleSearchFocus(event) {
      // Show recent searches or popular products when input is focused
      if (!event.target.value.trim()) {
        this.showDefaultResults();
      }
    }

    async performPredictiveSearch(query) {
      const resultsContainer = this.querySelector('.predictive-search__results');
      if (!resultsContainer) return;

      try {
        // Show loading state
        resultsContainer.innerHTML = '<div class="predictive-search__loading">Searching...</div>';
        
        const response = await fetch(`/search/suggest.json?q=${encodeURIComponent(query)}&resources[type]=product&resources[limit]=6`);
        const data = await response.json();
        
        this.renderSearchResults(data.resources.results.products || [], resultsContainer);
      } catch (error) {
        console.error('Search failed:', error);
        resultsContainer.innerHTML = '<div class="predictive-search__error">Search unavailable</div>';
      }
    }

    renderSearchResults(products, container) {
      if (products.length === 0) {
        container.innerHTML = '<div class="predictive-search__no-results">No products found</div>';
        return;
      }

      const resultsHTML = products.map(product => `
        <a href="${product.url}" class="predictive-search__result">
          <div class="predictive-search__result-image">
            <img src="${product.featured_image}" alt="${product.title}" loading="lazy">
          </div>
          <div class="predictive-search__result-content">
            <h3 class="predictive-search__result-title">${product.title}</h3>
            <div class="predictive-search__result-price">${Shopify.formatMoney(product.price)}</div>
          </div>
        </a>
      `).join('');

      container.innerHTML = `
        <div class="predictive-search__results-list">
          ${resultsHTML}
        </div>
      `;
    }

    clearSearchResults() {
      const resultsContainer = this.querySelector('.predictive-search__results');
      if (resultsContainer) {
        resultsContainer.innerHTML = '';
      }
    }

    showDefaultResults() {
      // Implementation for showing popular products or recent searches
      const resultsContainer = this.querySelector('.predictive-search__results');
      if (resultsContainer) {
        resultsContainer.innerHTML = '<div class="predictive-search__placeholder">Start typing to search products...</div>';
      }
    }
  }

  customElements.define('search-drawer', SearchDrawer);
}

/**
 * Localization Form Custom Element
 */
if (!customElements.get('localization-form')) {
  class LocalizationForm extends HTMLElement {
    constructor() {
      super();
      this.form = this.querySelector('form');
      this.selects = this.querySelectorAll('select');
    }

    connectedCallback() {
      this.bindEvents();
    }

    bindEvents() {
      this.selects.forEach(select => {
        select.addEventListener('change', this.handleSelectChange.bind(this));
      });
    }

    handleSelectChange(event) {
      // Auto-submit form when selection changes
      if (this.form) {
        this.form.submit();
      }
    }
  }

  customElements.define('localization-form', LocalizationForm);
}

/**
 * Predictive Search Custom Element
 */
if (!customElements.get('predictive-search')) {
  class PredictiveSearch extends HTMLElement {
    constructor() {
      super();
      this.input = this.querySelector('.predictive-search__input');
      this.results = this.querySelector('.predictive-search__results');
      this.form = this.querySelector('.predictive-search__form');
    }

    connectedCallback() {
      this.bindEvents();
    }

    bindEvents() {
      if (this.input) {
        this.input.addEventListener('input', debounce(this.handleInput.bind(this), 300));
        this.input.addEventListener('keydown', this.handleKeyDown.bind(this));
      }
      
      if (this.form) {
        this.form.addEventListener('submit', this.handleSubmit.bind(this));
      }
    }

    handleInput(event) {
      const query = event.target.value.trim();
      
      if (query.length >= 2) {
        this.fetchPredictions(query);
      } else {
        this.clearResults();
      }
    }

    handleKeyDown(event) {
      // Handle arrow navigation through results
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        this.navigateResults(event.key === 'ArrowDown' ? 1 : -1);
      }
    }

    handleSubmit(event) {
      // Let form submit naturally, but track search analytics
      dispatchCustomEvent('search:submitted', {
        query: this.input.value,
        source: 'predictive-search'
      });
    }

    async fetchPredictions(query) {
      try {
        const response = await fetch(`/search/suggest.json?q=${encodeURIComponent(query)}&resources[type]=product&resources[limit]=8`);
        const data = await response.json();
        
        this.renderPredictions(data.resources.results.products || []);
      } catch (error) {
        console.error('Predictive search failed:', error);
        this.clearResults();
      }
    }

    renderPredictions(products) {
      if (!this.results) return;
      
      if (products.length === 0) {
        this.results.innerHTML = '<div class="predictive-search__no-results">No suggestions found</div>';
        return;
      }

      const predictionsHTML = products.map(product => `
        <a href="${product.url}" class="predictive-search__prediction" tabindex="-1">
          <img src="${product.featured_image}" alt="${product.title}" loading="lazy">
          <div class="predictive-search__prediction-content">
            <div class="predictive-search__prediction-title">${product.title}</div>
            <div class="predictive-search__prediction-price">${Shopify.formatMoney(product.price)}</div>
          </div>
        </a>
      `).join('');

      this.results.innerHTML = predictionsHTML;
      this.results.style.display = 'block';
    }

    clearResults() {
      if (this.results) {
        this.results.innerHTML = '';
        this.results.style.display = 'none';
      }
    }

    navigateResults(direction) {
      const predictions = this.results.querySelectorAll('.predictive-search__prediction');
      if (predictions.length === 0) return;

      const currentIndex = Array.from(predictions).findIndex(p => p.matches(':focus'));
      let nextIndex = currentIndex + direction;

      if (nextIndex < 0) {
        nextIndex = predictions.length - 1;
      } else if (nextIndex >= predictions.length) {
        nextIndex = 0;
      }

      predictions[nextIndex].focus();
    }
  }

  customElements.define('predictive-search', PredictiveSearch);
}

// Initialize header when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  console.log('Pitagora Header System Loaded');
  
  // Ensure all custom elements are upgraded
  if (window.customElements) {
    customElements.whenDefined('store-header').then(() => {
      console.log('Header custom elements ready');
    });
  }
});