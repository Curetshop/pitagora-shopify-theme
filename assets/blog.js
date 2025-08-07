/**
 * Blog JavaScript - Pitagora Theme
 * Handles blog search, filtering, and interactions
 */

class BlogSearch {
  constructor() {
    this.form = document.querySelector('.blog-search-form');
    this.input = document.querySelector('.blog-search-form__input');
    this.debounceTimer = null;
    
    if (!this.form || !this.input) return;
    
    this.init();
  }
  
  init() {
    // Handle form submission
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.submitSearch();
    });
    
    // Handle input changes with debouncing
    this.input.addEventListener('input', () => {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        if (this.input.value.length >= 3) {
          this.showSuggestions();
        } else {
          this.hideSuggestions();
        }
      }, 300);
    });
    
    // Close suggestions on outside click
    document.addEventListener('click', (e) => {
      if (!this.form.contains(e.target)) {
        this.hideSuggestions();
      }
    });
  }
  
  submitSearch() {
    const query = this.input.value.trim();
    if (query) {
      window.location.href = `${this.form.action}?q=${encodeURIComponent(query)}`;
    }
  }
  
  async showSuggestions() {
    // In a real implementation, this would fetch suggestions from the search API
    // For now, we'll just show a placeholder
    const suggestionsContainer = this.createSuggestionsContainer();
    suggestionsContainer.innerHTML = '<div class="blog-search-suggestions__loading">Searching...</div>';
  }
  
  hideSuggestions() {
    const container = document.querySelector('.blog-search-suggestions');
    if (container) {
      container.remove();
    }
  }
  
  createSuggestionsContainer() {
    let container = document.querySelector('.blog-search-suggestions');
    
    if (!container) {
      container = document.createElement('div');
      container.className = 'blog-search-suggestions';
      this.form.appendChild(container);
    }
    
    return container;
  }
}

class BlogFilters {
  constructor() {
    this.container = document.querySelector('.blog-template');
    this.categoryLinks = document.querySelectorAll('.blog-categories__link');
    this.tagLinks = document.querySelectorAll('.blog-tags-cloud__tag');
    
    if (!this.container) return;
    
    this.init();
  }
  
  init() {
    // Add loading states to filter links
    [...this.categoryLinks, ...this.tagLinks].forEach(link => {
      link.addEventListener('click', (e) => {
        if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
          this.showLoadingState();
        }
      });
    });
    
    // Handle filter state from URL
    this.highlightActiveFilters();
  }
  
  showLoadingState() {
    this.container.setAttribute('data-loading', 'true');
  }
  
  highlightActiveFilters() {
    const urlParams = new URLSearchParams(window.location.search);
    const activeTag = urlParams.get('tag');
    
    if (activeTag) {
      // Update document title
      const blogTitle = document.querySelector('.blog-header__title');
      if (blogTitle) {
        blogTitle.textContent += ` - ${activeTag}`;
      }
    }
  }
}

class BlogArticleCards {
  constructor() {
    this.cards = document.querySelectorAll('.blog-article-card');
    
    if (!this.cards.length) return;
    
    this.init();
  }
  
  init() {
    // Add intersection observer for animation
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('blog-article-card--visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '50px'
    });
    
    this.cards.forEach(card => {
      observer.observe(card);
    });
    
    // Handle read time calculations
    this.updateReadTimes();
  }
  
  updateReadTimes() {
    // Read times are calculated server-side, but we can add client-side enhancements here
    const readTimeElements = document.querySelectorAll('.blog-article-card__read-time');
    
    readTimeElements.forEach(element => {
      const time = element.textContent.match(/\d+/);
      if (time && parseInt(time[0]) === 1) {
        element.setAttribute('data-read-time', 'short');
      }
    });
  }
}

class BlogSidebar {
  constructor() {
    this.sidebar = document.querySelector('.blog-sidebar');
    this.stickyOffset = 100;
    
    if (!this.sidebar) return;
    
    this.init();
  }
  
  init() {
    // Make sidebar sticky on desktop
    if (window.matchMedia('(min-width: 1024px)').matches) {
      this.enableStickyBehavior();
    }
    
    // Handle tag cloud interactions
    this.initTagCloud();
  }
  
