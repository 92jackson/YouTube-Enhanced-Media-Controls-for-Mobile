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
			showTextSearch: window.userSettings.navbarShowTextSearch,
			showVoiceSearch: window.userSettings.navbarShowVoiceSearch,
			showHomeButton: window.userSettings.navbarShowHomeButton,
			showFavourites: window.userSettings.navbarShowFavourites,
			showVideoToggle: window.userSettings.navbarShowVideoToggle,
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

		this._bindMethods();
		this._createNavbar();
		this._setupEventListeners();
		this._setupChipObserver();
		this._updateActiveStates();

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
		this._handleVoiceSearchClick = this._handleVoiceSearchClick.bind(this);
		this._handleFavouritesClick = this._handleFavouritesClick.bind(this);
		this._handleDebugLogsClick = this._handleDebugLogsClick.bind(this);
		this._handleVideoToggleClick = this._handleVideoToggleClick.bind(this);
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
	}

	/**
	 * @description Creates the DOM structure for the custom navbar.
	 * @returns {HTMLElement} The navbar DOM element.
	 */
	_createNavbarElement() {
		// Create main navbar
		const navbar = document.createElement('nav');
		navbar.className = 'yt-custom-navbar';

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

		// Add Debug Log Download button (only when debugging enabled)
		if (this.options.enableDebugLogging) {
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
			rightDiv.appendChild(debugBtn);
		}

		// Add Video Toggle button (before favourites) - only if enabled
		if (this.options.showVideoToggle) {
			const videoToggleBtn = document.createElement('button');
			videoToggleBtn.className = 'yt-navbar-icon-button yt-navbar-video-toggle';
			videoToggleBtn.setAttribute('data-action', 'video-toggle');
			videoToggleBtn.setAttribute('aria-label', 'Toggle Video Player');

			const videoToggleSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
			videoToggleSvg.setAttribute('viewBox', '0 0 24 24');
			videoToggleSvg.setAttribute('width', '20');
			videoToggleSvg.setAttribute('height', '20');
			const videoTogglePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');

			// Use different icons based on current state
			const isVideoHidden = document.body.classList.contains('yt-hide-video-player');
			if (isVideoHidden) {
				// Show video icon (when video is currently hidden)
				videoTogglePath.setAttribute(
					'd',
					'M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4zM14 13h-3v3H9v-3H6v-2h3V8h2v3h3v2z'
				);
			} else {
				// Hide video icon (when video is currently visible)
				videoTogglePath.setAttribute(
					'd',
					'M21 6.5l-4 4V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11zM9.5 16L8 14.5 10.5 12 8 9.5 9.5 8 12 10.5 14.5 8 16 9.5 13.5 12 16 14.5 14.5 16 12 13.5 9.5 16z'
				);
			}

			videoToggleSvg.appendChild(videoTogglePath);
			videoToggleBtn.appendChild(videoToggleSvg);
			rightDiv.appendChild(videoToggleBtn);
		}

		// Add Favourites icon button (before search)
		if (this.options.showFavourites) {
			const favouritesBtn = document.createElement('button');
			favouritesBtn.className = 'yt-navbar-icon-button yt-navbar-favourites';
			favouritesBtn.setAttribute('data-action', 'favourites');
			favouritesBtn.setAttribute('aria-label', 'Favourites');

			const favouritesSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
			favouritesSvg.setAttribute('viewBox', '0 0 24 24');
			favouritesSvg.setAttribute('width', '20');
			favouritesSvg.setAttribute('height', '20');
			const favouritesPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
			favouritesPath.setAttribute(
				'd',
				'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'
			);
			favouritesSvg.appendChild(favouritesPath);
			favouritesBtn.appendChild(favouritesSvg);
			rightDiv.appendChild(favouritesBtn);
		}

		// Add right links
		if (this.options.showTextSearch) {
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
			rightDiv.appendChild(searchBtn);
		}
		if (this.options.showVoiceSearch) {
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
			rightDiv.appendChild(voiceBtn);
		}

		navbar.appendChild(rightDiv);

		return navbar;
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
			}
		});
		// Add event listener to close dialog when pressing Escape
		document.addEventListener('keydown', (event) => {
			if (event.key === 'Escape') {
				const overlay = document.querySelector('.yt-favourites-dialog-overlay');
				if (overlay && overlay.classList.contains('visible')) {
					this._hideFavouritesDialog();
				}
			}
		});
	}

	/**
	 * @description Updates active states with retry logic for SPA navigation delays.
	 * @param {number} attempt - Current attempt number.
	 */
	_updateActiveStatesWithRetry(attempt = 0) {
		const MAX_ATTEMPTS = 5;
		const RETRY_DELAY = 300;

		// Try to find the chip bar first
		const chipBar = document.querySelector('#filter-chip-bar');
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

		const chipBar = document.querySelector('#filter-chip-bar');
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
		const activeChip = document.querySelector(
			'#filter-chip-bar ytm-chip-cloud-chip-renderer.selected'
		);

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
			const chipContainer = document.querySelector(
				`#filter-chip-bar .chip-container[aria-label='${chipLabel}']`
			);

			if (chipContainer) {
				const chipRenderer = chipContainer.closest('ytm-chip-cloud-chip-renderer');
				if (chipRenderer) {
					logger.log('Navbar', `Clicking filter chip: ${chipLabel}`);
					chipRenderer.click();
				} else {
					logger.warn('Navbar', `Chip renderer not found for: ${chipLabel}`);
				}
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
					`Clicking text search button (${PageUtils.isResultsPage() ? 'results' : 'header'})`
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
		const selectors = {
			headerVoiceButton: 'button[aria-label="Search with your voice"]',
			headerSearchButton:
				'button.topbar-menu-button-avatar-button[aria-label="Search YouTube"]',
			headerCloseSearchButton: 'ytm-mobile-topbar-renderer .mobile-topbar-back-arrow',
		};

		(async () => {
			const success = await DOMUtils.clickElement(selectors.headerVoiceButton, {
				primeSelectorOrElement: selectors.headerSearchButton,
				primeReadySelectorOrElement: selectors.headerCloseSearchButton,
				primeUndoSelectorOrElement: selectors.headerCloseSearchButton,
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
		const hasPlaylistId = !!urlParams.get('list');

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

		// Add actions bar under header to prevent cramped layout
		const actionsBar = document.createElement('div');
		actionsBar.className = 'yt-favourites-dialog-actions';

		if (hasVideoId) {
			const addToFavBtn = document.createElement('button');
			addToFavBtn.className = 'yt-favourites-dialog-add-btn';
			addToFavBtn.textContent = '+ Add';

			if (hasPlaylistId) {
				addToFavBtn.addEventListener('click', (e) => {
					const existingDropdown = document.getElementById(
						'yt-add-to-favourites-dropdown'
					);
					if (existingDropdown) {
						this._hideAddToFavouritesDropdown();
					} else {
						this._showAddToFavouritesDropdown(e, addToFavBtn);
					}
				});
			} else {
				addToFavBtn.addEventListener('click', () => this._addCurrentMixToFavourites());
			}

			actionsBar.appendChild(addToFavBtn);
		}

		content.appendChild(actionsBar);

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

		const favourites = window.userSettings.favouriteMixes || [];
		const currentFilter = window.userSettings.favouritesDialogFilter || 'all';

		// Filter favourites based on current filter setting
		const filteredFavourites = favourites.filter((favourite) => {
			if (currentFilter === 'all') {
				return true;
			}

			const isPlaylist = !!favourite.playlistId;
			const originalTitle = favourite.title || '';
			const isMix = /^(?:my\s+)?mix/i.test(originalTitle);

			switch (currentFilter) {
				case 'mixes':
					return isPlaylist && isMix;
				case 'playlists':
					return isPlaylist && !isMix;
				case 'videos':
					return !isPlaylist;
				default:
					return true;
			}
		});

		// Sort favourites based on current sort setting
		const currentSort = window.userSettings.favouritesDialogSort || 'newestFirst';

		filteredFavourites.sort((a, b) => {
			switch (currentSort) {
				case 'aToZ':
					// Use display title (customTitle if available, otherwise original title)
					const displayTitleA = a.customTitle || a.title || '';
					const displayTitleB = b.customTitle || b.title || '';

					// Remove "Mix -" prefix only from original titles (not custom titles)
					const cleanTitleA = StringUtils.stripMixPrefix(
						displayTitleA,
						!a.customTitle
					).toLowerCase();
					const cleanTitleB = StringUtils.stripMixPrefix(
						displayTitleB,
						!b.customTitle
					).toLowerCase();

					return cleanTitleA.localeCompare(cleanTitleB);

				case 'zToA':
					// Use display title (customTitle if available, otherwise original title)
					const displayTitleA_ZA = a.customTitle || a.title || '';
					const displayTitleB_ZA = b.customTitle || b.title || '';

					// Remove "Mix -" prefix only from original titles (not custom titles)
					const cleanTitleA_ZA = StringUtils.stripMixPrefix(
						displayTitleA_ZA,
						!a.customTitle
					).toLowerCase();
					const cleanTitleB_ZA = StringUtils.stripMixPrefix(
						displayTitleB_ZA,
						!b.customTitle
					).toLowerCase();

					return cleanTitleB_ZA.localeCompare(cleanTitleA_ZA);

				case 'type':
					// Sort by type: playlists first, then videos
					const isPlaylistA = !!a.playlistId;
					const isPlaylistB = !!b.playlistId;

					if (isPlaylistA && !isPlaylistB) return -1;
					if (!isPlaylistA && isPlaylistB) return 1;

					// If both are same type, sort alphabetically (also excluding prefixes)
					const displayTitleA2 = a.customTitle || a.title || '';
					const displayTitleB2 = b.customTitle || b.title || '';
					const cleanTitleA2 = displayTitleA2
						.toLowerCase()
						.replace(/^(?!my\s)mix\s*-\s*/i, '');
					const cleanTitleB2 = displayTitleB2
						.toLowerCase()
						.replace(/^(?!my\s)mix\s*-\s*/i, '');
					return cleanTitleA2.localeCompare(cleanTitleB2);

				case 'oldestFirst':
					// Sort by date added (oldest first)
					const indexA_OF = favourites.indexOf(a);
					const indexB_OF = favourites.indexOf(b);
					return indexA_OF - indexB_OF;

				case 'newestFirst':
				default:
					// Default sort by date added (most recent first)
					// Since items are added to the end of the array, reverse order
					const indexA = favourites.indexOf(a);
					const indexB = favourites.indexOf(b);
					return indexB - indexA;
			}
		});

		if (filteredFavourites.length === 0) {
			const emptyMessage = document.createElement('div');
			emptyMessage.className = 'yt-favourites-dialog-empty';

			const boldText = document.createElement('strong');
			if (currentFilter === 'all') {
				boldText.textContent = 'No saved mixes or videos yet.';
			} else {
				const filterLabels = {
					mixes: 'mixes',
					playlists: 'playlists',
					videos: 'videos',
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

		filteredFavourites.forEach((favourite, filteredIndex) => {
			// Find the original index in the full favourites array
			const originalIndex = favourites.indexOf(favourite);
			const item = document.createElement('div');
			item.className = 'yt-favourites-dialog-item';

			// Make the entire item clickable to play the mix
			item.addEventListener('click', (e) => {
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
	_showAddToFavouritesDropdown(event, button) {
		// Remove any existing dropdown
		this._hideAddToFavouritesDropdown();

		// Create dropdown container
		const dropdown = document.createElement('div');
		dropdown.className = 'yt-add-to-favourites-dropdown';
		dropdown.id = 'yt-add-to-favourites-dropdown';

		// Create dropdown options
		const addMixOption = document.createElement('button');
		addMixOption.className = 'yt-dropdown-option';
		addMixOption.textContent = 'Add Mix/Playlist';
		addMixOption.addEventListener('click', () => {
			this._addCurrentMixToFavourites();
			this._hideAddToFavouritesDropdown();
		});

		const addVideoOption = document.createElement('button');
		addVideoOption.className = 'yt-dropdown-option';
		addVideoOption.textContent = 'Add Current Video';
		addVideoOption.addEventListener('click', () => {
			this._addCurrentMixToFavourites(true);
			this._hideAddToFavouritesDropdown();
		});

		dropdown.appendChild(addMixOption);
		dropdown.appendChild(addVideoOption);

		// Position dropdown relative to button
		const buttonRect = button.getBoundingClientRect();
		dropdown.style.position = 'absolute';
		dropdown.style.top = `${buttonRect.bottom + 5}px`;
		dropdown.style.right = `${window.innerWidth - buttonRect.right}px`;
		dropdown.style.zIndex = '10001';

		// Add to DOM
		document.body.appendChild(dropdown);

		// Track active button for outside-click logic
		this._activeAddToFavouritesButton = button;

		// Add capture-phase outside listener to close dropdown on any click elsewhere
		this._dropdownOutsideHandler = (e) => {
			const currentDropdown = document.getElementById('yt-add-to-favourites-dropdown');
			if (!currentDropdown) {
				return;
			}
			// Ignore clicks inside the dropdown
			if (currentDropdown.contains(e.target)) {
				return;
			}
			// Ignore clicks on the active add button (toggle handled separately)
			if (
				this._activeAddToFavouritesButton &&
				this._activeAddToFavouritesButton.contains(e.target)
			) {
				return;
			}
			this._hideAddToFavouritesDropdown();
		};
		document.addEventListener('pointerdown', this._dropdownOutsideHandler, true);
	}

	/**
	 * @description Hides the add to favourites dropdown.
	 */
	_hideAddToFavouritesDropdown() {
		const dropdown = document.getElementById('yt-add-to-favourites-dropdown');
		if (dropdown) {
			dropdown.remove();
		}
		// Clean up outside listener and active button reference
		if (this._dropdownOutsideHandler) {
			document.removeEventListener('pointerdown', this._dropdownOutsideHandler, true);
			this._dropdownOutsideHandler = null;
		}
		this._activeAddToFavouritesButton = null;
	}

	/**
	 * @description Handles clicks outside the dropdown to close it.
	 * @param {Event} event - The click event.
	 */
	_handleDropdownOutsideClick(event) {
		const dropdown = document.getElementById('yt-add-to-favourites-dropdown');
		if (dropdown && !dropdown.contains(event.target)) {
			this._hideAddToFavouritesDropdown();
		}
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
