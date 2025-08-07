if (!customElements.get('newsletter-signup')) {
  class NewsletterSignup extends HTMLElement {
    constructor() {
      super();
      this.form = this.querySelector('.newsletter__form');
      this.emailInput = this.querySelector('input[type="email"]');
      this.nameInput = this.querySelector('input[name="contact[first_name]"]');
      this.submitButton = this.querySelector('.newsletter__submit');
      this.submitText = this.querySelector('.newsletter__submit-text');
      this.submitLoading = this.querySelector('.newsletter__submit-loading');
      this.successMessage = this.querySelector('.newsletter__success');
      this.errorMessage = this.querySelector('.newsletter__error');
      this.errorText = this.querySelector('.newsletter__error-text');
    }

    connectedCallback() {
      this.form?.addEventListener('submit', this.handleSubmit.bind(this));
      this.emailInput?.addEventListener('input', this.handleEmailInput.bind(this));
    }

    async handleSubmit(event) {
      event.preventDefault();
      
      if (!this.validateForm()) return;

      this.setLoadingState(true);
      this.hideMessages();

      try {
        const formData = new FormData(this.form);
        
        const response = await fetch(this.form.action || '/contact', {
          method: 'POST',
          body: formData,
          headers: {
            'X-Requested-With': 'XMLHttpRequest',
          },
        });

        if (response.ok) {
          this.showSuccess();
          this.resetForm();
          
          // Track subscription event
          this.trackSubscription();
        } else {
          const errorData = await response.text();
          this.showError(this.parseErrorMessage(errorData));
        }
      } catch (error) {
        console.error('Newsletter signup error:', error);
        this.showError('Something went wrong. Please try again.');
      } finally {
        this.setLoadingState(false);
      }
    }

    validateForm() {
      let isValid = true;

      // Validate email
      if (!this.emailInput.value || !this.isValidEmail(this.emailInput.value)) {
        this.showError('Please enter a valid email address.');
        this.emailInput.focus();
        return false;
      }

      // Validate name if required
      if (this.nameInput && !this.nameInput.value.trim()) {
        this.showError('Please enter your name.');
        this.nameInput.focus();
        return false;
      }

      return isValid;
    }

    isValidEmail(email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    }

    handleEmailInput(event) {
      // Clear errors on input
      if (this.errorMessage && !this.errorMessage.hidden) {
        this.hideMessages();
      }

      // Real-time validation
      const email = event.target.value;
      if (email && !this.isValidEmail(email)) {
        event.target.setCustomValidity('Please enter a valid email address.');
      } else {
        event.target.setCustomValidity('');
      }
    }

    setLoadingState(loading) {
      this.dataset.loading = loading;
      this.submitButton.disabled = loading;
      
      if (loading) {
        this.submitText.hidden = true;
        this.submitLoading.hidden = false;
      } else {
        this.submitText.hidden = false;
        this.submitLoading.hidden = true;
      }
    }

    showSuccess() {
      this.hideMessages();
      if (this.successMessage) {
        this.successMessage.hidden = false;
        
        // Announce to screen readers
        this.successMessage.setAttribute('aria-live', 'polite');
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
          if (this.successMessage) {
            this.successMessage.hidden = true;
          }
        }, 5000);
      }
    }

    showError(message) {
      this.hideMessages();
      if (this.errorMessage && this.errorText) {
        this.errorText.textContent = message;
        this.errorMessage.hidden = false;
        
        // Announce to screen readers
        this.errorMessage.setAttribute('aria-live', 'assertive');
      }
    }

    hideMessages() {
      if (this.successMessage) {
        this.successMessage.hidden = true;
      }
      if (this.errorMessage) {
        this.errorMessage.hidden = true;
      }
    }

    parseErrorMessage(errorHtml) {
      // Try to extract meaningful error message from Shopify's response
      const parser = new DOMParser();
      const doc = parser.parseFromString(errorHtml, 'text/html');
      const errorElement = doc.querySelector('.errors li, .error-message, [data-error]');
      
      if (errorElement) {
        return errorElement.textContent.trim();
      }
      
      // Default fallback messages
      if (errorHtml.toLowerCase().includes('already')) {
        return 'This email is already subscribed.';
      }
      
      return 'Something went wrong. Please try again.';
    }

    resetForm() {
      this.form?.reset();
      
      // Clear any custom validity
      this.emailInput?.setCustomValidity('');
    }

    trackSubscription() {
      // Google Analytics 4 event
      if (typeof gtag !== 'undefined') {
        gtag('event', 'newsletter_signup', {
          event_category: 'Newsletter',
          event_label: 'Footer Signup',
          value: 1
        });
      }

      // Custom event for other tracking
      document.dispatchEvent(new CustomEvent('newsletter:subscribed', {
        detail: {
          email: this.emailInput?.value,
          name: this.nameInput?.value,
          sectionId: this.getAttribute('data-section-id')
        }
      }));
    }

    // Public methods for external control
    reset() {
      this.resetForm();
      this.hideMessages();
      this.setLoadingState(false);
    }

    getFormData() {
      return {
        email: this.emailInput?.value || '',
        name: this.nameInput?.value || ''
      };
    }
  }

  customElements.define('newsletter-signup', NewsletterSignup);
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
    const newsletter = event.target.querySelector('newsletter-signup');
    if (newsletter) {
      newsletter.reset();
    }
  });

  document.addEventListener('shopify:section:deselect', function(event) {
    const newsletter = event.target.querySelector('newsletter-signup');
    if (newsletter) {
      newsletter.reset();
    }
  });
}