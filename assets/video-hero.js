/**
 * Video Hero Component
 * Advanced video background with YouTube/Vimeo support and custom controls
 */

class VideoHero {
  constructor(container) {
    this.container = container;
    this.sectionId = container.dataset.sectionId;
    this.mediaContainer = container.querySelector('.video-hero__media');
    this.videoElement = container.querySelector('.video-hero__video');
    this.iframeContainer = container.querySelector('.video-hero__iframe-container');
    this.posterOverlay = container.querySelector('.video-hero__poster-overlay');
    this.playButton = container.querySelector('[data-video-play]');
    this.toggleButton = container.querySelector('[data-video-toggle]');
    this.muteButton = container.querySelector('[data-video-mute]');
    
    this.isPlaying = false;
    this.isMuted = true;
    this.player = null;
    this.playerType = null;
    
    this.settings = this.getSettings();
    
    this.init();
  }
  
  getSettings() {
    return {
      autoplay: this.mediaContainer?.dataset.videoAutoplay === 'true',
      muted: this.mediaContainer?.dataset.videoMuted === 'true',
      loop: this.mediaContainer?.dataset.videoLoop === 'true'
    };
  }
  
  init() {
    this.detectVideoType();
    this.setupEventListeners();
    this.initializeVideo();
    this.setupIntersectionObserver();
    
    console.log('🎬 Video Hero initialized');
  }
  
