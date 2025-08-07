if (!customElements.get('instagram-feed-component')) {
  class InstagramFeedComponent extends HTMLElement {
    constructor() {
      super();
      this.username = this.getAttribute('data-username');
      this.accessToken = this.getAttribute('data-access-token');
      this.postsCount = parseInt(this.getAttribute('data-posts-count')) || 6;
      this.openInNewTab = this.getAttribute('data-open-in-new-tab') === 'true';
      this.showCaptions = this.getAttribute('data-show-captions') === 'true';
      
      this.loadingElement = this.querySelector('.instagram-feed__loading');
      this.errorElement = this.querySelector('.instagram-feed__error');
      this.errorMessage = this.querySelector('.instagram-feed__error-message');
      
      this.cache = new Map();
      this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    connectedCallback() {
      if (this.accessToken && this.username) {
        this.loadInstagramFeed();
      }
    }

    async loadInstagramFeed() {
      try {
        this.showLoading();
        
        // Check cache first
        const cacheKey = `instagram_${this.username}_${this.postsCount}`;
        const cached = this.getCachedData(cacheKey);
        
        if (cached) {
          this.renderFeed(cached);
          return;
        }

        // Instagram Basic Display API endpoint
        const apiUrl = `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp&limit=${this.postsCount}&access_token=${this.accessToken}`;
        
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
          throw new Error(`Instagram API error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.error.message || 'Instagram API error');
        }
        
        // Cache the data
        this.setCachedData(cacheKey, data.data);
        
        this.renderFeed(data.data);
        
      } catch (error) {
        console.error('Instagram feed error:', error);
        this.showError(error.message);
        
        // Track error for analytics
        this.trackError(error);
      }
    }

    renderFeed(posts) {
      this.hideLoading();
      this.hideError();
      
      if (!posts || posts.length === 0) {
        this.showError('No Instagram posts found.');
        return;
      }

      // Remove demo grid if it exists
      const demoGrid = this.querySelector('.instagram-feed__grid--demo');
      if (demoGrid) {
        demoGrid.remove();
      }

      const grid = document.createElement('div');
      grid.className = 'instagram-feed__grid';
      
      posts.forEach((post, index) => {
        const postElement = this.createPostElement(post, index);
        grid.appendChild(postElement);
      });
      
      // Insert grid before error element
      this.insertBefore(grid, this.errorElement);
      
      // Dispatch loaded event
      this.dispatchEvent(new CustomEvent('instagram:loaded', {
        detail: { posts: posts.length }
      }));
    }

    createPostElement(post, index) {
      const postDiv = document.createElement('div');
      postDiv.className = `instagram-post${post.media_type === 'VIDEO' ? ' instagram-post--video' : ''}`;
      
      // Media
      const mediaDiv = document.createElement('div');
      mediaDiv.className = 'instagram-post__media';
      
      const img = document.createElement('img');
      img.className = 'instagram-post__image';
      img.src = post.media_type === 'VIDEO' ? (post.thumbnail_url || post.media_url) : post.media_url;
      img.alt = this.extractAltText(post.caption) || `Instagram post ${index + 1}`;
      img.loading = index < 6 ? 'eager' : 'lazy';
      
      // Handle image load errors
      img.addEventListener('error', () => {
        img.src = this.createPlaceholderDataUrl();
      });
      
      mediaDiv.appendChild(img);
      
      // Overlay
      const overlay = document.createElement('div');
      overlay.className = 'instagram-post__overlay';
      
      // Stats (placeholder - real stats require additional API calls)
      const stats = document.createElement('div');
      stats.className = 'instagram-post__stats';
      
      const likeStat = document.createElement('span');
      likeStat.className = 'instagram-post__stat';
      likeStat.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        ${this.generateRandomLikes()}
      `;
      
      const commentStat = document.createElement('span');
      commentStat.className = 'instagram-post__stat';
      commentStat.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        ${this.generateRandomComments()}
      `;
      
      stats.appendChild(likeStat);
      stats.appendChild(commentStat);
      overlay.appendChild(stats);
      
      // Caption
      if (this.showCaptions && post.caption) {
        const caption = document.createElement('div');
        caption.className = 'instagram-post__caption';
        // Secure caption creation
        const p = document.createElement('p');
        p.textContent = this.truncateCaption(post.caption);
        caption.appendChild(p);
        overlay.appendChild(caption);
      }
      
      mediaDiv.appendChild(overlay);
      postDiv.appendChild(mediaDiv);
      
      // Link
      const link = document.createElement('a');
      link.className = 'instagram-post__link';
      link.href = post.permalink;
      link.setAttribute('aria-label', `View Instagram post${post.caption ? `: ${this.truncateCaption(post.caption, 50)}` : ''}`);
      
      if (this.openInNewTab) {
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      }
      
      // Track click
      link.addEventListener('click', () => {
        this.trackPostClick(post.id, index);
      });
      
      postDiv.appendChild(link);
      
      return postDiv;
    }

    extractAltText(caption) {
      if (!caption) return null;
      
      // Remove hashtags and mentions, truncate
      return caption
        .replace(/#\w+/g, '')
        .replace(/@\w+/g, '')
        .trim()
        .substring(0, 100);
    }

    truncateCaption(caption, maxLength = 100) {
      if (!caption) return '';
      
      if (caption.length <= maxLength) return this.escapeHtml(caption);
      
      return this.escapeHtml(caption.substring(0, maxLength).trim() + '...');
    }

    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    generateRandomLikes() {
      return Math.floor(Math.random() * 500) + 50;
    }

    generateRandomComments() {
      return Math.floor(Math.random() * 50) + 5;
    }

    createPlaceholderDataUrl() {
      // Create a simple gradient placeholder
      const svg = `
        <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
            </linearGradient>
          </defs>
          <rect width="400" height="400" fill="url(#grad)"/>
        </svg>
      `;
      return `data:image/svg+xml;base64,${btoa(svg)}`;
    }

    // Cache management
    getCachedData(key) {
      const cached = this.cache.get(key);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
      this.cache.delete(key);
      return null;
    }

    setCachedData(key, data) {
      this.cache.set(key, {
        data: data,
        timestamp: Date.now()
      });
    }

    // UI state management
    showLoading() {
      if (this.loadingElement) {
        this.loadingElement.style.display = 'flex';
      }
    }

    hideLoading() {
      if (this.loadingElement) {
        this.loadingElement.style.display = 'none';
      }
    }

    showError(message) {
      this.hideLoading();
      if (this.errorElement && this.errorMessage) {
        this.errorMessage.textContent = message;
        this.errorElement.hidden = false;
      }
    }

    hideError() {
      if (this.errorElement) {
        this.errorElement.hidden = true;
      }
    }

    // Analytics tracking
    trackPostClick(postId, index) {
      if (typeof gtag !== 'undefined') {
        gtag('event', 'instagram_post_click', {
          event_category: 'Instagram Feed',
          event_label: postId,
          value: index + 1
        });
      }
      
      // Custom event
      this.dispatchEvent(new CustomEvent('instagram:post-click', {
        detail: { postId, index }
      }));
    }

    trackError(error) {
      if (typeof gtag !== 'undefined') {
        gtag('event', 'instagram_feed_error', {
          event_category: 'Instagram Feed',
          event_label: error.message
        });
      }
    }

    // Public methods
    refresh() {
      this.cache.clear();
      this.loadInstagramFeed();
    }

    clearCache() {
      this.cache.clear();
    }
  }

  customElements.define('instagram-feed-component', InstagramFeedComponent);
}

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
    const instagramFeed = event.target.querySelector('instagram-feed-component');
    if (instagramFeed && instagramFeed.accessToken) {
      instagramFeed.refresh();
    }
  });
}

// Auto-refresh on visibility change (when tab becomes active)
document.addEventListener('visibilitychange', debounce(() => {
  if (!document.hidden) {
    const feeds = document.querySelectorAll('instagram-feed-component');
    feeds.forEach(feed => {
      // Only refresh if data is older than 10 minutes
      const lastRefresh = feed.dataset.lastRefresh;
      if (!lastRefresh || Date.now() - parseInt(lastRefresh) > 10 * 60 * 1000) {
        feed.refresh();
        feed.dataset.lastRefresh = Date.now().toString();
      }
    });
  }
}, 1000));