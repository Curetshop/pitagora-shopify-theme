/**
 * Unified Error Handling System
 * Centralizes error management and reporting across the Pitagora theme
 * Based on Cursor analysis recommendations
 */

class ErrorHandler {
  constructor(options = {}) {
    this.debug = options.debug || false;
    this.logToConsole = options.logToConsole !== false;
    this.showUserMessages = options.showUserMessages !== false;
    
    // Error categories
    this.categories = {
      NETWORK: 'network',
      VALIDATION: 'validation', 
      SECURITY: 'security',
      PERFORMANCE: 'performance',
      USER_INPUT: 'user_input',
      SYSTEM: 'system'
    };
    
    // Error levels
    this.levels = {
      INFO: 'info',
      WARNING: 'warning',
      ERROR: 'error',
      CRITICAL: 'critical'
    };
    
    // Initialize error tracking
    this.errorLog = [];
    this.setupGlobalErrorHandling();
  }

  /**
   * Setup global error handling
   */
  setupGlobalErrorHandling() {
    // JavaScript errors
    window.addEventListener('error', (event) => {
      this.handleError({
        message: event.message,
        source: event.filename,
        line: event.lineno,
        column: event.colno,
        error: event.error,
        category: this.categories.SYSTEM,
        level: this.levels.ERROR
      });
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError({
        message: `Unhandled Promise Rejection: ${event.reason}`,
        category: this.categories.SYSTEM,
        level: this.levels.ERROR
      });
      event.preventDefault(); // Prevent console error
    });

    // Network errors (fetch failures)
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        if (!response.ok) {
          this.handleError({
            message: `Network request failed: ${response.status} ${response.statusText}`,
            url: args[0],
            status: response.status,
            category: this.categories.NETWORK,
            level: response.status >= 500 ? this.levels.ERROR : this.levels.WARNING
          });
        }
        return response;
      } catch (error) {
        this.handleError({
          message: `Network request error: ${error.message}`,
          url: args[0],
          error: error,
          category: this.categories.NETWORK,
          level: this.levels.ERROR
        });
        throw error;
      }
    };
  }

  /**
   * Main error handling method
   */
  handleError(errorData) {
    const errorEntry = {
      timestamp: new Date().toISOString(),
      id: this.generateErrorId(),
      ...errorData
    };

    // Add to error log
    this.errorLog.push(errorEntry);

    // Console logging
    if (this.logToConsole) {
      this.logToConsole(errorEntry);
    }

    // User notification for non-system errors
    if (this.showUserMessages && this.shouldShowToUser(errorEntry)) {
      this.showUserError(errorEntry);
    }

    // Debug information
    if (this.debug) {
      console.group('🔍 Error Debug Information');
      console.log('Error Entry:', errorEntry);
      console.log('Stack Trace:', errorEntry.error?.stack);
      console.groupEnd();
    }

    return errorEntry;
  }

  /**
   * Log error to console with appropriate level
   */
  logToConsole(errorEntry) {
    const message = `[${errorEntry.category.toUpperCase()}] ${errorEntry.message}`;
    
    switch (errorEntry.level) {
      case this.levels.INFO:
        console.info('ℹ️', message);
        break;
      case this.levels.WARNING:
        console.warn('⚠️', message);
        break;
      case this.levels.ERROR:
        console.error('❌', message);
        break;
      case this.levels.CRITICAL:
        console.error('🚨', message);
        break;
      default:
        console.log('📝', message);
    }
  }

  /**
   * Determine if error should be shown to user
   */
  shouldShowToUser(errorEntry) {
    return errorEntry.level === this.levels.ERROR || 
           errorEntry.level === this.levels.CRITICAL ||
           errorEntry.category === this.categories.VALIDATION ||
           errorEntry.category === this.categories.USER_INPUT;
  }

  /**
   * Show user-friendly error message
   */
  showUserError(errorEntry) {
    let userMessage = this.getUserFriendlyMessage(errorEntry);
    
    // Use theme toast system if available
    if (window.theme && window.theme.showToast) {
      window.theme.showToast(userMessage, 'error');
    } else {
      // Fallback notification
      this.showFallbackNotification(userMessage);
    }
  }

  /**
   * Get user-friendly error message
   */
  getUserFriendlyMessage(errorEntry) {
    switch (errorEntry.category) {
      case this.categories.NETWORK:
        return 'Connection issue. Please check your internet and try again.';
      case this.categories.VALIDATION:
        return errorEntry.message || 'Please check your input and try again.';
      case this.categories.USER_INPUT:
        return 'Invalid input. Please correct and try again.';
      case this.categories.SECURITY:
        return 'Security error. Please refresh the page and try again.';
      default:
        return 'Something went wrong. Please refresh the page and try again.';
    }
  }

  /**
   * Fallback notification system
   */
  showFallbackNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'error-notification';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #dc2626;
      color: white;
      padding: 1rem;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      z-index: 10000;
      max-width: 300px;
    `;
    
    const messageText = document.createElement('p');
    messageText.textContent = message;
    messageText.style.margin = '0';
    
    notification.appendChild(messageText);
    document.body.appendChild(notification);

    // Auto remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  }

  /**
   * Generate unique error ID
   */
  generateErrorId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }

  /**
   * Validation error helper
   */
  validationError(message, field = null) {
    return this.handleError({
      message: message,
      field: field,
      category: this.categories.VALIDATION,
      level: this.levels.ERROR
    });
  }

  /**
   * Network error helper
   */
  networkError(message, url = null, status = null) {
    return this.handleError({
      message: message,
      url: url,
      status: status,
      category: this.categories.NETWORK,
      level: this.levels.ERROR
    });
  }

  /**
   * Security error helper
   */
  securityError(message, details = null) {
    return this.handleError({
      message: message,
      details: details,
      category: this.categories.SECURITY,
      level: this.levels.CRITICAL
    });
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    const stats = {
      total: this.errorLog.length,
      byCategory: {},
      byLevel: {},
      recent: this.errorLog.slice(-10)
    };

    this.errorLog.forEach(error => {
      stats.byCategory[error.category] = (stats.byCategory[error.category] || 0) + 1;
      stats.byLevel[error.level] = (stats.byLevel[error.level] || 0) + 1;
    });

    return stats;
  }

  /**
   * Clear error log
   */
  clearErrors() {
    this.errorLog = [];
  }
}

// Global instance
window.ErrorHandler = new ErrorHandler({
  debug: window.location.hostname === 'localhost' || window.location.search.includes('debug=true')
});

// Shopify theme integration
if (typeof theme !== 'undefined') {
  theme.errorHandler = window.ErrorHandler;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ErrorHandler;
}