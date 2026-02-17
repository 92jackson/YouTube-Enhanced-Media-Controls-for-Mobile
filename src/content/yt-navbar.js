// yt-navbar.js
/**
 * @class YTCustomNavbar
 * @description A custom navigation bar for YouTube mobile that replaces the native navbar
 *              with a themed version that matches the custom player's appearance.
 */

class YTCustomNavbar {
	/**
	 * @description Initializes the custom navbar with the provided options.
	 * @param {object} options - Configuration options for the navbar.
	 */
	constructor(options = {}) {
		this.options = {
			showMixes: window.userSettings.navbarShowMixes,
			showPlaylists: window.userSettings.navbarShowPlaylists,
			showLive: window.userSettings.navbarShowLive,
			showMusic: window.userSettings.navbarShowMusic,
			showHomeButton: window.userSettings.navbarShowHomeButton,
			enableDebugLogging: window.userSettings.enableDebugLogging,
			...options,
		};

		this.navbarElement = null;
		this.isVisible = false;

		// Active state tracking
		this.chipObserver = null;
		this.currentActivePage = null;
		this.chipObserverRetryCount = 0;
		this.maxChipObserverRetries = 3;
		this.customSearchOverlay = null;
		this.customSearchInput = null;

		this._bindMethods();

		// Only create visual elements if not in headless mode (indicated by option)
		if (!this.options.headless) {
			this._createNavbar();
			this._setupEventListeners();
			this._setupChipObserver();
			this._updateActiveStates();
		}

		logger.log('Navbar', 'Custom navbar initialized', this.options);
	}

	/**
	 * @description Binds methods to maintain proper `this` context.
	 */
	_bindMethods() {
		this._handleLogoClick = this._handleLogoClick.bind(this);
		this._handleMixesClick = this._handleMixesClick.bind(this);
		this._handlePlaylistsClick = this._handlePlaylistsClick.bind(this);
		this._handleLiveClick = this._handleLiveClick.bind(this);
		this._handleMusicClick = this._handleMusicClick.bind(this);
		this._handleTextSearchClick = this._handleTextSearchClick.bind(this);
		this._handleCustomSearchClick = this._handleCustomSearchClick.bind(this);
		this._handleVoiceSearchClick = this._handleVoiceSearchClick.bind(this);
		this._handleFavouritesClick = this._handleFavouritesClick.bind(this);
		this._handleDebugLogsClick = this._handleDebugLogsClick.bind(this);
		this._handleVideoToggleClick = this._handleVideoToggleClick.bind(this);
		this._handleToggleDrawerClick = this._handleToggleDrawerClick.bind(this);
		this._handleDrawerStateChange = this._handleDrawerStateChange.bind(this);
		this._hideCustomSearchOverlay = this._hideCustomSearchOverlay.bind(this);
		this._submitCustomSearch = this._submitCustomSearch.bind(this);
	}

	/**
	 * @description Creates the navbar DOM structure and injects it into the DOM.
	 */
	_createNavbar() {
		this.navbarElement = this._createNavbarElement();

		// Insert at the beginning of body
		document.body.insertBefore(this.navbarElement, document.body.firstChild);
		document.body.classList.add('yt-custom-navbar-active');
		this.isVisible = true;

		// Listen for drawer state changes
		window.addEventListener('yt-drawer-state-change', this._handleDrawerStateChange);
	}

	/**
	 * @description Creates the DOM structure for the custom navbar.
	 * @returns {HTMLElement} The navbar DOM element.
	 */
	_createNavbarElement() {
		// Create main navbar
		const navbar = document.createElement('nav');
		navbar.className = 'yt-custom-navbar';
		navbar.classList.toggle('yt-navbar-has-logo', !!this.options.showHomeButton);

		// Create home button if enabled
		if (this.options.showHomeButton) {
			const logoDiv = document.createElement('div');
			logoDiv.className = 'yt-navbar-logo';

			const logoButton = document.createElement('button');
			logoButton.className = 'yt-navbar-logo-button';
			logoButton.setAttribute('data-action', 'home');

			// Create YouTube logo SVG
			const logoSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
			logoSvg.setAttribute('id', 'yt-ringo2-svg_yt1');
			logoSvg.setAttribute('viewBox', '0 0 30 20');
			logoSvg.setAttribute('focusable', 'false');
			logoSvg.setAttribute('aria-hidden', 'true');

			const logoGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');

			// Background path
			const bgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
			bgPath.setAttribute(
				'd',
				'M14.4848 20C14.4848 20 23.5695 20 25.8229 19.4C27.0917 19.06 28.0459 18.08 28.3808 16.87C29 14.65 29 9.98 29 9.98C29 9.98 29 5.34 28.3808 3.14C28.0459 1.9 27.0917 0.94 25.8229 0.61C23.5695 0 14.4848 0 14.4848 0C14.4848 0 5.42037 0 3.17711 0.61C1.9286 0.94 0.954148 1.9 0.59888 3.14C0 5.34 0 9.98 0 9.98C0 9.98 0 14.65 0.59888 16.87C0.954148 18.08 1.9286 19.06 3.17711 19.4C5.42037 20 14.4848 20 14.4848 20Z'
			);
			logoGroup.appendChild(bgPath);

			// Play button path
			const playPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
			playPath.setAttribute('d', 'M19 10L11.5 5.75V14.25L19 10Z');
			playPath.setAttribute('fill', 'white');
			logoGroup.appendChild(playPath);

			logoSvg.appendChild(logoGroup);
			logoButton.appendChild(logoSvg);
			logoDiv.appendChild(logoButton);
			navbar.appendChild(logoDiv);
		}

		// Create left section
		const leftDiv = document.createElement('div');
		leftDiv.className = 'yt-navbar-left';

		// Add left links
		if (this.options.showMixes) {
			const mixesBtn = document.createElement('button');
			mixesBtn.className = 'yt-navbar-link';
			mixesBtn.setAttribute('data-action', 'mixes');
			mixesBtn.textContent = 'MIXES';
			leftDiv.appendChild(mixesBtn);
		}
		if (this.options.showPlaylists) {
			const playlistsBtn = document.createElement('button');
			playlistsBtn.className = 'yt-navbar-link';
			playlistsBtn.setAttribute('data-action', 'playlists');
			playlistsBtn.textContent = 'PLAYLISTS';
			leftDiv.appendChild(playlistsBtn);
		}
		if (this.options.showLive) {
			const liveBtn = document.createElement('button');
			liveBtn.className = 'yt-navbar-link';
			liveBtn.setAttribute('data-action', 'live');
			liveBtn.textContent = 'LIVE';
			leftDiv.appendChild(liveBtn);
		}
		if (this.options.showMusic) {
			const musicBtn = document.createElement('button');
			musicBtn.className = 'yt-navbar-link';
			musicBtn.setAttribute('data-action', 'music');
			musicBtn.textContent = 'MUSIC';
			leftDiv.appendChild(musicBtn);
		}

		navbar.appendChild(leftDiv);

		// Create right section
		const rightDiv = document.createElement('div');
		rightDiv.className = 'yt-navbar-right';
		const slots = Array.isArray(window.userSettings.navbarRightSlots)
			? window.userSettings.navbarRightSlots
			: [];

		const usedActions = new Set();
		for (let i = 0; i < slots.length; i++) {
			const actionId = slots[i];
			const slotClassName = `yt-navbar-right-slot${i + 1}`;
			if (!actionId || actionId === 'none' || usedActions.has(actionId)) {
				continue;
			}
			const el = this._createNavbarRightControlForAction(actionId);
			if (!el) {
				continue;
			}
			el.classList.add(slotClassName);
			usedActions.add(actionId);
			rightDiv.appendChild(el);
		}

		navbar.appendChild(rightDiv);

		const customSearchOverlay = this._createCustomSearchOverlayElement();
		if (customSearchOverlay) {
			navbar.appendChild(customSearchOverlay);
		}

		return navbar;
	}

	_createNavbarRightControlForAction(actionId) {
		switch (actionId) {
			case 'play': {
				const playBtn = document.createElement('button');
				playBtn.className = 'yt-navbar-icon-button yt-navbar-play-toggle';
				playBtn.setAttribute('data-action', 'play');
				playBtn.setAttribute('aria-label', 'Play/Pause');

				const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
				svg.setAttribute('viewBox', '0 0 24 24');
				svg.setAttribute('width', '20');
				svg.setAttribute('height', '20');
				const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
				svg.appendChild(path);
				playBtn.appendChild(svg);

				this._updateNavbarPlayToggleIcon(playBtn);
				return playBtn;
			}
			case 'previous': {
				const prevBtn = document.createElement('button');
				prevBtn.className = 'yt-navbar-icon-button yt-navbar-previous';
				prevBtn.setAttribute('data-action', 'previous');
				prevBtn.setAttribute('aria-label', 'Previous');

				const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
				svg.setAttribute('viewBox', '0 0 24 24');
				svg.setAttribute('width', '20');
				svg.setAttribute('height', '20');
				const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
				path.setAttribute('d', 'M6 6h2v12H6zm3.5 6l8.5 6V6z');
				svg.appendChild(path);
				prevBtn.appendChild(svg);
				return prevBtn;
			}
			case 'restart-then-previous': {
				const prevBtn = document.createElement('button');
				prevBtn.className = 'yt-navbar-icon-button yt-navbar-restart-then-previous';
				prevBtn.setAttribute('data-action', 'restart-then-previous');
				prevBtn.setAttribute('aria-label', 'Restart then Previous');

				const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
				svg.setAttribute('viewBox', '0 0 24 24');
				svg.setAttribute('width', '20');
				svg.setAttribute('height', '20');
				const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
				path.setAttribute(
					'd',
					'M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6s-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8S16.42 4 12 4z'
				);
				svg.appendChild(path);
				prevBtn.appendChild(svg);
				return prevBtn;
			}
			case 'skip': {
				const nextBtn = document.createElement('button');
				nextBtn.className = 'yt-navbar-icon-button yt-navbar-skip';
				nextBtn.setAttribute('data-action', 'skip');
				nextBtn.setAttribute('aria-label', 'Next');

				const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
				svg.setAttribute('viewBox', '0 0 24 24');
				svg.setAttribute('width', '20');
				svg.setAttribute('height', '20');
				const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
				path.setAttribute('d', 'M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z');
				svg.appendChild(path);
				nextBtn.appendChild(svg);
				return nextBtn;
			}
			case 'seek-back': {
				const seekBackBtn = document.createElement('button');
				seekBackBtn.className = 'yt-navbar-icon-button yt-navbar-seek-back';
				seekBackBtn.setAttribute('data-action', 'seek-back');
				seekBackBtn.setAttribute('aria-label', 'Seek Back');

				const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
				svg.setAttribute('viewBox', '0 0 24 24');
				svg.setAttribute('width', '20');
				svg.setAttribute('height', '20');
				const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
				path.setAttribute('d', 'M11 18l-6.5-6L11 6v12zM19 18l-6.5-6L19 6v12z');
				svg.appendChild(path);
				seekBackBtn.appendChild(svg);
				return seekBackBtn;
			}
			case 'seek-forward': {
				const seekForwardBtn = document.createElement('button');
				seekForwardBtn.className = 'yt-navbar-icon-button yt-navbar-seek-forward';
				seekForwardBtn.setAttribute('data-action', 'seek-forward');
				seekForwardBtn.setAttribute('aria-label', 'Seek Forward');

				const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
				svg.setAttribute('viewBox', '0 0 24 24');
				svg.setAttribute('width', '20');
				svg.setAttribute('height', '20');
				const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
				path.setAttribute('d', 'M13 6l6.5 6L13 18V6zM5 6l6.5 6L5 18V6z');
				svg.appendChild(path);
				seekForwardBtn.appendChild(svg);
				return seekForwardBtn;
			}
			case 'repeat': {
				const repeatBtn = document.createElement('button');
				repeatBtn.className = 'yt-navbar-icon-button yt-navbar-repeat';
				repeatBtn.setAttribute('data-action', 'repeat');
				repeatBtn.setAttribute('aria-label', 'Repeat');

				const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
				svg.setAttribute('viewBox', '0 0 24 24');
				svg.setAttribute('width', '20');
				svg.setAttribute('height', '20');
				const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
				path.setAttribute(
					'd',
					'M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z'
				);
				svg.appendChild(path);
				repeatBtn.appendChild(svg);
				repeatBtn.classList.toggle('active', !!window.userSettings.repeatCurrentlyOn);
				repeatBtn.setAttribute(
					'aria-pressed',
					String(!!window.userSettings.repeatCurrentlyOn)
				);
				return repeatBtn;
			}
			case 'debug-logs': {
				if (!this.options.enableDebugLogging) return null;
				const debugBtn = document.createElement('button');
				debugBtn.className = 'yt-navbar-icon-button yt-navbar-debug-logs';
				debugBtn.setAttribute('data-action', 'debug-logs');
				debugBtn.setAttribute('aria-label', 'Download Debug Logs');

				const debugSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
				debugSvg.setAttribute('viewBox', '0 0 24 24');
				debugSvg.setAttribute('width', '20');
				debugSvg.setAttribute('height', '20');
				const debugPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
				debugPath.setAttribute(
					'd',
					'M20,8H17.19C16.74,7.22 16.12,6.55 15.37,6.04L17,4.41L15.59,3L13.42,5.17C12.96,5.06 12.49,5 12,5C11.51,5 11.04,5.06 10.59,5.17L8.41,3L7,4.41L8.62,6.04C7.88,6.55 7.26,7.22 6.81,8H4V10H6.09C6.04,10.33 6,10.66 6,11V12H4V14H6V15C6,15.34 6.04,15.67 6.09,16H4V18H6.81C7.85,19.79 9.78,21 12,21C14.22,21 16.15,19.79 17.19,18H20V16H17.91C17.96,15.67 18,15.34 18,15V14H20V12H18V11C18,10.66 17.96,10.33 17.91,10H20V8M16,15A4,4 0 0,1 12,19A4,4 0 0,1 8,15V11A4,4 0 0,1 12,7A4,4 0 0,1 16,11V15M14,10V12L15.5,13.5L14.5,14.5L12.5,12.5V10H14Z'
				);
				debugSvg.appendChild(debugPath);
				debugBtn.appendChild(debugSvg);
				return debugBtn;
			}
			case 'video-toggle': {
				const videoToggleBtn = document.createElement('button');
				videoToggleBtn.className = 'yt-navbar-icon-button yt-navbar-video-toggle';
				videoToggleBtn.setAttribute('data-action', 'video-toggle');
				videoToggleBtn.setAttribute('aria-label', 'Toggle Video Player');

				const videoToggleSvg = document.createElementNS(
					'http://www.w3.org/2000/svg',
					'svg'
				);
				videoToggleSvg.setAttribute('viewBox', '0 0 24 24');
				videoToggleSvg.setAttribute('width', '20');
				videoToggleSvg.setAttribute('height', '20');
				const videoTogglePath = document.createElementNS(
					'http://www.w3.org/2000/svg',
					'path'
				);

				const isVideoHidden = document.body.classList.contains('yt-hide-video-player');
				if (isVideoHidden) {
					videoTogglePath.setAttribute(
						'd',
						'M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4zM14 13h-3v3H9v-3H6v-2h3V8h2v3h3v2z'
					);
				} else {
					videoTogglePath.setAttribute(
						'd',
						'M21 6.5l-4 4V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11zM9.5 16L8 14.5 10.5 12 8 9.5 9.5 8 12 10.5 14.5 8 16 9.5 13.5 12 16 14.5 14.5 16 12 13.5 9.5 16z'
					);
				}

				videoToggleSvg.appendChild(videoTogglePath);
				videoToggleBtn.appendChild(videoToggleSvg);
				return videoToggleBtn;
			}
			case 'favourites': {
				const favouritesBtn = document.createElement('button');
				favouritesBtn.className = 'yt-navbar-icon-button yt-navbar-favourites';
				favouritesBtn.setAttribute('data-action', 'favourites');
				favouritesBtn.setAttribute('aria-label', 'Favourites');

				const favouritesSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
				favouritesSvg.setAttribute('viewBox', '0 0 24 24');
				favouritesSvg.setAttribute('width', '20');
				favouritesSvg.setAttribute('height', '20');
				const favouritesPath = document.createElementNS(
					'http://www.w3.org/2000/svg',
					'path'
				);
				favouritesPath.setAttribute(
					'd',
					'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'
				);
				favouritesSvg.appendChild(favouritesPath);
				favouritesBtn.appendChild(favouritesSvg);
				return favouritesBtn;
			}
			case 'toggle-drawer': {
				const drawerBtn = document.createElement('button');
				drawerBtn.className = 'yt-navbar-icon-button';
				drawerBtn.setAttribute('data-action', 'toggle-drawer');
				drawerBtn.setAttribute('aria-label', 'Toggle Playlist');

				const drawerSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
				drawerSvg.setAttribute('viewBox', '0 0 24 24');
				drawerSvg.setAttribute('width', '20');
				drawerSvg.setAttribute('height', '20');

				const drawerPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
				// Initial icon (Restore/Open)
				drawerPath.setAttribute(
					'd',
					'M19 4H5c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H5V6h14v12z'
				);

				drawerSvg.appendChild(drawerPath);
				drawerBtn.appendChild(drawerSvg);

				// Update icon state if player is available
				if (window.ytPlayerInstance) {
					// Defer slightly to ensure button is in DOM if needed,
					// though here we are creating it, so we can just update it.
					// Actually _updateDrawerToggleIcon searches by selector in navbarElement,
					// so we need to wait until it is appended or manually set it.
					// Let's just set the initial state if known.
					const state = window.ytPlayerInstance.drawerState || 'closed';
					let pathD =
						'M19 4H5c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H5V6h14v12z';
					let label = 'Open Playlist';

					if (state === 'mid') {
						const direction = window.ytPlayerInstance.drawerToggleDirection || 'up';
						if (direction === 'up') {
							pathD = 'M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z';
							label = 'Expand Playlist';
						} else {
							pathD = 'M6 19h12v2H6z';
							label = 'Close Playlist';
						}
					} else if (state === 'full') {
						pathD = 'M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z';
						label = 'Collapse to Mid';
					}
					drawerPath.setAttribute('d', pathD);
					drawerBtn.setAttribute('aria-label', label);
					const inst = window.ytPlayerInstance;
					const canToggle =
						typeof inst._canDragDrawer === 'function'
							? inst._canDragDrawer()
							: !!(
									inst &&
									inst.hasPlaylist &&
									inst.options &&
									inst.options.customPlaylistMode !== 'disabled' &&
									inst.options.customPlaylistMode !== 'fixed-fully-open' &&
									inst.options.customPlaylistMode !== 'fixed-below-video'
								);
					drawerBtn.style.display = canToggle ? '' : 'none';
				} else {
					drawerBtn.style.display = 'none';
				}

				return drawerBtn;
			}
			case 'text-search': {
				if (window.Selectors.getVariant() === 'desktop') {
					// TODO- Fix native search for desktop
					return;
				}

				const searchBtn = document.createElement('button');
				searchBtn.className = 'yt-navbar-icon-button';
				searchBtn.setAttribute('data-action', 'text-search');
				searchBtn.setAttribute('aria-label', 'Search');

				const searchSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
				searchSvg.setAttribute('viewBox', '0 0 24 24');
				searchSvg.setAttribute('width', '20');
				searchSvg.setAttribute('height', '20');
				const searchPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
				searchPath.setAttribute(
					'd',
					'M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z'
				);
				searchSvg.appendChild(searchPath);
				searchBtn.appendChild(searchSvg);
				return searchBtn;
			}
			case 'custom-search': {
				const searchBtn = document.createElement('button');
				searchBtn.className = 'yt-navbar-icon-button yt-navbar-custom-search';
				searchBtn.setAttribute('data-action', 'custom-search');
				searchBtn.setAttribute('aria-label', 'Custom Search');

				const searchSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
				searchSvg.setAttribute('viewBox', '0 0 24 24');
				searchSvg.setAttribute('width', '20');
				searchSvg.setAttribute('height', '20');
				const searchPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
				searchPath.setAttribute(
					'd',
					'M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z'
				);
				searchSvg.appendChild(searchPath);
				searchBtn.appendChild(searchSvg);
				return searchBtn;
			}
			case 'voice-search': {
				const voiceBtn = document.createElement('button');
				voiceBtn.className = 'yt-navbar-icon-button';
				voiceBtn.setAttribute('data-action', 'voice-search');
				voiceBtn.setAttribute('aria-label', 'Voice Search');

				const voiceSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
				voiceSvg.setAttribute('viewBox', '0 0 24 24');
				voiceSvg.setAttribute('width', '20');
				voiceSvg.setAttribute('height', '20');

				const voicePath1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
				voicePath1.setAttribute(
					'd',
					'M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z'
				);
				voiceSvg.appendChild(voicePath1);

				const voicePath2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
				voicePath2.setAttribute(
					'd',
					'M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z'
				);
				voiceSvg.appendChild(voicePath2);

				voiceBtn.appendChild(voiceSvg);
				return voiceBtn;
			}
			default:
				return null;
		}
	}

