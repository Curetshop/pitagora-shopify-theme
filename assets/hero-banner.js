// Hero Banner JavaScript - Pitagora Theme

class HeroBanner {
  constructor(element) {
    this.element = element;
    this.slides = element.querySelectorAll('.hero-slide');
    this.currentSlide = 0;
    this.autoplay = element.dataset.autoplay === 'true';
    this.autoplayDuration = parseInt(element.dataset.autplayDuration) || 5000;
    this.autoplayTimer = null;
    this.isTransitioning = false;
    
    this.init();
  }
  
  init() {
    if (this.slides.length <= 1) return;
    
    this.createNavigation();
    this.bindEvents();
    
    if (this.autoplay) {
      this.startAutoplay();
    }
  }
  
  createNavigation() {
    // Create navigation dots
    const navigation = document.createElement('div');
    navigation.className = 'hero-banner__navigation';
    
    this.slides.forEach((slide, index) => {
      const dot = document.createElement('button');
      dot.className = `hero-banner__nav-dot${index === 0 ? ' hero-banner__nav-dot--active' : ''}`;
      dot.setAttribute('aria-label', `Go to slide ${index + 1}`);
      dot.addEventListener('click', () => this.goToSlide(index));
      navigation.appendChild(dot);
    });
    
    this.element.appendChild(navigation);
    
    // Create arrow navigation
    if (this.slides.length > 1) {
      const prevArrow = document.createElement('button');
      prevArrow.className = 'hero-banner__arrow hero-banner__arrow--prev';
      prevArrow.setAttribute('aria-label', 'Previous slide');
      prevArrow.innerHTML = '<svg class="hero-banner__arrow-icon" viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>';
      prevArrow.addEventListener('click', () => this.previousSlide());
      
      const nextArrow = document.createElement('button');
      nextArrow.className = 'hero-banner__arrow hero-banner__arrow--next';
      nextArrow.setAttribute('aria-label', 'Next slide');
      nextArrow.innerHTML = '<svg class="hero-banner__arrow-icon" viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>';
      nextArrow.addEventListener('click', () => this.nextSlide());
      
      this.element.appendChild(prevArrow);
      this.element.appendChild(nextArrow);
    }
  }
  
  bindEvents() {
    // Keyboard navigation
    this.element.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') {
        this.previousSlide();
      } else if (e.key === 'ArrowRight') {
        this.nextSlide();
      }
    });
    
    // Pause autoplay on hover
    if (this.autoplay) {
      this.element.addEventListener('mouseenter', () => this.pauseAutoplay());
      this.element.addEventListener('mouseleave', () => this.startAutoplay());
    }
    
    // Touch/swipe support
    let startX = 0;
    let endX = 0;
    
    this.element.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
    });
    
    this.element.addEventListener('touchend', (e) => {
      endX = e.changedTouches[0].clientX;
      this.handleSwipe(startX, endX);
    });
  }
  
  handleSwipe(startX, endX) {
    const threshold = 50;
    const diff = startX - endX;
    
    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        this.nextSlide();
      } else {
        this.previousSlide();
      }
    }
  }
  
  goToSlide(index) {
    if (this.isTransitioning || index === this.currentSlide) return;
    
    this.isTransitioning = true;
    
    // Remove active class from current slide
    this.slides[this.currentSlide].classList.remove('hero-slide--active');
    
    // Update navigation dots
    const dots = this.element.querySelectorAll('.hero-banner__nav-dot');
    dots[this.currentSlide].classList.remove('hero-banner__nav-dot--active');
    dots[index].classList.add('hero-banner__nav-dot--active');
    
    // Add active class to new slide
    this.slides[index].classList.add('hero-slide--active');
    
    // Update current slide
    this.currentSlide = index;
    
    // Reset autoplay timer
    if (this.autoplay) {
      this.resetAutoplay();
    }
    
    // Dispatch custom event
    this.element.dispatchEvent(new CustomEvent('slideChange', {
      detail: { currentSlide: index, totalSlides: this.slides.length }
    }));
    
    // Allow transitions after animation completes
    setTimeout(() => {
      this.isTransitioning = false;
    }, 800);
  }
  
  nextSlide() {
    const nextIndex = (this.currentSlide + 1) % this.slides.length;
    this.goToSlide(nextIndex);
  }
  
  previousSlide() {
    const prevIndex = this.currentSlide === 0 ? this.slides.length - 1 : this.currentSlide - 1;
    this.goToSlide(prevIndex);
  }
  
  startAutoplay() {
    if (!this.autoplay) return;
    
    this.autoplayTimer = setInterval(() => {
      this.nextSlide();
    }, this.autoplayDuration);
  }
  
  pauseAutoplay() {
    if (this.autoplayTimer) {
      clearInterval(this.autoplayTimer);
      this.autoplayTimer = null;
    }
  }
  
  resetAutoplay() {
    this.pauseAutoplay();
    this.startAutoplay();
  }
  
  destroy() {
    this.pauseAutoplay();
    this.element.removeEventListener('keydown', this.handleKeydown);
    this.element.removeEventListener('mouseenter', this.pauseAutoplay);
    this.element.removeEventListener('mouseleave', this.startAutoplay);
  }
}

// Initialize hero banners when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const heroBanners = document.querySelectorAll('hero-banner');
  heroBanners.forEach(banner => {
    new HeroBanner(banner);
  });
});

// Initialize hero banners for dynamically loaded content
document.addEventListener('shopify:section:load', (event) => {
  const heroBanner = event.target.querySelector('hero-banner');
  if (heroBanner) {
    new HeroBanner(heroBanner);
  }
});

// Clean up when sections are unloaded
document.addEventListener('shopify:section:unload', (event) => {
  const heroBanner = event.target.querySelector('hero-banner');
  if (heroBanner && heroBanner.heroBannerInstance) {
    heroBanner.heroBannerInstance.destroy();
  }
}); 