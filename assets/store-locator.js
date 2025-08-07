/**
 * Store Locator System
 * Advanced location finder with Google Maps integration
 */

class StoreLocator {
  constructor(container) {
    this.container = container;
    this.sectionId = container.dataset.sectionId;
    this.apiKey = container.dataset.apiKey;
    this.defaultLat = parseFloat(container.dataset.defaultLat) || 40.7128;
    this.defaultLng = parseFloat(container.dataset.defaultLng) || -74.0060;
    this.defaultZoom = parseInt(container.dataset.defaultZoom) || 12;
    this.maxRadius = parseInt(container.dataset.maxRadius) || 50;
    
    // Elements
    this.searchInput = container.querySelector('[data-location-search]');
    this.searchButton = container.querySelector('[data-search-submit]');
    this.locationButton = container.querySelector('[data-use-location]');
    this.searchResults = container.querySelector('[data-search-results]');
    this.mapContainer = container.querySelector('[data-map-container]');
    this.mapLoading = container.querySelector('[data-map-loading]');
    this.mapError = container.querySelector('[data-map-error]');
    this.storesList = container.querySelector('[data-stores-list]');
    this.resultsTitle = container.querySelector('[data-results-title]');
    this.resultsCount = container.querySelector('[data-results-count]');
    this.noResults = container.querySelector('[data-no-results]');
    this.emptyState = container.querySelector('[data-empty-state]');
    this.modalEl = container.querySelector('[data-store-modal]');
    
    // Filter elements
    this.distanceFilter = container.querySelector('[data-distance-filter]');
    this.typeFilter = container.querySelector('[data-type-filter]');
    this.serviceFilters = container.querySelectorAll('[data-service-filter]');
    this.clearFiltersBtn = container.querySelector('[data-clear-filters]');
    
    // Map controls
    this.resetMapBtn = container.querySelector('[data-reset-map]');
    this.fullscreenBtn = container.querySelector('[data-fullscreen-map]');
    this.retryMapBtn = container.querySelector('[data-retry-map]');
    
    // State
    this.map = null;
    this.markers = [];
    this.infoWindow = null;
    this.geocoder = null;
    this.placesService = null;
    this.userLocation = null;
    this.stores = this.loadStoresData();
    this.filteredStores = [...this.stores];
    this.currentFilters = {
      distance: null,
      type: null,
      services: [],
      searchLocation: null
    };
    
    this.init();
  }
  
  init() {
    this.setupEventListeners();
    this.loadGoogleMapsAPI();
    this.displayStores(this.stores);
    
    console.log('🗺️ Store Locator initialized');
  }
  
  loadStoresData() {
    const storeDataScript = this.container.querySelector('[data-stores-data]');
    if (storeDataScript) {
      try {
        const data = JSON.parse(storeDataScript.textContent);
        return data.stores || [];
      } catch (error) {
        console.error('Error parsing store data:', error);
      }
    }
    return [];
  }
  
