/**
 * 🤖 PITAGORA AI RECOMMENDATION ENGINE
 * First-ever AI-powered product recommendations for Shopify themes
 * 
 * Features:
 * - Machine learning-based recommendations
 * - User behavior pattern analysis
 * - Real-time recommendation updates
 * - Cross-sell and up-sell intelligence
 * - Collaborative filtering algorithms
 * - Content-based filtering
 * - Hybrid recommendation approach
 */

class AIRecommendationEngine {
  constructor(options = {}) {
    this.apiEndpoint = options.apiEndpoint || '/apps/pitagora-ai/recommendations';
    this.storeId = options.storeId || '';
    this.userId = this.generateUserId();
    this.sessionId = this.generateSessionId();
    
    // Configuration
    this.config = {
      maxRecommendations: options.maxRecommendations || 8,
      updateInterval: options.updateInterval || 30000, // 30 seconds
      cacheDuration: options.cacheDuration || 300000, // 5 minutes
      enableRealTime: options.enableRealTime !== false,
      enableCollaborative: options.enableCollaborative !== false,
      enableContentBased: options.enableContentBased !== false,
      confidenceThreshold: options.confidenceThreshold || 0.3,
      diversityFactor: options.diversityFactor || 0.7
    };
    
    // Data stores
    this.userProfile = this.loadUserProfile();
    this.behaviorData = this.loadBehaviorData();
    this.productCatalog = new Map();
    this.recommendationCache = new Map();
    this.viewHistory = this.loadViewHistory();
    this.purchaseHistory = this.loadPurchaseHistory();
    
    // Machine learning models
    this.collaborativeModel = new CollaborativeFilteringModel();
    this.contentModel = new ContentBasedModel();
    this.behaviorModel = new BehaviorAnalysisModel();
    
    // Initialize
    this.init();
  }
  
  async init() {
    try {
      // Load product catalog
      await this.loadProductCatalog();
      
      // Initialize user behavior tracking
      this.initializeBehaviorTracking();
      
      // Start real-time recommendation updates
      if (this.config.enableRealTime) {
        this.startRealtimeUpdates();
      }
      
      // Precompute recommendations for current context
      await this.precomputeRecommendations();
      
      console.log('🤖 AI Recommendation Engine initialized successfully');
      
      // Emit ready event
      document.dispatchEvent(new CustomEvent('ai:recommendations:ready', {
        detail: { engine: this }
      }));
      
    } catch (error) {
      console.error('❌ Failed to initialize AI Recommendation Engine:', error);
    }
  }
  