	/**
	 * @description Sets up event listeners for navbar interactions.
	 */
	_setupEventListeners() {
		if (!this.navbarElement) return;

		this.navbarElement.addEventListener('click', (event) => {
			const button = event.target.closest('[data-action]');
			if (!button) return;

			const action = button.dataset.action;
			logger.log('Navbar', `Navbar action clicked: ${action}`);

			switch (action) {
				case 'play':
					this._handlePlayPauseClick(button);
					break;
				case 'previous':
					this._handlePreviousClick('previous');
					break;
				case 'restart-then-previous':
					this._handlePreviousClick('restart-then-previous');
					break;
				case 'skip':
					this._handleSkipClick();
					break;
				case 'seek-back':
					this._handleSeekClick(-1);
					break;
				case 'seek-forward':
					this._handleSeekClick(1);
					break;
				case 'repeat':
					this._handleRepeatClick(button);
					break;
				case 'home':
					this._handleLogoClick();
					break;
				case 'mixes':
					this._handleMixesClick();
					break;
				case 'playlists':
					this._handlePlaylistsClick();
					break;
				case 'live':
					this._handleLiveClick();
					break;
				case 'music':
					this._handleMusicClick();
					break;
				case 'text-search':
					this._handleTextSearchClick();
					break;
				case 'custom-search':
					this._handleCustomSearchClick();
					break;
				case 'voice-search':
					this._handleVoiceSearchClick();
					break;
				case 'favourites':
					this._handleFavouritesClick();
					break;
				case 'debug-logs':
					this._handleDebugLogsClick();
					break;
				case 'video-toggle':
					this._handleVideoToggleClick();
					break;
				case 'toggle-drawer':
					this._handleToggleDrawerClick();
					break;
			}
		});
		// Add event listener to close dialog when pressing Escape
		document.addEventListener('keydown', (event) => {
			if (event.key === 'Escape') {
				if (
					this.navbarElement &&
					this.navbarElement.classList.contains('yt-navbar-custom-search-active')
				) {
					this._hideCustomSearchOverlay();
					return;
				}
				const overlay = document.querySelector('.yt-favourites-dialog-overlay');
				if (overlay && overlay.classList.contains('visible')) {
					this._hideFavouritesDialog();
				}
			}
		});
	}

