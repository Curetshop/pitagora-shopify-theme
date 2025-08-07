if (!customElements.get('search-form')) {
  class SearchForm extends HTMLElement {
    constructor() {
      super();
      this.form = this.querySelector('.search-form');
      this.input = this.querySelector('.search-form__input');
      this.submitButton = this.querySelector('.search-form__submit');
      
      this.setupEventListeners();
    }

    setupEventListeners() {
      // Auto-submit on input change (with debouncing)
      let debounceTimer;
      this.input?.addEventListener('input', (event) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          this.handleInputChange(event);
        }, 500);
      });

      // Handle form submission
      this.form?.addEventListener('submit', (event) => {
        this.handleSubmit(event);
      });

      // Handle keyboard shortcuts
      this.input?.addEventListener('keydown', (event) => {
        this.handleKeydown(event);
      });
    }

    handleInputChange(event) {
      const query = event.target.value.trim();
      
      if (query.length >= 2) {
        // Dispatch custom event for search suggestions
        this.dispatchEvent(new CustomEvent('search:input-changed', {
          detail: { query },
          bubbles: true
        }));
      }
    }

    handleSubmit(event) {
      const query = this.input?.value.trim();
      
      if (!query) {
        event.preventDefault();
        this.input?.focus();
        return;
      }
      
      // Track search
      this.trackSearch(query);
      
      // Add to recent searches
      this.addToRecentSearches(query);
    }

    handleKeydown(event) {
      switch (event.key) {
        case 'Escape':
          event.target.blur();
          break;
        case 'Enter':
          if (event.target.value.trim()) {
            this.form?.submit();
          }
          break;
      }
    }

    trackSearch(query) {
      // Google Analytics 4
      if (typeof gtag !== 'undefined') {
        gtag('event', 'search', {
          search_term: query,
          event_category: 'Site Search'
        });
      }
      
      // Custom tracking
      this.dispatchEvent(new CustomEvent('search:submitted', {
        detail: { query },
        bubbles: true
      }));
    }

    addToRecentSearches(query) {
      try {
        let recentSearches = JSON.parse(localStorage.getItem('recent_searches') || '[]');
        
        // Remove if already exists
        recentSearches = recentSearches.filter(search => 
          search.toLowerCase() !== query.toLowerCase()
        );
        
        // Add to beginning
        recentSearches.unshift(query);
        
        // Keep only 10 most recent
        recentSearches = recentSearches.slice(0, 10);
        
        localStorage.setItem('recent_searches', JSON.stringify(recentSearches));
      } catch (error) {
        console.error('Error saving recent search:', error);
      }
    }

    // Public methods
    focus() {
      this.input?.focus();
    }

    clear() {
      if (this.input) {
        this.input.value = '';
        this.input.focus();
      }
    }

    setQuery(query) {
      if (this.input) {
        this.input.value = query;
      }
    }
  }

  customElements.define('search-form', SearchForm);
}

