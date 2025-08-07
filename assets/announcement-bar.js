if (!customElements.get('announcement-bar')) {
  class AnnouncementBar extends HTMLElement {
    constructor() {
      super();
      this.closeButton = this.querySelector('[data-close-announcement]');
      this.isDismissible = this.getAttribute('data-dismissible') === 'true';
      this.sectionId = this.getAttribute('data-section-id');
      this.storageKey = `announcement-dismissed-${this.sectionId}`;
    }

    connectedCallback() {
      // Check if already dismissed
      if (this.isDismissible && localStorage.getItem(this.storageKey)) {
        this.style.display = 'none';
        return;
      }

      // Setup close functionality
      if (this.closeButton && this.isDismissible) {
        this.closeButton.addEventListener('click', this.handleClose.bind(this));
      }
    }

    handleClose() {
      // Animate out
      this.setAttribute('data-dismissed', 'true');
      
      // Remove from DOM after animation
      setTimeout(() => {
        this.style.display = 'none';
        
        // Remember dismissal
        if (this.isDismissible) {
          localStorage.setItem(this.storageKey, 'true');
        }
        
        // Dispatch event for layout updates
        document.dispatchEvent(new CustomEvent('announcement:dismissed', {
          detail: { sectionId: this.sectionId }
        }));
      }, 300);
    }

    // Public method to show the bar (e.g., for admin preview)
    show() {
      this.style.display = 'block';
      this.removeAttribute('data-dismissed');
      localStorage.removeItem(this.storageKey);
    }

    // Public method to hide the bar
    hide() {
      this.handleClose();
    }
  }

  customElements.define('announcement-bar', AnnouncementBar);
}

// Utils for theme customizer
if (Shopify && Shopify.designMode) {
  document.addEventListener('shopify:section:select', function(event) {
    const announcementBar = event.target.querySelector('announcement-bar');
    if (announcementBar) {
      announcementBar.show();
    }
  });

  document.addEventListener('shopify:section:deselect', function(event) {
    const announcementBar = event.target.querySelector('announcement-bar');
    if (announcementBar) {
      announcementBar.hide();
    }
  });
}