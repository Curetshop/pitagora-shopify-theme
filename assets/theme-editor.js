// Pitagora Theme - Theme Editor JavaScript
// Handles real-time updates in Shopify Theme Customizer

(function() {
  'use strict';

  // Theme Editor utilities
  const ThemeEditor = {
    init() {
      if (window.Shopify && window.Shopify.designMode) {
        this.initSectionReloading();
        this.initSettingsUpdates();
        console.log('🎨 Theme Editor initialized');
      }
    },

    // Handle section reloading in theme customizer
    initSectionReloading() {
      document.addEventListener('shopify:section:load', (event) => {
        const section = event.target;
        this.reinitializeSection(section);
      });

      document.addEventListener('shopify:section:unload', (event) => {
        // Cleanup any event listeners or timers
        this.cleanupSection(event.target);
      });

      document.addEventListener('shopify:section:select', (event) => {
        // Scroll to section when selected in customizer
        event.target.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      });

      document.addEventListener('shopify:section:deselect', (event) => {
        // Handle deselection if needed
      });

      document.addEventListener('shopify:block:select', (event) => {
        const block = event.target;
        
        // Handle specific block selections
        if (block.classList.contains('testimonial-block')) {
          this.selectTestimonial(block);
        } else if (block.classList.contains('slide-block')) {
          this.selectSlide(block);
        }
      });
    },

    // Reinitialize JavaScript for reloaded sections
    reinitializeSection(section) {
      // Reinitialize custom elements
      const customElements = section.querySelectorAll('[data-custom-element]');
      customElements.forEach(element => {
        if (element.connectedCallback) {
          element.connectedCallback();
        }
      });

      // Reinitialize specific components
      if (section.querySelector('.hero-banner')) {
        this.initHeroBanner(section);
      }

      if (section.querySelector('.testimonials-carousel')) {
        this.initTestimonials(section);
      }

      if (section.querySelector('.newsletter-signup')) {
        this.initNewsletter(section);
      }

      if (section.querySelector('.announcement-bar')) {
        this.initAnnouncementBar(section);
      }
    },

    // Cleanup section resources
    cleanupSection(section) {
      // Clear any intervals or timeouts
      const intervals = section.querySelectorAll('[data-interval-id]');
      intervals.forEach(element => {
        const intervalId = element.dataset.intervalId;
        if (intervalId) {
          clearInterval(parseInt(intervalId));
        }
      });

      // Remove event listeners
      const elements = section.querySelectorAll('[data-event-listeners]');
      elements.forEach(element => {
        element.replaceWith(element.cloneNode(true));
      });
    },

    // Handle settings updates
    initSettingsUpdates() {
      document.addEventListener('shopify:theme_editor:setting_changed', (event) => {
        const settingName = event.detail.setting_name;
        const value = event.detail.value;

        this.handleSettingChange(settingName, value);
      });
    },

    // Handle individual setting changes
    handleSettingChange(settingName, value) {
      switch (settingName) {
        case 'color_primary':
          this.updatePrimaryColor(value);
          break;
        case 'color_secondary':
          this.updateSecondaryColor(value);
          break;
        case 'font_heading':
          this.updateHeadingFont(value);
          break;
        case 'font_body':
          this.updateBodyFont(value);
          break;
        case 'enable_sticky_header':
          this.toggleStickyHeader(value);
          break;
        default:
          // Handle other settings
          break;
      }
    },

    // Color updates
    updatePrimaryColor(color) {
      document.documentElement.style.setProperty('--color-primary', this.hexToRgb(color));
    },

    updateSecondaryColor(color) {
      document.documentElement.style.setProperty('--color-secondary', this.hexToRgb(color));
    },

    // Font updates
    updateHeadingFont(fontFamily) {
      document.documentElement.style.setProperty('--font-family-heading', fontFamily);
    },

    updateBodyFont(fontFamily) {
      document.documentElement.style.setProperty('--font-family-base', fontFamily);
    },

    // Header settings
    toggleStickyHeader(enabled) {
      const header = document.querySelector('.site-header');
      if (header) {
        header.classList.toggle('header--sticky', enabled);
      }
    },

    // Component-specific initializations
    initHeroBanner(section) {
      const heroBanner = section.querySelector('hero-banner');
      if (heroBanner && heroBanner.restart) {
        heroBanner.restart();
      }
    },

    initTestimonials(section) {
      const testimonials = section.querySelector('testimonials-carousel');
      if (testimonials && testimonials.restart) {
        testimonials.restart();
      }
    },

    initNewsletter(section) {
      const newsletter = section.querySelector('newsletter-signup');
      if (newsletter && newsletter.resetForm) {
        newsletter.resetForm();
      }
    },

    initAnnouncementBar(section) {
      const announcementBar = section.querySelector('announcement-bar');
      if (announcementBar) {
        // Reset dismissal state in theme editor
        localStorage.removeItem('announcement-bar-dismissed');
        announcementBar.style.display = 'block';
      }
    },

    // Block-specific selections
    selectTestimonial(block) {
      const carousel = block.closest('.testimonials-carousel');
      if (carousel) {
        const index = Array.from(block.parentNode.children).indexOf(block);
        const customElement = carousel.querySelector('testimonials-carousel');
        if (customElement && customElement.goToSlide) {
          customElement.goToSlide(index);
        }
      }
    },

    selectSlide(block) {
      const slideshow = block.closest('.hero-banner');
      if (slideshow) {
        const index = Array.from(block.parentNode.children).indexOf(block);
        const customElement = slideshow.querySelector('hero-banner');
        if (customElement && customElement.goToSlide) {
          customElement.goToSlide(index);
        }
      }
    },

    // Utility functions
    hexToRgb(hex) {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? 
        `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : 
        null;
    }
  };

  // Initialize theme editor
  ThemeEditor.init();

  // Make available globally for debugging
  window.ThemeEditor = ThemeEditor;

})();