if (!customElements.get('search-results')) {
  class SearchResults extends HTMLElement {
    constructor() {
      super();
      this.sectionId = this.getAttribute('data-section-id');
      this.resultsCount = parseInt(this.getAttribute('data-results-count')) || 0;
      this.currentPage = parseInt(this.getAttribute('data-current-page')) || 1;
      
      this.sortSelect = this.querySelector('[data-search-sort]');
      this.filterToggle = this.querySelector('[data-filter-toggle]');
      this.grid = this.querySelector('.search-results__grid');
      
      this.setupEventListeners();
      this.initializeFilters();
    }

    setupEventListeners() {
      // Sort handling
      this.sortSelect?.addEventListener('change', (event) => {
        this.handleSort(event.target.value);
      });

      // Filter toggle
      this.filterToggle?.addEventListener('click', () => {
        this.toggleFilters();
      });

      // Grid view switching (if implemented)
      document.addEventListener('keydown', (event) => {
        if (event.ctrlKey || event.metaKey) {
          switch (event.key) {
            case 'k':
              event.preventDefault();
              document.querySelector('.search-form__input')?.focus();
              break;
          }
        }
      });
    }

    initializeFilters() {
      // Initialize any filter-specific functionality
      if (this.filterToggle) {
        // Set initial state
        this.filterToggle.setAttribute('aria-expanded', 'false');
      }
    }

    handleSort(sortValue) {
      if (!sortValue) return;

      const url = new URL(window.location);
      url.searchParams.set('sort_by', sortValue);
      url.searchParams.delete('page'); // Reset to first page when sorting
      
      this.navigateToUrl(url.toString());
    }

    toggleFilters() {
      // Dispatch event for filter sidebar/drawer
      this.dispatchEvent(new CustomEvent('search:filters-toggle', {
        bubbles: true
      }));

      const isExpanded = this.filterToggle.getAttribute('aria-expanded') === 'true';
      this.filterToggle.setAttribute('aria-expanded', !isExpanded);
    }

    navigateToUrl(url) {
      this.setLoadingState(true);
      window.location.href = url;
    }

    setLoadingState(loading) {
      this.dataset.loading = loading;
      
      if (loading) {
        this.setAttribute('aria-busy', 'true');
      } else {
        this.removeAttribute('aria-busy');
      }
    }

    // Public methods
    updateResultsCount(count) {
      this.resultsCount = count;
      this.setAttribute('data-results-count', count);
      
      // Update count display
      const countElement = this.querySelector('.search-results__count span');
      if (countElement) {
        countElement.textContent = `${count} ${count === 1 ? 'result' : 'results'}`;
      }
    }

    getCurrentQuery() {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('q') || '';
    }

    highlightSearchTerms() {
      const query = this.getCurrentQuery();
      if (!query || query.length < 2) return;

      const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 1);
      const textElements = this.querySelectorAll('.search-result-card__title, .search-result-card__excerpt');
      
      textElements.forEach(element => {
        let html = element.innerHTML;
        
        searchTerms.forEach(term => {
          const regex = new RegExp(`\\b(${this.escapeRegExp(term)})\\b`, 'gi');
          html = html.replace(regex, '<mark>$1</mark>');
        });
        
        element.innerHTML = html;
      });
    }

    escapeRegExp(string) {
      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
  }

  customElements.define('search-results', SearchResults);
}

// Initialize search functionality when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Highlight search terms in results
  const searchResults = document.querySelector('search-results');
  if (searchResults && searchResults.resultsCount > 0) {
    searchResults.highlightSearchTerms();
  }
  
  // Focus search input if no results
  const urlParams = new URLSearchParams(window.location.search);
  const query = urlParams.get('q');
  if (query && searchResults && searchResults.resultsCount === 0) {
    setTimeout(() => {
      const searchInput = document.querySelector('.search-form__input');
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    }, 100);
  }
});

// Search suggestions functionality
class SearchSuggestions {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.setupListeners();
  }

  setupListeners() {
    document.addEventListener('search:input-changed', (event) => {
      this.handleSearchInput(event.detail.query);
    });
  }

  async handleSearchInput(query) {
    if (query.length < 2) return;

    try {
      const suggestions = await this.getSuggestions(query);
      this.displaySuggestions(suggestions);
    } catch (error) {
      console.error('Error fetching search suggestions:', error);
    }
  }

  async getSuggestions(query) {
    // Check cache first
    const cached = this.getCachedSuggestions(query);
    if (cached) return cached;

    // Fetch from Shopify predictive search API
    const response = await fetch(`/search/suggest.json?q=${encodeURIComponent(query)}&resources[type]=product&resources[limit]=8`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch suggestions');
    }
    
    const data = await response.json();
    
    // Cache the results
    this.setCachedSuggestions(query, data);
    
    return data;
  }

  displaySuggestions(suggestions) {
    // Implementation would depend on UI design
    // This could create a dropdown or update a suggestions section
    console.log('Search suggestions:', suggestions);
  }

  getCachedSuggestions(query) {
    const cached = this.cache.get(query.toLowerCase());
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  setCachedSuggestions(query, data) {
    this.cache.set(query.toLowerCase(), {
      data,
      timestamp: Date.now()
    });
  }
}

// Initialize search suggestions
const searchSuggestions = new SearchSuggestions();

// Utility functions
function debounce(func, wait) {
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

// Theme editor support
if (Shopify && Shopify.designMode) {
  document.addEventListener('shopify:section:select', function(event) {
    const searchForm = event.target.querySelector('search-form');
    if (searchForm) {
      searchForm.focus();
    }
  });
}