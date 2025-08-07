/**
 * 404 Page functionality for Pitagora Theme
 * Handles search, back button, and interactive elements
 */

document.addEventListener('DOMContentLoaded', function() {
  // Handle back button functionality
  const backButton = document.querySelector('.error-404-back-button');
  if (backButton) {
    backButton.addEventListener('click', function() {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = '/';
      }
    });
  }

  // Enhanced search functionality
  const searchForm = document.querySelector('.error-404-search-form');
  const searchInput = document.querySelector('.error-404-search-form__input');
  const searchSubmit = document.querySelector('.error-404-search-form__submit');

  if (searchForm && searchInput && searchSubmit) {
    // Auto-focus search input on desktop
    if (window.innerWidth >= 768 && !('ontouchstart' in window)) {
      setTimeout(() => {
        searchInput.focus();
      }, 500);
    }

    // Add search suggestions (if available)
    setupSearchSuggestions(searchInput);

    // Enhance search submit button
    searchSubmit.addEventListener('click', function(e) {
      const query = searchInput.value.trim();
      if (!query) {
        e.preventDefault();
        searchInput.focus();
        searchInput.classList.add('shake');
        setTimeout(() => {
          searchInput.classList.remove('shake');
        }, 500);
      }
    });
  }

  // Track 404 page for analytics
  track404Page();

  // Initialize interactive elements
  initializeInteractiveElements();

  // Setup popular products tracking
  trackPopularProductClicks();
});

function setupSearchSuggestions(searchInput) {
  let suggestionsTimeout;
  
  searchInput.addEventListener('input', function() {
    clearTimeout(suggestionsTimeout);
    const query = this.value.trim();
    
    if (query.length >= 2) {
      suggestionsTimeout = setTimeout(() => {
        fetchSearchSuggestions(query, searchInput);
      }, 300);
    } else {
      hideSuggestions();
    }
  });

  // Hide suggestions when clicking outside
  document.addEventListener('click', function(e) {
    if (!searchInput.contains(e.target)) {
      hideSuggestions();
    }
  });
}

async function fetchSearchSuggestions(query, searchInput) {
  try {
    const response = await fetch(`/search/suggest.json?q=${encodeURIComponent(query)}&resources[type]=product,article,page&resources[limit]=5`);
    
    if (!response.ok) return;
    
    const data = await response.json();
    displaySuggestions(data, searchInput);
  } catch (error) {
    console.warn('Error fetching search suggestions:', error);
  }
}

function displaySuggestions(data, searchInput) {
  hideSuggestions(); // Remove existing suggestions
  
  const suggestions = [];
  
  // Add product suggestions
  if (data.resources.results.products) {
    data.resources.results.products.forEach(product => {
      suggestions.push({
        title: product.title,
        url: product.url,
        type: 'product',
        image: product.featured_image
      });
    });
  }

  // Add article suggestions
  if (data.resources.results.articles) {
    data.resources.results.articles.forEach(article => {
      suggestions.push({
        title: article.title,
        url: article.url,
        type: 'article'
      });
    });
  }

  // Add page suggestions
  if (data.resources.results.pages) {
    data.resources.results.pages.forEach(page => {
      suggestions.push({
        title: page.title,
        url: page.url,
        type: 'page'
      });
    });
  }

  if (suggestions.length > 0) {
    createSuggestionsDropdown(suggestions, searchInput);
  }
}

function createSuggestionsDropdown(suggestions, searchInput) {
  const dropdown = document.createElement('div');
  dropdown.className = 'error-404-search-suggestions';
  
  suggestions.forEach((suggestion, index) => {
    const item = document.createElement('a');
    item.className = 'error-404-search-suggestion';
    item.href = suggestion.url;
    item.innerHTML = `
      <div class="error-404-search-suggestion__content">
        <span class="error-404-search-suggestion__title">${suggestion.title}</span>
        <span class="error-404-search-suggestion__type">${suggestion.type}</span>
      </div>
    `;
    
    // Add keyboard navigation
    item.addEventListener('keydown', function(e) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = this.nextElementSibling || dropdown.firstElementChild;
        next.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = this.previousElementSibling || dropdown.lastElementChild;
        prev.focus();
      } else if (e.key === 'Escape') {
        hideSuggestions();
        searchInput.focus();
      }
    });
    
    dropdown.appendChild(item);
  });
  
  // Position dropdown
  const inputWrapper = searchInput.closest('.error-404-search-form__input-wrapper');
  inputWrapper.style.position = 'relative';
  inputWrapper.appendChild(dropdown);
  
  // Add keyboard navigation for search input
  searchInput.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const firstSuggestion = dropdown.querySelector('.error-404-search-suggestion');
      if (firstSuggestion) firstSuggestion.focus();
    }
  });
}