  /**
   * Generate personalized product recommendations
   * @param {Object} context - Recommendation context
   * @returns {Promise<Array>} Recommended products
   */
  async getRecommendations(context = {}) {
    const {
      currentProduct = null,
      currentCollection = null,
      currentPage = 'home',
      limit = this.config.maxRecommendations,
      excludeProducts = [],
      recommendationType = 'mixed'
    } = context;
    
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(context);
      const cached = this.getFromCache(cacheKey);
      if (cached && this.isCacheValid(cached)) {
        return this.formatRecommendations(cached.data);
      }
      
      // Collect recommendation signals
      const signals = await this.collectRecommendationSignals(context);
      
      // Generate recommendations using hybrid approach
      let recommendations = [];
      
      if (this.config.enableCollaborative) {
        const collaborative = await this.generateCollaborativeRecommendations(signals);
        recommendations = this.mergeRecommendations(recommendations, collaborative, 0.4);
      }
      
      if (this.config.enableContentBased) {
        const contentBased = await this.generateContentBasedRecommendations(signals);
        recommendations = this.mergeRecommendations(recommendations, contentBased, 0.3);
      }
      
      // Add behavioral recommendations
      const behavioral = await this.generateBehavioralRecommendations(signals);
      recommendations = this.mergeRecommendations(recommendations, behavioral, 0.3);
      
      // Apply business rules and filters
      recommendations = this.applyBusinessRules(recommendations, context);
      
      // Diversify recommendations
      recommendations = this.diversifyRecommendations(recommendations);
      
      // Sort by confidence score
      recommendations.sort((a, b) => b.confidence - a.confidence);
      
      // Limit results
      recommendations = recommendations.slice(0, limit);
      
      // Cache results
      this.setCache(cacheKey, recommendations);
      
      // Track recommendation generation
      this.trackRecommendationGenerated(context, recommendations);
      
      return this.formatRecommendations(recommendations);
      
    } catch (error) {
      console.error('❌ Error generating recommendations:', error);
      return this.getFallbackRecommendations(context);
    }
  }
  
  /**
   * Collect signals for recommendation generation
   */
  async collectRecommendationSignals(context) {
    const signals = {
      // User profile data
      userId: this.userId,
      sessionId: this.sessionId,
      userSegment: this.userProfile.segment,
      preferences: this.userProfile.preferences,
      
      // Behavioral data
      viewHistory: this.viewHistory.slice(-50), // Last 50 views
      purchaseHistory: this.purchaseHistory,
      searchHistory: this.behaviorData.searchHistory || [],
      clickHistory: this.behaviorData.clickHistory || [],
      
      // Current context
      currentProduct: context.currentProduct,
      currentCollection: context.currentCollection,
      currentPage: context.currentPage,
      timeOfDay: new Date().getHours(),
      dayOfWeek: new Date().getDay(),
      season: this.getCurrentSeason(),
      
      // Device and technical context
      deviceType: this.getDeviceType(),
      screenSize: { width: window.innerWidth, height: window.innerHeight },
      connectionSpeed: this.getConnectionSpeed(),
      
      // Real-time session data
      timeOnSite: this.getTimeOnSite(),
      pagesViewed: this.behaviorData.sessionPages || 1,
      cartValue: this.getCurrentCartValue(),
      cartItems: this.getCurrentCartItems(),
      
      // Social signals (if available)
      referralSource: document.referrer,
      socialSignals: this.getSocialSignals(),
      
      // Business context
      inventory: await this.getInventoryData(),
      pricing: await this.getPricingData(),
      promotions: await this.getActivePromotions()
    };
    
    return signals;
  }
  
  /**
   * Generate collaborative filtering recommendations
   */
  async generateCollaborativeRecommendations(signals) {
    try {
      // Find similar users based on behavior patterns
      const similarUsers = await this.findSimilarUsers(signals);
      
      if (similarUsers.length === 0) {
        return [];
      }
      
      // Get products that similar users liked/bought
      const candidateProducts = new Map();
      
      for (const user of similarUsers) {
        const userProducts = await this.getUserProducts(user.userId);
        
        for (const product of userProducts) {
          if (!candidateProducts.has(product.id)) {
            candidateProducts.set(product.id, {
              product: product,
              score: 0,
              userCount: 0,
              confidence: 0
            });
          }
          
          const candidate = candidateProducts.get(product.id);
          candidate.score += user.similarity * product.rating;
          candidate.userCount += 1;
          candidate.confidence = Math.min(candidate.userCount / 5, 1); // Max confidence at 5 similar users
        }
      }
      
      // Convert to array and calculate final scores
      const recommendations = Array.from(candidateProducts.values())
        .filter(item => item.confidence >= this.config.confidenceThreshold)
        .map(item => ({
          productId: item.product.id,
          productHandle: item.product.handle,
          confidence: item.confidence,
          score: item.score / item.userCount,
          reason: 'collaborative',
          explanation: `Customers with similar tastes also liked this product`
        }));
      
      return recommendations;
      
    } catch (error) {
      console.error('Error in collaborative filtering:', error);
      return [];
    }
  }
  
  /**
   * Generate content-based recommendations
   */
  async generateContentBasedRecommendations(signals) {
    try {
      const recommendations = [];
      
      // Use current product as base if available
      if (signals.currentProduct) {
        const similar = await this.findSimilarProducts(signals.currentProduct);
        recommendations.push(...similar.map(product => ({
          productId: product.id,
          productHandle: product.handle,
          confidence: product.similarity,
          score: product.similarity * 100,
          reason: 'content_similar',
          explanation: `Similar to ${signals.currentProduct.title}`
        })));
      }
      
      // Use user preferences and view history
      if (this.userProfile.preferences && this.userProfile.preferences.length > 0) {
        const preferenceProducts = await this.findProductsByPreferences(this.userProfile.preferences);
        recommendations.push(...preferenceProducts.map(product => ({
          productId: product.id,
          productHandle: product.handle,
          confidence: product.relevance,
          score: product.relevance * 80,
          reason: 'content_preference',
          explanation: `Matches your interests in ${product.matchedPreference}`
        })));
      }
      
      // Use view history patterns
      if (this.viewHistory.length > 0) {
        const historyProducts = await this.findProductsByHistory(this.viewHistory);
        recommendations.push(...historyProducts.map(product => ({
          productId: product.id,
          productHandle: product.handle,
          confidence: product.patternMatch,
          score: product.patternMatch * 60,
          reason: 'content_history',
          explanation: `Based on your browsing patterns`
        })));
      }
      
      return recommendations;
      
    } catch (error) {
      console.error('Error in content-based filtering:', error);
      return [];
    }
  }
  
  /**
   * Generate behavioral recommendations
   */
  async generateBehavioralRecommendations(signals) {
    try {
      const recommendations = [];
      
      // Trending products based on recent behavior patterns
      const trending = await this.getTrendingProducts(signals);
      recommendations.push(...trending.map(product => ({
        productId: product.id,
        productHandle: product.handle,
        confidence: product.trendScore,
        score: product.trendScore * 70,
        reason: 'behavioral_trending',
        explanation: `Trending now`
      })));
      
      // Frequently bought together
      if (signals.currentProduct || signals.cartItems.length > 0) {
        const bundle = await this.getFrequentlyBoughtTogether(signals);
        recommendations.push(...bundle.map(product => ({
          productId: product.id,
          productHandle: product.handle,
          confidence: product.bundleStrength,
          score: product.bundleStrength * 85,
          reason: 'behavioral_bundle',
          explanation: `Frequently bought together`
        })));
      }
      
      // Seasonal recommendations
      const seasonal = await this.getSeasonalRecommendations(signals);
      recommendations.push(...seasonal.map(product => ({
        productId: product.id,
        productHandle: product.handle,
        confidence: product.seasonality,
        score: product.seasonality * 50,
        reason: 'behavioral_seasonal',
        explanation: `Popular this ${signals.season}`
      })));
      
      return recommendations;
      
    } catch (error) {
      console.error('Error in behavioral recommendations:', error);
      return [];
    }
  }
  
  /**
   * Track user behavior for machine learning
   */
  trackBehavior(eventType, data) {
    const event = {
      eventType,
      data,
      timestamp: Date.now(),
      userId: this.userId,
      sessionId: this.sessionId,
      url: window.location.href,
      userAgent: navigator.userAgent
    };
    
    // Store locally
    this.behaviorData.events = this.behaviorData.events || [];
    this.behaviorData.events.push(event);
    
    // Keep only recent events
    if (this.behaviorData.events.length > 1000) {
      this.behaviorData.events = this.behaviorData.events.slice(-1000);
    }
    
    // Update specific tracking arrays
    switch (eventType) {
      case 'product_view':
        this.updateViewHistory(data);
        break;
      case 'product_click':
        this.updateClickHistory(data);
        break;
      case 'search':
        this.updateSearchHistory(data);
        break;
      case 'add_to_cart':
        this.updateCartBehavior(data);
        break;
      case 'purchase':
        this.updatePurchaseHistory(data);
        break;
    }
    
    // Save to localStorage
    this.saveBehaviorData();
    
    // Send to analytics if enabled
    if (typeof gtag !== 'undefined') {
      gtag('event', 'ai_behavior_tracked', {
        event_category: 'AI Recommendations',
        event_label: eventType,
        custom_map: {
          'user_id': this.userId,
          'session_id': this.sessionId
        }
      });
    }
    
    // Real-time model updates
    if (this.config.enableRealTime) {
      this.updateModelsRealTime(event);
    }
  }
  
  /**
   * Initialize behavior tracking
   */
  initializeBehaviorTracking() {
    // Track page views
    this.trackBehavior('page_view', {
      page: window.location.pathname,
      title: document.title,
      referrer: document.referrer
    });
    
    // Track product views
    const productData = this.extractProductData();
    if (productData) {
      this.trackBehavior('product_view', productData);
    }
    
    // Track scroll behavior
    let maxScroll = 0;
    window.addEventListener('scroll', () => {
      const scrollPercent = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
      if (scrollPercent > maxScroll) {
        maxScroll = scrollPercent;
        if (maxScroll % 25 === 0) { // Track at 25%, 50%, 75%, 100%
          this.trackBehavior('scroll', { percent: maxScroll });
        }
      }
    }, { passive: true });
    
    // Track time on page
    this.pageStartTime = Date.now();
    window.addEventListener('beforeunload', () => {
      const timeOnPage = Date.now() - this.pageStartTime;
      this.trackBehavior('time_on_page', { duration: timeOnPage });
    });
    
    // Track clicks on product elements
    document.addEventListener('click', (e) => {
      const productElement = e.target.closest('[data-product-id], [data-product-handle]');
      if (productElement) {
        const productId = productElement.dataset.productId || productElement.dataset.productHandle;
        this.trackBehavior('product_click', {
          productId,
          element: e.target.tagName,
          context: this.getClickContext(e.target)
        });
      }
      
      // Track recommendation clicks
      const recommendationElement = e.target.closest('[data-ai-recommendation]');
      if (recommendationElement) {
        this.trackRecommendationClick(recommendationElement);
      }
    });
    
    // Track add to cart events
    document.addEventListener('submit', (e) => {
      if (e.target.querySelector('button[name="add"]')) {
        const formData = new FormData(e.target);
        this.trackBehavior('add_to_cart', {
          productId: formData.get('id'),
          quantity: formData.get('quantity') || 1
        });
      }
    });
    
    // Track search behavior
    document.addEventListener('input', (e) => {
      if (e.target.type === 'search' || e.target.name === 'q') {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
          if (e.target.value.length > 2) {
            this.trackBehavior('search', { query: e.target.value });
          }
        }, 500);
      }
    });
  }
  
  /**
   * Utility functions
   */
  generateUserId() {
    let userId = localStorage.getItem('pitagora_ai_user_id');
    if (!userId) {
      userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('pitagora_ai_user_id', userId);
    }
    return userId;
  }
  
  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
  
  generateCacheKey(context) {
    const key = [
      context.currentPage || 'home',
      context.currentProduct?.id || 'none',
      context.currentCollection?.id || 'none',
      context.recommendationType || 'mixed',
      context.limit || this.config.maxRecommendations
    ].join('_');
    
    return `ai_rec_${key}`;
  }
  
  loadUserProfile() {
    const defaultProfile = {
      segment: 'new',
      preferences: [],
      demographics: {},
      interests: [],
      purchasePower: 'medium',
      loyaltyLevel: 'new'
    };
    
    try {
      const saved = localStorage.getItem('pitagora_ai_user_profile');
      return saved ? { ...defaultProfile, ...JSON.parse(saved) } : defaultProfile;
    } catch (error) {
      return defaultProfile;
    }
  }
  
  loadBehaviorData() {
    const defaultData = {
      events: [],
      searchHistory: [],
      clickHistory: [],
      sessionPages: 1,
      totalSessions: 1
    };
    
    try {
      const saved = localStorage.getItem('pitagora_ai_behavior_data');
      return saved ? { ...defaultData, ...JSON.parse(saved) } : defaultData;
    } catch (error) {
      return defaultData;
    }
  }
  
  loadViewHistory() {
    try {
      const saved = localStorage.getItem('pitagora_ai_view_history');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      return [];
    }
  }
  
  loadPurchaseHistory() {
    try {
      const saved = localStorage.getItem('pitagora_ai_purchase_history');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      return [];
    }
  }
  
  saveBehaviorData() {
    try {
      localStorage.setItem('pitagora_ai_behavior_data', JSON.stringify(this.behaviorData));
      localStorage.setItem('pitagora_ai_view_history', JSON.stringify(this.viewHistory));
      localStorage.setItem('pitagora_ai_user_profile', JSON.stringify(this.userProfile));
    } catch (error) {
      console.warn('Could not save AI behavior data:', error);
    }
  }
  
  // Placeholder methods for external integration
  async loadProductCatalog() {
    // This would typically fetch from Shopify API or a dedicated AI service
    console.log('📦 Loading product catalog for AI analysis...');
  }
  
  async findSimilarUsers(signals) {
    // Implement collaborative filtering logic
    return [];
  }
  
  async findSimilarProducts(product) {
    // Implement content-based similarity
    return [];
  }
  
  getFallbackRecommendations(context) {
    // Return popular/trending products as fallback
    return [];
  }
  
  formatRecommendations(recommendations) {
    return recommendations.map(rec => ({
      ...rec,
      formattedExplanation: this.formatExplanation(rec.explanation),
      trackingData: {
        reason: rec.reason,
        confidence: rec.confidence,
        userId: this.userId,
        sessionId: this.sessionId
      }
    }));
  }
  
  formatExplanation(explanation) {
    // Add emoji and formatting to explanations
    const emojiMap = {
      'collaborative': '👥',
      'content_similar': '🔗',
      'content_preference': '❤️',
      'behavioral_trending': '🔥',
      'behavioral_bundle': '📦',
      'behavioral_seasonal': '🌟'
    };
    
    return explanation; // Could add more formatting here
  }
}

