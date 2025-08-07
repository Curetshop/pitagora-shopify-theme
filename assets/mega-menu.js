/**
 * Mega Menu Component
 * Advanced navigation system with hover/click triggers and accessibility
 */

class MegaMenu {
  constructor(container) {
    this.container = container;
    this.trigger = container.dataset.megaMenuTrigger || 'hover';
    this.style = container.dataset.megaMenuStyle || 'full-width';
    this.menuItems = container.querySelectorAll('.mega-menu__item.has-mega-panel');
    this.activeItem = null;
    this.closeTimeout = null;
    
    this.init();
  }
  
  init() {
    this.setupEventListeners();
    this.setupAccessibility();
    
    // Close menu when clicking outside
    document.addEventListener('click', this.handleOutsideClick.bind(this));
    
    // Handle escape key
    document.addEventListener('keydown', this.handleKeydown.bind(this));
    
    console.log('🎯 Mega Menu initialized');
  }
  
  setupEventListeners() {
    this.menuItems.forEach(item => {
      const link = item.querySelector('.mega-menu__link');
      const panel = item.querySelector('.mega-menu__panel');
      
      if (this.trigger === 'hover') {
        // Hover events
        item.addEventListener('mouseenter', () => this.showPanel(item));
        item.addEventListener('mouseleave', () => this.hidePanel(item));
        
        // Keyboard navigation for hover mode
        link.addEventListener('focus', () => this.showPanel(item));
        link.addEventListener('blur', (e) => {
          // Only hide if focus is moving outside the item
          if (!item.contains(e.relatedTarget)) {
            this.hidePanel(item);
          }
        });
      } else {
        // Click events
        link.addEventListener('click', (e) => {
          e.preventDefault();
          this.togglePanel(item);
        });
      }
      
      // Panel interaction events
      if (panel) {
        panel.addEventListener('mouseenter', () => {
          if (this.closeTimeout) {
            clearTimeout(this.closeTimeout);
            this.closeTimeout = null;
          }
        });
        
        panel.addEventListener('mouseleave', () => {
          if (this.trigger === 'hover') {
            this.hidePanel(item);
          }
        });
      }
    });
  }
  
  setupAccessibility() {
    this.menuItems.forEach(item => {
      const link = item.querySelector('.mega-menu__link');
      const panel = item.querySelector('.mega-menu__panel');
      
      if (panel) {
        // Set up ARIA attributes
        const panelId = `mega-panel-${Math.random().toString(36).substr(2, 9)}`;
        panel.id = panelId;
        link.setAttribute('aria-controls', panelId);
        link.setAttribute('aria-expanded', 'false');
        
        // Make panel focusable for keyboard navigation
        panel.setAttribute('tabindex', '-1');
        
        // Set up focus management within panels
        this.setupPanelFocusManagement(panel);
      }
    });
  }
  
  setupPanelFocusManagement(panel) {
    const focusableElements = panel.querySelectorAll('a, button, [tabindex]:not([tabindex="-1"])');
    
    if (focusableElements.length > 0) {
      // Focus first element when panel opens
      panel.addEventListener('transitionend', (e) => {
        if (e.target === panel && panel.style.opacity === '1') {
          focusableElements[0].focus();
        }
      });
      
      // Trap focus within panel
      focusableElements.forEach((element, index) => {
        element.addEventListener('keydown', (e) => {
          if (e.key === 'Tab') {
            const isLastElement = index === focusableElements.length - 1;
            const isFirstElement = index === 0;
            
            if (e.shiftKey && isFirstElement) {
              e.preventDefault();
              focusableElements[focusableElements.length - 1].focus();
            } else if (!e.shiftKey && isLastElement) {
              e.preventDefault();
              focusableElements[0].focus();
            }
          }
        });
      });
    }
  }
  
  showPanel(item, delay = 150) {
    if (this.closeTimeout) {
      clearTimeout(this.closeTimeout);
      this.closeTimeout = null;
    }
    
    // Close other panels first
    this.hideAllPanels();
    
    setTimeout(() => {
      const link = item.querySelector('.mega-menu__link');
      const panel = item.querySelector('.mega-menu__panel');
      
      item.classList.add('is-active');
      link.setAttribute('aria-expanded', 'true');
      
      if (panel) {
        panel.style.opacity = '1';
        panel.style.visibility = 'visible';
        
        // Position panel for contained style
        if (this.style === 'contained') {
          this.positionPanel(panel, item);
        }
      }
      
      this.activeItem = item;
      
      // Dispatch custom event
      this.container.dispatchEvent(new CustomEvent('megamenu:panelopen', {
        detail: { item, panel }
      }));
    }, delay);
  }
  