  detectVideoType() {
    const videoUrl = this.container.querySelector('[data-video-url]')?.dataset.videoUrl || '';
    
    if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
      this.playerType = 'youtube';
    } else if (videoUrl.includes('vimeo.com')) {
      this.playerType = 'vimeo';
    } else if (this.videoElement) {
      this.playerType = 'html5';
    }
  }
  
  setupEventListeners() {
    // Play button
    if (this.playButton) {
      this.playButton.addEventListener('click', () => {
        this.playVideo();
      });
    }
    
    // Control buttons
    if (this.toggleButton) {
      this.toggleButton.addEventListener('click', () => {
        this.togglePlayPause();
      });
    }
    
    if (this.muteButton) {
      this.muteButton.addEventListener('click', () => {
        this.toggleMute();
      });
    }
    
    // HTML5 video events
    if (this.videoElement) {
      this.videoElement.addEventListener('loadeddata', () => {
        this.onVideoReady();
      });
      
      this.videoElement.addEventListener('play', () => {
        this.onVideoPlay();
      });
      
      this.videoElement.addEventListener('pause', () => {
        this.onVideoPause();
      });
      
      this.videoElement.addEventListener('ended', () => {
        this.onVideoEnded();
      });
    }
    
    // Window events
    window.addEventListener('blur', () => {
      if (this.isPlaying && !this.settings.autoplay) {
        this.pauseVideo();
      }
    });
    
    // Intersection observer for performance
    this.setupIntersectionObserver();
  }
  
  setupIntersectionObserver() {
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            // Video is in viewport
            if (this.settings.autoplay && !this.isPlaying) {
              setTimeout(() => this.playVideo(), 500);
            }
          } else {
            // Video is out of viewport
            if (this.isPlaying && this.settings.autoplay) {
              this.pauseVideo();
            }
          }
        });
      }, {
        threshold: 0.5,
        rootMargin: '50px'
      });
      
      observer.observe(this.container);
    }
  }
  
  initializeVideo() {
    switch (this.playerType) {
      case 'youtube':
        this.initYouTubePlayer();
        break;
      case 'vimeo':
        this.initVimeoPlayer();
        break;
      case 'html5':
        this.initHTML5Video();
        break;
    }
  }
  
  initYouTubePlayer() {
    if (!window.YT) {
      this.loadYouTubeAPI();
      return;
    }
    
    const videoId = this.extractYouTubeId();
    if (!videoId) return;
    
    this.player = new YT.Player(`video-${this.sectionId}`, {
      videoId: videoId,
      playerVars: {
        autoplay: this.settings.autoplay ? 1 : 0,
        mute: this.settings.muted ? 1 : 0,
        loop: this.settings.loop ? 1 : 0,
        controls: 0,
        showinfo: 0,
        rel: 0,
        iv_load_policy: 3,
        modestbranding: 1,
        playsinline: 1,
        playlist: this.settings.loop ? videoId : undefined
      },
      events: {
        onReady: () => this.onVideoReady(),
        onStateChange: (event) => this.onYouTubeStateChange(event)
      }
    });
  }
  
  initVimeoPlayer() {
    if (!window.Vimeo) {
      this.loadVimeoAPI();
      return;
    }
    
    const videoId = this.extractVimeoId();
    if (!videoId) return;
    
    this.player = new Vimeo.Player(`video-${this.sectionId}`, {
      id: videoId,
      autoplay: this.settings.autoplay,
      muted: this.settings.muted,
      loop: this.settings.loop,
      controls: false,
      title: false,
      byline: false,
      portrait: false,
      background: true
    });
    
    this.player.ready().then(() => {
      this.onVideoReady();
    });
    
    this.player.on('play', () => this.onVideoPlay());
    this.player.on('pause', () => this.onVideoPause());
    this.player.on('ended', () => this.onVideoEnded());
  }
  
  initHTML5Video() {
    if (!this.videoElement) return;
    
    this.videoElement.muted = this.settings.muted;
    this.videoElement.loop = this.settings.loop;
    
    if (this.settings.autoplay && this.settings.muted) {
      this.videoElement.play().catch(e => {
        console.warn('Autoplay failed:', e);
        this.showPlayButton();
      });
    }
  }
  
  loadYouTubeAPI() {
    if (window.YT) return;
    
    window.onYouTubeIframeAPIReady = () => {
      this.initYouTubePlayer();
    };
    
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(script);
  }
  
  loadVimeoAPI() {
    if (window.Vimeo) return;
    
    const script = document.createElement('script');
    script.src = 'https://player.vimeo.com/api/player.js';
    script.onload = () => this.initVimeoPlayer();
    document.head.appendChild(script);
  }
  
  extractYouTubeId() {
    const url = this.container.querySelector('[data-video-url]')?.dataset.videoUrl || '';
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    return match ? match[1] : null;
  }
  
  extractVimeoId() {
    const url = this.container.querySelector('[data-video-url]')?.dataset.videoUrl || '';
    const match = url.match(/vimeo\.com\/(\d+)/);
    return match ? match[1] : null;
  }
  
  playVideo() {
    switch (this.playerType) {
      case 'youtube':
        if (this.player && this.player.playVideo) {
          this.player.playVideo();
        }
        break;
      case 'vimeo':
        if (this.player && this.player.play) {
          this.player.play();
        }
        break;
      case 'html5':
        if (this.videoElement) {
          this.videoElement.play().catch(e => {
            console.warn('Play failed:', e);
          });
        }
        break;
    }
    
    this.hidePlayButton();
  }
  
  pauseVideo() {
    switch (this.playerType) {
      case 'youtube':
        if (this.player && this.player.pauseVideo) {
          this.player.pauseVideo();
        }
        break;
      case 'vimeo':
        if (this.player && this.player.pause) {
          this.player.pause();
        }
        break;
      case 'html5':
        if (this.videoElement) {
          this.videoElement.pause();
        }
        break;
    }
  }
  
  togglePlayPause() {
    if (this.isPlaying) {
      this.pauseVideo();
    } else {
      this.playVideo();
    }
  }
  
  toggleMute() {
    const newMutedState = !this.isMuted;
    
    switch (this.playerType) {
      case 'youtube':
        if (this.player) {
          if (newMutedState) {
            this.player.mute();
          } else {
            this.player.unMute();
          }
        }
        break;
      case 'vimeo':
        if (this.player) {
          this.player.setMuted(newMutedState);
        }
        break;
      case 'html5':
        if (this.videoElement) {
          this.videoElement.muted = newMutedState;
        }
        break;
    }
    
    this.isMuted = newMutedState;
    this.updateMuteButton();
  }
  
  onVideoReady() {
    console.log('🎬 Video ready');
    
    // Auto-play if enabled
    if (this.settings.autoplay) {
      setTimeout(() => this.playVideo(), 500);
    } else {
      this.showPlayButton();
    }
  }
  
  onVideoPlay() {
    this.isPlaying = true;
    this.updatePlayButton();
    this.hidePlayButton();
    
    // Dispatch custom event
    this.container.dispatchEvent(new CustomEvent('videohero:play', {
      detail: { sectionId: this.sectionId, playerType: this.playerType }
    }));
  }
  
  onVideoPause() {
    this.isPlaying = false;
    this.updatePlayButton();
    
    // Dispatch custom event
    this.container.dispatchEvent(new CustomEvent('videohero:pause', {
      detail: { sectionId: this.sectionId, playerType: this.playerType }
    }));
  }
  
  onVideoEnded() {
    this.isPlaying = false;
    this.updatePlayButton();
    
    if (!this.settings.loop) {
      this.showPlayButton();
    }
    
    // Dispatch custom event
    this.container.dispatchEvent(new CustomEvent('videohero:ended', {
      detail: { sectionId: this.sectionId, playerType: this.playerType }
    }));
  }
  
  onYouTubeStateChange(event) {
    switch (event.data) {
      case YT.PlayerState.PLAYING:
        this.onVideoPlay();
        break;
      case YT.PlayerState.PAUSED:
        this.onVideoPause();
        break;
      case YT.PlayerState.ENDED:
        this.onVideoEnded();
        break;
    }
  }
  
  showPlayButton() {
    if (this.playButton && this.posterOverlay) {
      this.posterOverlay.style.opacity = '1';
      this.posterOverlay.style.visibility = 'visible';
    }
  }
  
  hidePlayButton() {
    if (this.playButton && this.posterOverlay) {
      this.posterOverlay.style.opacity = '0';
      this.posterOverlay.style.visibility = 'hidden';
    }
  }
  
  updatePlayButton() {
    if (this.toggleButton) {
      if (this.isPlaying) {
        this.toggleButton.classList.add('video-hero__control--playing');
        this.toggleButton.setAttribute('aria-label', 'Pause video');
      } else {
        this.toggleButton.classList.remove('video-hero__control--playing');
        this.toggleButton.setAttribute('aria-label', 'Play video');
      }
    }
  }
  
  updateMuteButton() {
    if (this.muteButton) {
      if (this.isMuted) {
        this.muteButton.classList.add('video-hero__control--muted');
        this.muteButton.setAttribute('aria-label', 'Unmute video');
      } else {
        this.muteButton.classList.remove('video-hero__control--muted');
        this.muteButton.setAttribute('aria-label', 'Mute video');
      }
    }
  }
  
  // Public API methods
  play() {
    this.playVideo();
  }
  
  pause() {
    this.pauseVideo();
  }
  
  mute() {
    if (!this.isMuted) {
      this.toggleMute();
    }
  }
  
  unmute() {
    if (this.isMuted) {
      this.toggleMute();
    }
  }
  
  destroy() {
    // Clean up player
    if (this.player) {
      if (this.playerType === 'youtube' && this.player.destroy) {
        this.player.destroy();
      } else if (this.playerType === 'vimeo' && this.player.destroy) {
        this.player.destroy();
      }
    }
    
    // Remove event listeners
    if (this.videoElement) {
      this.videoElement.removeEventListener('loadeddata', this.onVideoReady);
      this.videoElement.removeEventListener('play', this.onVideoPlay);
      this.videoElement.removeEventListener('pause', this.onVideoPause);
      this.videoElement.removeEventListener('ended', this.onVideoEnded);
    }
    
    console.log('🎬 Video Hero destroyed');
  }
}