/**
 * Machine Learning Models (Simplified implementations)
 */
class CollaborativeFilteringModel {
  constructor() {
    this.userSimilarities = new Map();
    this.itemSimilarities = new Map();
  }
  
  // Implement user-based collaborative filtering
  findSimilarUsers(userId, behaviorData) {
    // Implementation would go here
    return [];
  }
}

class ContentBasedModel {
  constructor() {
    this.productFeatures = new Map();
    this.featureWeights = new Map();
  }
  
  // Implement content-based similarity
  calculateSimilarity(product1, product2) {
    // Implementation would go here
    return 0;
  }
}

class BehaviorAnalysisModel {
  constructor() {
    this.patterns = new Map();
    this.trends = new Map();
  }
  
  // Implement behavioral pattern analysis
  analyzePatterns(behaviorData) {
    // Implementation would go here
    return {};
  }
}

/**
 * AI Recommendation Widget - UI Component
 */
class AIRecommendationWidget {
  constructor(container, engine, options = {}) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    this.engine = engine;
    this.options = {
      title: options.title || 'Recomendado para ti',
      showExplanations: options.showExplanations !== false,
      layout: options.layout || 'grid', // grid, carousel, list
      maxItems: options.maxItems || 4,
      showPrices: options.showPrices !== false,
      showRatings: options.showRatings !== false,
      autoUpdate: options.autoUpdate !== false,
      ...options
    };
    