  hidePanel(item, delay = 200) {
    this.closeTimeout = setTimeout(() => {
      const link = item.querySelector('.mega-menu__link');
      const panel = item.querySelector('.mega-menu__panel');
      
      item.classList.remove('is-active');
      link.setAttribute('aria-expanded', 'false');
      
      if (panel) {
        panel.style.opacity = '0';
        panel.style.visibility = 'hidden';
      }
      
      if (this.activeItem === item) {
        this.activeItem = null;
      }
      
      // Dispatch custom event
      this.container.dispatchEvent(new CustomEvent('megamenu:panelclose', {
        detail: { item, panel }
      }));
    }, delay);
  }
  
  togglePanel(item) {
    if (item.classList.contains('is-active')) {
      this.hidePanel(item, 0);
    } else {
      this.showPanel(item, 0);
    }
  }
  
  hideAllPanels() {
    this.menuItems.forEach(item => {
      if (item.classList.contains('is-active')) {
        this.hidePanel(item, 0);
      }
    });
  }
  
  positionPanel(panel, item) {
    const itemRect = item.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    
    // Reset transform
    panel.style.transform = 'translateX(-50%) translateY(0)';
    
    // Check if panel would go off-screen
    const panelLeft = itemRect.left + (itemRect.width / 2) - (panelRect.width / 2);
    const panelRight = panelLeft + panelRect.width;
    
    if (panelLeft < 20) {
      // Panel would go off left edge
      panel.style.transform = 'translateX(0) translateY(0)';
      panel.style.left = '20px';
    } else if (panelRight > viewportWidth - 20) {
      // Panel would go off right edge
      panel.style.transform = 'translateX(-100%) translateY(0)';
      panel.style.left = 'auto';
      panel.style.right = '20px';
    }
  }
  
  handleOutsideClick(e) {
    if (!this.container.contains(e.target) && this.activeItem) {
      this.hideAllPanels();
    }
  }
  
  handleKeydown(e) {
    if (e.key === 'Escape' && this.activeItem) {
      this.hideAllPanels();
      // Return focus to the active link
      const activeLink = this.activeItem.querySelector('.mega-menu__link');
      if (activeLink) {
        activeLink.focus();
      }
    }
  }
  
  // Public methods for external control
  open(itemSelector) {
    const item = this.container.querySelector(itemSelector);
    if (item && item.classList.contains('has-mega-panel')) {
      this.showPanel(item, 0);
    }
  }
  
  close(itemSelector = null) {
    if (itemSelector) {
      const item = this.container.querySelector(itemSelector);
      if (item) {
        this.hidePanel(item, 0);
      }
    } else {
      this.hideAllPanels();
    }
  }
  
  destroy() {
    // Clean up event listeners
    document.removeEventListener('click', this.handleOutsideClick.bind(this));
    document.removeEventListener('keydown', this.handleKeydown.bind(this));
    
    // Remove active states
    this.hideAllPanels();
    
    console.log('🎯 Mega Menu destroyed');
  }
}

// Auto-initialize mega menus
document.addEventListener('DOMContentLoaded', () => {
  const megaMenus = document.querySelectorAll('.mega-menu-container');
  
  megaMenus.forEach(container => {
    // Store instance on element for external access
    container.megaMenu = new MegaMenu(container);
  });
});

// Handle dynamic content loading (like AJAX)
document.addEventListener('shopify:section:load', (e) => {
  const megaMenuContainer = e.target.querySelector('.mega-menu-container');
  if (megaMenuContainer && !megaMenuContainer.megaMenu) {
    megaMenuContainer.megaMenu = new MegaMenu(megaMenuContainer);
  }
});

document.addEventListener('shopify:section:unload', (e) => {
  const megaMenuContainer = e.target.querySelector('.mega-menu-container');
  if (megaMenuContainer && megaMenuContainer.megaMenu) {
    megaMenuContainer.megaMenu.destroy();
    delete megaMenuContainer.megaMenu;
  }
});

// Export for external use
window.MegaMenu = MegaMenu;