	_createCustomSearchOverlayElement() {
		const overlay = document.createElement('div');
		overlay.className = 'yt-navbar-custom-search-overlay';

		const backBtn = document.createElement('button');
		backBtn.className = 'yt-navbar-icon-button yt-navbar-custom-search-back';
		backBtn.setAttribute('aria-label', 'Back');
		backBtn.addEventListener('click', () => {
			this._hideCustomSearchOverlay();
		});

		const backSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		backSvg.setAttribute('viewBox', '0 0 24 24');
		backSvg.setAttribute('width', '20');
		backSvg.setAttribute('height', '20');
		const backPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		backPath.setAttribute('d', 'M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z');
		backSvg.appendChild(backPath);
		backBtn.appendChild(backSvg);

		const input = document.createElement('input');
		input.type = 'text';
		input.className = 'yt-navbar-custom-search-input';
		input.setAttribute('aria-label', 'Search query');
		input.placeholder = 'Search';
		input.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				e.preventDefault();
				this._submitCustomSearch();
			} else if (e.key === 'Escape') {
				e.preventDefault();
				this._hideCustomSearchOverlay();
			}
		});

		const submitBtn = document.createElement('button');
		submitBtn.className = 'yt-navbar-icon-button yt-navbar-custom-search-submit';
		submitBtn.setAttribute('aria-label', 'Search');
		submitBtn.addEventListener('click', () => {
			this._submitCustomSearch();
		});

		const submitSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		submitSvg.setAttribute('viewBox', '0 0 24 24');
		submitSvg.setAttribute('width', '20');
		submitSvg.setAttribute('height', '20');
		const submitPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		submitPath.setAttribute(
			'd',
			'M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z'
		);
		submitSvg.appendChild(submitPath);
		submitBtn.appendChild(submitSvg);

		overlay.appendChild(backBtn);
		overlay.appendChild(input);
		overlay.appendChild(submitBtn);

		this.customSearchOverlay = overlay;
		this.customSearchInput = input;
		return overlay;
	}

	_handleCustomSearchClick() {
		if (!this.navbarElement || !this.customSearchInput) return;
		this.navbarElement.classList.add('yt-navbar-custom-search-active');
		this.customSearchInput.value = '';
		setTimeout(() => {
			this.customSearchInput.focus();
		}, 0);
	}

	_hideCustomSearchOverlay() {
		if (!this.navbarElement || !this.customSearchInput) return;
		this.navbarElement.classList.remove('yt-navbar-custom-search-active');
		this.customSearchInput.value = '';
	}

	_submitCustomSearch() {
		if (!this.customSearchInput) return;
		const query = this.customSearchInput.value.trim();
		if (!query) {
			this.customSearchInput.focus();
			return;
		}
		const path = `/results?search_query=${encodeURIComponent(query)}`;
		window.history.pushState({}, '', path);
		window.dispatchEvent(new PopStateEvent('popstate'));
		this._hideCustomSearchOverlay();
		this._handleNavigation();
	}

	/**
	 * @description Updates active states with retry logic for SPA navigation delays.
	 * @param {number} attempt - Current attempt number.
	 */
	_updateActiveStatesWithRetry(attempt = 0) {
		const MAX_ATTEMPTS = 5;
		const RETRY_DELAY = 300;

		// Try to find the chip bar first
		const chipBar = DOMUtils.getElement(CSS_SELECTORS.filterChipBar);
		if (!chipBar && attempt < MAX_ATTEMPTS) {
			setTimeout(() => {
				this._updateActiveStatesWithRetry(attempt + 1);
			}, RETRY_DELAY);
			return;
		}

		this._updateActiveStates();
	}

	/**
	 * @description Sets up observer to watch for filter chip state changes on the home page.
	 *              Uses retry logic to handle cases where chip bar loads after navbar initialization.
	 */
	_setupChipObserver() {
		// Only observe chips on the home page
		if (window.location.pathname !== '/') {
			logger.log('Navbar', 'Not on home page, skipping chip observer setup');
			return;
		}

		const chipBar = DOMUtils.getElement(CSS_SELECTORS.filterChipBar);
		if (!chipBar) {
			// Retry with exponential backoff if chip bar isn't loaded yet
			if (this.chipObserverRetryCount < this.maxChipObserverRetries) {
				this.chipObserverRetryCount++;
				const retryDelay = Math.min(1000 * this.chipObserverRetryCount, 3000);
				logger.log(
					'Navbar',
					`Chip bar not found, retrying in ${retryDelay}ms (attempt ${this.chipObserverRetryCount})`
				);
				setTimeout(() => {
					this._setupChipObserver();
					this._updateActiveStatesWithRetry();
				}, retryDelay);
			} else {
				logger.warn(
					'Navbar',
					'Chip bar not found after maximum retries, skipping chip observer'
				);
			}
			return;
		}

		// Clean up existing observer
		if (this.chipObserver) {
			this.chipObserver.disconnect();
		}

		this.chipObserver = new MutationObserver(() => {
			// Debounce updates to avoid excessive calls during rapid DOM changes
			clearTimeout(this._chipUpdateTimeout);
			this._chipUpdateTimeout = setTimeout(() => {
				this._updateActiveStates();
			}, 100);
		});

		this.chipObserver.observe(chipBar, {
			childList: true,
			subtree: true,
			attributes: true,
			attributeFilter: ['class', 'aria-selected'],
		});

		this.chipObserverRetryCount = 0; // Reset retry count on successful setup
		logger.log('Navbar', 'Chip observer set up successfully');
	}

	/**
	 * @description Updates active states for all navbar links based on current page and selected chips.
	 *              Optimized to minimize DOM queries and only update when necessary.
	 */
	_updateActiveStates() {
		if (!this.navbarElement) return;

		const currentPath = window.location.pathname;
		const links = this.navbarElement.querySelectorAll('.yt-navbar-link');

		// Store current active link to avoid unnecessary DOM manipulation
		const currentActiveLink = this.navbarElement.querySelector('.yt-navbar-link.active');
		let newActiveLink = null;

		// Check for playlist page (simple URL-based detection)
		if (currentPath === '/feed/playlists') {
			newActiveLink = this.navbarElement.querySelector('[data-action="playlists"]');
		} else if (currentPath === '/') {
			// For home page, check active chips
			newActiveLink = this._getActiveLinkFromChips();
		}

		// Only update DOM if active link changed
		if (currentActiveLink !== newActiveLink) {
			// Remove active class from all links
			links.forEach((link) => link.classList.remove('active'));

			// Add active class to new active link
			if (newActiveLink) {
				newActiveLink.classList.add('active');
				logger.log('Navbar', `Active state updated for: ${newActiveLink.dataset.action}`);
			}
		}
	}

	/**
	 * @description Determines which navbar link should be active based on selected filter chips.
	 * @returns {Element|null} The navbar link element that should be active, or null if none.
	 */
	_getActiveLinkFromChips() {
		const activeChip = DOMUtils.getElement(CSS_SELECTORS.filterChipSelected);

		if (!activeChip) return null;

		const chipLabel = DOMUtils.getAttribute(
			activeChip.querySelector('.chip-container'),
			'aria-label'
		);
		if (!chipLabel) return null;

		// Map chip labels to navbar actions (case-insensitive for robustness)
		const chipToAction = {
			mixes: 'mixes',
			live: 'live',
			music: 'music',
		};

		const normalizedLabel = chipLabel.toLowerCase();
		const action = chipToAction[normalizedLabel];

		if (action) {
			const link = this.navbarElement.querySelector(`[data-action="${action}"]`);
			if (link) {
				logger.log('Navbar', `Active chip detected: ${chipLabel} -> ${action}`);
				return link;
			}
		}

		return null;
	}

	/**
	 * @description Handles navigation state changes and updates active states accordingly.
	 *              Called after navigation to ensure proper active state synchronization.
	 */
	_handleNavigation() {
		// Reset retry count for new page
		this.chipObserverRetryCount = 0;

		// Update active states after a brief delay to allow page content to load
		setTimeout(() => {
			this._updateActiveStatesWithRetry();

			// Setup or cleanup chip observer based on current page
			if (window.location.pathname === '/') {
				this._setupChipObserver();
			} else {
				this._cleanupChipObserver();
			}
		}, 300);
	}

	/**
	 * @description Cleans up the chip observer and related timers.
	 */
	_cleanupChipObserver() {
		if (this.chipObserver) {
			this.chipObserver.disconnect();
			this.chipObserver = null;
		}
		if (this._chipUpdateTimeout) {
			clearTimeout(this._chipUpdateTimeout);
			this._chipUpdateTimeout = null;
		}
	}

	/**
	 * @description Sets active state immediately for better user experience during navigation.
	 * @param {string} action - The action name of the link to activate.
	 */
	_setImmediateActiveState(action) {
		if (!this.navbarElement) return;

		const links = this.navbarElement.querySelectorAll('.yt-navbar-link');
		const targetLink = this.navbarElement.querySelector(`[data-action="${action}"]`);

		if (targetLink) {
			// Remove active from all, add to target
			links.forEach((link) => link.classList.remove('active'));
			targetLink.classList.add('active');
		}
	}

	/**
	 * @description Handles navigation using SPA routing.
	 * @param {string} path - The path to navigate to.
	 */
	_navigateToPath(path) {
		if (window.location.pathname !== path) {
			logger.log('Navbar', `Navigating to: ${path}`);
			window.history.pushState({}, '', path);
			window.dispatchEvent(new PopStateEvent('popstate'));
			this._handleNavigation();
		}
	}

	/**
	 * @description Clicks a filter chip in the chip bar.
	 * @param {string} chipLabel - The aria-label of the chip to click.
	 */
	_clickFilterChip(chipLabel, attempt = 0) {
		const MAX_ATTEMPTS = 5;
		const RETRY_DELAY = 300;

		setTimeout(() => {
			const chipSelector = window.Selectors.format('filterChipContainerByLabel', {
				chipLabel,
			});
			let chipContainer = DOMUtils.getElement(chipSelector);

			if (!chipContainer || window.Selectors.getVariant() === 'desktop') {
				chipContainer = DOMUtils.getElement(
					CSS_SELECTORS.filterChipContainerByLabel,
					document,
					false,
					chipLabel
				);
			}

			if (chipContainer) {
				const clickTarget =
					chipContainer.closest('button') ||
					chipContainer.querySelector('button') ||
					chipContainer;

				logger.log('Navbar', `Clicking filter chip: ${chipLabel}`);
				clickTarget.click();
			} else if (attempt < MAX_ATTEMPTS) {
				logger.log(
					'Navbar',
					`Retrying filter chip click (${attempt + 1}/${MAX_ATTEMPTS})...`
				);
				this._clickFilterChip(chipLabel, attempt + 1);
			} else {
				logger.warn(
					'Navbar',
					`Filter chip not found after ${MAX_ATTEMPTS} attempts: ${chipLabel}`
				);
			}
		}, RETRY_DELAY);
	}

	/**
	 * @description Handles logo/home button click.
	 */
	_handleLogoClick() {
		this._navigateToPath('/');
		// Clear all active states when going to home
		setTimeout(() => {
			if (this.navbarElement) {
				this.navbarElement
					.querySelectorAll('.yt-navbar-link')
					.forEach((link) => link.classList.remove('active'));
			}
		}, 50);
	}

	/**
	 * @description Handles Mixes link click.
	 */
	_handleMixesClick() {
		this._navigateToPath('/');
		this._clickFilterChip('Mixes');
		this._setImmediateActiveState('mixes');
	}

	/**
	 * @description Handles Playlists link click.
	 */
	_handlePlaylistsClick() {
		this._navigateToPath('/feed/playlists');
		this._setImmediateActiveState('playlists');
	}

	/**
	 * @description Handles Live link click.
	 */
	_handleLiveClick() {
		this._navigateToPath('/');
		this._clickFilterChip('Live');
		this._setImmediateActiveState('live');
	}

	/**
	 * @description Handles Music link click.
	 */
	_handleMusicClick() {
		this._navigateToPath('/');
		this._clickFilterChip('Music');
		this._setImmediateActiveState('music');
	}

	/**
	 * @description Handles text search button click.
	 */
	_handleTextSearchClick() {
		const selectors = {
			headerSearchButton: CSS_SELECTORS.headerSearchButton,
			resultsPageSearchButton: CSS_SELECTORS.resultsPageTextSearchButton,
		};

		(async () => {
			// Choose appropriate target based on page type
			let targetSelector = PageUtils.isResultsPage()
				? selectors.resultsPageSearchButton
				: selectors.headerSearchButton;

			let success = await DOMUtils.clickElement(targetSelector);
			// Fallback: if results button not found, try header button
			if (!success && targetSelector === selectors.resultsPageSearchButton) {
				success = await DOMUtils.clickElement(selectors.headerSearchButton);
			}

			if (success) {
				logger.log(
					'Navbar',
					`Clicking text search button (${
						PageUtils.isResultsPage() ? 'results' : 'header'
					})`
				);
			} else {
				logger.warn('Navbar', 'Text search button not found');
			}
		})();
	}

	/**
	 * @description Handles voice search button click.
	 */
	_handleVoiceSearchClick() {
		(async () => {
			const success = await DOMUtils.clickElement(CSS_SELECTORS.headerVoiceButton, {
				primeSelectorOrElement: CSS_SELECTORS.headerSearchButton,
				primeReadySelectorOrElement: CSS_SELECTORS.headerCloseSearchButton,
				primeUndoSelectorOrElement: CSS_SELECTORS.headerCloseSearchButton,
			});

			if (success) {
				logger.log('Navbar', 'Clicking voice search button');
			} else {
				logger.warn('Navbar', 'Voice search button not found');
			}
		})();
	}

	/**
	 * @description Handles favourites button click to show dialog.
	 */
	_handleFavouritesClick() {
		logger.log('Navbar', 'Favourites button clicked');
		this._showFavouritesDialog();
	}

	/**
	 * @description Handles video toggle button click to toggle video player visibility.
	 */
	_handleVideoToggleClick() {
		logger.log('Navbar', 'Video toggle button clicked');

		// Toggle the setting
		const newValue = !window.userSettings.hideVideoPlayer;
		window.userSettings.hideVideoPlayer = newValue;

		// Save the setting to storage
		if (window.storageApi && window.storageApi.local) {
			window.storageApi.local.set({ hideVideoPlayer: newValue });
		}

		// Apply the change immediately by toggling the body class
		document.body.classList.toggle('yt-hide-video-player', newValue);

		// Update the button icon to reflect the new state
		this._updateVideoToggleIcon();

		// Trigger measurements recalculation if player exists
		if (
			window.ytPlayerInstance &&
			window.ytPlayerInstance._invalidateAndRecalculateMeasurements
		) {
			window.ytPlayerInstance._invalidateAndRecalculateMeasurements();
		}

		logger.log(
			'Navbar',
			`Video player visibility toggled to: ${newValue ? 'hidden' : 'visible'}`
		);
	}

	/**
	 * @description Handles toggle drawer button click.
	 */
	_handleToggleDrawerClick() {
		logger.log('Navbar', 'Toggle drawer button clicked');
		if (
			window.ytPlayerInstance &&
			typeof window.ytPlayerInstance.toggleDrawerState === 'function'
		) {
			window.ytPlayerInstance.toggleDrawerState();
		} else {
			logger.warn(
				'Navbar',
				'YTMediaPlayer instance not found or toggleDrawerState not available'
			);
		}
	}

	/**
	 * @description Updates the video toggle button icon based on current state.
	 */
	_updateVideoToggleIcon() {
		const videoToggleBtn = this.navbarElement.querySelector('.yt-navbar-video-toggle');
		if (!videoToggleBtn) return;

		const videoTogglePath = videoToggleBtn.querySelector('path');
		if (!videoTogglePath) return;

		const isVideoHidden = document.body.classList.contains('yt-hide-video-player');

		if (isVideoHidden) {
			// Show video icon (when video is currently hidden)
			videoTogglePath.setAttribute(
				'd',
				'M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4zM14 13h-3v3H9v-3H6v-2h3V8h2v3h3v2z'
			);
			videoToggleBtn.setAttribute('aria-label', 'Show Video Player');
		} else {
			// Hide video icon (when video is currently visible)
			videoTogglePath.setAttribute(
				'd',
				'M21 6.5l-4 4V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11zM9.5 16L8 14.5 10.5 12 8 9.5 9.5 8 12 10.5 14.5 8 16 9.5 13.5 12 16 14.5 14.5 16 12 13.5 9.5 16z'
			);
			videoToggleBtn.setAttribute('aria-label', 'Hide Video Player');
		}
	}

	/**
	 * @description Handles drawer state change event.
	 * @param {CustomEvent} event - The drawer state change event.
	 */
	_handleDrawerStateChange(event) {
		const { state, toggleDirection } = event.detail;
		this._updateDrawerToggleIcon(state, toggleDirection);
	}

	/**
	 * @description Updates the drawer toggle button icon based on current state.
	 * @param {string} state - The current drawer state ('closed', 'mid', 'full').
	 * @param {string} toggleDirection - The current toggle direction ('up' or 'down').
	 */
	_updateDrawerToggleIcon(state, toggleDirection = 'up') {
		const drawerBtn = this.navbarElement.querySelector('[data-action="toggle-drawer"]');
		if (!drawerBtn) return;

		const drawerPath = drawerBtn.querySelector('path');
		if (!drawerPath) return;

		const inst = window.ytPlayerInstance;
		const canToggle =
			typeof inst?._canDragDrawer === 'function'
				? inst._canDragDrawer()
				: !!(
						inst &&
						inst.hasPlaylist &&
						inst.options &&
						inst.options.customPlaylistMode !== 'disabled' &&
						inst.options.customPlaylistMode !== 'fixed-fully-open' &&
						inst.options.customPlaylistMode !== 'fixed-below-video'
					);
		drawerBtn.style.display = canToggle ? '' : 'none';
		if (!canToggle) return;

		let pathD = '';
		let label = '';

		switch (state) {
			case 'mid':
				if (toggleDirection === 'up') {
					// Arrow Up (Expand)
					pathD = 'M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z';
					label = 'Expand Playlist';
				} else {
					// Minimize (Close)
					pathD = 'M6 19h12v2H6z';
					label = 'Close Playlist';
				}
				break;
			case 'full':
				// Arrow Down (Collapse)
				pathD = 'M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z';
				label = 'Collapse to Mid';
				break;
			case 'closed':
			default:
				// Restore (Open)
				pathD =
					'M19 4H5c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H5V6h14v12z';
				label = 'Open Playlist';
				break;
		}

		drawerPath.setAttribute('d', pathD);
		drawerBtn.setAttribute('aria-label', label);
	}

	/**
	 * @description Handles debug logs button click to download logs.
	 */
	_handleDebugLogsClick() {
		logger.log('Navbar', 'Debug logs button clicked');
		if (window.logger && typeof window.logger.downloadLogs === 'function') {
			window.logger.downloadLogs();
		} else {
			logger.warn('Navbar', 'Logger download function not available');
		}
	}

	/**
	 * @description Shows the favourites dialog.
	 */
	_showFavouritesDialog() {
		// Remove existing dialog if any
		const existingDialog = document.querySelector('.yt-favourites-dialog-overlay');
		if (existingDialog) {
			existingDialog.remove();
		}

		// Create modal overlay
		const overlay = document.createElement('div');
		overlay.className = 'yt-favourites-dialog-overlay';
		overlay.addEventListener('click', (e) => {
			if (e.target === overlay) {
				this._hideFavouritesDialog();
			}
		});

		// Create modal container
		const modal = document.createElement('div');
		modal.className = 'yt-favourites-dialog-modal';
		modal.addEventListener('click', (e) => e.stopPropagation());

		// Create header
		const header = document.createElement('div');
		header.className = 'yt-favourites-dialog-header';

		const title = document.createElement('div');
		title.className = 'yt-favourites-dialog-title';
		title.textContent = 'Favourites';

		// Create right section for buttons
		const rightSection = document.createElement('div');
		rightSection.className = 'yt-favourites-dialog-header-right';

		// Check if we're on a page with content we can add to favorites
		const urlParams = new URLSearchParams(window.location.search);
		const hasVideoId = !!urlParams.get('v');

		let addToFavBtn = null;
		if (hasVideoId) {
			addToFavBtn = document.createElement('button');
			addToFavBtn.className = 'yt-favourites-dialog-add-btn';
			addToFavBtn.textContent = '+ Add';

			addToFavBtn.addEventListener('click', (e) => {
				const existingMenu = document.getElementById('yt-add-to-favourites-overlay');
				if (existingMenu) {
					this._hideAddToFavouritesDropdown();
				} else {
					this._showAddToFavouritesDropdown(e, addToFavBtn);
				}
			});
		}

		const filterButton = document.createElement('button');
		filterButton.className = 'yt-favourites-dialog-filter-toggle';
		filterButton.setAttribute('aria-label', 'Filter');

		// Create SVG element without using innerHTML
		const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		svg.setAttribute('width', '16');
		svg.setAttribute('height', '16');
		svg.setAttribute('viewBox', '0 0 24 24');
		svg.setAttribute('fill', 'currentColor');

		const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		path.setAttribute('d', 'M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z');

		svg.appendChild(path);
		filterButton.appendChild(svg);

		filterButton.addEventListener('click', () => this._showFilterPopup());

		const searchButton = document.createElement('button');
		searchButton.className = 'yt-favourites-dialog-search-toggle';
		searchButton.setAttribute('aria-label', 'Search');

		// Create SVG element without using innerHTML
		const searchSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		searchSvg.setAttribute('width', '16');
		searchSvg.setAttribute('height', '16');
		searchSvg.setAttribute('viewBox', '0 0 24 24');
		searchSvg.setAttribute('fill', 'currentColor');

		const searchPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		searchPath.setAttribute(
			'd',
			'M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z'
		);

		searchSvg.appendChild(searchPath);
		searchButton.appendChild(searchSvg);

		searchButton.addEventListener('click', (e) => {
			e.preventDefault();
			e.stopPropagation();
			this._showSearchInput();
		});

		const closeBtn = document.createElement('button');
		closeBtn.className = 'yt-favourites-dialog-close';
		closeBtn.setAttribute('aria-label', 'Close');

		// Create SVG element without using innerHTML
		const closeSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		closeSvg.setAttribute('width', '16');
		closeSvg.setAttribute('height', '16');
		closeSvg.setAttribute('viewBox', '0 0 24 24');
		closeSvg.setAttribute('fill', 'currentColor');

		const closePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		closePath.setAttribute(
			'd',
			'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z'
		);

		closeSvg.appendChild(closePath);
		closeBtn.appendChild(closeSvg);

		closeBtn.addEventListener('click', () => this._hideFavouritesDialog());

		if (addToFavBtn) rightSection.appendChild(addToFavBtn);
		rightSection.appendChild(searchButton);
		rightSection.appendChild(filterButton);
		rightSection.appendChild(closeBtn);
		header.appendChild(title);
		header.appendChild(rightSection);

		// Create search input container (initially hidden)
		const searchContainer = document.createElement('div');
		searchContainer.className = 'yt-favourites-dialog-search-container';
		searchContainer.style.display = 'none';

		const searchInput = document.createElement('input');
		searchInput.type = 'text';
		searchInput.className = 'yt-favourites-dialog-search-input';
		searchInput.placeholder = 'Search favorites...';
		// Remove debug logging from search input and filtering
		searchInput.addEventListener('input', (e) => {
			this._filterFavoritesBySearch(e.target.value);
		});
		searchInput.addEventListener('keydown', (e) => {
			if (e.key === 'Escape') {
				this._hideSearchInput();
			}
		});

		const clearSearchBtn = document.createElement('button');
		clearSearchBtn.className = 'yt-favourites-dialog-search-clear';
		clearSearchBtn.textContent = '×';
		clearSearchBtn.setAttribute('aria-label', 'Clear search');
		clearSearchBtn.addEventListener('click', () => this._hideSearchInput());

		searchContainer.appendChild(searchInput);
		searchContainer.appendChild(clearSearchBtn);
		header.appendChild(searchContainer);

		modal.appendChild(header);

		// Create content area
		const content = document.createElement('div');
		content.className = 'yt-favourites-dialog-content';

		// Add favourites list container
		const favouritesList = document.createElement('div');
		favouritesList.className = 'yt-favourites-dialog-list';
		content.appendChild(favouritesList);

		modal.appendChild(content);
		overlay.appendChild(modal);

		// Add to DOM
		document.body.appendChild(overlay);

		// Update content
		this._updateFavouritesDialog();

		// Trigger bottom sheet animation - slide in from bottom
		requestAnimationFrame(() => {
			overlay.classList.add('visible');
			modal.classList.add('slide-in');
		});
	}

	/**
	 * @description Shows the filter popup for the favourites dialog.
	 */
	_showFilterPopup() {
		// Remove any existing filter popup
		this._hideFilterPopup();

		// Create filter popup overlay
		const filterOverlay = document.createElement('div');
		filterOverlay.className = 'yt-filter-popup-overlay';
		filterOverlay.id = 'yt-filter-popup-overlay';

		// Create filter popup modal
		const filterModal = document.createElement('div');
		filterModal.className = 'yt-filter-popup-modal';

		// Create header
		const header = document.createElement('div');
		header.className = 'yt-filter-popup-header';

		const title = document.createElement('h3');
		title.textContent = 'Filter & Sort';
		title.className = 'yt-filter-popup-title';

		const closeBtn = document.createElement('button');
		closeBtn.className = 'yt-filter-popup-close';
		closeBtn.setAttribute('aria-label', 'Close');
		closeBtn.textContent = '×';
		closeBtn.addEventListener('click', () => this._hideFilterPopup());

		header.appendChild(title);
		header.appendChild(closeBtn);
		filterModal.appendChild(header);

		// Create content area
		const content = document.createElement('div');
		content.className = 'yt-filter-popup-content';

		// Filter section
		const filterSection = document.createElement('div');
		filterSection.className = 'yt-filter-popup-section';

		const filterLabel = document.createElement('h4');
		filterLabel.textContent = 'Show';
		filterLabel.className = 'yt-filter-popup-section-title';
		filterSection.appendChild(filterLabel);

		const filterButtons = [
			{ value: 'all', label: 'All' },
			{ value: 'mixes', label: 'Mixes' },
			{ value: 'playlists', label: 'Playlists' },
			{ value: 'videos', label: 'Videos' },
			{ value: 'snapshots', label: 'Snapshots' },
		];

		const filterButtonsContainer = document.createElement('div');
		filterButtonsContainer.className = 'yt-filter-popup-buttons';

		filterButtons.forEach(({ value, label }) => {
			const filterBtn = document.createElement('button');
			filterBtn.className = 'yt-filter-popup-btn';
			filterBtn.textContent = label;
			filterBtn.dataset.filter = value;

			// Set active state based on current setting
			if (window.userSettings.favouritesDialogFilter === value) {
				filterBtn.classList.add('active');
			}

			filterBtn.addEventListener('click', () => {
				// Update active state
				filterButtonsContainer.querySelectorAll('.yt-filter-popup-btn').forEach((btn) => {
					btn.classList.remove('active');
				});
				filterBtn.classList.add('active');

				// Save setting
				window.userSettings.favouritesDialogFilter = value;
				if (window.storageApi && window.storageApi.local) {
					window.storageApi.local.set({ favouritesDialogFilter: value });
				}

				// Update the list
				this._updateFavouritesDialog();
			});

			filterButtonsContainer.appendChild(filterBtn);
		});

		filterSection.appendChild(filterButtonsContainer);
		content.appendChild(filterSection);

		// Sort section
		const sortSection = document.createElement('div');
		sortSection.className = 'yt-filter-popup-section';

		const sortLabel = document.createElement('h4');
		sortLabel.textContent = 'Sort by';
		sortLabel.className = 'yt-filter-popup-section-title';
		sortSection.appendChild(sortLabel);

		const sortOptions = [
			{ value: 'newestFirst', label: 'Newest First' },
			{ value: 'oldestFirst', label: 'Oldest First' },
			{ value: 'aToZ', label: 'A-Z' },
			{ value: 'zToA', label: 'Z-A' },
			{ value: 'type', label: 'Type' },
		];

		const sortButtonsContainer = document.createElement('div');
		sortButtonsContainer.className = 'yt-filter-popup-buttons';

		sortOptions.forEach(({ value, label }) => {
			const sortBtn = document.createElement('button');
			sortBtn.className = 'yt-filter-popup-btn';
			sortBtn.textContent = label;
			sortBtn.dataset.sort = value;

			// Set active state based on current setting
			if (window.userSettings.favouritesDialogSort === value) {
				sortBtn.classList.add('active');
			}

			sortBtn.addEventListener('click', () => {
				// Update active state
				sortButtonsContainer.querySelectorAll('.yt-filter-popup-btn').forEach((btn) => {
					btn.classList.remove('active');
				});
				sortBtn.classList.add('active');

				// Save setting
				window.userSettings.favouritesDialogSort = value;
				if (window.storageApi && window.storageApi.local) {
					window.storageApi.local.set({ favouritesDialogSort: value });
				}

				// Update the list
				this._updateFavouritesDialog();
			});

			sortButtonsContainer.appendChild(sortBtn);
		});

		sortSection.appendChild(sortButtonsContainer);
		content.appendChild(sortSection);

		filterModal.appendChild(content);
		filterOverlay.appendChild(filterModal);

		// Add to DOM
		document.body.appendChild(filterOverlay);

		// Add click outside listener to close popup
		filterOverlay.addEventListener('click', (e) => {
			if (e.target === filterOverlay) {
				this._hideFilterPopup();
			}
		});

		// Trigger animation
		requestAnimationFrame(() => {
			filterOverlay.classList.add('visible');
			filterModal.classList.add('slide-in');
		});
	}

	/**
	 * @description Hides the filter popup.
	 */
	_hideFilterPopup() {
		const filterOverlay = document.querySelector('.yt-filter-popup-overlay');
		const filterModal = document.querySelector('.yt-filter-popup-modal');
		if (filterOverlay && filterModal) {
			// Start slide out animation
			filterOverlay.classList.remove('visible');
			filterModal.classList.remove('slide-in');
			filterModal.classList.add('slide-out');

			// Remove from DOM after animation completes
			setTimeout(() => {
				filterOverlay.remove();
			}, 300);
		}
	}

	_showSnapshotReorderDialog(snapshotId) {
		this._hideSnapshotReorderDialog();

		const snapshots = window.userSettings.mixSnapshots || {};
		const snap = snapshots[snapshotId];
		if (!snap || !Array.isArray(snap.items)) return;

		const overlay = document.createElement('div');
		overlay.className = 'yt-snapshot-reorder-overlay';
		overlay.id = 'yt-snapshot-reorder-overlay';

		const modal = document.createElement('div');
		modal.className = 'yt-snapshot-reorder-modal';

		const header = document.createElement('div');
		header.className = 'yt-snapshot-reorder-header';

		const closeBtn = document.createElement('button');
		closeBtn.className = 'yt-snapshot-reorder-close';
		closeBtn.setAttribute('aria-label', 'Close');
		closeBtn.textContent = '×';
		closeBtn.addEventListener('click', () => this._hideSnapshotReorderDialog());

		const title = document.createElement('div');
		title.className = 'yt-snapshot-reorder-header-title';
		title.textContent = snap.title || 'Mix Snapshot';

		const doneBtn = document.createElement('button');
		doneBtn.className = 'yt-snapshot-reorder-done';
		doneBtn.textContent = 'Done';
		doneBtn.addEventListener('click', async () => {
			await this._saveSnapshotReorderDialog(snapshotId);
			this._hideSnapshotReorderDialog();
			this._updateFavouritesDialog();
		});

		header.appendChild(closeBtn);
		header.appendChild(title);
		header.appendChild(doneBtn);

		const content = document.createElement('div');
		content.className = 'yt-snapshot-reorder-content';

		const list = document.createElement('div');
		list.className = 'yt-snapshot-reorder-list';

		const createHandleSvg = () => {
			const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
			svg.setAttribute('viewBox', '0 0 24 24');
			svg.setAttribute('width', '18');
			svg.setAttribute('height', '18');
			const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
			path.setAttribute('d', 'M3 10h18v2H3v-2zm0-5h18v2H3V5zm0 10h18v2H3v-2zm0 5h18v2H3v-2z');
			svg.appendChild(path);
			return svg;
		};

		snap.items.forEach((snapItem, idx) => {
			const row = document.createElement('div');
			row.className = 'yt-snapshot-reorder-item';
			row.dataset.videoId = snapItem?.id || '';

			const handle = document.createElement('button');
			handle.className = 'yt-snapshot-reorder-handle';
			handle.setAttribute('aria-label', 'Drag to reorder');
			handle.appendChild(createHandleSvg());

			const thumbWrap = document.createElement('div');
			thumbWrap.className = 'yt-snapshot-reorder-thumb';
			const thumbImg = document.createElement('img');
			const thumbUrl =
				MediaUtils.getStandardThumbnailUrl(snapItem?.id) || snapItem?.thumbnailUrl || '';
			if (thumbUrl) {
				thumbImg.src = thumbUrl;
			}
			thumbImg.alt = snapItem?.title || `Item ${idx + 1}`;
			thumbWrap.appendChild(thumbImg);

			const textWrap = document.createElement('div');
			textWrap.className = 'yt-snapshot-reorder-item-text';

			const rowTitle = document.createElement('div');
			rowTitle.className = 'yt-snapshot-reorder-item-title';
			rowTitle.textContent = snapItem?.title || `Item ${idx + 1}`;

			const rowMeta = document.createElement('div');
			rowMeta.className = 'yt-snapshot-reorder-item-meta';
			const metaParts = [];
			const artistText = snapItem?.artist || snapItem?.channel || '';
			const durationText = snapItem?.duration || '';
			if (artistText) metaParts.push(artistText);
			if (durationText) metaParts.push(durationText);
			rowMeta.textContent = metaParts.join(' • ');

			textWrap.appendChild(rowTitle);
			textWrap.appendChild(rowMeta);

			const removeBtn = document.createElement('button');
			removeBtn.className = 'yt-snapshot-reorder-remove';
			removeBtn.setAttribute('aria-label', 'Remove item');
			const removeSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
			removeSvg.setAttribute('viewBox', '0 0 24 24');
			removeSvg.setAttribute('width', '18');
			removeSvg.setAttribute('height', '18');
			const removePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
			removePath.setAttribute('d', 'M6 7h12l-1 14H7L6 7zm3-3h6l1 1h4v2H4V5h4l1-1z');
			removeSvg.appendChild(removePath);
			removeBtn.appendChild(removeSvg);
			removeBtn.addEventListener('click', (ev) => {
				ev.preventDefault();
				ev.stopPropagation();
				if (overlay.classList.contains('dragging')) return;
				row.remove();
			});

			row.appendChild(handle);
			row.appendChild(thumbWrap);
			row.appendChild(textWrap);
			row.appendChild(removeBtn);

			list.appendChild(row);
		});

		let dragState = null;

		const getListItemElements = () =>
			Array.from(list.querySelectorAll('.yt-snapshot-reorder-item'));

		const findInsertBeforeElement = (clientY, draggingElement, placeholder) => {
			const items = getListItemElements().filter(
				(el) => el !== draggingElement && el !== placeholder
			);
			for (const el of items) {
				const r = el.getBoundingClientRect();
				if (clientY < r.top + r.height / 2) return el;
			}
			return null;
		};

		const applyDragPosition = () => {
			if (!dragState) return;
			dragState.raf = null;

			const deltaY = dragState.latestY - dragState.pointerOffsetY - dragState.baseTop;
			dragState.dragEl.style.transform = `translate3d(0, ${deltaY}px, 0)`;

			const insertBefore = findInsertBeforeElement(
				dragState.latestY,
				dragState.dragEl,
				dragState.placeholder
			);
			if (insertBefore) {
				if (insertBefore !== dragState.placeholder.nextSibling) {
					list.insertBefore(dragState.placeholder, insertBefore);
				}
			} else {
				list.appendChild(dragState.placeholder);
			}

			const listRect = list.getBoundingClientRect();
			const edge = 72;
			if (dragState.latestY < listRect.top + edge) {
				const amt = Math.min(edge, listRect.top + edge - dragState.latestY);
				list.scrollBy(0, -Math.max(2, amt / 3));
			} else if (dragState.latestY > listRect.bottom - edge) {
				const amt = Math.min(edge, dragState.latestY - (listRect.bottom - edge));
				list.scrollBy(0, Math.max(2, amt / 3));
			}
		};

		const onPointerMove = (ev) => {
			if (!dragState || ev.pointerId !== dragState.pointerId) return;
			ev.preventDefault();
			dragState.latestY = ev.clientY;
			if (!dragState.raf) {
				dragState.raf = requestAnimationFrame(applyDragPosition);
			}
		};

		const endDrag = (ev) => {
			if (!dragState) return;
			if (ev && dragState.pointerId !== ev.pointerId) return;

			document.removeEventListener('pointermove', onPointerMove, { passive: false });
			document.removeEventListener('pointerup', endDrag);
			document.removeEventListener('pointercancel', endDrag);

			dragState.dragEl.style.transform = '';
			dragState.dragEl.style.position = '';
			dragState.dragEl.style.top = '';
			dragState.dragEl.style.left = '';
			dragState.dragEl.style.width = '';
			dragState.dragEl.style.zIndex = '';
			dragState.dragEl.style.pointerEvents = '';
			dragState.dragEl.classList.remove('dragging');

			list.insertBefore(dragState.dragEl, dragState.placeholder);
			dragState.placeholder.remove();

			overlay.classList.remove('dragging');

			dragState = null;
		};

		const startDrag = (ev, row) => {
			if (dragState) return;
			ev.preventDefault();
			ev.stopPropagation();

			const rect = row.getBoundingClientRect();
			const placeholder = document.createElement('div');
			placeholder.className = 'yt-snapshot-reorder-placeholder';
			placeholder.style.height = `${rect.height}px`;

			list.insertBefore(placeholder, row);

			row.classList.add('dragging');
			row.style.width = `${rect.width}px`;
			row.style.position = 'fixed';
			row.style.top = `${rect.top}px`;
			row.style.left = `${rect.left}px`;
			row.style.zIndex = '10004';
			row.style.pointerEvents = 'none';

			overlay.classList.add('dragging');

			dragState = {
				pointerId: ev.pointerId,
				dragEl: row,
				placeholder,
				pointerOffsetY: ev.clientY - rect.top,
				baseTop: rect.top,
				latestY: ev.clientY,
				raf: null,
			};

			document.addEventListener('pointermove', onPointerMove, { passive: false });
			document.addEventListener('pointerup', endDrag);
			document.addEventListener('pointercancel', endDrag);
		};

		list.querySelectorAll('.yt-snapshot-reorder-handle').forEach((handleEl) => {
			handleEl.addEventListener('pointerdown', (ev) => {
				const row = ev.target.closest('.yt-snapshot-reorder-item');
				if (!row) return;
				handleEl.setPointerCapture?.(ev.pointerId);
				startDrag(ev, row);
			});
		});

		content.appendChild(list);
		modal.appendChild(header);
		modal.appendChild(content);
		overlay.appendChild(modal);

		document.body.appendChild(overlay);

		overlay.addEventListener('click', (e) => {
			if (e.target === overlay && !overlay.classList.contains('dragging')) {
				this._hideSnapshotReorderDialog();
			}
		});

		requestAnimationFrame(() => {
			overlay.classList.add('visible');
			modal.classList.add('slide-in');
		});
	}

	_hideSnapshotReorderDialog() {
		const overlay = document.querySelector('.yt-snapshot-reorder-overlay');
		const modal = document.querySelector('.yt-snapshot-reorder-modal');
		if (overlay && modal) {
			overlay.classList.remove('visible');
			modal.classList.remove('slide-in');
			modal.classList.add('slide-out');
			setTimeout(() => {
				overlay.remove();
			}, 300);
		}
	}

	async _saveSnapshotReorderDialog(snapshotId) {
		const overlay = document.querySelector('.yt-snapshot-reorder-overlay');
		const list = overlay ? overlay.querySelector('.yt-snapshot-reorder-list') : null;
		if (!list) return false;

		const orderedIds = Array.from(list.querySelectorAll('.yt-snapshot-reorder-item'))
			.map((el) => el.dataset.videoId)
			.filter(Boolean);

		const current = window.userSettings.mixSnapshots || {};
		const snap = current[snapshotId];
		if (!snap || !Array.isArray(snap.items)) return false;

		const itemById = new Map();
		snap.items.forEach((it) => {
			if (it?.id) itemById.set(it.id, it);
		});
		const reordered = orderedIds.map((id) => itemById.get(id)).filter(Boolean);

		const updatedSnap = Object.assign({}, snap, { items: reordered, reorderedAt: Date.now() });
		const updated = Object.assign({}, current, { [snapshotId]: updatedSnap });

		const success = await window.saveUserSetting('mixSnapshots', updated);
		if (!success) return false;

		if (window.userSettings.activeMixSnapshotId === snapshotId && window.ytPlayerInstance) {
			if (!reordered.length) {
				await window.saveUserSetting('activeMixSnapshotId', null);
				window.ytPlayerInstance.updatePlaylist(null, null);
			} else {
				const title = updatedSnap.title || 'Mix Snapshot';
				window.ytPlayerInstance.updatePlaylist(reordered, updatedSnap.id, title);
				const currentVideoId =
					typeof PageUtils !== 'undefined' && PageUtils.getCurrentVideoIdFromUrl
						? PageUtils.getCurrentVideoIdFromUrl()
						: null;
				if (currentVideoId) {
					window.ytPlayerInstance.setActivePlaylistItem?.(currentVideoId);
				}
			}
		}

		this._updateFavouritesDialog();
		return true;
	}

	async _storeActiveTempSnapshot() {
		const activeSnapshotId = window.userSettings.activeMixSnapshotId;
		const tempSnapshot = window.userSettings.tempMixSnapshot || null;
		if (!activeSnapshotId || !tempSnapshot || tempSnapshot.id !== activeSnapshotId) {
			this._flashAddButtonFeedback('✕ No temp snapshot', 'error');
			return false;
		}

		const current = window.userSettings.mixSnapshots || {};
		const existing = current[tempSnapshot.id] || null;

		const stored = Object.assign({}, tempSnapshot);
		stored.id = tempSnapshot.id;
		stored.title =
			(existing && existing.title ? existing.title : tempSnapshot.title) || 'Mix Snapshot';
		stored.createdAt =
			(existing && existing.createdAt ? existing.createdAt : tempSnapshot.createdAt) ||
			Date.now();

		const updated = Object.assign({}, current, { [tempSnapshot.id]: stored });
		const ok1 = await window.saveUserSetting('mixSnapshots', updated);
		if (!ok1) {
			this._flashAddButtonFeedback('✕ Failed', 'error');
			return false;
		}

		await window.saveUserSetting('tempMixSnapshot', null);

		if (
			window.ytPlayerInstance &&
			typeof window.ytPlayerInstance.updatePlaylist === 'function'
		) {
			const items = Array.isArray(stored.items) ? stored.items : [];
			const title = stored.title || 'Mix Snapshot';
			window.ytPlayerInstance.updatePlaylist(items, stored.id, title);
			const currentVideoId =
				typeof PageUtils !== 'undefined' && PageUtils.getCurrentVideoIdFromUrl
					? PageUtils.getCurrentVideoIdFromUrl()
					: null;
			if (currentVideoId) {
				window.ytPlayerInstance.setActivePlaylistItem?.(currentVideoId);
			}
		}

		this._flashAddButtonFeedback('✓ Snapshot Stored', 'success');
		this._updateFavouritesDialog();
		return true;
	}

	_showSearchInput() {
		const overlay = document.querySelector('.yt-favourites-dialog-overlay');
		const dialog = overlay ? overlay.querySelector('.yt-favourites-dialog-modal') : null;
		if (!dialog) return;

		// Lock the current height to prevent jumping
		const currentHeight = dialog.offsetHeight;
		dialog.style.setProperty('--locked-height', `${currentHeight}px`);
		dialog.classList.add('search-active');

		const header = dialog.querySelector('.yt-favourites-dialog-header');
		const searchContainer = dialog.querySelector('.yt-favourites-dialog-search-container');
		const searchInput = dialog.querySelector('.yt-favourites-dialog-search-input');

		if (header && searchContainer && searchInput) {
			// Hide the normal header content
			const title = header.querySelector('.yt-favourites-dialog-title');
			const rightSection = header.querySelector('.yt-favourites-dialog-header-right');

			if (title) title.style.display = 'none';
			if (rightSection) rightSection.style.display = 'none';

			// Show search container
			searchContainer.style.display = 'flex';
			searchInput.focus();
		}
	}

	_hideSearchInput() {
		const overlay = document.querySelector('.yt-favourites-dialog-overlay');
		const dialog = overlay ? overlay.querySelector('.yt-favourites-dialog-modal') : null;
		if (!dialog) return;

		// Unlock the height to allow natural resizing
		dialog.classList.remove('search-active');
		dialog.style.removeProperty('--locked-height');

		const header = dialog.querySelector('.yt-favourites-dialog-header');
		const searchContainer = dialog.querySelector('.yt-favourites-dialog-search-container');
		const searchInput = dialog.querySelector('.yt-favourites-dialog-search-input');

		if (header && searchContainer && searchInput) {
			// Show the normal header content
			const title = header.querySelector('.yt-favourites-dialog-title');
			const rightSection = header.querySelector('.yt-favourites-dialog-header-right');

			if (title) title.style.display = 'block';
			if (rightSection) rightSection.style.display = 'flex';

			// Hide search container and clear input
			searchContainer.style.display = 'none';
			searchInput.value = '';

			// Reset the favorites list to show all items
			this._filterFavoritesBySearch('');
		}
	}

	_filterFavoritesBySearch(searchTerm) {
		const overlay = document.querySelector('.yt-favourites-dialog-overlay');
		const dialog = overlay ? overlay.querySelector('.yt-favourites-dialog-modal') : null;
		if (!dialog) return;

		const items = dialog.querySelectorAll('.yt-favourites-dialog-item');
		const lowerSearchTerm = searchTerm.toLowerCase().trim();

		items.forEach((item) => {
			// Get the original title and custom title from data attributes
			const originalTitle = item.getAttribute('data-original-title') || '';
			const customTitle = item.getAttribute('data-custom-title') || '';
			const channel = item.getAttribute('data-channel') || '';

			// Use custom title if available, otherwise use original title
			const titleToSearch = customTitle || originalTitle;

			const title = titleToSearch.toLowerCase();
			const channelLower = channel.toLowerCase();

			const matches =
				!lowerSearchTerm ||
				title.includes(lowerSearchTerm) ||
				channelLower.includes(lowerSearchTerm);

			item.style.display = matches ? 'flex' : 'none';
		});

		// Update empty state if needed
		this._updateEmptyState();
	}

	_updateEmptyState() {
		const overlay = document.querySelector('.yt-favourites-dialog-overlay');
		const dialog = overlay ? overlay.querySelector('.yt-favourites-dialog-modal') : null;
		if (!dialog) return;

		const container = dialog.querySelector('.yt-favourites-dialog-list');
		if (!container) return;

		const items = container.querySelectorAll('.yt-favourites-dialog-item');
		const visibleItems = Array.from(items).filter((item) => item.style.display !== 'none');

		// Remove existing search empty state
		const existingSearchEmpty = container.querySelector('.yt-favourites-dialog-search-empty');
		if (existingSearchEmpty) {
			existingSearchEmpty.remove();
		}

		// If no visible items and there are items in total (meaning search filtered them out)
		if (visibleItems.length === 0 && items.length > 0) {
			const searchEmptyMessage = document.createElement('div');
			searchEmptyMessage.className =
				'yt-favourites-dialog-search-empty yt-favourites-dialog-empty';

			const boldText = document.createElement('strong');
			boldText.textContent = 'No matches found.';
			searchEmptyMessage.appendChild(boldText);

			const lineBreak = document.createElement('br');
			searchEmptyMessage.appendChild(lineBreak);

			const instructionText = document.createTextNode('Try a different search term.');
			searchEmptyMessage.appendChild(instructionText);

			container.appendChild(searchEmptyMessage);
		}
	}

	/**
	 * @description Hides the favourites dialog with bottom sheet animation.
	 */
	_hideFavouritesDialog() {
		this._hideAddToFavouritesDropdown();
		this._hideFilterPopup();
		this._hideSnapshotReorderDialog();
		this._hideAddToExistingSnapshotDialog();
		this._hideSearchInput();

		const overlay = document.querySelector('.yt-favourites-dialog-overlay');
		const modal = document.querySelector('.yt-favourites-dialog-modal');
		if (overlay && modal) {
			// Start slide out animation
			overlay.classList.remove('visible');
			modal.classList.remove('slide-in');
			modal.classList.add('slide-out');

			// Remove from DOM after animation completes
			setTimeout(() => {
				overlay.remove();
			}, 300);
		}
	}

	/**
	 * @description Toggles the favourites dialog visibility (for gesture support).
	 */
	toggleFavouritesDialog() {
		const overlay = document.querySelector('.yt-favourites-dialog-overlay');
		if (overlay && overlay.classList.contains('visible')) {
			this._hideFavouritesDialog();
		} else {
			this._showFavouritesDialog();
		}
	}

	/**
	 * @description Updates the favourites dialog content.
	 */
	_updateFavouritesDialog() {
		const listContainer = document.querySelector('.yt-favourites-dialog-list');
		if (!listContainer) {
			logger.warn('Navbar', 'Favourites dialog list container not found');
			return;
		}

		this._renderFavouritesDialogList(listContainer);
	}

	/**
	 * @description Renders the favourites list in the dialog.
	 */
	_renderFavouritesDialogList(container) {
		// Clear container content safely
		while (container.firstChild) {
			container.removeChild(container.firstChild);
		}

		const snapshotsObj = window.userSettings.mixSnapshots || {};
		const snapshots = Object.values(snapshotsObj);
		const favourites = window.userSettings.favouriteMixes || [];
		const currentFilter = window.userSettings.favouritesDialogFilter || 'all';

		// Build unified list entries (snapshots + favourites)
		const mergedEntries = [];
		const currentSort = window.userSettings.favouritesDialogSort || 'newestFirst';

		// Map snapshots into merged entries
		snapshots.forEach((snap) => {
			mergedEntries.push({
				kind: 'snapshot',
				snap,
				title: snap.title || '',
				ts: snap.createdAt || 0,
			});
		});

		// Map favourites into merged entries
		favourites.forEach((favourite, idx) => {
			const isPlaylist = !!favourite.playlistId;
			const originalTitle = favourite.title || '';
			const isMix = /^(?:my\s+)?mix/i.test(originalTitle);
			const displayTitle =
				favourite.customTitle ||
				favourite.title ||
				(isPlaylist ? 'Untitled Mix' : 'Untitled Video');
			const normalized = StringUtils.stripMixPrefix(
				displayTitle,
				!favourite.customTitle
			).toLowerCase();
			mergedEntries.push({
				kind: 'favourite',
				favourite,
				title: normalized,
				isPlaylist,
				isMix,
				ts: favourite.addedAt || idx,
				index: idx,
			});
		});

		// Filter merged entries based on current filter
		const filteredMerged = mergedEntries.filter((entry) => {
			if (currentFilter === 'all') return true;
			if (currentFilter === 'snapshots') return entry.kind === 'snapshot';
			if (entry.kind === 'favourite') {
				if (currentFilter === 'mixes') return entry.isPlaylist && entry.isMix;
				if (currentFilter === 'playlists') return entry.isPlaylist && !entry.isMix;
				if (currentFilter === 'videos') return !entry.isPlaylist;
			}
			return false;
		});

		// Sort merged entries according to current sort
		filteredMerged.sort((a, b) => {
			switch (currentSort) {
				case 'aToZ':
					return (a.title || '').localeCompare(b.title || '');
				case 'zToA':
					return (b.title || '').localeCompare(a.title || '');
				case 'type': {
					const order = (e) => {
						if (e.kind === 'favourite') {
							if (e.isPlaylist) return e.isMix ? 0 : 0; // mixes/playlists first
							return 2; // videos
						}
						return 1; // snapshots
					};
					const oa = order(a);
					const ob = order(b);
					if (oa !== ob) return oa - ob;
					return (a.title || '').localeCompare(b.title || '');
				}
				case 'oldestFirst':
					return (a.ts || 0) - (b.ts || 0);
				case 'newestFirst':
				default:
					return (b.ts || 0) - (a.ts || 0);
			}
		});

		if (filteredMerged.length === 0) {
			const emptyMessage = document.createElement('div');
			emptyMessage.className = 'yt-favourites-dialog-empty';

			const boldText = document.createElement('strong');
			if (currentFilter === 'all') {
				boldText.textContent = 'No saved items yet.';
			} else {
				const filterLabels = {
					mixes: 'mixes',
					playlists: 'playlists',
					videos: 'videos',
					snapshots: 'snapshots',
				};
				boldText.textContent = `No saved ${filterLabels[currentFilter]} yet.`;
			}
			emptyMessage.appendChild(boldText);

			const lineBreak = document.createElement('br');
			emptyMessage.appendChild(lineBreak);

			const instructionText = document.createTextNode(
				'Navigate to a mix or video you want to save, then click the add button.'
			);
			emptyMessage.appendChild(instructionText);

			container.appendChild(emptyMessage);
			return;
		}

		filteredMerged.forEach((entry) => {
			if (entry.kind === 'snapshot') {
				const snap = entry.snap;
				const firstItem = snap.items && snap.items[0];
				const item = document.createElement('div');
				item.className = 'yt-favourites-dialog-item';
				item.addEventListener('click', (e) => {
					const activeRenameInput = document.querySelector(
						'.yt-favourites-dialog-rename-input'
					);
					if (
						!e.target.closest('.yt-favourites-dialog-more-options-btn') &&
						!e.target.closest('.yt-favourites-dialog-options-overlay') &&
						!e.target.closest('.yt-favourites-dialog-rename-input') &&
						!activeRenameInput
					) {
						window.startPlayingMixSnapshot?.(snap.id);
						this._hideFavouritesDialog();
					}
				});
				item.setAttribute('data-original-title', snap.title || '');
				item.setAttribute('data-custom-title', '');
				item.setAttribute('data-channel', '');
				const thumbnail = document.createElement('div');
				thumbnail.className = 'yt-favourites-dialog-item-thumbnail';
				if (firstItem?.id) {
					const thumbnailUrl = MediaUtils.getStandardThumbnailUrl(firstItem.id);
					if (thumbnailUrl) {
						thumbnail.classList.add('stacked');
						const thumbnailImg = document.createElement('img');
						thumbnailImg.src = thumbnailUrl;
						thumbnailImg.alt = snap.title || 'Mix Snapshot';
						thumbnailImg.style.width = '100%';
						thumbnailImg.style.height = '100%';
						thumbnailImg.style.objectFit = 'cover';
						thumbnailImg.style.borderRadius = '8px';
						thumbnailImg.style.position = 'relative';
						thumbnailImg.style.zIndex = '9';
						thumbnail.appendChild(thumbnailImg);
						ColorUtils.getAdaptiveColorFromThumbnail(thumbnailUrl)
							.then((colors) => {
								thumbnail.style.setProperty('--stack-color-1', colors.primary);
								thumbnail.style.setProperty('--stack-color-2', colors.secondary);
							})
							.catch(() => {
								thumbnail.style.setProperty('--stack-color-1', '#666666');
								thumbnail.style.setProperty('--stack-color-2', '#888888');
							});
					}
				}
				const playOverlay = document.createElement('div');
				playOverlay.className = 'play-overlay';
				thumbnail.appendChild(playOverlay);
				const info = document.createElement('div');
				info.className = 'yt-favourites-dialog-item-info';
				const title = document.createElement('div');
				title.className = 'yt-favourites-dialog-item-title';
				const snapBadge = document.createElement('span');
				snapBadge.className = 'yt-mix-badge';
				snapBadge.textContent = 'SNAP';
				title.appendChild(snapBadge);
				const titleText = document.createTextNode(snap.title || 'Mix Snapshot');
				title.appendChild(titleText);
				const meta = document.createElement('div');
				meta.className = 'yt-favourites-dialog-item-meta';
				const count = Array.isArray(snap.items) ? snap.items.length : 0;
				const idText = document.createTextNode(`Snapshot • ${count} items`);
				meta.appendChild(idText);
				info.appendChild(title);
				info.appendChild(meta);
				const moreOptionsBtn = document.createElement('button');
				moreOptionsBtn.className = 'yt-favourites-dialog-more-options-btn';
				moreOptionsBtn.setAttribute('aria-label', 'More options');
				const moreOptionsSvg = document.createElementNS(
					'http://www.w3.org/2000/svg',
					'svg'
				);
				moreOptionsSvg.setAttribute('viewBox', '0 0 24 24');
				moreOptionsSvg.setAttribute('width', '16');
				moreOptionsSvg.setAttribute('height', '16');
				const moreOptionsPath = document.createElementNS(
					'http://www.w3.org/2000/svg',
					'path'
				);
				moreOptionsPath.setAttribute(
					'd',
					'M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z'
				);
				moreOptionsSvg.appendChild(moreOptionsPath);
				moreOptionsBtn.appendChild(moreOptionsSvg);
				moreOptionsBtn.addEventListener('click', (e) => {
					e.stopPropagation();
					const existingOverlay = item.querySelector(
						'.yt-favourites-dialog-options-overlay'
					);
					if (existingOverlay) {
						existingOverlay.remove();
						return;
					}
					document
						.querySelectorAll('.yt-favourites-dialog-options-overlay')
						.forEach((ov) => ov.remove());
					const overlay = document.createElement('div');
					overlay.className = 'yt-favourites-dialog-options-overlay';
					overlay.addEventListener('click', (ev) => {
						if (ev.target === overlay) {
							overlay.remove();
						}
					});
					const renameBtn = document.createElement('button');
					renameBtn.className =
						'yt-favourites-dialog-overlay-btn yt-favourites-dialog-overlay-rename-btn';
					renameBtn.setAttribute('aria-label', 'Rename snapshot');
					const renameSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
					renameSvg.setAttribute('viewBox', '0 0 24 24');
					renameSvg.setAttribute('width', '16');
					renameSvg.setAttribute('height', '16');
					const renamePath = document.createElementNS(
						'http://www.w3.org/2000/svg',
						'path'
					);
					renamePath.setAttribute(
						'd',
						'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z'
					);
					renameSvg.appendChild(renamePath);
					renameBtn.appendChild(renameSvg);
					const renameLabel = document.createElement('span');
					renameLabel.textContent = 'Rename';
					renameBtn.appendChild(renameLabel);
					renameBtn.addEventListener('click', (ev) => {
						ev.stopPropagation();
						overlay.remove();
						const titleElement = item.querySelector('.yt-favourites-dialog-item-title');
						this._startRenamingSnapshot(titleElement, snap.id);
					});
					const removeBtn = document.createElement('button');
					removeBtn.className =
						'yt-favourites-dialog-overlay-btn yt-favourites-dialog-overlay-remove-btn';
					removeBtn.setAttribute('aria-label', 'Remove snapshot');
					const removeSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
					removeSvg.setAttribute('viewBox', '0 0 24 24');
					removeSvg.setAttribute('width', '16');
					removeSvg.setAttribute('height', '16');
					const removePath = document.createElementNS(
						'http://www.w3.org/2000/svg',
						'path'
					);
					removePath.setAttribute(
						'd',
						'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z'
					);
					removeSvg.appendChild(removePath);
					removeBtn.appendChild(removeSvg);
					const removeLabel = document.createElement('span');
					removeLabel.textContent = 'Remove';
					removeBtn.appendChild(removeLabel);
					removeBtn.addEventListener('click', async (ev) => {
						ev.stopPropagation();
						overlay.remove();
						const current = window.userSettings.mixSnapshots || {};
						const updated = Object.assign({}, current);
						delete updated[snap.id];
						await window.saveUserSetting('mixSnapshots', updated);
						this._updateFavouritesDialog();
					});
					const reorderBtn = document.createElement('button');
					reorderBtn.className =
						'yt-favourites-dialog-overlay-btn yt-favourites-dialog-overlay-reorder-btn';
					reorderBtn.setAttribute('aria-label', 'Reorder snapshot items');
					const reorderSvg = document.createElementNS(
						'http://www.w3.org/2000/svg',
						'svg'
					);
					reorderSvg.setAttribute('viewBox', '0 0 24 24');
					reorderSvg.setAttribute('width', '16');
					reorderSvg.setAttribute('height', '16');
					const reorderPath = document.createElementNS(
						'http://www.w3.org/2000/svg',
						'path'
					);
					reorderPath.setAttribute('d', 'M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z');
					reorderSvg.appendChild(reorderPath);
					reorderBtn.appendChild(reorderSvg);
					const reorderLabel = document.createElement('span');
					reorderLabel.textContent = 'Reorder';
					reorderBtn.appendChild(reorderLabel);
					reorderBtn.addEventListener('click', (ev) => {
						ev.stopPropagation();
						overlay.remove();
						this._showSnapshotReorderDialog(snap.id);
					});
					overlay.appendChild(renameBtn);
					overlay.appendChild(reorderBtn);
					overlay.appendChild(removeBtn);
					item.appendChild(overlay);
					const closeOverlay = (ev) => {
						if (
							!overlay.contains(ev.target) &&
							!item
								.querySelector('.yt-favourites-dialog-more-options-btn')
								.contains(ev.target)
						) {
							overlay.remove();
							document.removeEventListener('click', closeOverlay);
						}
					};
					setTimeout(() => {
						document.addEventListener('click', closeOverlay);
					}, 0);
				});
				item.appendChild(thumbnail);
				item.appendChild(info);
				item.appendChild(moreOptionsBtn);
				container.appendChild(item);
				return;
			}

			// Favourite entry rendering (unchanged logic)
			const favourite = entry.favourite;
			const originalIndex = favourites.indexOf(favourite);
			const item = document.createElement('div');
			item.className = 'yt-favourites-dialog-item';

			// Make the entire item clickable to play the mix
			item.addEventListener('click', async (e) => {
				// Don't trigger if clicking the more options button, or the rename input
				// Also don't trigger if there's any active rename input in the dialog
				const activeRenameInput = document.querySelector(
					'.yt-favourites-dialog-rename-input'
				);
				if (
					!e.target.closest('.yt-favourites-dialog-more-options-btn') &&
					!e.target.closest('.yt-favourites-dialog-options-overlay') &&
					!e.target.closest('.yt-favourites-dialog-rename-input') &&
					!activeRenameInput
				) {
					// Generate appropriate URL based on whether it's a playlist or individual video
					let fullUrl;
					if (favourite.playlistId) {
						// For playlists/mixes, include both video and playlist parameters
						fullUrl = `https://m.youtube.com/watch?v=${favourite.videoId}&list=${favourite.playlistId}`;
					} else {
						// For individual videos, only include the video parameter
						fullUrl = `https://m.youtube.com/watch?v=${favourite.videoId}`;
					}

					logger.log(
						'Navbar',
						`Navigating to favourite ${
							favourite.playlistId ? 'mix' : 'video'
						}: ${fullUrl}`
					);

					await window.saveUserSetting('activeMixSnapshotId', null);
					await window.saveUserSetting('tempMixSnapshot', null);

					// Use window.location.href for full page navigation instead of SPA routing
					window.location.href = fullUrl;
					this._hideFavouritesDialog();
				}
			});
			item.style.cursor = 'pointer';

			// Add thumbnail
			const thumbnail = document.createElement('div');
			thumbnail.className = 'yt-favourites-dialog-item-thumbnail';

			// Determine if this is a playlist/mix or individual video
			const isPlaylist = !!favourite.playlistId;

			// Add stacked effect for playlists/mixes
			if (isPlaylist) {
				thumbnail.classList.add('stacked');
			}

			// Get the video ID for thumbnail
			const videoId = favourite.videoId;
			if (videoId) {
				const thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;

				// Create an actual img element instead of using background-image
				const thumbnailImg = document.createElement('img');
				thumbnailImg.src = thumbnailUrl;
				thumbnailImg.alt = favourite.title || 'Video thumbnail';
				thumbnailImg.style.width = '100%';
				thumbnailImg.style.height = '100%';
				thumbnailImg.style.objectFit = 'cover';
				thumbnailImg.style.borderRadius = '8px';
				thumbnailImg.style.position = 'relative';
				thumbnailImg.style.zIndex = '9'; // Above the pseudo-elements but below play overlay
				thumbnail.appendChild(thumbnailImg);

				// Extract adaptive colors for stacked effect if this is a playlist/mix
				if (isPlaylist) {
					ColorUtils.getAdaptiveColorFromThumbnail(thumbnailUrl)
						.then((colors) => {
							// Apply adaptive colors to the stacked effect
							thumbnail.style.setProperty('--stack-color-1', colors.primary);
							thumbnail.style.setProperty('--stack-color-2', colors.secondary);
						})
						.catch((error) => {
							// Fallback to default colors if extraction fails
							thumbnail.style.setProperty('--stack-color-1', '#666666');
							thumbnail.style.setProperty('--stack-color-2', '#888888');
						});
				}
			}

			// Add play overlay element for hover effect
			const playOverlay = document.createElement('div');
			playOverlay.className = 'play-overlay';
			thumbnail.appendChild(playOverlay);

			const info = document.createElement('div');
			info.className = 'yt-favourites-dialog-item-info';

			const title = document.createElement('div');
			title.className = 'yt-favourites-dialog-item-title';

			const originalTitle = favourite.title || '';

			// Add appropriate badge before title
			if (isPlaylist) {
				// For playlists/mixes, check if it's a mix and add Mix badge, otherwise Playlist badge
				const isMix = /^(?:my\s+)?mix/i.test(originalTitle);
				if (isMix) {
					const mixBadge = document.createElement('span');
					mixBadge.className = 'yt-mix-badge';
					mixBadge.textContent = 'Mix';
					title.appendChild(mixBadge);
				} else {
					const playlistBadge = document.createElement('span');
					playlistBadge.className = 'yt-mix-badge';
					playlistBadge.textContent = 'List';
					title.appendChild(playlistBadge);
				}
			}
			// No badge for standalone videos

			// Use customTitle if available, otherwise fall back to original title
			let displayTitle =
				favourite.customTitle ||
				favourite.title ||
				(isPlaylist ? 'Untitled Mix' : 'Untitled Video');

			// Strip 'mix - ' prefix from original titles only (not edited ones) and only for playlists
			if (!favourite.customTitle && isPlaylist) {
				displayTitle = StringUtils.stripMixPrefix(displayTitle, true);
			}

			const titleText = document.createTextNode(displayTitle);
			title.appendChild(titleText);

			// Store original data for search functionality
			item.setAttribute('data-original-title', favourite.title || '');
			item.setAttribute('data-custom-title', favourite.customTitle || '');
			item.setAttribute('data-channel', favourite.channelName || '');

			const meta = document.createElement('div');
			meta.className = 'yt-favourites-dialog-item-meta';

			// Show appropriate ID based on type
			const idText = isPlaylist
				? document.createTextNode(favourite.playlistId || 'Unknown Playlist ID')
				: document.createTextNode(favourite.videoId || 'Unknown Video ID');
			meta.appendChild(idText);

			info.appendChild(title);
			info.appendChild(meta);

			// Add more options button (three dots)
			const moreOptionsBtn = document.createElement('button');
			moreOptionsBtn.className = 'yt-favourites-dialog-more-options-btn';
			moreOptionsBtn.setAttribute('aria-label', 'More options');

			// Create three dots SVG icon
			const moreOptionsSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
			moreOptionsSvg.setAttribute('viewBox', '0 0 24 24');
			moreOptionsSvg.setAttribute('width', '16');
			moreOptionsSvg.setAttribute('height', '16');
			const moreOptionsPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
			moreOptionsPath.setAttribute(
				'd',
				'M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z'
			);
			moreOptionsSvg.appendChild(moreOptionsPath);
			moreOptionsBtn.appendChild(moreOptionsSvg);

			moreOptionsBtn.addEventListener('click', (e) => {
				e.stopPropagation(); // Prevent item click
				this._toggleOptionsOverlay(item, favourite, originalIndex);
			});

			item.appendChild(thumbnail);
			item.appendChild(info);
			item.appendChild(moreOptionsBtn);
			container.appendChild(item);
		});
	}

	/**
	 * @description Toggles the options overlay for a favorites item.
	 */
	_toggleOptionsOverlay(itemElement, favourite, index) {
		// Check if overlay already exists for this item
		const existingOverlay = itemElement.querySelector('.yt-favourites-dialog-options-overlay');

		if (existingOverlay) {
			// Remove existing overlay
			existingOverlay.remove();
			return;
		}

		// Remove any other existing overlays first
		const allOverlays = document.querySelectorAll('.yt-favourites-dialog-options-overlay');
		allOverlays.forEach((overlay) => overlay.remove());

		// Create overlay
		const overlay = document.createElement('div');
		overlay.className = 'yt-favourites-dialog-options-overlay';

		// Add click handler to close overlay when clicking on the overlay itself
		overlay.addEventListener('click', (e) => {
			// Only close if clicking directly on the overlay, not on its buttons
			if (e.target === overlay) {
				overlay.remove();
			}
		});

		// Create rename button
		const renameBtn = document.createElement('button');
		renameBtn.className =
			'yt-favourites-dialog-overlay-btn yt-favourites-dialog-overlay-rename-btn';
		renameBtn.setAttribute('aria-label', 'Rename mix');

		// Create SVG edit icon
		const renameSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		renameSvg.setAttribute('viewBox', '0 0 24 24');
		renameSvg.setAttribute('width', '16');
		renameSvg.setAttribute('height', '16');
		const renamePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		renamePath.setAttribute(
			'd',
			'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z'
		);
		renameSvg.appendChild(renamePath);
		renameBtn.appendChild(renameSvg);

		const renameLabel = document.createElement('span');
		renameLabel.textContent = 'Rename';
		renameBtn.appendChild(renameLabel);

		renameBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			overlay.remove(); // Remove overlay first
			const titleElement = itemElement.querySelector('.yt-favourites-dialog-item-title');
			this._startRenaming(titleElement, favourite, index);
		});

		// Create remove button
		const removeBtn = document.createElement('button');
		removeBtn.className =
			'yt-favourites-dialog-overlay-btn yt-favourites-dialog-overlay-remove-btn';
		removeBtn.setAttribute('aria-label', 'Remove from favourites');

		// Create SVG trash icon
		const removeSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		removeSvg.setAttribute('viewBox', '0 0 24 24');
		removeSvg.setAttribute('width', '16');
		removeSvg.setAttribute('height', '16');
		const removePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		removePath.setAttribute(
			'd',
			'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z'
		);
		removeSvg.appendChild(removePath);
		removeBtn.appendChild(removeSvg);

		const removeLabel = document.createElement('span');
		removeLabel.textContent = 'Remove';
		removeBtn.appendChild(removeLabel);

		removeBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			overlay.remove(); // Remove overlay first
			this._removeFavouriteFromDialog(index);
		});

		overlay.appendChild(renameBtn);
		overlay.appendChild(removeBtn);
		itemElement.appendChild(overlay);

		// Add click outside to close
		const closeOverlay = (e) => {
			if (
				!overlay.contains(e.target) &&
				!itemElement
					.querySelector('.yt-favourites-dialog-more-options-btn')
					.contains(e.target)
			) {
				overlay.remove();
				document.removeEventListener('click', closeOverlay);
			}
		};

		// Use setTimeout to avoid immediate closure from the current click event
		setTimeout(() => {
			document.addEventListener('click', closeOverlay);
		}, 0);
	}

	/**
	 * @description Removes a favourite from the dialog and updates storage.
	 */
	async _removeFavouriteFromDialog(index) {
		try {
			const favourites = [...(window.userSettings.favouriteMixes || [])];
			favourites.splice(index, 1);

			// Use the same method as _addCurrentMixToFavourites
			const success = await window.saveUserSetting('favouriteMixes', favourites);
			if (success) {
				this._updateFavouritesDialog();
				logger.log('Navbar', 'Favourite removed successfully');
			}
		} catch (error) {
			logger.error('Navbar', 'Failed to remove favourite:', error);
		}
	}

	/**
	 * @description Starts the renaming process for a favourite mix.
	 */
	_startRenaming(titleElement, favourite, index) {
		// Create input element
		const input = document.createElement('input');
		input.type = 'text';
		input.className = 'yt-favourites-dialog-rename-input';
		// Use customTitle if available, otherwise fall back to original title
		const currentDisplayTitle = favourite.customTitle || favourite.title || 'Untitled Mix';
		input.value = currentDisplayTitle;
		input.maxLength = 100;

		// Replace title with input
		const originalText = titleElement.textContent;
		titleElement.style.display = 'none';
		titleElement.parentNode.insertBefore(input, titleElement);

		// Focus and select all text
		input.focus();
		input.select();

		// Handle save
		const saveRename = async () => {
			const newTitle = input.value.trim();
			// Always save, even if it's the same - this allows reverting to original by clearing
			await this._renameFavourite(index, newTitle);
			// Restore original display
			input.remove();
			titleElement.style.display = '';
		};

		// Handle cancel
		const cancelRename = () => {
			input.remove();
			titleElement.style.display = '';
		};

		// Event listeners
		input.addEventListener('blur', saveRename);
		input.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				e.preventDefault();
				saveRename();
			} else if (e.key === 'Escape') {
				e.preventDefault();
				cancelRename();
			}
		});
	}

	_startRenamingSnapshot(titleElement, snapshotId) {
		const input = document.createElement('input');
		input.type = 'text';
		input.className = 'yt-favourites-dialog-rename-input';
		const snapshots = window.userSettings.mixSnapshots || {};
		const currentTitle = snapshots[snapshotId]?.title || 'Mix Snapshot';
		input.value = currentTitle;
		input.maxLength = 100;
		const originalText = titleElement.textContent;
		titleElement.style.display = 'none';
		titleElement.parentNode.insertBefore(input, titleElement);
		input.focus();
		input.select();
		const saveRename = async () => {
			const newTitle = input.value.trim();
			await this._renameSnapshot(snapshotId, newTitle);
			input.remove();
			titleElement.style.display = '';
		};
		const cancelRename = () => {
			input.remove();
			titleElement.style.display = '';
		};
		input.addEventListener('blur', saveRename);
		input.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				e.preventDefault();
				saveRename();
			} else if (e.key === 'Escape') {
				e.preventDefault();
				cancelRename();
			}
		});
	}

	async _renameSnapshot(snapshotId, newTitle) {
		try {
			const current = window.userSettings.mixSnapshots || {};
			const updated = Object.assign({}, current);
			if (!updated[snapshotId]) return;
			updated[snapshotId].title = newTitle || updated[snapshotId].title || 'Mix Snapshot';
			updated[snapshotId].renamedAt = Date.now();
			const success = await window.saveUserSetting('mixSnapshots', updated);
			if (success) {
				this._updateFavouritesDialog();
				logger.log('Navbar', 'Snapshot renamed successfully', {
					id: snapshotId,
					newTitle,
				});
			}
		} catch (error) {
			logger.error('Navbar', 'Failed to rename snapshot:', error);
		}
	}

	/**
	 * @description Renames a favourite mix and updates storage.
	 */
	async _renameFavourite(index, newTitle) {
		try {
			const favourites = [...(window.userSettings.favouriteMixes || [])];
			if (favourites[index]) {
				// Use customTitle property to preserve original title
				if (newTitle.trim() === '') {
					// Empty title means revert to original
					delete favourites[index].customTitle;
				} else {
					favourites[index].customTitle = newTitle.trim();
				}
				favourites[index].renamedAt = Date.now();

				const success = await window.saveUserSetting('favouriteMixes', favourites);
				if (success) {
					this._updateFavouritesDialog();
					logger.log('Navbar', 'Favourite renamed successfully', { index, newTitle });
				}
			}
		} catch (error) {
			logger.error('Navbar', 'Failed to rename favourite:', error);
		}
	}

	/**
	 * @description Adds the current mix or video to favourites.
	 */
	async _addCurrentMixToFavourites(forceVideoOnly) {
		const urlParams = new URLSearchParams(window.location.search);
		const playlistId = urlParams.get('list');
		const videoId = urlParams.get('v');

		if (!videoId) {
			logger.warn('Navbar', 'Cannot add to favourites: missing video ID');
			this._flashAddButtonFeedback('✕ Cannot add', 'error');
			return;
		}

		// Determine if this is a playlist/mix or individual video
		let isPlaylist = !!playlistId;
		if (forceVideoOnly) isPlaylist = false;

		// Get title using existing data from ytPlayerInstance
		let title = '';

		// First, try to get title from ytPlayerInstance (most reliable)
		if (window.ytPlayerInstance && window.ytPlayerInstance.options) {
			// Check for playlist title first
			if (
				window.ytPlayerInstance.options.currentPlaylist &&
				window.ytPlayerInstance.options.currentPlaylist.title &&
				isPlaylist
			) {
				title = window.ytPlayerInstance.options.currentPlaylist.title;
			}
			// If no playlist title, try video title
			else if (
				window.ytPlayerInstance.options.nowPlayingVideoDetails &&
				window.ytPlayerInstance.options.nowPlayingVideoDetails.title
			) {
				title = window.ytPlayerInstance.options.nowPlayingVideoDetails.title;
			}
		}

		// Fallback
		if (!title) {
			title = isPlaylist ? `Mix - ${playlistId}` : `Video - ${videoId}`;
		}

		// Create favourite object
		const favourite = {
			title: title,
			videoId: videoId,
			addedAt: Date.now(),
		};

		// Add playlistId only if it exists (for playlists/mixes)
		if (isPlaylist) {
			favourite.playlistId = playlistId;
		}

		// Get current favourites
		const favourites = window.userSettings.favouriteMixes || [];

		// Check if already exists
		const exists = favourites.some((fav) => {
			if (isPlaylist) {
				// For playlists, check by playlistId
				return fav.playlistId === playlistId;
			} else {
				// For individual videos, check by videoId and ensure it's not part of a playlist
				return fav.videoId === videoId && !fav.playlistId;
			}
		});

		if (exists) {
			logger.log(
				'Navbar',
				isPlaylist ? 'Mix already in favourites' : 'Video already in favourites'
			);
			this._flashAddButtonFeedback('ⓘ Already saved', 'info');
			return;
		}

		// Add to favourites
		favourites.push(favourite);

		// Save to storage
		const success = await window.saveUserSetting('favouriteMixes', favourites);
		if (success) {
			logger.log('Navbar', `${isPlaylist ? 'Mix' : 'Video'} added to favourites`, favourite);
			this._updateFavouritesDialog(); // Refresh the dialog
			this._flashAddButtonFeedback('✓ Added', 'success');
		} else {
			this._flashAddButtonFeedback('✕ Failed', 'error');
		}
	}

	_hideAddToExistingSnapshotDialog() {
		const overlay = document.getElementById('yt-add-to-existing-snapshot-overlay');
		const modal = overlay ? overlay.querySelector('.yt-snapshot-reorder-modal') : null;
		if (overlay && modal) {
			overlay.classList.remove('visible');
			modal.classList.remove('slide-in');
			modal.classList.add('slide-out');
			setTimeout(() => {
				overlay.remove();
			}, 300);
		}
	}

	_showAddToExistingSnapshotDialog(mode = 'select', sourceSnapshotId = null) {
		this._hideAddToExistingSnapshotDialog();

		const snapshotsObj = window.userSettings.mixSnapshots || {};
		const activeSnapshotId = window.userSettings.activeMixSnapshotId;
		const persistedActiveSnapshot = activeSnapshotId ? snapshotsObj[activeSnapshotId] : null;
		const tempSnapshot = window.userSettings.tempMixSnapshot || null;
		const isTempSnapshotPlaying =
			!!activeSnapshotId &&
			!persistedActiveSnapshot &&
			!!tempSnapshot &&
			tempSnapshot.id === activeSnapshotId;

		const snapshotById = Object.assign({}, snapshotsObj);
		if (isTempSnapshotPlaying) {
			snapshotById[tempSnapshot.id] = tempSnapshot;
		}

		const snapshots = Object.values(snapshotById).filter((s) => s && s.id);
		if (!snapshots.length) {
			this._flashAddButtonFeedback('✕ No snapshots saved', 'error');
			return;
		}

		snapshots.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

		const overlay = document.createElement('div');
		overlay.className = 'yt-snapshot-reorder-overlay yt-add-to-existing-snapshot-overlay';
		overlay.id = 'yt-add-to-existing-snapshot-overlay';

		const modal = document.createElement('div');
		modal.className = 'yt-snapshot-reorder-modal yt-add-to-existing-snapshot-modal';

		const header = document.createElement('div');
		header.className = 'yt-snapshot-reorder-header';

		const closeBtn = document.createElement('button');
		closeBtn.className = 'yt-snapshot-reorder-close';
		closeBtn.setAttribute('aria-label', 'Close');
		closeBtn.textContent = '×';
		closeBtn.addEventListener('click', () => this._hideAddToExistingSnapshotDialog());

		const title = document.createElement('div');
		title.className = 'yt-snapshot-reorder-header-title';
		title.textContent = 'Select Snapshot';

		const headerRight = document.createElement('div');
		headerRight.className = 'yt-snapshot-reorder-done';
		headerRight.style.visibility = 'hidden';

		header.appendChild(closeBtn);
		header.appendChild(title);
		header.appendChild(headerRight);

		const content = document.createElement('div');
		content.className = 'yt-snapshot-reorder-content';

		const list = document.createElement('div');
		list.className = 'yt-snapshot-reorder-list';

		const renderSelectView = () => {
			if (mode === 'merge') {
				title.textContent = 'Merge Into Snapshot';
			} else if (mode === 'video') {
				title.textContent = 'Add Video to Snapshot';
			} else if (mode === 'playlist') {
				title.textContent = 'Add Playlist to Snapshot';
			} else {
				title.textContent = 'Select Snapshot';
			}
			while (list.firstChild) list.removeChild(list.firstChild);

			snapshots.forEach((snap) => {
				if (mode === 'merge' && sourceSnapshotId && snap.id === sourceSnapshotId) {
					return;
				}
				const firstItem =
					Array.isArray(snap.items) && snap.items.length ? snap.items[0] : null;

				const row = document.createElement('div');
				row.className = 'yt-snapshot-reorder-item';
				row.dataset.snapshotId = snap.id;

				const thumbWrap = document.createElement('div');
				thumbWrap.className = 'yt-snapshot-reorder-thumb';
				const thumbImg = document.createElement('img');
				const thumbUrl =
					(firstItem?.id && MediaUtils.getStandardThumbnailUrl(firstItem.id)) ||
					firstItem?.thumbnailUrl ||
					'';
				if (thumbUrl) thumbImg.src = thumbUrl;
				thumbImg.alt = snap.title || 'Snapshot';
				thumbWrap.appendChild(thumbImg);

				const textWrap = document.createElement('div');
				textWrap.className = 'yt-snapshot-reorder-item-text';

				const rowTitle = document.createElement('div');
				rowTitle.className = 'yt-snapshot-reorder-item-title';
				rowTitle.textContent = snap.title || 'Mix Snapshot';

				const rowMeta = document.createElement('div');
				rowMeta.className = 'yt-snapshot-reorder-item-meta';
				const count = Array.isArray(snap.items) ? snap.items.length : 0;
				rowMeta.textContent = `Snapshot • ${count} items`;

				textWrap.appendChild(rowTitle);
				textWrap.appendChild(rowMeta);

				row.appendChild(thumbWrap);
				row.appendChild(textWrap);

				row.addEventListener('click', async () => {
					if (mode === 'merge') {
						const mergeSourceId = sourceSnapshotId || activeSnapshotId;
						await this._mergeSnapshots(snap.id, mergeSourceId);
						this._hideAddToExistingSnapshotDialog();
						return;
					}
					if (mode === 'video' || mode === 'playlist') {
						await this._addToSnapshot(snap.id, mode);
						this._hideAddToExistingSnapshotDialog();
						return;
					}
					renderActionView(snap.id);
				});

				list.appendChild(row);
			});
		};

		const renderActionView = (snapshotId) => {
			const snap = snapshotById[snapshotId];
			if (!snap) {
				this._flashAddButtonFeedback('✕ Snapshot missing', 'error');
				this._hideAddToExistingSnapshotDialog();
				return;
			}

			const urlParams = new URLSearchParams(window.location.search);
			const isPlaylist = !!urlParams.get('list');

			title.textContent = snap.title || 'Mix Snapshot';
			while (list.firstChild) list.removeChild(list.firstChild);

			const backBtn = document.createElement('button');
			backBtn.className = 'yt-dropdown-option';
			backBtn.textContent = 'Back';
			backBtn.addEventListener('click', () => {
				renderSelectView();
			});

			const activeId = window.userSettings.activeMixSnapshotId;
			const canMerge = !!activeId && activeId !== snapshotId && !!snapshotById[activeId];
			const mergeBtn = document.createElement('button');
			mergeBtn.className = 'yt-dropdown-option';
			mergeBtn.textContent = 'Merge Snapshots';
			mergeBtn.addEventListener('click', async () => {
				await this._mergeSnapshots(snapshotId, activeId);
				this._hideAddToExistingSnapshotDialog();
			});

			list.appendChild(backBtn);
			if (canMerge) list.appendChild(mergeBtn);
			const addLabel = isPlaylist ? 'Add Full Playlist/Mix' : 'Add Current Video';
			const addMode = isPlaylist ? 'playlist' : 'video';
			const addBtn = document.createElement('button');
			addBtn.className = 'yt-dropdown-option';
			addBtn.textContent = addLabel;
			addBtn.addEventListener('click', async () => {
				await this._addToSnapshot(snapshotId, addMode);
				this._hideAddToExistingSnapshotDialog();
			});
			list.appendChild(addBtn);

			if (!isPlaylist) return;
			const addVideoBtn = document.createElement('button');
			addVideoBtn.className = 'yt-dropdown-option';
			addVideoBtn.textContent = 'Add Current Video';
			addVideoBtn.addEventListener('click', async () => {
				await this._addToSnapshot(snapshotId, 'video');
				this._hideAddToExistingSnapshotDialog();
			});
			list.appendChild(addVideoBtn);
		};

		content.appendChild(list);
		modal.appendChild(header);
		modal.appendChild(content);
		overlay.appendChild(modal);

		document.body.appendChild(overlay);

		overlay.addEventListener('click', (e) => {
			if (e.target === overlay) {
				this._hideAddToExistingSnapshotDialog();
			}
		});

		renderSelectView();

		requestAnimationFrame(() => {
			overlay.classList.add('visible');
			modal.classList.add('slide-in');
		});
	}

	async _addToSnapshot(snapshotId, mode) {
		const snapshotsObj = window.userSettings.mixSnapshots || {};
		let snap = snapshotsObj[snapshotId] || null;
		let source = 'persisted';
		if (!snap) {
			const tempSnapshot = window.userSettings.tempMixSnapshot || null;
			if (tempSnapshot && tempSnapshot.id === snapshotId) {
				snap = tempSnapshot;
				source = 'temp';
			}
		}
		if (!snap) {
			this._flashAddButtonFeedback('✕ Snapshot missing', 'error');
			return false;
		}

		const urlParams = new URLSearchParams(window.location.search);
		const videoId = urlParams.get('v');
		const playlistId = urlParams.get('list');

		if (!videoId) {
			this._flashAddButtonFeedback('✕ Cannot add', 'error');
			return false;
		}

		const existingItems = Array.isArray(snap.items) ? snap.items.slice() : [];
		const existingIds = new Set(existingItems.map((it) => it?.id).filter(Boolean));

		let itemsToAdd = [];

		if (mode === 'playlist' && playlistId) {
			let cached = window.ytPlayerInstance?.getCachedPlaylistData?.()?.items || null;
			if (!Array.isArray(cached) || !cached.length) {
				cached = window.ytPlayerInstance?.options?.currentPlaylist?.items || null;
			}
			if (!Array.isArray(cached) || !cached.length) {
				this._flashAddButtonFeedback('✕ Playlist not loaded', 'error');
				return false;
			}
			itemsToAdd = cached
				.filter((it) => it?.id && !existingIds.has(it.id))
				.map((it) => ({
					id: it.id,
					title: it.title || '',
					artist: it.artist || '',
					duration: it.duration || '',
					thumbnailUrl: it.thumbnailUrl || '',
				}));
		} else {
			let title = '';
			let artist = '';
			let duration = '';

			const details = window.ytPlayerInstance?.options?.nowPlayingVideoDetails || null;
			if (details) {
				title = details.title || '';
				artist = details.author || '';
			}

			const playlistItems = window.ytPlayerInstance?.options?.currentPlaylist?.items || null;
			if (Array.isArray(playlistItems) && playlistItems.length) {
				const match = playlistItems.find((it) => it?.id === videoId);
				if (match) {
					if (!title) title = match.title || '';
					if (!artist) artist = match.artist || '';
					if (!duration) duration = match.duration || '';
				}
			}

			if (!title) {
				let rawTitle = document.title || '';
				if (rawTitle.toLowerCase().endsWith(' - youtube')) {
					rawTitle = rawTitle.substring(0, rawTitle.length - ' - youtube'.length).trim();
				}
				title = rawTitle || `Video - ${videoId}`;
			}

			if (!existingIds.has(videoId)) {
				itemsToAdd = [
					{
						id: videoId,
						title,
						artist,
						duration,
					},
				];
			}
		}

		if (!itemsToAdd.length) {
			this._flashAddButtonFeedback('ⓘ No new items', 'info');
			return true;
		}

		const nextItems = existingItems.concat(itemsToAdd);
		const updatedSnap = Object.assign({}, snap, { items: nextItems, updatedAt: Date.now() });
		let ok = false;
		if (source === 'temp') {
			ok = await window.saveUserSetting('tempMixSnapshot', updatedSnap);
		} else {
			const updatedAll = Object.assign({}, snapshotsObj, { [snapshotId]: updatedSnap });
			ok = await window.saveUserSetting('mixSnapshots', updatedAll);
		}
		if (!ok) {
			this._flashAddButtonFeedback('✕ Failed', 'error');
			return false;
		}

		if (window.ytPlayerInstance && window.userSettings.activeMixSnapshotId === snapshotId) {
			const playlistTitle = updatedSnap.title || 'Mix Snapshot';
			window.ytPlayerInstance.updatePlaylist(nextItems, updatedSnap.id, playlistTitle);
			const currentVideoId =
				typeof PageUtils !== 'undefined' && PageUtils.getCurrentVideoIdFromUrl
					? PageUtils.getCurrentVideoIdFromUrl()
					: null;
			if (currentVideoId) {
				window.ytPlayerInstance.setActivePlaylistItem?.(currentVideoId);
			}
		}

		this._updateFavouritesDialog();
		this._flashAddButtonFeedback('✓ Added', 'success');
		return true;
	}

	async _mergeSnapshots(targetSnapshotId, sourceSnapshotId) {
		if (!targetSnapshotId || !sourceSnapshotId) {
			this._flashAddButtonFeedback('✕ Snapshot missing', 'error');
			return false;
		}

		if (targetSnapshotId === sourceSnapshotId) {
			this._flashAddButtonFeedback('ⓘ Same snapshot', 'info');
			return true;
		}

		const snapshotsObj = window.userSettings.mixSnapshots || {};
		const tempSnapshot = window.userSettings.tempMixSnapshot || null;

		let targetSnap = snapshotsObj[targetSnapshotId] || null;
		let targetSource = 'persisted';
		if (!targetSnap && tempSnapshot && tempSnapshot.id === targetSnapshotId) {
			targetSnap = tempSnapshot;
			targetSource = 'temp';
		}

		let sourceSnap = snapshotsObj[sourceSnapshotId] || null;
		if (!sourceSnap && tempSnapshot && tempSnapshot.id === sourceSnapshotId) {
			sourceSnap = tempSnapshot;
		}

		if (!targetSnap || !sourceSnap) {
			this._flashAddButtonFeedback('✕ Snapshot missing', 'error');
			return false;
		}

		const targetItems = Array.isArray(targetSnap.items) ? targetSnap.items.slice() : [];
		const sourceItems = Array.isArray(sourceSnap.items) ? sourceSnap.items.slice() : [];

		const existingIds = new Set(targetItems.map((it) => it?.id).filter(Boolean));
		const itemsToAdd = sourceItems.filter((it) => it?.id && !existingIds.has(it.id));

		if (!itemsToAdd.length) {
			this._flashAddButtonFeedback('ⓘ No new items', 'info');
			return true;
		}

		const nextItems = targetItems.concat(itemsToAdd);
		const updatedSnap = Object.assign({}, targetSnap, {
			items: nextItems,
			updatedAt: Date.now(),
		});

		let ok = false;
		if (targetSource === 'temp') {
			ok = await window.saveUserSetting('tempMixSnapshot', updatedSnap);
		} else {
			const updatedAll = Object.assign({}, snapshotsObj, { [targetSnapshotId]: updatedSnap });
			ok = await window.saveUserSetting('mixSnapshots', updatedAll);
		}

		if (!ok) {
			this._flashAddButtonFeedback('✕ Failed', 'error');
			return false;
		}

		if (
			window.ytPlayerInstance &&
			window.userSettings.activeMixSnapshotId === targetSnapshotId
		) {
			const playlistTitle = updatedSnap.title || 'Mix Snapshot';
			window.ytPlayerInstance.updatePlaylist(nextItems, updatedSnap.id, playlistTitle);
			const currentVideoId =
				typeof PageUtils !== 'undefined' && PageUtils.getCurrentVideoIdFromUrl
					? PageUtils.getCurrentVideoIdFromUrl()
					: null;
			if (currentVideoId) {
				window.ytPlayerInstance.setActivePlaylistItem?.(currentVideoId);
			}
		}

		this._updateFavouritesDialog();
		this._flashAddButtonFeedback('✓ Merged', 'success');
		return true;
	}

	/**
	 * @description Temporarily changes the add button label/icon to show feedback.
	 * @param {string} message - The message to display on the button.
	 * @param {'success'|'info'|'error'} [type='success'] - The feedback type for styling.
	 */
	_flashAddButtonFeedback(message, type = 'success') {
		const btn = document.querySelector('.yt-favourites-dialog-add-btn');
		if (!btn) {
			return;
		}

		// Preserve original label only once
		if (!btn.dataset.originalLabel) {
			btn.dataset.originalLabel = btn.textContent || '+ Add';
		}

		// Apply temporary state
		btn.textContent = message;
		btn.classList.remove('success', 'info', 'error');
		btn.classList.add(type);
		btn.disabled = true;

		// Revert after delay
		setTimeout(() => {
			btn.textContent = btn.dataset.originalLabel;
			btn.classList.remove('success', 'info', 'error');
			btn.disabled = false;
		}, 2000);
	}

	/**
	 * @description Removes a favourite mix by index (legacy method for compatibility).
	 * @param {number} index - The index of the favourite to remove.
	 */
	async _removeFavourite(index) {
		return this._removeFavouriteFromDialog(index);
	}

	/**
	 * @description Shows a dropdown menu for adding to favourites when on a mix/playlist.
	 * @param {Event} event - The click event.
	 * @param {HTMLElement} button - The button that was clicked.
	 */
	_createInfoButton() {
		const infoBtn = document.createElement('button');
		infoBtn.className = 'yt-add-to-favourites-info-btn';
		infoBtn.setAttribute('aria-label', 'Info');

		const infoIcon = document.createElement('span');
		infoIcon.textContent = 'i';
		infoIcon.style.fontWeight = 'bold';
		infoIcon.style.fontFamily = 'serif';
		infoIcon.style.fontSize = '18px';
		infoIcon.style.lineHeight = '1';
		infoBtn.appendChild(infoIcon);

		const hideInfoPopup = () => {
			const existing = document.getElementById('yt-add-favourites-info-overlay');
			if (existing) existing.remove();
		};

		const showInfoPopup = () => {
			hideInfoPopup();

			const infoOverlay = document.createElement('div');
			infoOverlay.className = 'yt-add-favourites-info-overlay';
			infoOverlay.id = 'yt-add-favourites-info-overlay';

			const infoModal = document.createElement('div');
			infoModal.className = 'yt-add-favourites-info-modal';

			const infoHeader = document.createElement('div');
			infoHeader.className = 'yt-add-favourites-info-header';

			const infoTitle = document.createElement('div');
			infoTitle.className = 'yt-add-favourites-info-title';
			infoTitle.textContent = 'About Playlists, Mixes & Snapshots';

			const infoClose = document.createElement('button');
			infoClose.className = 'yt-add-favourites-info-close';
			infoClose.setAttribute('aria-label', 'Close');
			infoClose.textContent = '×';
			infoClose.addEventListener('click', hideInfoPopup);

			infoHeader.appendChild(infoTitle);
			infoHeader.appendChild(infoClose);

			const infoBody = document.createElement('div');
			infoBody.className = 'yt-add-favourites-info-body';

			const para1 = document.createElement('p');
			para1.textContent =
				'YouTube mixes are dynamic and can change over time. Playlists can also be altered.';

			const para2 = document.createElement('p');
			para2.textContent =
				'Snapshots preserve the current mix exactly as is, also allowing Looped and Shuffle playback. You can also easily rearrange and add additional videos and playlists to snapshots.';

			const para3 = document.createElement('p');
			para3.textContent = 'Recommendation: Backup favourites/snapshots in extension options.';

			infoBody.appendChild(para1);
			infoBody.appendChild(para2);
			infoBody.appendChild(para3);

			infoModal.appendChild(infoHeader);
			infoModal.appendChild(infoBody);
			infoOverlay.appendChild(infoModal);
			document.body.appendChild(infoOverlay);

			requestAnimationFrame(() => {
				infoOverlay.classList.add('visible');
			});

			infoOverlay.addEventListener('click', (e) => {
				if (e.target === infoOverlay) hideInfoPopup();
			});
		};

		infoBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			const existing = document.getElementById('yt-add-favourites-info-overlay');
			if (existing) {
				hideInfoPopup();
			} else {
				showInfoPopup();
			}
		});

		return infoBtn;
	}

	_showAddToFavouritesDropdown(event, button) {
		this._hideAddToFavouritesDropdown();

		const urlParams = new URLSearchParams(window.location.search);
		const videoId = urlParams.get('v');
		const playlistId = urlParams.get('list');
		const isPlaylist = !!playlistId;

		if (!videoId) {
			this._flashAddButtonFeedback('✕ Cannot add', 'error');
			return;
		}

		const activeSnapshotId = window.userSettings.activeMixSnapshotId;
		const snapshotsObj = window.userSettings.mixSnapshots || {};
		const persistedSnapshot = activeSnapshotId && snapshotsObj[activeSnapshotId];
		const tempSnapshot = window.userSettings.tempMixSnapshot || null;
		const isTempSnapshotPlaying =
			!!activeSnapshotId && !persistedSnapshot && tempSnapshot?.id === activeSnapshotId;
		const activeSnapshot = persistedSnapshot || (isTempSnapshotPlaying ? tempSnapshot : null);

		const overlay = document.createElement('div');
		overlay.className = 'yt-snapshot-reorder-overlay yt-add-to-favourites-overlay';
		overlay.id = 'yt-add-to-favourites-overlay';

		const modal = document.createElement('div');
		modal.className = 'yt-snapshot-reorder-modal yt-add-to-favourites-modal';

		const header = document.createElement('div');
		header.className = 'yt-snapshot-reorder-header';

		const closeBtn = document.createElement('button');
		closeBtn.className = 'yt-snapshot-reorder-close';
		closeBtn.setAttribute('aria-label', 'Close');
		closeBtn.textContent = '×';
		closeBtn.addEventListener('click', () => this._hideAddToFavouritesDropdown());

		const title = document.createElement('div');
		title.className = 'yt-snapshot-reorder-header-title';
		title.textContent = 'Add to Favourites';

		const headerRight = document.createElement('div');
		headerRight.className = 'yt-add-to-favourites-header-actions';
		headerRight.appendChild(this._createInfoButton());

		header.appendChild(closeBtn);
		header.appendChild(title);
		header.appendChild(headerRight);

		const content = document.createElement('div');
		content.className = 'yt-add-to-favourites-content';

		const createCard = (config) => {
			const section = document.createElement('div');
			section.className = 'yt-add-to-favourites-section';

			const card = document.createElement('div');
			card.className = 'yt-add-to-favourites-card';

			const thumb = document.createElement('div');
			thumb.className = 'yt-favourites-dialog-item-thumbnail';
			if (config.stacked) {
				thumb.classList.add('stacked');
			}
			const thumbImg = document.createElement('img');
			if (config.thumbUrl) {
				thumbImg.src = config.thumbUrl;
			}
			thumbImg.alt = config.title || '';
			thumbImg.style.width = '100%';
			thumbImg.style.height = '100%';
			thumbImg.style.objectFit = 'cover';
			thumbImg.style.borderRadius = '8px';
			thumbImg.style.position = 'relative';
			thumbImg.style.zIndex = '9';
			thumb.appendChild(thumbImg);

			const info = document.createElement('div');
			info.className = 'yt-add-to-favourites-info';

			const cardTitle = document.createElement('div');
			cardTitle.className = 'yt-add-to-favourites-title';
			if (config.badgeText) {
				const badge = document.createElement('span');
				badge.className = 'yt-mix-badge';
				badge.textContent = config.badgeText;
				cardTitle.appendChild(badge);
			}
			const titleText = document.createTextNode(config.title || '');
			cardTitle.appendChild(titleText);

			info.appendChild(cardTitle);

			if (config.meta) {
				const cardMeta = document.createElement('div');
				cardMeta.className = 'yt-add-to-favourites-meta';
				cardMeta.textContent = config.meta;
				info.appendChild(cardMeta);
			}

			card.appendChild(thumb);
			card.appendChild(info);

			const actions = document.createElement('div');
			actions.className = 'yt-add-to-favourites-actions';
			config.actions.forEach((action) => {
				const btn = document.createElement('button');
				btn.className = 'yt-add-to-favourites-action';
				btn.textContent = action.label;
				btn.addEventListener('click', action.onClick);
				actions.appendChild(btn);
			});

			section.appendChild(card);
			section.appendChild(actions);
			if (config.stacked && config.stackThumbUrl) {
				ColorUtils.getAdaptiveColorFromThumbnail(config.stackThumbUrl)
					.then((colors) => {
						thumb.style.setProperty('--stack-color-1', colors.primary);
						thumb.style.setProperty('--stack-color-2', colors.secondary);
					})
					.catch(() => {
						thumb.style.setProperty('--stack-color-1', '#666666');
						thumb.style.setProperty('--stack-color-2', '#888888');
					});
			}
			return section;
		};

		const nowPlaying = window.ytPlayerInstance?.options?.nowPlayingVideoDetails || null;
		let videoTitle = nowPlaying?.title || '';
		let videoAuthor = nowPlaying?.author || '';
		let videoDuration = nowPlaying?.duration || '';

		const playlistItems = window.ytPlayerInstance?.options?.currentPlaylist?.items || null;
		if (Array.isArray(playlistItems) && playlistItems.length) {
			const match = playlistItems.find((it) => it?.id === videoId);
			if (match) {
				if (!videoTitle) videoTitle = match.title || '';
				if (!videoAuthor) videoAuthor = match.artist || '';
				if (!videoDuration) videoDuration = match.duration || '';
			}
		}

		if (!videoTitle) {
			let rawTitle = document.title || '';
			if (rawTitle.toLowerCase().endsWith(' - youtube')) {
				rawTitle = rawTitle.substring(0, rawTitle.length - ' - youtube'.length).trim();
			}
			videoTitle = rawTitle || `Video - ${videoId}`;
		}

		const videoMetaParts = [];
		if (videoAuthor) videoMetaParts.push(videoAuthor);
		if (videoDuration) videoMetaParts.push(videoDuration);

		const videoSection = createCard({
			title: videoTitle,
			meta: videoMetaParts.join(' • '),
			thumbUrl: MediaUtils.getStandardThumbnailUrl(videoId) || nowPlaying?.thumbnailUrl || '',
			actions: [
				{
					label: 'Add to Favourites',
					onClick: () => {
						this._addCurrentMixToFavourites(true);
						this._hideAddToFavouritesDropdown();
					},
				},
				{
					label: 'Add to Snapshot',
					onClick: () => {
						this._hideAddToFavouritesDropdown();
						this._showAddToExistingSnapshotDialog('video');
					},
				},
			],
		});

		let variantType = null;
		if (activeSnapshot) {
			variantType = 'snapshot';
		} else if (isPlaylist) {
			variantType = 'playlist';
		}

		if (variantType) {
			let variantTitle = '';
			let variantMeta = '';
			let variantThumb = '';
			let variantBadge = '';
			let variantStackThumb = '';
			const actions = [];

			if (variantType === 'snapshot') {
				const snapItems = Array.isArray(activeSnapshot.items) ? activeSnapshot.items : [];
				const firstItem = snapItems.length ? snapItems[0] : null;
				variantTitle = activeSnapshot.title || 'Mix Snapshot';
				variantMeta = `Snapshot • ${snapItems.length} items`;
				variantThumb =
					(firstItem?.id && MediaUtils.getStandardThumbnailUrl(firstItem.id)) ||
					firstItem?.thumbnailUrl ||
					'';
				variantStackThumb =
					(firstItem?.id && MediaUtils.getStandardThumbnailUrl(firstItem.id)) ||
					firstItem?.thumbnailUrl ||
					'';
				variantBadge = 'SNAP';

				if (isTempSnapshotPlaying) {
					actions.push({
						label: 'Store Snapshot',
						onClick: async () => {
							this._hideAddToFavouritesDropdown();
							await this._storeActiveTempSnapshot();
						},
					});
				}

				if (activeSnapshotId) {
					actions.push({
						label: 'Merge Snapshot',
						onClick: () => {
							this._hideAddToFavouritesDropdown();
							this._showAddToExistingSnapshotDialog('merge', activeSnapshotId);
						},
					});
				}
			} else {
				const playlist = window.ytPlayerInstance?.options?.currentPlaylist || null;
				const items = Array.isArray(playlist?.items) ? playlist.items : [];
				const firstItem = items.length ? items[0] : null;
				const itemCount = items.length;
				variantTitle = playlist?.title || 'Playlist/Mix';
				variantMeta = itemCount ? `Playlist • ${itemCount} items` : 'Playlist';
				variantThumb =
					(firstItem?.id && MediaUtils.getStandardThumbnailUrl(firstItem.id)) ||
					firstItem?.thumbnailUrl ||
					'';
				variantStackThumb =
					(firstItem?.id && MediaUtils.getStandardThumbnailUrl(firstItem.id)) ||
					firstItem?.thumbnailUrl ||
					'';
				const isMix = /^(?:my\s+)?mix/i.test(variantTitle);
				variantBadge = isMix ? 'Mix' : 'List';

				actions.push(
					{
						label: 'Add to Favourites',
						onClick: () => {
							this._addCurrentMixToFavourites();
							this._hideAddToFavouritesDropdown();
						},
					},
					{
						label: 'Save as Snapshot',
						onClick: () => {
							const ok = window.createMixSnapshotFromCurrentMix?.();
							if (ok) {
								this._flashAddButtonFeedback('✓ Snapshot Saved', 'success');
								this._updateFavouritesDialog();
							} else {
								this._flashAddButtonFeedback('✕ Failed', 'error');
							}
							this._hideAddToFavouritesDropdown();
						},
					},
					{
						label: 'Add to Exsisting Snapshot',
						onClick: () => {
							this._hideAddToFavouritesDropdown();
							this._showAddToExistingSnapshotDialog('playlist');
						},
					}
				);

				if (isTempSnapshotPlaying) {
					actions.push({
						label: 'Store Snapshot',
						onClick: async () => {
							this._hideAddToFavouritesDropdown();
							await this._storeActiveTempSnapshot();
						},
					});
				}
			}

			if (actions.length) {
				const variantSection = createCard({
					title: variantTitle,
					meta: variantMeta,
					thumbUrl: variantThumb,
					actions,
					badgeText: variantBadge,
					stacked: true,
					stackThumbUrl: variantStackThumb || variantThumb,
				});
				const tabs = document.createElement('div');
				tabs.className = 'yt-add-to-favourites-tabs';
				const panels = document.createElement('div');
				panels.className = 'yt-add-to-favourites-panels';
				const collectionPanel = document.createElement('div');
				collectionPanel.className = 'yt-add-to-favourites-tab-panel';
				const videoPanel = document.createElement('div');
				videoPanel.className = 'yt-add-to-favourites-tab-panel';
				collectionPanel.appendChild(variantSection);
				videoPanel.appendChild(videoSection);
				panels.appendChild(collectionPanel);
				panels.appendChild(videoPanel);

				const collectionTab = document.createElement('button');
				collectionTab.className = 'yt-add-to-favourites-tab';
				collectionTab.textContent =
					variantType === 'snapshot' ? 'Snapshot' : 'Playlist/Mix';

				const videoTab = document.createElement('button');
				videoTab.className = 'yt-add-to-favourites-tab';
				videoTab.textContent = 'Video';

				const setActiveTab = (key) => {
					const isCollection = key === 'collection';
					collectionTab.classList.toggle('active', isCollection);
					videoTab.classList.toggle('active', !isCollection);
					collectionPanel.classList.toggle('active', isCollection);
					videoPanel.classList.toggle('active', !isCollection);
				};

				collectionTab.addEventListener('click', () => setActiveTab('collection'));
				videoTab.addEventListener('click', () => setActiveTab('video'));

				tabs.appendChild(collectionTab);
				tabs.appendChild(videoTab);

				content.appendChild(tabs);
				content.appendChild(panels);
				setActiveTab('collection');
			}
		} else {
			const panels = document.createElement('div');
			panels.className = 'yt-add-to-favourites-panels';
			const videoPanel = document.createElement('div');
			videoPanel.className = 'yt-add-to-favourites-tab-panel active';
			videoPanel.appendChild(videoSection);
			panels.appendChild(videoPanel);
			content.appendChild(panels);
		}

		modal.appendChild(header);
		modal.appendChild(content);
		overlay.appendChild(modal);

		document.body.appendChild(overlay);

		overlay.addEventListener('click', (e) => {
			if (e.target === overlay) {
				this._hideAddToFavouritesDropdown();
			}
		});

		requestAnimationFrame(() => {
			overlay.classList.add('visible');
			modal.classList.add('slide-in');
		});
	}

	/**
	 * @description Hides the add to favourites dropdown.
	 */
	_hideAddToFavouritesDropdown() {
		const infoOverlay = document.getElementById('yt-add-favourites-info-overlay');
		if (infoOverlay) {
			infoOverlay.remove();
		}
		const overlay = document.getElementById('yt-add-to-favourites-overlay');
		const modal = overlay ? overlay.querySelector('.yt-add-to-favourites-modal') : null;
		if (overlay && modal) {
			overlay.classList.remove('visible');
			modal.classList.remove('slide-in');
			modal.classList.add('slide-out');
			setTimeout(() => {
				overlay.remove();
			}, 300);
		}
	}

	/**
	 * @description Handles actions from external sources like the FAB.
	 * @param {string} action - The action to handle.
	 */
	handleAction(action) {
		logger.log('Navbar', 'handleAction called with:', action);
		switch (action) {
			case 'play':
				this._handlePlayPauseClick(
					this.navbarElement?.querySelector('[data-action="play"]')
				);
				break;
			case 'previous':
				this._handlePreviousClick('previous');
				break;
			case 'restart-then-previous':
				this._handlePreviousClick('restart-then-previous');
				break;
			case 'skip':
				this._handleSkipClick();
				break;
			case 'seek-back':
				this._handleSeekClick(-1);
				break;
			case 'seek-forward':
				this._handleSeekClick(1);
				break;
			case 'repeat':
				this._handleRepeatClick(
					this.navbarElement?.querySelector('[data-action="repeat"]')
				);
				if (typeof updateNavbarRepeatButtonVisual === 'function') {
					updateNavbarRepeatButtonVisual();
				}
				break;
			case 'home':
				logger.log('Navbar', 'Calling _handleLogoClick');
				this._handleLogoClick();
				break;
			case 'mixes':
				logger.log('Navbar', 'Calling _handleMixesClick');
				this._handleMixesClick();
				break;
			case 'playlists':
				logger.log('Navbar', 'Calling _handlePlaylistsClick');
				this._handlePlaylistsClick();
				break;
			case 'live':
				logger.log('Navbar', 'Calling _handleLiveClick');
				this._handleLiveClick();
				break;
			case 'music':
				logger.log('Navbar', 'Calling _handleMusicClick');
				this._handleMusicClick();
				break;
			case 'text-search':
				logger.log('Navbar', 'Calling _handleTextSearchClick');
				this._handleTextSearchClick();
				break;
			case 'custom-search':
				logger.log('Navbar', 'Calling _handleCustomSearchClick');
				this._handleCustomSearchClick();
				break;
			case 'voice-search':
				logger.log('Navbar', 'Calling _handleVoiceSearchClick');
				this._handleVoiceSearchClick();
				break;
			case 'favourites':
				logger.log('Navbar', 'Calling _handleFavouritesClick');
				this._handleFavouritesClick();
				break;
			case 'video-toggle':
				logger.log('Navbar', 'Calling _handleVideoToggleClick');
				this._handleVideoToggleClick();
				break;
			case 'toggle-drawer':
				logger.log('Navbar', 'Calling _handleToggleDrawerClick');
				this._handleToggleDrawerClick();
				break;
			case 'debug-logs':
				logger.log('Navbar', 'Calling _handleDebugLogsClick');
				this._handleDebugLogsClick();
				break;
			default:
				logger.warn('Navbar', `Unknown action: ${action}`);
				break;
		}
	}

	_handlePlayPauseClick(button) {
		const inst = window.ytPlayerInstance;
		if (!inst || !inst.options || !inst.options.callbacks) return;

		const currentState = this._getCurrentPlayState();
		const playing = window.PlayState ? window.PlayState.PLAYING : 'playing';
		const paused = window.PlayState ? window.PlayState.PAUSED : 'paused';
		const newState = currentState === playing ? paused : playing;

		if (typeof inst.setPlayState === 'function') {
			inst.setPlayState(newState);
		}
		inst.options.callbacks.onPlayPauseClick?.(newState, { source: 'custom' });

		if (button) {
			this._updateNavbarPlayToggleIcon(button);
		}
	}

	_handlePreviousClick(actionId) {
		const inst = window.ytPlayerInstance;
		if (!inst || !inst.options || !inst.options.callbacks) return;
		inst.options.callbacks.onPreviousClick?.(actionId);
	}

	_handleSkipClick() {
		const inst = window.ytPlayerInstance;
		if (!inst || !inst.options || !inst.options.callbacks) return;
		inst.options.callbacks.onSkipClick?.();
	}

	_handleSeekClick(direction) {
		const inst = window.ytPlayerInstance;
		if (!inst || !inst.options || !inst.options.callbacks) return;
		const secs = ActionUtils.getSeekSkipSeconds(inst);
		inst.options.callbacks.onGestureSeek?.(direction * secs);
	}

	_handleRepeatClick(button) {
		const inst = window.ytPlayerInstance;
		if (!inst || !inst.options || !inst.options.callbacks) return;
		const raw = window.userSettings.repeatStickyAcrossVideos;
		const mode =
			raw === true ? 'always-sticky' : raw === false || raw == null ? 'always-single' : raw;
		const cycle = window.repeatCycleState
			? window.repeatCycleState
			: window.userSettings.repeatCurrentlyOn
				? 'sticky'
				: 'off';
		const nextEnabled = mode === 'toggle-single-sticky' ? cycle !== 'sticky' : cycle === 'off';
		inst.options.callbacks.onRepeatClick?.(nextEnabled);
		if (button) {
			const afterActive = nextEnabled || mode !== 'toggle-single-sticky' ? nextEnabled : true;
			button.classList.toggle('active', afterActive);
			button.setAttribute('aria-pressed', String(afterActive));
		}
	}

	_getCurrentPlayState() {
		const inst = window.ytPlayerInstance;
		if (inst && typeof inst.getPlayState === 'function') {
			return inst.getPlayState();
		}
		const video = DOMUtils.getElement([
			CSS_SELECTORS.videoElement,
			CSS_SELECTORS.videoElementAny,
		]);
		if (video) {
			return video.paused
				? window.PlayState
					? window.PlayState.PAUSED
					: 'paused'
				: window.PlayState
					? window.PlayState.PLAYING
					: 'playing';
		}
		return window.PlayState ? window.PlayState.PAUSED : 'paused';
	}

	_updateNavbarPlayToggleIcon(button) {
		if (!button) return;
		const path = button.querySelector('svg path');
		if (!path) return;
		const state = this._getCurrentPlayState();
		const playing = window.PlayState ? window.PlayState.PLAYING : 'playing';
		path.setAttribute(
			'd',
			state === playing ? 'M6 19h4V5H6v14zm8-14v14h4V5h-4z' : 'M8 5v14l11-7z'
		);
	}

	/**
	 * @description Updates navbar link visibility.
	 * @param {object} linkOptions - Object with boolean values for each link type.
	 */
	updateLinks(linkOptions) {
		Object.assign(this.options, linkOptions);
		this._recreateNavbar();
	}

	/**
	 * @description Recreates the navbar with updated options.
	 */
	_recreateNavbar() {
		// Clean up existing observers before recreating
		this._cleanupChipObserver();

		if (this.navbarElement) {
			this.navbarElement.remove();
		}
		this._createNavbar();
		this._setupEventListeners();
		this._setupChipObserver();
		this._updateActiveStates();
	}

	/**
	 * @description Shows the navbar.
	 */
	show() {
		if (this.navbarElement && !this.isVisible) {
			this.navbarElement.style.display = 'flex';
			document.body.classList.add('yt-custom-navbar-active');
			this.isVisible = true;
		}
	}

	/**
	 * @description Hides the navbar.
	 */
	hide() {
		if (this.navbarElement && this.isVisible) {
			this.navbarElement.style.display = 'none';
			document.body.classList.remove('yt-custom-navbar-active');
			this.isVisible = false;
		}
	}

	/**
	 * @description Destroys the navbar and cleans up resources.
	 */
	destroy() {
		// Clean up observers and timers
		this._cleanupChipObserver();

		if (this.navbarElement) {
			this.navbarElement.remove();
			this.navbarElement = null;
		}
		document.body.classList.remove('yt-custom-navbar-active');
		this.isVisible = false;
		logger.log('Navbar', 'Custom navbar destroyed');
	}
}

// Expose the class to the window object
if (typeof window !== 'undefined') {
	window.YTCustomNavbar = YTCustomNavbar;
}