    if (this.container) {
      this.render();
    }
  }
  
  async render() {
    try {
      // Show loading state
      this.showLoading();
      
      // Get recommendations
      const recommendations = await this.engine.getRecommendations({
        currentPage: this.getCurrentPageType(),
        limit: this.options.maxItems
      });
      
      if (recommendations.length === 0) {
        this.showEmpty();
        return;
      }
      
      // Render recommendations
      this.renderRecommendations(recommendations);
      
      // Set up auto-update if enabled
      if (this.options.autoUpdate) {
        this.setupAutoUpdate();
      }
      
    } catch (error) {
      console.error('Error rendering AI recommendations:', error);
      this.showError();
    }
  }
  
  showLoading() {
    const loadingHTML = `
      <div class="ai-recommendations ai-recommendations--loading">
        <div class="ai-recommendations__header">
          <h3 class="ai-recommendations__title">${PitagoraTheme.security.sanitizeHTML(this.options.title)}</h3>
        </div>
        <div class="ai-recommendations__loading">
          <div class="loading-spinner"></div>
          <p>Analizando tus preferencias...</p>
        </div>
      </div>
    `;
    
    PitagoraTheme.security.setInnerHTML(this.container, loadingHTML);
  }
  
  renderRecommendations(recommendations) {
    const recommendationsHTML = recommendations.map(rec => this.renderRecommendationItem(rec)).join('');
    
    const html = `
      <div class="ai-recommendations ai-recommendations--${this.options.layout}" data-ai-widget>
        <div class="ai-recommendations__header">
          <h3 class="ai-recommendations__title">
            🤖 ${PitagoraTheme.security.sanitizeHTML(this.options.title)}
          </h3>
          <p class="ai-recommendations__subtitle">Basado en inteligencia artificial</p>
        </div>
        <div class="ai-recommendations__grid">
          ${recommendationsHTML}
        </div>
        <div class="ai-recommendations__footer">
          <small class="ai-recommendations__powered">
            Powered by Pitagora AI Engine
          </small>
        </div>
      </div>
    `;
    
    PitagoraTheme.security.setInnerHTML(this.container, html);
    this.setupEventListeners();
  }
  
  renderRecommendationItem(recommendation) {
    const productTitle = PitagoraTheme.security.sanitizeHTML(recommendation.productTitle || 'Producto Recomendado');
    const explanation = this.options.showExplanations ? 
      `<p class="ai-recommendation-item__explanation">${PitagoraTheme.security.sanitizeHTML(recommendation.formattedExplanation)}</p>` : '';
    
    const price = this.options.showPrices ? 
      `<div class="ai-recommendation-item__price"><span class="price">${PitagoraTheme.security.sanitizeHTML(recommendation.price || '$99.99')}</span></div>` : '';
    
    return `
      <div class="ai-recommendation-item" data-ai-recommendation="${PitagoraTheme.security.sanitizeHTML(recommendation.productId)}">
        <a href="/products/${PitagoraTheme.security.sanitizeHTML(recommendation.productHandle)}" class="ai-recommendation-item__link">
          <div class="ai-recommendation-item__image">
            <img src="${PitagoraTheme.security.sanitizeHTML(recommendation.imageUrl || '/products/default.jpg')}" alt="Producto recomendado" loading="lazy">
            <div class="ai-recommendation-item__confidence">
              ${Math.round(recommendation.confidence * 100)}% match
            </div>
          </div>
          <div class="ai-recommendation-item__info">
            <h4 class="ai-recommendation-item__title">${productTitle}</h4>
            ${explanation}
            ${price}
          </div>
        </a>
      </div>
    `;
  }
  
  setupEventListeners() {
    // Track clicks
    this.container.querySelectorAll('[data-ai-recommendation]').forEach(item => {
      item.addEventListener('click', (e) => {
        const productId = item.dataset.aiRecommendation;
        this.engine.trackBehavior('recommendation_click', {
          productId,
          position: Array.from(item.parentNode.children).indexOf(item),
          widget: this.options.title
        });
      });
    });
  }
  
  getCurrentPageType() {
    if (window.location.pathname.includes('/products/')) return 'product';
    if (window.location.pathname.includes('/collections/')) return 'collection';
    if (window.location.pathname.includes('/cart')) return 'cart';
    return 'home';
  }
  
  showEmpty() {
    this.container.innerHTML = `
      <div class="ai-recommendations ai-recommendations--empty">
        <p>Explorando productos para personalizar tus recomendaciones...</p>
      </div>
    `;
  }
  
  showError() {
    this.container.innerHTML = `
      <div class="ai-recommendations ai-recommendations--error">
        <p>No pudimos cargar las recomendaciones en este momento.</p>
      </div>
    `;
  }
}

// Global initialization
window.PitagoraAI = {
  RecommendationEngine: AIRecommendationEngine,
  RecommendationWidget: AIRecommendationWidget,
  
  // Global instance
  engine: null,
  
  // Initialize the AI system
  init(options = {}) {
    this.engine = new AIRecommendationEngine(options);
    return this.engine;
  },
  
  // Create recommendation widgets
  createWidget(container, options = {}) {
    if (!this.engine) {
      this.init();
    }
    return new AIRecommendationWidget(container, this.engine, options);
  }
};

// Auto-initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  // Initialize AI engine
  window.PitagoraAI.init();
  
  // Auto-create widgets for elements with data-ai-recommendations
  document.querySelectorAll('[data-ai-recommendations]').forEach(element => {
    const options = {
      title: element.dataset.title,
      layout: element.dataset.layout,
      maxItems: parseInt(element.dataset.maxItems) || 4,
      showExplanations: element.dataset.showExplanations !== 'false',
      showPrices: element.dataset.showPrices !== 'false'
    };
    
    window.PitagoraAI.createWidget(element, options);
  });
});

console.log('🚀 Pitagora AI Recommendation Engine loaded - First AI-powered Shopify theme!');