  enableStickyBehavior() {
    let lastScrollY = window.scrollY;
    let ticking = false;
    
    const updateStickyPosition = () => {
      const currentScrollY = window.scrollY;
      const sidebarHeight = this.sidebar.offsetHeight;
      const windowHeight = window.innerHeight;
      
      if (sidebarHeight < windowHeight - this.stickyOffset) {
        this.sidebar.style.position = 'sticky';
        this.sidebar.style.top = `${this.stickyOffset}px`;
      } else {
        // Handle long sidebars
        if (currentScrollY > lastScrollY) {
          // Scrolling down
          this.sidebar.style.position = 'relative';
          this.sidebar.style.top = 'auto';
        } else {
          // Scrolling up
          const maxScroll = sidebarHeight - windowHeight + this.stickyOffset;
          const currentTop = parseInt(this.sidebar.style.top || 0);
          const newTop = Math.min(0, currentTop + (lastScrollY - currentScrollY));
          
          this.sidebar.style.position = 'sticky';
          this.sidebar.style.top = `${Math.max(-maxScroll, newTop)}px`;
        }
      }
      
      lastScrollY = currentScrollY;
      ticking = false;
    };
    
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(updateStickyPosition);
        ticking = true;
      }
    });
  }
  
  initTagCloud() {
    const tags = document.querySelectorAll('.blog-tags-cloud__tag');
    
    // Add hover effect ripple
    tags.forEach(tag => {
      tag.addEventListener('mouseenter', (e) => {
        const ripple = document.createElement('span');
        ripple.className = 'blog-tags-cloud__ripple';
        tag.appendChild(ripple);
        
        setTimeout(() => ripple.remove(), 600);
      });
    });
  }
}

// Initialize blog functionality when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new BlogSearch();
  new BlogFilters();
  new BlogArticleCards();
  new BlogSidebar();
});

// Handle pagination with AJAX (optional enhancement)
class BlogPagination {
  constructor() {
    this.pagination = document.querySelector('.pagination');
    this.grid = document.querySelector('.blog-grid');
    
    if (!this.pagination || !this.grid) return;
    
    this.init();
  }
  
  init() {
    const links = this.pagination.querySelectorAll('a');
    
    links.forEach(link => {
      link.addEventListener('click', async (e) => {
        if (window.history && window.history.pushState) {
          e.preventDefault();
          await this.loadPage(link.href);
        }
      });
    });
    
    // Handle browser back/forward
    window.addEventListener('popstate', () => {
      this.loadPage(window.location.href, false);
    });
  }
  
  async loadPage(url, updateHistory = true) {
    try {
      // Show loading state
      this.grid.style.opacity = '0.5';
      this.grid.style.pointerEvents = 'none';
      
      // Fetch new content
      const response = await fetch(url);
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Extract and update content
      const newGrid = doc.querySelector('.blog-grid');
      const newPagination = doc.querySelector('.pagination');
      
      if (newGrid) {
        this.grid.innerHTML = newGrid.innerHTML;
        
        // Re-initialize article cards for new content
        const cards = new BlogArticleCards();
        
        // Smooth scroll to top
        window.scrollTo({ top: this.grid.offsetTop - 100, behavior: 'smooth' });
      }
      
      if (newPagination) {
        this.pagination.innerHTML = newPagination.innerHTML;
        this.init(); // Re-initialize pagination handlers
      }
      
      // Update URL
      if (updateHistory) {
        window.history.pushState({}, '', url);
      }
      
      // Reset loading state
      this.grid.style.opacity = '1';
      this.grid.style.pointerEvents = 'auto';
      
    } catch (error) {
      console.error('Error loading page:', error);
      // Fallback to normal navigation
      window.location.href = url;
    }
  }
}

// Add CSS for search suggestions
const style = document.createElement('style');
style.textContent = `
  .blog-search-suggestions {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    margin-top: 0.5rem;
    background: var(--color-background);
    border: 1px solid var(--color-border);
    border-radius: var(--border-radius);
    box-shadow: var(--shadow-lg);
    z-index: 100;
    max-height: 40rem;
    overflow-y: auto;
  }
  
  .blog-search-suggestions__loading {
    padding: 2rem;
    text-align: center;
    color: var(--color-foreground-75);
  }
  
  .blog-article-card {
    opacity: 0;
    transform: translateY(2rem);
    transition: opacity 0.6s ease, transform 0.6s ease;
  }
  
  .blog-article-card--visible {
    opacity: 1;
    transform: translateY(0);
  }
  
  .blog-tags-cloud__ripple {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.5);
    transform: translate(-50%, -50%);
    animation: ripple 0.6s ease-out;
    pointer-events: none;
  }
  
  @keyframes ripple {
    to {
      width: 100%;
      height: 100%;
      opacity: 0;
    }
  }
  
  .blog-sidebar[style*="sticky"] {
    transition: top 0.3s ease;
  }
`;
document.head.appendChild(style);

// Initialize pagination if present
document.addEventListener('DOMContentLoaded', () => {
  new BlogPagination();
});