  setupEventListeners() {
    // Search functionality
    if (this.searchInput) {
      this.searchInput.addEventListener('input', this.debounce(() => {
        this.handleSearchInput();
      }, 300));
      
      this.searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.performSearch();
        }
      });
    }
    
    if (this.searchButton) {
      this.searchButton.addEventListener('click', () => {
        this.performSearch();
      });
    }
    
    if (this.locationButton) {
      this.locationButton.addEventListener('click', () => {
        this.getUserLocation();
      });
    }
    
    // Filters
    if (this.distanceFilter) {
      this.distanceFilter.addEventListener('change', () => {
        this.handleDistanceFilter();
      });
    }
    
    if (this.typeFilter) {
      this.typeFilter.addEventListener('change', () => {
        this.handleTypeFilter();
      });
    }
    
    this.serviceFilters.forEach(filter => {
      filter.addEventListener('change', () => {
        this.handleServiceFilter();
      });
    });
    
    if (this.clearFiltersBtn) {
      this.clearFiltersBtn.addEventListener('click', () => {
        this.clearAllFilters();
      });
    }
    
    // Map controls
    if (this.resetMapBtn) {
      this.resetMapBtn.addEventListener('click', () => {
        this.resetMap();
      });
    }
    
    if (this.fullscreenBtn) {
      this.fullscreenBtn.addEventListener('click', () => {
        this.toggleFullscreen();
      });
    }
    
    if (this.retryMapBtn) {
      this.retryMapBtn.addEventListener('click', () => {
        this.loadGoogleMapsAPI();
      });
    }
    
    // Store card interactions
    this.container.addEventListener('click', (e) => {
      const storeCard = e.target.closest('.store-card');
      if (storeCard && !e.target.closest('[data-get-directions], [data-view-details], [data-show-on-map]')) {
        this.highlightStore(storeCard);
      }
      
      // Directions button
      const directionsBtn = e.target.closest('[data-get-directions]');
      if (directionsBtn) {
        const address = directionsBtn.dataset.address;
        this.getDirections(address);
      }
      
      // Details button
      const detailsBtn = e.target.closest('[data-view-details]');
      if (detailsBtn) {
        const storeId = detailsBtn.dataset.storeId;
        this.showStoreDetails(storeId);
      }
      
      // Show on map button
      const mapBtn = e.target.closest('[data-show-on-map]');
      if (mapBtn) {
        const lat = parseFloat(mapBtn.dataset.storeLat);
        const lng = parseFloat(mapBtn.dataset.storeLng);
        const name = mapBtn.dataset.storeName;
        this.showStoreOnMap(lat, lng, name);
      }
    });
    
    // Modal events
    if (this.modalEl) {
      const overlay = this.modalEl.querySelector('[data-modal-overlay]');
      const closeBtn = this.modalEl.querySelector('[data-modal-close]');
      
      if (overlay) {
        overlay.addEventListener('click', () => this.closeModal());
      }
      
      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.closeModal());
      }
      
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.modalEl.style.display !== 'none') {
          this.closeModal();
        }
      });
    }
    
    // Search results dropdown
    document.addEventListener('click', (e) => {
      if (!this.container.contains(e.target)) {
        this.hideSearchResults();
      }
    });
  }
  
  async loadGoogleMapsAPI() {
    if (!this.apiKey) {
      this.showMapError('Google Maps API key is required');
      return;
    }
    
    if (window.google && window.google.maps) {
      this.initializeMap();
      return;
    }
    
    try {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${this.apiKey}&libraries=places,geometry&callback=initStoreLocatorMaps`;
      script.async = true;
      script.defer = true;
      
      // Set up global callback
      window.initStoreLocatorMaps = () => {
        this.initializeMap();
        delete window.initStoreLocatorMaps;
      };
      
      script.onerror = () => {
        this.showMapError('Failed to load Google Maps API');
      };
      
      document.head.appendChild(script);
      
    } catch (error) {
      console.error('Error loading Google Maps API:', error);
      this.showMapError('Error loading map');
    }
  }
  
  initializeMap() {
    this.hideMapLoading();
    
    try {
      // Initialize map
      this.map = new google.maps.Map(this.mapContainer, {
        center: { lat: this.defaultLat, lng: this.defaultLng },
        zoom: this.defaultZoom,
        styles: this.getMapStyles(),
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
        zoomControlOptions: {
          position: google.maps.ControlPosition.LEFT_BOTTOM
        }
      });
      
      // Initialize services
      this.geocoder = new google.maps.Geocoder();
      this.placesService = new google.maps.places.PlacesService(this.map);
      this.infoWindow = new google.maps.InfoWindow();
      
      // Add store markers
      this.addStoreMarkers();
      
      // Try to get user's location
      this.getUserLocation(false);
      
      console.log('🗺️ Google Maps initialized');
      
    } catch (error) {
      console.error('Error initializing map:', error);
      this.showMapError('Error initializing map');
    }
  }
  
  getMapStyles() {
    return [
      {
        featureType: 'all',
        elementType: 'geometry.fill',
        stylers: [{ weight: '2.00' }]
      },
      {
        featureType: 'all',
        elementType: 'geometry.stroke',
        stylers: [{ color: '#9c9c9c' }]
      },
      {
        featureType: 'all',
        elementType: 'labels.text',
        stylers: [{ visibility: 'on' }]
      },
      {
        featureType: 'landscape',
        elementType: 'all',
        stylers: [{ color: '#f2f2f2' }]
      },
      {
        featureType: 'landscape',
        elementType: 'geometry.fill',
        stylers: [{ color: '#ffffff' }]
      },
      {
        featureType: 'poi',
        elementType: 'all',
        stylers: [{ visibility: 'off' }]
      },
      {
        featureType: 'road',
        elementType: 'all',
        stylers: [{ saturation: -100 }, { lightness: 45 }]
      },
      {
        featureType: 'road',
        elementType: 'geometry.fill',
        stylers: [{ color: '#eeeeee' }]
      },
      {
        featureType: 'road',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#7b7b7b' }]
      },
      {
        featureType: 'road',
        elementType: 'labels.text.stroke',
        stylers: [{ color: '#ffffff' }]
      },
      {
        featureType: 'water',
        elementType: 'all',
        stylers: [{ color: '#46bcec' }, { visibility: 'on' }]
      }
    ];
  }
  
  addStoreMarkers() {
    if (!this.map) return;
    
    // Clear existing markers
    this.clearMarkers();
    
    this.filteredStores.forEach((store, index) => {
      if (store.lat && store.lng) {
        const marker = new google.maps.Marker({
          position: { lat: store.lat, lng: store.lng },
          map: this.map,
          title: store.name,
          icon: this.getStoreMarkerIcon(store.type),
          animation: google.maps.Animation.DROP
        });
        
        // Add click listener for info window
        marker.addListener('click', () => {
          this.showStoreInfoWindow(store, marker);
          this.highlightStoreCard(store.id);
        });
        
        this.markers.push({ marker, store });
      }
    });
    
    // Fit map to show all markers
    if (this.markers.length > 0) {
      this.fitMapToMarkers();
    }
  }
  
  getStoreMarkerIcon(storeType) {
    const colors = {
      flagship: '#667eea',
      outlet: '#f5576c',
      partner: '#4facfe'
    };
    
    const color = colors[storeType] || '#667eea';
    
    return {
      path: google.maps.SymbolPath.CIRCLE,
      fillColor: color,
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 3,
      scale: 12
    };
  }
  
  showStoreInfoWindow(store, marker) {
    const content = `
      <div class="store-info-window">
        <h3 class="store-info-window__name">${store.name}</h3>
        <div class="store-info-window__address">
          <strong>Address:</strong><br>
          ${store.address}<br>
          ${store.city}, ${store.state} ${store.zip}
        </div>
        ${store.phone ? `<div class="store-info-window__phone">
          <strong>Phone:</strong> <a href="tel:${store.phone}">${store.phone}</a>
        </div>` : ''}
        <div class="store-info-window__actions">
          <button onclick="window.open('https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(store.address + ', ' + store.city + ', ' + store.state)}', '_blank')" class="store-info-window__button">
            Get Directions
          </button>
        </div>
      </div>
    `;
    
    this.infoWindow.setContent(content);
    this.infoWindow.open(this.map, marker);
  }
  
  clearMarkers() {
    this.markers.forEach(({ marker }) => {
      marker.setMap(null);
    });
    this.markers = [];
  }
  
  fitMapToMarkers() {
    if (!this.map || this.markers.length === 0) return;
    
    const bounds = new google.maps.LatLngBounds();
    this.markers.forEach(({ marker }) => {
      bounds.extend(marker.getPosition());
    });
    
    this.map.fitBounds(bounds);
    
    // Ensure minimum zoom level
    const listener = google.maps.event.addListener(this.map, 'bounds_changed', () => {
      if (this.map.getZoom() > 15) {
        this.map.setZoom(15);
      }
      google.maps.event.removeListener(listener);
    });
  }
  
  async handleSearchInput() {
    const query = this.searchInput.value.trim();
    
    if (query.length < 3) {
      this.hideSearchResults();
      return;
    }
    
    if (!this.placesService) return;
    
    try {
      const request = {
        query: query,
        fields: ['place_id', 'name', 'formatted_address', 'geometry']
      };
      
      this.placesService.findPlaceFromQuery(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          this.showSearchResults(results.slice(0, 5));
        } else {
          this.hideSearchResults();
        }
      });
      
    } catch (error) {
      console.error('Error searching places:', error);
      this.hideSearchResults();
    }
  }
  
  showSearchResults(results) {
    if (!results || results.length === 0) {
      this.hideSearchResults();
      return;
    }
    
    const html = results.map(result => `
      <div class="store-locator__search-result" data-place-id="${result.place_id}">
        <strong>${result.name}</strong><br>
        <small>${result.formatted_address}</small>
      </div>
    `).join('');
    
    this.searchResults.innerHTML = html;
    this.searchResults.style.display = 'block';
    
    // Add click listeners
    this.searchResults.querySelectorAll('.store-locator__search-result').forEach(result => {
      result.addEventListener('click', () => {
        const placeId = result.dataset.placeId;
        this.selectSearchResult(placeId);
      });
    });
  }
  
  hideSearchResults() {
    if (this.searchResults) {
      this.searchResults.style.display = 'none';
    }
  }
  
  selectSearchResult(placeId) {
    if (!this.placesService) return;
    
    const request = {
      placeId: placeId,
      fields: ['geometry', 'formatted_address']
    };
    
    this.placesService.getDetails(request, (place, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && place.geometry) {
        const location = place.geometry.location;
        this.searchInput.value = place.formatted_address;
        this.hideSearchResults();
        
        // Update search location
        this.currentFilters.searchLocation = {
          lat: location.lat(),
          lng: location.lng()
        };
        
        // Filter stores by distance and update display
        this.filterAndDisplayStores();
        
        // Update map center
        if (this.map) {
          this.map.setCenter(location);
          this.map.setZoom(12);
        }
      }
    });
  }
  
  performSearch() {
    const query = this.searchInput.value.trim();
    if (!query || !this.geocoder) return;
    
    this.geocoder.geocode({ address: query }, (results, status) => {
      if (status === google.maps.GeocoderStatus.OK && results[0]) {
        const location = results[0].geometry.location;
        
        this.currentFilters.searchLocation = {
          lat: location.lat(),
          lng: location.lng()
        };
        
        this.filterAndDisplayStores();
        
        if (this.map) {
          this.map.setCenter(location);
          this.map.setZoom(12);
        }
      } else {
        this.showNotification('Location not found', 'error');
      }
    });
  }
  
  getUserLocation(showMessage = true) {
    if (!navigator.geolocation) {
      if (showMessage) {
        this.showNotification('Geolocation is not supported', 'error');
      }
      return;
    }
    
    const button = this.locationButton;
    if (button) {
      button.disabled = true;
      button.style.opacity = '0.5';
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        
        this.currentFilters.searchLocation = this.userLocation;
        this.searchInput.value = 'Your location';
        
        this.filterAndDisplayStores();
        
        if (this.map) {
          this.map.setCenter(this.userLocation);
          this.map.setZoom(12);
          
          // Add user location marker
          new google.maps.Marker({
            position: this.userLocation,
            map: this.map,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: '#4285F4',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 3,
              scale: 8
            },
            title: 'Your location'
          });
        }
        
        if (showMessage) {
          this.showNotification('Using your current location', 'success');
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        if (showMessage) {
          this.showNotification('Unable to get your location', 'error');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
    
    // Re-enable button
    if (button) {
      setTimeout(() => {
        button.disabled = false;
        button.style.opacity = '1';
      }, 2000);
    }
  }
  
  handleDistanceFilter() {
    const value = this.distanceFilter.value;
    this.currentFilters.distance = value ? parseInt(value) : null;
    this.filterAndDisplayStores();
  }
  
  handleTypeFilter() {
    const value = this.typeFilter.value;
    this.currentFilters.type = value || null;
    this.filterAndDisplayStores();
  }
  
  handleServiceFilter() {
    const selectedServices = [];
    this.serviceFilters.forEach(filter => {
      if (filter.checked) {
        selectedServices.push(filter.value);
      }
    });
    this.currentFilters.services = selectedServices;
    this.filterAndDisplayStores();
  }
  
  filterAndDisplayStores() {
    let filtered = [...this.stores];
    
    // Filter by search location and distance
    if (this.currentFilters.searchLocation && this.currentFilters.distance) {
      filtered = filtered.filter(store => {
        if (!store.lat || !store.lng) return false;
        
        const distance = this.calculateDistance(
          this.currentFilters.searchLocation.lat,
          this.currentFilters.searchLocation.lng,
          store.lat,
          store.lng
        );
        
        return distance <= this.currentFilters.distance;
      });
    }
    
    // Filter by store type
    if (this.currentFilters.type) {
      filtered = filtered.filter(store => store.type === this.currentFilters.type);
    }
    
    // Filter by services
    if (this.currentFilters.services.length > 0) {
      filtered = filtered.filter(store => {
        return this.currentFilters.services.some(service => 
          store.services && store.services.includes(service)
        );
      });
    }
    
    // Sort by distance if search location is set
    if (this.currentFilters.searchLocation) {
      filtered.sort((a, b) => {
        const distanceA = this.calculateDistance(
          this.currentFilters.searchLocation.lat,
          this.currentFilters.searchLocation.lng,
          a.lat,
          a.lng
        );
        const distanceB = this.calculateDistance(
          this.currentFilters.searchLocation.lat,
          this.currentFilters.searchLocation.lng,
          b.lat,
          b.lng
        );
        return distanceA - distanceB;
      });
    }
    
    this.filteredStores = filtered;
    this.displayStores(filtered);
    this.addStoreMarkers();
  }
  
  calculateDistance(lat1, lng1, lat2, lng2) {
    if (!lat1 || !lng1 || !lat2 || !lng2) return Infinity;
    
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
  
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }
  
  displayStores(stores) {
    if (stores.length === 0) {
      this.showNoResults();
      return;
    }
    
    this.hideNoResults();
    
    // Update results count and title
    if (this.resultsCount) {
      this.resultsCount.textContent = `${stores.length} ${stores.length === 1 ? 'store' : 'stores'} found`;
    }
    
    if (this.resultsTitle) {
      this.resultsTitle.textContent = this.currentFilters.searchLocation ? 
        'Nearby Stores' : 'All Stores';
    }
    
    // Render store cards
    const html = stores.map((store, index) => {
      let distanceHtml = '';
      if (this.currentFilters.searchLocation && store.lat && store.lng) {
        const distance = this.calculateDistance(
          this.currentFilters.searchLocation.lat,
          this.currentFilters.searchLocation.lng,
          store.lat,
          store.lng
        );
        distanceHtml = `<div class="store-card__distance" data-store-distance style="display: block;">${distance.toFixed(1)} mi</div>`;
      }
      
      return this.renderStoreCard(store, distanceHtml);
    }).join('');
    
    this.storesList.innerHTML = html;
    
    // Update store hours for each card
    setTimeout(() => {
      this.updateStoreHours();
    }, 100);
  }
  
  renderStoreCard(store, distanceHtml = '') {
    // This would typically use the store-card snippet
    // For now, we'll create a simplified version
    return `
      <div class="store-card" data-store-id="${store.id}">
        <div class="store-card__content">
          <div class="store-card__header">
            <h3 class="store-card__name">${store.name}</h3>
            ${distanceHtml}
          </div>
          <div class="store-card__address">
            <svg class="store-card__address-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="M12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5M12,2A7,7 0 0,0 5,9C5,14.25 12,22 12,22C12,22 19,14.25 19,9A7,7 0 0,0 12,2Z"/>
            </svg>
            <span>${store.address}, ${store.city}, ${store.state} ${store.zip}</span>
          </div>
          ${store.phone ? `<div class="store-card__contact">
            <a href="tel:${store.phone}" class="store-card__contact-item">
              <svg class="store-card__contact-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="currentColor" d="M6.62,10.79C8.06,13.62 10.38,15.94 13.21,17.38L15.41,15.18C15.69,14.9 16.08,14.82 16.43,14.93C17.55,15.3 18.75,15.5 20,15.5A1,1 0 0,1 21,16.5V20A1,1 0 0,1 20,21A17,17 0 0,1 3,4A1,1 0 0,1 4,3H7.5A1,1 0 0,1 8.5,4C8.5,5.25 8.7,6.45 9.07,7.57C9.18,7.92 9.1,8.31 8.82,8.59L6.62,10.79Z"/>
              </svg>
              <span>${store.phone}</span>
            </a>
          </div>` : ''}
          <div class="store-card__actions">
            <button class="store-card__action-button" data-get-directions data-address="${store.address}, ${store.city}, ${store.state}">
              <svg class="store-card__action-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="currentColor" d="M21.71,11.29L12.71,2.29C12.32,1.9 11.69,1.9 11.3,2.29L2.29,11.29C1.9,11.68 1.9,12.32 2.29,12.71L11.3,21.71C11.69,22.1 12.32,22.1 12.71,21.71L21.71,12.71C22.1,12.32 22.1,11.68 21.71,11.29M13,17.42V10.5H17L12,5.5L7,10.5H11V17.42L6.41,12.83L5,14.24L12,21.24L19,14.24L17.59,12.83L13,17.42Z"/>
              </svg>
              Directions
            </button>
            <button class="store-card__action-button" data-show-on-map data-store-lat="${store.lat}" data-store-lng="${store.lng}" data-store-name="${store.name}">
              <svg class="store-card__action-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="currentColor" d="M15,19L9,16.89V5L15,7.11M20.5,3C20.44,3 20.39,3 20.34,3L15,5.1L9,3L3.36,4.9C3.15,4.97 3,5.15 3,5.38V20.5A0.5,0.5 0 0,0 3.5,21C3.55,21 3.61,21 3.66,21L9,18.9L15,21L20.64,19.1C20.85,19.03 21,18.85 21,18.62V3.5A0.5,0.5 0 0,0 20.5,3Z"/>
              </svg>
              Show on Map
            </button>
          </div>
        </div>
      </div>
    `;
  }
  
  updateStoreHours() {
    const storeCards = this.container.querySelectorAll('.store-card');
    storeCards.forEach(card => {
      const storeId = card.dataset.storeId;
      const store = this.stores.find(s => s.id === storeId);
      
      if (store && store.hours) {
        const today = new Date().toLocaleDateString('en-US', { weekday: 'lowercase' });
        const todayHours = store.hours[today];
        
        const hoursElement = card.querySelector('[data-current-hours]');
        if (hoursElement && todayHours) {
          hoursElement.textContent = `Today: ${todayHours}`;
        }
      }
    });
  }
  
  showNoResults() {
    if (this.noResults) {
      this.noResults.style.display = 'block';
    }
    if (this.storesList) {
      this.storesList.style.display = 'none';
    }
  }
  
  hideNoResults() {
    if (this.noResults) {
      this.noResults.style.display = 'none';
    }
    if (this.storesList) {
      this.storesList.style.display = 'block';
    }
  }
  
  clearAllFilters() {
    // Reset filter inputs
    if (this.distanceFilter) this.distanceFilter.value = '';
    if (this.typeFilter) this.typeFilter.value = '';
    this.serviceFilters.forEach(filter => {
      filter.checked = false;
    });
    if (this.searchInput) this.searchInput.value = '';
    
    // Reset filter state
    this.currentFilters = {
      distance: null,
      type: null,
      services: [],
      searchLocation: null
    };
    
    // Reset display
    this.filteredStores = [...this.stores];
    this.displayStores(this.stores);
    this.addStoreMarkers();
    
    // Reset map
    this.resetMap();
  }
  
  resetMap() {
    if (this.map) {
      this.map.setCenter({ lat: this.defaultLat, lng: this.defaultLng });
      this.map.setZoom(this.defaultZoom);
    }
  }
  
  toggleFullscreen() {
    if (!document.fullscreenElement) {
      this.container.requestFullscreen().catch(err => {
        console.error('Error attempting to enable fullscreen:', err);
      });
    } else {
      document.exitFullscreen();
    }
  }
  
  highlightStore(storeCard) {
    // Remove previous highlights
    this.container.querySelectorAll('.store-card.is-highlighted').forEach(card => {
      card.classList.remove('is-highlighted');
    });
    
    // Highlight current store
    storeCard.classList.add('is-highlighted');
    
    // Show on map
    const storeId = storeCard.dataset.storeId;
    const store = this.stores.find(s => s.id === storeId);
    
    if (store && store.lat && store.lng && this.map) {
      this.map.setCenter({ lat: store.lat, lng: store.lng });
      this.map.setZoom(15);
      
      // Find and highlight marker
      const markerData = this.markers.find(m => m.store.id === storeId);
      if (markerData) {
        this.showStoreInfoWindow(store, markerData.marker);
      }
    }
  }
  
  highlightStoreCard(storeId) {
    const storeCard = this.container.querySelector(`[data-store-id="${storeId}"]`);
    if (storeCard) {
      this.highlightStore(storeCard);
      storeCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
  
  getDirections(address) {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
    window.open(url, '_blank');
  }
  
  showStoreDetails(storeId) {
    const store = this.stores.find(s => s.id === storeId);
    if (!store || !this.modalEl) return;
    
    // Create detailed store view
    const modalBody = this.modalEl.querySelector('[data-modal-body]');
    modalBody.innerHTML = this.createStoreDetailsHTML(store);
    
    this.openModal();
  }
  
  createStoreDetailsHTML(store) {
    return `
      <div class="store-details">
        <h2 class="store-details__name">${store.name}</h2>
        <div class="store-details__content">
          <div class="store-details__info">
            <h3>Contact Information</h3>
            <p><strong>Address:</strong><br>${store.address}<br>${store.city}, ${store.state} ${store.zip}</p>
            ${store.phone ? `<p><strong>Phone:</strong> <a href="tel:${store.phone}">${store.phone}</a></p>` : ''}
            ${store.email ? `<p><strong>Email:</strong> <a href="mailto:${store.email}">${store.email}</a></p>` : ''}
            ${store.website ? `<p><strong>Website:</strong> <a href="${store.website}" target="_blank">Visit Website</a></p>` : ''}
          </div>
          ${store.hours ? `
            <div class="store-details__hours">
              <h3>Store Hours</h3>
              <ul>
                <li><strong>Monday:</strong> ${store.hours.monday}</li>
                <li><strong>Tuesday:</strong> ${store.hours.tuesday}</li>
                <li><strong>Wednesday:</strong> ${store.hours.wednesday}</li>
                <li><strong>Thursday:</strong> ${store.hours.thursday}</li>
                <li><strong>Friday:</strong> ${store.hours.friday}</li>
                <li><strong>Saturday:</strong> ${store.hours.saturday}</li>
                <li><strong>Sunday:</strong> ${store.hours.sunday}</li>
              </ul>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }
  
  showStoreOnMap(lat, lng, name) {
    if (!this.map) return;
    
    this.map.setCenter({ lat, lng });
    this.map.setZoom(15);
    
    // Find and trigger marker
    const markerData = this.markers.find(m => m.store.lat === lat && m.store.lng === lng);
    if (markerData) {
      google.maps.event.trigger(markerData.marker, 'click');
    }
  }
  
  openModal() {
    if (!this.modalEl) return;
    
    this.modalEl.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    requestAnimationFrame(() => {
      this.modalEl.classList.add('is-visible');
    });
  }
  
  closeModal() {
    if (!this.modalEl) return;
    
    this.modalEl.classList.remove('is-visible');
    document.body.style.overflow = '';
    
    setTimeout(() => {
      this.modalEl.style.display = 'none';
    }, 300);
  }
  
  showMapLoading() {
    if (this.mapLoading) {
      this.mapLoading.style.display = 'flex';
    }
  }
  
  hideMapLoading() {
    if (this.mapLoading) {
      this.mapLoading.style.display = 'none';
    }
  }
  
  showMapError(message) {
    this.hideMapLoading();
    
    if (this.mapError) {
      this.mapError.style.display = 'flex';
      const errorText = this.mapError.querySelector('.store-locator__error-text');
      if (errorText) {
        errorText.textContent = message;
      }
    }
  }
  
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `store-locator__notification store-locator__notification--${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 2rem;
      right: 2rem;
      background: rgba(var(--color-base-background-1), 0.95);
      color: rgb(var(--color-base-text));
      padding: 1rem 2rem;
      border-radius: 0.8rem;
      box-shadow: 0 8px 32px rgba(var(--color-base-text), 0.15);
      backdrop-filter: blur(20px);
      z-index: 1000;
      transform: translateX(100%);
      transition: transform 0.3s ease;
      font-weight: 500;
    `;
    
    if (type === 'success') {
      notification.style.borderLeft = '4px solid #4CAF50';
    } else if (type === 'error') {
      notification.style.borderLeft = '4px solid #F44336';
    }
    
    document.body.appendChild(notification);
    
    requestAnimationFrame(() => {
      notification.style.transform = 'translateX(0)';
    });
    
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 4000);
  }
  
  debounce(func, wait) {
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
}

// Custom Element for Modal
class StoreModal extends HTMLElement {
  connectedCallback() {
    this.setAttribute('role', 'dialog');
    this.setAttribute('aria-modal', 'true');
    this.setAttribute('aria-labelledby', 'store-modal-title');
  }
}

if (!customElements.get('store-modal')) {
  customElements.define('store-modal', StoreModal);
}

// Auto-initialize
document.addEventListener('DOMContentLoaded', () => {
  const storeLocators = document.querySelectorAll('.store-locator');
  
  storeLocators.forEach(container => {
    container.storeLocator = new StoreLocator(container);
  });
});

// Handle dynamic content loading
document.addEventListener('shopify:section:load', (e) => {
  const storeLocator = e.target.querySelector('.store-locator');
  if (storeLocator && !storeLocator.storeLocator) {
    storeLocator.storeLocator = new StoreLocator(storeLocator);
  }
});

document.addEventListener('shopify:section:unload', (e) => {
  const storeLocator = e.target.querySelector('.store-locator');
  if (storeLocator && storeLocator.storeLocator) {
    delete storeLocator.storeLocator;
  }
});

// Export for external use
window.StoreLocator = StoreLocator;