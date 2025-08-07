if (!customElements.get('testimonials-carousel')) {
  class TestimonialsCarousel extends HTMLElement {
    constructor() {
      super();
      this.currentSlide = 0;
      this.totalSlides = 0;
      this.isAutoplay = this.getAttribute('data-autoplay') === 'true';
      this.autoplayDuration = parseInt(this.getAttribute('data-autoplay-duration')) * 1000 || 5000;
      this.layout = this.getAttribute('data-layout') || 'carousel';
      this.autoplayTimer = null;
      
      this.slidesContainer = this.querySelector('.testimonials__slides');
      this.slides = this.querySelectorAll('.testimonial-card');
      this.prevButton = this.querySelector('.testimonials__nav-button--prev');
      this.nextButton = this.querySelector('.testimonials__nav-button--next');
      this.paginationBullets = this.querySelectorAll('.testimonials__pagination-bullet');
      
      this.totalSlides = this.slides.length;
    }

    connectedCallback() {
      if (this.layout !== 'carousel') return;
      
      this.initializeCarousel();
      this.setupEventListeners();
      
      if (this.isAutoplay && this.totalSlides > 1) {
        this.startAutoplay();
      }
      
      // Pause autoplay on hover
      this.addEventListener('mouseenter', () => this.stopAutoplay());
      this.addEventListener('mouseleave', () => {
        if (this.isAutoplay) this.startAutoplay();
      });
      
      // Pause autoplay on focus within
      this.addEventListener('focusin', () => this.stopAutoplay());
      this.addEventListener('focusout', () => {
        if (this.isAutoplay) this.startAutoplay();
      });
    }

    disconnectedCallback() {
      this.stopAutoplay();
    }

    initializeCarousel() {
      if (this.totalSlides <= 1) {
        this.hideNavigation();
        return;
      }
      
      this.updateSlideVisibility();
      this.updateNavigation();
      this.updatePagination();
    }

    setupEventListeners() {
      // Navigation buttons
      this.prevButton?.addEventListener('click', () => this.goToPreviousSlide());
      this.nextButton?.addEventListener('click', () => this.goToNextSlide());
      
      // Pagination bullets
      this.paginationBullets.forEach((bullet, index) => {
        bullet.addEventListener('click', () => this.goToSlide(index));
      });
      
      // Keyboard navigation
      this.addEventListener('keydown', this.handleKeydown.bind(this));
      
      // Touch/Swipe support
      this.setupTouchEvents();
    }

    setupTouchEvents() {
      let startX = 0;
      let currentX = 0;
      let isDragging = false;
      
      this.slidesContainer?.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        isDragging = true;
        this.stopAutoplay();
      }, { passive: true });
      
      this.slidesContainer?.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        currentX = e.touches[0].clientX;
      }, { passive: true });
      
      this.slidesContainer?.addEventListener('touchend', () => {
        if (!isDragging) return;
        
        const difference = startX - currentX;
        const threshold = 50;
        
        if (Math.abs(difference) > threshold) {
          if (difference > 0) {
            this.goToNextSlide();
          } else {
            this.goToPreviousSlide();
          }
        }
        
        isDragging = false;
        if (this.isAutoplay) {
          setTimeout(() => this.startAutoplay(), 1000);
        }
      });
    }

    handleKeydown(event) {
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          this.goToPreviousSlide();
          break;
        case 'ArrowRight':
          event.preventDefault();
          this.goToNextSlide();
          break;
        case 'Home':
          event.preventDefault();
          this.goToSlide(0);
          break;
        case 'End':
          event.preventDefault();
          this.goToSlide(this.totalSlides - 1);
          break;
      }
    }

    goToNextSlide() {
      this.currentSlide = (this.currentSlide + 1) % this.totalSlides;
      this.updateCarousel();
    }

    goToPreviousSlide() {
      this.currentSlide = (this.currentSlide - 1 + this.totalSlides) % this.totalSlides;
      this.updateCarousel();
    }

    goToSlide(index) {
      if (index >= 0 && index < this.totalSlides) {
        this.currentSlide = index;
        this.updateCarousel();
      }
    }

    updateCarousel() {
      this.updateSlidePosition();
      this.updateSlideVisibility();
      this.updateNavigation();
      this.updatePagination();
      
      // Announce slide change to screen readers
      this.announceSlideChange();
      
      // Dispatch custom event
      this.dispatchEvent(new CustomEvent('testimonial:changed', {
        detail: { 
          currentSlide: this.currentSlide,
          totalSlides: this.totalSlides 
        }
      }));
    }

    updateSlidePosition() {
      if (!this.slidesContainer) return;
      
      const slideWidth = 100;
      const translateX = -this.currentSlide * slideWidth / this.getSlidesPerView();
      
      this.slidesContainer.style.transform = `translateX(${translateX}%)`;
    }

    getSlidesPerView() {
      const width = window.innerWidth;
      if (width >= 1024) return 3;
      if (width >= 768) return 2;
      return 1;
    }

    updateSlideVisibility() {
      this.slides.forEach((slide, index) => {
        slide.classList.toggle('testimonial-card--active', index === this.currentSlide);
        slide.setAttribute('aria-hidden', index !== this.currentSlide);
        
        if (index === this.currentSlide) {
          slide.removeAttribute('tabindex');
        } else {
          slide.setAttribute('tabindex', '-1');
        }
      });
    }

    updateNavigation() {
      if (this.prevButton) {
        this.prevButton.disabled = this.totalSlides <= 1;
      }
      
      if (this.nextButton) {
        this.nextButton.disabled = this.totalSlides <= 1;
      }
    }

    updatePagination() {
      this.paginationBullets.forEach((bullet, index) => {
        bullet.classList.toggle('testimonials__pagination-bullet--active', index === this.currentSlide);
        bullet.setAttribute('aria-current', index === this.currentSlide ? 'true' : 'false');
      });
    }

    hideNavigation() {
      const navigation = this.querySelector('.testimonials__navigation');
      const pagination = this.querySelector('.testimonials__pagination');
      
      if (navigation) navigation.style.display = 'none';
      if (pagination) pagination.style.display = 'none';
    }

    announceSlideChange() {
      const currentSlide = this.slides[this.currentSlide];
      if (currentSlide) {
        const quote = currentSlide.querySelector('.testimonial-card__quote');
        const author = currentSlide.querySelector('.testimonial-card__author-name');
        
        if (quote && author) {
          const announcement = `${quote.textContent.trim()} by ${author.textContent.trim()}`;
          this.announceToScreenReader(announcement);
        }
      }
    }

    announceToScreenReader(message) {
      const announcement = document.createElement('div');
      announcement.setAttribute('aria-live', 'polite');
      announcement.setAttribute('aria-atomic', 'true');
      announcement.className = 'visually-hidden';
      announcement.textContent = message;
      
      document.body.appendChild(announcement);
      
      setTimeout(() => {
        document.body.removeChild(announcement);
      }, 1000);
    }

    startAutoplay() {
      if (!this.isAutoplay || this.totalSlides <= 1) return;
      
      this.stopAutoplay();
      this.autoplayTimer = setInterval(() => {
        this.goToNextSlide();
      }, this.autoplayDuration);
    }

    stopAutoplay() {
      if (this.autoplayTimer) {
        clearInterval(this.autoplayTimer);
        this.autoplayTimer = null;
      }
    }

    // Public methods
    play() {
      this.isAutoplay = true;
      this.startAutoplay();
    }

    pause() {
      this.isAutoplay = false;
      this.stopAutoplay();
    }

    next() {
      this.goToNextSlide();
    }

    previous() {
      this.goToPreviousSlide();
    }

    goto(index) {
      this.goToSlide(index);
    }
  }

  customElements.define('testimonials-carousel', TestimonialsCarousel);
}

// Utility function for responsive behavior
function handleTestimonialsResize() {
  const testimonials = document.querySelectorAll('testimonials-carousel');
  testimonials.forEach(testimonial => {
    if (testimonial.layout === 'carousel') {
      testimonial.updateSlidePosition();
    }
  });
}

// Debounced resize handler
let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(handleTestimonialsResize, 150);
});

// Theme editor support
if (Shopify && Shopify.designMode) {
  document.addEventListener('shopify:section:select', function(event) {
    const testimonials = event.target.querySelector('testimonials-carousel');
    if (testimonials) {
      testimonials.pause();
    }
  });

  document.addEventListener('shopify:section:deselect', function(event) {
    const testimonials = event.target.querySelector('testimonials-carousel');
    if (testimonials && testimonials.isAutoplay) {
      testimonials.play();
    }
  });

  document.addEventListener('shopify:block:select', function(event) {
    const testimonials = event.target.closest('testimonials-carousel');
    if (testimonials) {
      const blockIndex = Array.from(event.target.parentNode.children).indexOf(event.target);
      testimonials.goto(blockIndex);
      testimonials.pause();
    }
  });
}