function hideSuggestions() {
  const existingSuggestions = document.querySelector('.error-404-search-suggestions');
  if (existingSuggestions) {
    existingSuggestions.remove();
  }
}

function track404Page() {
  // Track 404 page view for analytics
  if (typeof gtag !== 'undefined') {
    gtag('event', 'page_view', {
      page_title: '404 - Page Not Found',
      page_location: window.location.href,
      custom_parameter: 'error_page'
    });
  }

  // Track the original URL that caused the 404
  const originalUrl = document.referrer || window.location.href;
  console.info('404 Error - Original URL:', originalUrl);

  // Send to analytics if available
  if (typeof analytics !== 'undefined' && analytics.track) {
    analytics.track('404 Error', {
      url: window.location.href,
      referrer: document.referrer,
      timestamp: new Date().toISOString()
    });
  }
}

function initializeInteractiveElements() {
  // Add hover effects to popular pages
  const popularLinks = document.querySelectorAll('.error-404-popular-pages__link');
  popularLinks.forEach(link => {
    link.addEventListener('mouseenter', function() {
      this.style.transform = 'translateX(0.5rem)';
    });
    
    link.addEventListener('mouseleave', function() {
      this.style.transform = '';
    });
  });

  // Add click tracking to popular pages
  popularLinks.forEach(link => {
    link.addEventListener('click', function() {
      const linkText = this.textContent.trim();
      trackEvent('404_popular_page_click', { page: linkText });
    });
  });

  // Add interactive effects to contact info
  const contactLinks = document.querySelectorAll('.error-404-contact-info__link');
  contactLinks.forEach(link => {
    link.addEventListener('click', function() {
      const contactType = this.href.includes('mailto:') ? 'email' : 'phone';
      trackEvent('404_contact_click', { type: contactType });
    });
  });
}

function trackPopularProductClicks() {
  const productLinks = document.querySelectorAll('.error-404-product a');
  productLinks.forEach(link => {
    link.addEventListener('click', function() {
      const productTitle = this.textContent.trim() || 
                          this.querySelector('img')?.alt || 
                          'Unknown Product';
      trackEvent('404_product_click', { product: productTitle });
    });
  });
}

function trackEvent(eventName, parameters = {}) {
  // Google Analytics 4
  if (typeof gtag !== 'undefined') {
    gtag('event', eventName, parameters);
  }

  // Generic analytics
  if (typeof analytics !== 'undefined' && analytics.track) {
    analytics.track(eventName, parameters);
  }

  console.info('Event tracked:', eventName, parameters);
}

// Add CSS for search suggestions and animations
const style = document.createElement('style');
style.textContent = `
  .error-404-search-suggestions {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: var(--color-background);
    border: 1px solid var(--color-border);
    border-top: none;
    border-radius: 0 0 var(--border-radius-lg) var(--border-radius-lg);
    box-shadow: var(--shadow-lg);
    z-index: 10;
    max-height: 30rem;
    overflow-y: auto;
  }
  
  .error-404-search-suggestion {
    display: block;
    padding: 1.2rem 1.5rem;
    text-decoration: none;
    color: var(--color-foreground);
    border-bottom: 1px solid var(--color-border);
    transition: background-color 0.15s ease;
  }
  
  .error-404-search-suggestion:last-child {
    border-bottom: none;
  }
  
  .error-404-search-suggestion:hover,
  .error-404-search-suggestion:focus {
    background: var(--color-background-2);
    outline: none;
  }
  
  .error-404-search-suggestion__content {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .error-404-search-suggestion__title {
    font-size: 1.4rem;
    font-weight: 500;
  }
  
  .error-404-search-suggestion__type {
    font-size: 1.2rem;
    color: var(--color-foreground-75);
    text-transform: capitalize;
    background: rgba(var(--color-primary), 0.1);
    padding: 0.2rem 0.8rem;
    border-radius: var(--border-radius);
  }
  
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-0.5rem); }
    75% { transform: translateX(0.5rem); }
  }
  
  .error-404-search-form__input.shake {
    animation: shake 0.5s ease-in-out;
    border-color: #ef4444;
  }
  
  .error-404-popular-pages__link {
    transition: transform 0.15s ease, padding-left 0.15s ease;
  }
  
  @media (max-width: 767px) {
    .error-404-search-suggestions {
      max-height: 25rem;
    }
    
    .error-404-search-suggestion {
      padding: 1rem 1.2rem;
    }
    
    .error-404-search-suggestion__content {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }
  }
`;
document.head.appendChild(style);