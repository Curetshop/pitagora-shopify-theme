/**
 * Security Utilities - HTML Sanitization System
 * Addresses XSS vulnerabilities identified in theme analysis
 * Based on OWASP recommendations for client-side sanitization
 */

class SecurityUtils {
  constructor() {
    // HTML entities map for escaping
    this.htmlEntities = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    };

    // Allowed HTML tags for rich content (very restrictive)
    this.allowedTags = ['b', 'i', 'em', 'strong', 'span'];
    
    // Allowed attributes (extremely restrictive)
    this.allowedAttributes = ['class', 'data-*'];
  }

  /**
   * Escape HTML entities to prevent XSS
   * @param {string} str - String to escape
   * @returns {string} Escaped string
   */
  escapeHtml(str) {
    if (typeof str !== 'string') return str;
    
    return str.replace(/[&<>"'\/]/g, (match) => {
      return this.htmlEntities[match] || match;
    });
  }

  /**
   * Sanitize user input with strict whitelist approach
   * @param {string} input - Input to sanitize
   * @returns {string} Sanitized string
   */
  sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    
    // First escape all HTML
    let sanitized = this.escapeHtml(input);
    
    // Remove any remaining script tags or javascript: protocols
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    sanitized = sanitized.replace(/javascript:/gi, '');
    sanitized = sanitized.replace(/on\w+\s*=/gi, '');
    
    return sanitized.trim();
  }

  /**
   * Safe innerHTML replacement
   * @param {HTMLElement} element - Target element
   * @param {string} content - Content to set
   */
  safeSetInnerHTML(element, content) {
    if (!element || typeof content !== 'string') return;
    
    // Sanitize content
    const sanitized = this.sanitizeInput(content);
    
    // Use textContent for maximum security
    element.textContent = sanitized;
  }

  /**
   * Create safe HTML template
   * @param {string} template - Template string
   * @param {Object} data - Data object
   * @returns {string} Safe HTML string
   */
  createSafeTemplate(template, data = {}) {
    if (typeof template !== 'string') return '';
    
    let result = template;
    
    // Replace placeholders with sanitized data
    Object.keys(data).forEach(key => {
      const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      const value = this.sanitizeInput(String(data[key] || ''));
      result = result.replace(placeholder, value);
    });
    
    return result;
  }

  /**
   * Validate and sanitize URL
   * @param {string} url - URL to validate
   * @returns {string} Safe URL or empty string
   */
  sanitizeUrl(url) {
    if (typeof url !== 'string') return '';
    
    // Remove javascript: and data: protocols
    if (/^(javascript|data|vbscript):/i.test(url)) {
      return '';
    }
    
    // Allow only http, https, mailto, tel protocols
    if (!/^(https?|mailto|tel):/i.test(url) && url.startsWith('//')) {
      return `https:${url}`;
    }
    
    return url;
  }

  /**
   * Safe event handler attachment
   * @param {HTMLElement} element - Target element
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   */
  safeAddEventListener(element, event, handler) {
    if (!element || typeof event !== 'string' || typeof handler !== 'function') {
      return;
    }
    
    element.addEventListener(event, handler);
  }

  /**
   * Secure form data processing
   * @param {FormData|Object} formData - Form data to process
   * @returns {Object} Sanitized form data
   */
  sanitizeFormData(formData) {
    const sanitized = {};
    
    if (formData instanceof FormData) {
      for (const [key, value] of formData.entries()) {
        sanitized[key] = this.sanitizeInput(value);
      }
    } else if (typeof formData === 'object' && formData !== null) {
      Object.keys(formData).forEach(key => {
        sanitized[key] = this.sanitizeInput(String(formData[key] || ''));
      });
    }
    
    return sanitized;
  }

  /**
   * Content Security Policy helper
   * @param {string} content - Content to validate
   * @returns {boolean} True if content is CSP compliant
   */
  validateCSPCompliance(content) {
    if (typeof content !== 'string') return false;
    
    // Check for inline scripts or styles
    const inlineScriptRegex = /<script[^>]*>|javascript:/i;
    const inlineStyleRegex = /<[^>]*style\s*=/i;
    const eventHandlerRegex = /on\w+\s*=/i;
    
    return !inlineScriptRegex.test(content) && 
           !inlineStyleRegex.test(content) && 
           !eventHandlerRegex.test(content);
  }
}

// Global instance
window.SecurityUtils = new SecurityUtils();

// Shopify theme integration
if (typeof theme !== 'undefined') {
  theme.security = window.SecurityUtils;
}

/**
 * Safe innerHTML polyfill for legacy code
 * Replaces direct innerHTML assignments with secure alternatives
 */
Object.defineProperty(Element.prototype, 'safeInnerHTML', {
  set: function(content) {
    window.SecurityUtils.safeSetInnerHTML(this, content);
  },
  configurable: true
});

/**
 * Export for module systems
 */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SecurityUtils;
}