// Countdown Timer Component
class CountdownTimer extends HTMLElement {
  constructor() {
    super();
    this.endDate = new Date(this.dataset.endDate);
    this.hideOnComplete = this.dataset.hideOnComplete === 'true';
    this.interval = null;
    
    this.daysEl = this.querySelector('[data-days]');
    this.hoursEl = this.querySelector('[data-hours]');
    this.minutesEl = this.querySelector('[data-minutes]');
    this.secondsEl = this.querySelector('[data-seconds]');
    
    this.init();
  }
  
  init() {
    if (isNaN(this.endDate)) {
      console.error('Invalid countdown end date');
      return;
    }
    
    this.updateTimer();
    this.interval = setInterval(() => this.updateTimer(), 1000);
  }
  
  updateTimer() {
    const now = new Date();
    const timeLeft = this.endDate - now;
    
    if (timeLeft <= 0) {
      this.onComplete();
      return;
    }
    
    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
    
    if (this.daysEl) this.daysEl.textContent = days.toString().padStart(2, '0');
    if (this.hoursEl) this.hoursEl.textContent = hours.toString().padStart(2, '0');
    if (this.minutesEl) this.minutesEl.textContent = minutes.toString().padStart(2, '0');
    if (this.secondsEl) this.secondsEl.textContent = seconds.toString().padStart(2, '0');
  }
  
  onComplete() {
    if (this.interval) {
      clearInterval(this.interval);
    }
    
    if (this.hideOnComplete) {
      this.style.display = 'none';
    }
    
    // Dispatch complete event
    this.dispatchEvent(new CustomEvent('countdown:complete'));
  }
  
  disconnectedCallback() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }
}

// Register custom elements
if (!customElements.get('countdown-timer')) {
  customElements.define('countdown-timer', CountdownTimer);
}

// Auto-initialize video heroes
document.addEventListener('DOMContentLoaded', () => {
  const videoHeroes = document.querySelectorAll('.video-hero');
  
  videoHeroes.forEach(container => {
    container.videoHero = new VideoHero(container);
  });
});

// Handle dynamic content loading
document.addEventListener('shopify:section:load', (e) => {
  const videoHero = e.target.querySelector('.video-hero');
  if (videoHero && !videoHero.videoHero) {
    videoHero.videoHero = new VideoHero(videoHero);
  }
});

document.addEventListener('shopify:section:unload', (e) => {
  const videoHero = e.target.querySelector('.video-hero');
  if (videoHero && videoHero.videoHero) {
    videoHero.videoHero.destroy();
    delete videoHero.videoHero;
  }
});

// Export for external use
window.VideoHero = VideoHero;