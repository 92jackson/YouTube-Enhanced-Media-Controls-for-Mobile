// yt-media-player.js
const DrawerState = {
	CLOSED: 'closed',
	MID: 'mid',
	FULL: 'full',
};

const DrawerMode = {
	CLOSED: 'closed',
	OPENED: 'opened',
	BELOW_VIDEO: 'below-video',
	FIXED_FULLY_OPEN: 'fixed-fully-open',
	FIXED_BELOW_VIDEO: 'fixed-below-video',
	DISABLED: 'disabled',
};

const PlayState = {
	PLAYING: 'playing',
	PAUSED: 'paused',
	BUFFERING: 'buffering',
};

const VoiceState = {
	NORMAL: 'normal',
	LISTENING: 'listening',
	FAILED: 'failed',
};

class YTMediaPlayer {
	constructor(options = {}) {
		// Set default player container selector
		this.playerContainerSelector = options.playerContainerSelector;

		this.options = {
			// Debugging
			enableDebugLogging: window.userSettings.enableDebugLogging,

			// Layout & Core Functionality
			initialLayout: window.userSettings.defaultPlayerLayout,
			customPlaylistMode: window.userSettings.customPlaylistMode,
			returnToDefaultModeOnVideoSelect: window.userSettings.returnToDefaultModeOnVideoSelect,
			showBottomControls: window.userSettings.showBottomControls,
			showVoiceButton: window.userSettings.showVoiceSearchButton,
			previousButtonBehavior: window.userSettings.previousButtonBehavior,

			// Appearance
			customPlayerTheme: window.userSettings.customPlayerTheme,
			customPlayerAccentColor: window.userSettings.customPlayerAccentColor,
			showPreviousButton: window.userSettings.showPreviousButton,
			showSkipButton: window.userSettings.showSkipButton,
			customPlayerFontMultiplier: window.userSettings.customPlayerFontMultiplier,
			playlistItemDensity: window.userSettings.playlistItemDensity,
			allowMultilinePlaylistTitles: window.userSettings.allowMultilinePlaylistTitles,
			keepPlaylistFocused: window.userSettings.keepPlaylistFocused,

			// Playlist Duplicate Handling
			playlistRemoveSame: window.userSettings.playlistRemoveSame,
			allowDifferentVersions: window.userSettings.allowDifferentVersions,

			// Gestures
			enableGestures: window.userSettings.enableGestures,
			gestureSingleSwipeLeftAction: window.userSettings.gestureSingleSwipeLeftAction,
			gestureSingleSwipeRightAction: window.userSettings.gestureSingleSwipeRightAction,
			gestureTwoFingerSwipeUpAction: window.userSettings.gestureTwoFingerSwipeUpAction,
			gestureTwoFingerSwipeDownAction: window.userSettings.gestureTwoFingerSwipeDownAction,
			gestureTwoFingerSwipeLeftAction: window.userSettings.gestureTwoFingerSwipeLeftAction,
			gestureTwoFingerSwipeRightAction: window.userSettings.gestureTwoFingerSwipeRightAction,
			gestureTwoFingerPressAction: window.userSettings.gestureTwoFingerPressAction,
			showGestureFeedback: window.userSettings.showGestureFeedback,

			// Data & Initial State
			nowPlayingVideoDetails: {
				title: 'Video Title',
				author: 'Video Author',
				thumbnailUrl: '',
				currentTime: 0,
				totalTime: 100,
				videoId: null,
			},
			currentPlaylist: { items: [], activeItemId: null },
			currentHandleTitle: 'Up Next',
			currentPlayState: PlayState.PAUSED,

			// Callbacks
			callbacks: {
				onPlayPauseClick: () => {},
				onPreviousClick: () => {},
				onSkipClick: () => {},
				onVoiceSearchClick: () => {},
				onPlaylistItemClick: () => {},
				onSeekbarUpdate: () => {},
				onDrawerStateChange: () => {},
				onDrawerUserToggle: () => {},
				onGestureSeek: (seconds) => {},
				onGestureTogglePlaylist: () => {},
				onGestureRestartCurrent: () => {},
				onGesturePreviousOnly: () => {},
				onGestureSmartPrevious: () => {},
			},
			...options,
		};

		// Core state
		this.playerWrapper = null;
		this.isPlayerVisible = true;
		this.hasPlaylist = false;

		// Playback state
		this.trackTime = this.options.nowPlayingVideoDetails.currentTime;
		this.totalTime = this.options.nowPlayingVideoDetails.totalTime;
		this.trackTimer = null;
		this.isSeekbarDragging = false;

		// Drawer state
		this.drawerState = DrawerState.CLOSED;
		this.isFirstDrawerRender = true;
		this.isDrawerDragging = false;
		this.drawerDragStart = { y: 0, height: 0 };
		this.lastDrawerUpdateTime = 0;
		this.drawerUpdateThrottle = 100; // ms
		this._suppressNextClick = false; // prevent mouse click on drag release

		// Cached measurements - invalidated on resize
		this.cachedMeasurements = {
			maxDrawerHeight: 0,
			midDrawerHeight: 0,
			controlsHeight: 0,
			buttonGroupWidth: 0,
			valid: false,
		};

		// Animation and interaction state
		this.isPrevButtonAnimating = false;
		this.isRestartIconLocked = false;

		// Gesture state
		this.touchStartInfo = { x: 0, y: 0, time: 0, target: null, fingerCount: 0 };
		this.isSwipeGestureActive = false;

		// Auto-scroll state
		this.autoScrollFocusTimer = null;
		this.programmaticScrollInProgress = false;

		// Configuration constants
		this.MIN_MEANINGFUL_SNAP_DIFFERENCE = 40;
		this.SWIPE_DISTANCE_THRESHOLD = 60;
		this.TAP_DISTANCE_THRESHOLD = 60;
		this.SWIPE_TIME_THRESHOLD = 500;
		this.SWIPE_VERTICAL_THRESHOLD_RATIO = 0.7;
		this.playlistScrollDebounceDelay = 2500;

		// Timers
		this.gestureFeedbackTimeout = null;
		this.measurementUpdateId = 0;

		// Full playlist title for handle text
		this._fullPlaylistTitle = this.options.currentHandleTitle;

		// Initialize
		this._initialize();
	}

	/**
	 * Main initialization method
	 */
	_initialize() {
		logger.log('Core', 'YTMediaPlayer initialization started.', true);

		this._bindMethods();
		this._injectHTML();
		this._cacheDOMElements();
		this._applyAppearanceSettings();
		this._setupEventListeners();
		this._initializeState();

		logger.log('Core', 'YTMediaPlayer initialization completed.', true);
	}

	/**
	 * Bind methods for event handlers
	 */
	_bindMethods() {
		// Drawer handlers
		this._startDrawerDrag_bound = this._startDrawerDrag.bind(this);
		this._drawerDrag_bound = this._drawerDrag.bind(this);
		this._stopDrawerDrag_bound = this._stopDrawerDrag.bind(this);
		this._handleDrawerClick_bound = this._handleDrawerClick.bind(this);
		this._handleDrawerCloseButton_bound = this._handleDrawerCloseButton.bind(this);

		// Layout handlers
		this._handleResize_bound = this._handleResize.bind(this);
		this._handlePlayerControlsMutation_bound = this._handlePlayerControlsMutation.bind(this);

		// Gesture handlers
		this._handleTouchStart_bound = this._handleTouchStart.bind(this);
		this._handleTouchMove_bound = this._handleTouchMove.bind(this);
		this._handleTouchEnd_bound = this._handleTouchEnd.bind(this);

		// Playlist handlers
		this._handlePlaylistScroll_bound = this._handlePlaylistScroll.bind(this);
		this._performAutoScrollFocus_bound = this._performAutoScrollFocus.bind(this);
	}

	/**
	 * Generate and inject HTML
	 */
	_injectHTML() {
		const tempDiv = document.createElement('div');
		tempDiv.innerHTML = this._getHTML();
		this.playerWrapper = tempDiv.firstElementChild;
	}

	/**
	 * Generate complete HTML structure
	 */
	_getHTML() {
		const initialThumbnail =
			this.options.nowPlayingVideoDetails.thumbnailUrl ||
			(typeof browser !== 'undefined' ? browser : chrome).runtime.getURL(
				'/assets/default_thumb.png'
			);

		const wrapperClasses = this._getWrapperClasses();
		const playlistHTML = this._getPlaylistHTML();

		return `
<div class="yt-player-wrapper ${wrapperClasses}">
	${playlistHTML}
	<div class="yt-player-controls ${this.options.initialLayout}"> 
		<div class="yt-playing-details">
			<div class="yt-seekbar-background">
				<div class="yt-seekbar-progress"><div class="yt-seekbar-handle"></div></div>
			</div>
			<div class="yt-details-overlay">
				<div class="yt-thumbnail" style="background-image: url('${initialThumbnail}');"></div>
				<div class="yt-text-content">
					<div class="yt-video-title">
						${this.options.nowPlayingVideoDetails.title}
						<span class="yt-video-author-compact">${this.options.nowPlayingVideoDetails.author}</span>
					</div>
					<div class="yt-video-author">${this.options.nowPlayingVideoDetails.author}</div>
					<div class="yt-playback-info">
						<div class="yt-video-timer">0:00 / 0:00</div>
						<div class="yt-seekbar-inline"><div class="yt-seekbar-progress-inline"><div class="yt-seekbar-thumb-inline"></div></div></div>
					</div>
				</div>
			</div>
		</div>
		<div class="yt-main-controls">
			<div class="yt-button-group">
				${this._getPreviousButtonHTML()}
				${this._getPlayButtonHTML()}
				${this._getSkipButtonHTML()}
			</div>
			<div class="yt-right-section">
				${this.options.showVoiceButton ? this._getVoiceButtonHTML() : ''}
			</div>
		</div>
	</div>
	<div class="yt-gesture-feedback-overlay"></div>
</div>`;
	}

	/**
	 * Get wrapper CSS classes based on options
	 */
	_getWrapperClasses() {
		const classes = [];

		if (this.options.customPlaylistMode === DrawerMode.FIXED_FULLY_OPEN) {
			classes.push('playlist-always-open');
		} else if (this.options.customPlaylistMode === DrawerMode.FIXED_BELOW_VIDEO) {
			classes.push('playlist-fixed-below-video');
		} else if (this.options.customPlaylistMode === DrawerMode.DISABLED) {
			classes.push('playlist-mode-disabled');
		}

		if (!this.options.showBottomControls) {
			classes.push('bottom-controls-hidden');
		}

		if (!this.options.showPreviousButton) {
			classes.push('hide-prev-button');
		}

		if (!this.options.showSkipButton) {
			classes.push('hide-skip-button');
		}

		return classes.join(' ');
	}

	/**
	 * Generate playlist HTML if not disabled
	 */
	_getPlaylistHTML() {
		if (this.options.customPlaylistMode === DrawerMode.DISABLED) {
			return '';
		}

		const itemCount = this.options.currentPlaylist?.items?.length || 0;
		const subheaderText = itemCount === 1 ? '1 item' : `${itemCount} items`;
		let headerText = this.options.currentHandleTitle;

		if (this.options.customPlaylistMode === DrawerMode.CLOSED) {
			headerText = /^(?:my\s+)?mix/i.test(headerText) ? 'Mix' : 'Playlist';
		}

		return `
<div class="yt-drawer-drag-handle" title="Drag to open/close playlist">
	<div class="yt-drawer-drag-cue"></div>
	<button class="yt-drawer-close-button" aria-label="Close playlist">&times;</button>
	<div class="yt-drawer-header-content">
		<h1 class="yt-drawer-header">${headerText}</h1>
		<p class="yt-drawer-subheader">${subheaderText}</p>
	</div>
</div>
<div class="yt-player-drawer">
	<div class="yt-playlist-wrapper"></div>
</div>`;
	}

	/**
	 * Generate button HTML
	 */
	_getPreviousButtonHTML() {
		return `
<button class="yt-control-button yt-prev-button previous">
	<svg class="icon previous" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
	<svg class="icon restart" viewBox="0 0 24 24"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6s-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8S16.42 4 12 4z"/></svg>
</button>`;
	}

	_getPlayButtonHTML() {
		return `
<button class="yt-control-button yt-play-button paused">
	<svg class="icon paused" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
	<svg class="icon playing" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
	<svg class="icon buffering" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-dasharray="31.416" stroke-dashoffset="31.416"><animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite"/><animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416" repeatCount="indefinite"/></circle></svg>
</button>`;
	}

	_getSkipButtonHTML() {
		return `
<button class="yt-control-button yt-skip-button">
	<svg class="icon default" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
</button>`;
	}

	_getVoiceButtonHTML() {
		return `
<button class="yt-voice-search-button normal">
	<svg class="icon default" viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" focusable="false">
		<g>
			<path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"></path>
			<path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"></path>
		</g>
	</svg>
</button>`;
	}

	/**
	 * Cache DOM elements
	 */
	_cacheDOMElements() {
		if (!this.playerWrapper) {
			logger.error('DOM', 'playerWrapper not initialized. Cannot cache DOM elements.', true);
			return;
		}

		// Main structure
		this.playerControls = this.playerWrapper.querySelector('.yt-player-controls');
		this.detailsOverlayElement = this.playerWrapper.querySelector('.yt-details-overlay');
		this.mainControls = this.playerWrapper.querySelector('.yt-main-controls');
		this.buttonGroup = this.playerWrapper.querySelector('.yt-button-group');

		// Playlist elements (conditional)
		if (this.options.customPlaylistMode !== DrawerMode.DISABLED) {
			this.drawerHandle = this.playerWrapper.querySelector('.yt-drawer-drag-handle');
			this.playerDrawer = this.playerWrapper.querySelector('.yt-player-drawer');
			this.drawerCloseButton = this.playerWrapper.querySelector('.yt-drawer-close-button');
			this.drawerHeader = this.playerWrapper.querySelector('.yt-drawer-header');
			this.drawerSubheader = this.playerWrapper.querySelector('.yt-drawer-subheader');
			this.playlistWrapper = this.playerWrapper.querySelector('.yt-playlist-wrapper');
		}

		// Video details
		this.thumbnailElement = this.playerWrapper.querySelector('.yt-thumbnail');
		this.videoTitleElement = this.playerWrapper.querySelector('.yt-video-title');
		this.videoAuthorElement = this.playerWrapper.querySelector('.yt-video-author');
		this.videoAuthorCompactElement = this.playerWrapper.querySelector(
			'.yt-video-author-compact'
		);
		this.videoTimerElement = this.playerWrapper.querySelector('.yt-video-timer');

		// Seekbars
		this.seekbarBackground = this.playerWrapper.querySelector('.yt-seekbar-background');
		this.seekbarProgress = this.playerWrapper.querySelector('.yt-seekbar-progress');
		this.seekbarHandle = this.playerWrapper.querySelector('.yt-seekbar-handle');
		this.seekbarInline = this.playerWrapper.querySelector('.yt-seekbar-inline');
		this.seekbarProgressInline = this.playerWrapper.querySelector(
			'.yt-seekbar-progress-inline'
		);
		this.seekbarThumbInline = this.playerWrapper.querySelector('.yt-seekbar-thumb-inline');

		// Control buttons
		this.prevButton = this.playerWrapper.querySelector('.yt-prev-button');
		this.playButton = this.playerWrapper.querySelector('.yt-play-button');
		this.skipButton = this.playerWrapper.querySelector('.yt-skip-button');
		this.voiceButton = this.options.showVoiceButton
			? this.playerWrapper.querySelector('.yt-voice-search-button')
			: null;

		// Gesture feedback
		this.gestureFeedbackOverlay = this.playerWrapper.querySelector(
			'.yt-gesture-feedback-overlay'
		);
	}

	/**
	 * Apply appearance settings
	 */
	_applyAppearanceSettings() {
		if (!this.playerWrapper) return;

		// Playlist density
		this.playerWrapper.classList.add(`playlist-density-${this.options.playlistItemDensity}`);

		// Multiline titles
		if (this.options.allowMultilinePlaylistTitles) {
			this.playerWrapper.classList.add('playlist-multiline-titles');
		}
	}

	/**
	 * Initialize state after DOM is ready
	 */
	_initializeState() {
		logger.log('Core', '=== _initializeState START ===');

		// Set initial time
		this.setCurrentTime(
			this.options.nowPlayingVideoDetails.currentTime,
			this.options.nowPlayingVideoDetails.totalTime
		);

		// Update playlist
		this.updatePlaylist(this.options.currentPlaylist.items);

		// DEFER MEASUREMENTS AND DRAWER STATE UNTIL AFTER DOM RENDERS
		logger.log('Core', 'Deferring measurements until after DOM renders');

		// Use multiple timing strategies to ensure proper rendering
		requestAnimationFrame(() => {
			logger.log('Core', 'First rAF - attempting measurements');
			this._invalidateAndRecalculateMeasurements();

			if (this.cachedMeasurements.controlsHeight === 0) {
				logger.log('Core', 'Controls height still 0, trying setTimeout');
				setTimeout(() => {
					logger.log('Core', 'setTimeout - attempting measurements again');
					this._invalidateAndRecalculateMeasurements();
					this._setupDrawerInteractions(); // Re-setup after playlist state is ready
					this._setInitialDrawerState();
					this._updateCSSVariables();
				}, 50);
			} else {
				logger.log('Core', 'Controls height valid, proceeding with drawer state');
				this._setupDrawerInteractions(); // Re-setup after playlist state is ready
				this._setInitialDrawerState();
				this._updateCSSVariables();
			}
		});

		logger.log('Core', '=== _initializeState END ===');
	}

	/**
	 * MEASUREMENT SYSTEM
	 */
	_invalidateAndRecalculateMeasurements() {
		this.cachedMeasurements.valid = false;
		this._recalculateMeasurements();
	}

	_recalculateMeasurements() {
		if (!this.isPlayerVisible || !this.playerWrapper || !this.playerControls) {
			this.cachedMeasurements = {
				maxDrawerHeight: 0,
				midDrawerHeight: 0,
				controlsHeight: 0,
				buttonGroupWidth: 0,
				valid: false,
			};
			logger.log(
				'Measurements',
				`Early exit - Visible: ${this.isPlayerVisible}, Wrapper: ${!!this
					.playerWrapper}, Controls: ${!!this.playerControls}`
			);
			return;
		}

		// Force a layout recalculation
		this.playerControls.getBoundingClientRect();
		this.playerWrapper.getBoundingClientRect();

		const controlsHeight = this.playerControls.offsetHeight;
		const buttonGroupWidth = this.buttonGroup.offsetWidth;
		const wrapperHeight = this.playerWrapper.offsetHeight;
		const OPEN_HANDLE_HEIGHT = 70;

		logger.log(
			'Measurements',
			`Raw measurements (Controls: ${controlsHeight}px, Button group: ${buttonGroupWidth}px, Wrapper: ${wrapperHeight}px)`
		);

		// If controls height is still 0, we're measuring too early
		if (controlsHeight === 0) {
			logger.log(
				'Measurements',
				'Controls height is 0 - measurements too early, keeping invalid'
			);
			this.cachedMeasurements = {
				maxDrawerHeight: 0,
				midDrawerHeight: 0,
				controlsHeight: 0,
				buttonGroupWidth: 0,
				valid: false,
			};
			return;
		}

		// Calculate max drawer height
		const maxDrawerHeight = Math.max(0, wrapperHeight - controlsHeight - OPEN_HANDLE_HEIGHT);

		// Calculate mid drawer height (below video)
		let midDrawerHeight = 0;
		if (maxDrawerHeight > 0) {
			const videoAreaElement = DOMUtils.getElement(this.playerContainerSelector);
			logger.log('Measurements', `Video area element found: ${!!videoAreaElement}`);
			if (videoAreaElement) {
				const videoAreaRect = videoAreaElement.getBoundingClientRect();
				const playerWrapperRect = this.playerWrapper.getBoundingClientRect();
				const targetDrawerTopY = videoAreaRect.bottom;
				const spaceAvailable = playerWrapperRect.bottom - targetDrawerTopY;

				logger.log(
					'Measurements',
					`Video area calculations (videoAreaRect: ${videoAreaRect}, playerWrapperRect: ${playerWrapperRect}, targetDrawerTopY: ${targetDrawerTopY}px, spaceAvailable: ${spaceAvailable}px)`
				);

				midDrawerHeight = Math.max(0, spaceAvailable - controlsHeight - OPEN_HANDLE_HEIGHT);

				// Ensure mid height is meaningfully different from max
				if (maxDrawerHeight - midDrawerHeight < this.MIN_MEANINGFUL_SNAP_DIFFERENCE) {
					logger.log('Measurements', `Mid height too close to max, setting to 0`);
					midDrawerHeight = 0;
				}
			}
		} else {
			logger.log(
				'Measurements',
				`Skipping mid calculation - maxDrawerHeight: ${maxDrawerHeight}`
			);
		}

		this.cachedMeasurements = {
			maxDrawerHeight,
			midDrawerHeight,
			controlsHeight,
			buttonGroupWidth,
			valid: true,
		};

		// Update drawer max height constraint
		if (this.playerDrawer) {
			this.playerDrawer.style.maxHeight = `${maxDrawerHeight}px`;
			logger.log('Measurements', `Set drawer maxHeight to: ${maxDrawerHeight}px`);
		}

		logger.log(
			'Measurements',
			`Final measurements (Max: ${maxDrawerHeight}px, Mid: ${midDrawerHeight}px, Controls: ${controlsHeight}px, Button group: ${buttonGroupWidth}px)`
		);
	}

	/**
	 * CENTRALIZED DRAWER HEIGHT MANAGEMENT
	 */
	_setDrawerHeight(targetHeight, animate = true, isFirstDraw = false) {
		logger.log(
			'Drawer',
			`_setDrawerHeight called - Target: ${targetHeight}px, Animate: ${animate}, FirstDraw: ${isFirstDraw}`
		);

		// Ensure event listeners are set up whenever we try to draw the drawer
		this._setupDrawerInteractions();

		if (!this.playerDrawer || this.options.customPlaylistMode === DrawerMode.DISABLED) {
			logger.log('Drawer', 'Cannot set drawer height - drawer not found or disabled');
			return;
		}

		// Disable animations for first draw if default is open
		const shouldAnimate = animate && !isFirstDraw;

		if (isFirstDraw && targetHeight > 0) {
			this.playerWrapper.classList.add('yt-animations-disabled');
		} else if (targetHeight === 0) {
			// Immediately update handle state
			this.drawerState = DrawerState.CLOSED;
			this._updateDrawerVisualState();
		}

		// Set transition
		this.playerDrawer.style.transition = shouldAnimate ? 'height 0.3s ease-out' : 'none';

		// Set height
		this.playerDrawer.style.height = `${targetHeight}px`;

		// Update state
		this._setDrawerStateFromHeight(targetHeight);

		// Re-enable animations after first draw
		if (isFirstDraw && targetHeight > 0) {
			requestAnimationFrame(() => {
				this.playerWrapper.classList.remove('yt-animations-disabled');
				if (this.playerDrawer) {
					this.playerDrawer.style.transition = 'height 0.3s ease-out';
				}
			});
		}

		// Update visual state after transition
		if (shouldAnimate) {
			const transitionHandler = () => {
				this._updateDrawerVisualState();
				this.playerDrawer.removeEventListener('transitionend', transitionHandler);
			};
			this.playerDrawer.addEventListener('transitionend', transitionHandler);
			setTimeout(() => {
				this._updateDrawerVisualState();
				this.playerDrawer.removeEventListener('transitionend', transitionHandler);
			}, 350);
		} else {
			this._updateDrawerVisualState();
		}
	}

	/**
	 * Set initial drawer state based on mode
	 */
	_setInitialDrawerState() {
		logger.log(
			'Drawer',
			`_setInitialDrawerState called. Mode: ${this.options.customPlaylistMode}`
		);

		// DON'T DRAW DRAWER UNTIL FIRST PLAYLIST ARRIVES
		if (!this.hasPlaylist) {
			logger.log('Drawer', 'No playlist yet, skipping drawer state setup');
			return;
		}

		if (!this.cachedMeasurements.valid) {
			logger.log('Drawer', 'Measurements not valid, recalculating');
			this._recalculateMeasurements();
		}

		// If measurements are still invalid, defer this call
		if (!this.cachedMeasurements.valid) {
			logger.log(
				'Drawer',
				'Measurements still invalid after recalculation, deferring drawer state'
			);
			setTimeout(() => {
				this._setInitialDrawerState();
			}, 100);
			return;
		}

		logger.log(
			'Drawer',
			`Measurements - Max: ${this.cachedMeasurements.maxDrawerHeight}px, Mid: ${this.cachedMeasurements.midDrawerHeight}px, HasPlaylist: ${this.hasPlaylist}`
		);

		let initialHeight = 0;
		const { maxDrawerHeight, midDrawerHeight } = this.cachedMeasurements;

		switch (this.options.customPlaylistMode) {
			case DrawerMode.CLOSED:
			case DrawerMode.DISABLED:
				initialHeight = 0;
				logger.log('Drawer', 'Initial state: CLOSED/DISABLED');
				break;
			case DrawerMode.OPENED:
			case DrawerMode.FIXED_FULLY_OPEN:
				initialHeight = maxDrawerHeight;
				logger.log(
					'Drawer',
					`Initial state: OPENED/FIXED_FULLY_OPEN - Height: ${initialHeight}px`
				);
				break;
			case DrawerMode.BELOW_VIDEO:
			case DrawerMode.FIXED_BELOW_VIDEO:
				initialHeight = midDrawerHeight > 0 ? midDrawerHeight : 0;
				logger.log(
					'Drawer',
					`Initial state: BELOW_VIDEO/FIXED_BELOW_VIDEO - Height: ${initialHeight}px`
				);
				break;
			default:
				// Handle string values from content script
				if (this.options.customPlaylistMode === 'opened') {
					initialHeight = maxDrawerHeight;
					logger.log(
						'Drawer',
						`Initial state: 'opened' string - Height: ${initialHeight}px`
					);
				} else if (this.options.customPlaylistMode === 'below-video') {
					initialHeight = midDrawerHeight > 0 ? midDrawerHeight : 0;
					logger.log(
						'Drawer',
						`Initial state: 'below-video' string - Height: ${initialHeight}px`
					);
				} else if (this.options.customPlaylistMode === 'closed') {
					initialHeight = 0;
					logger.log(
						'Drawer',
						`Initial state: 'closed' string - Height: ${initialHeight}px`
					);
				}
				break;
		}

		const shouldAnimateInitial = false; // Never animate initial state
		const isFirstDraw = this.isFirstDrawerRender && initialHeight > 0;

		logger.log(
			'Drawer',
			`Setting initial height: ${initialHeight}px, animate: ${shouldAnimateInitial}, isFirstDraw: ${isFirstDraw}`
		);
		this._setDrawerHeight(initialHeight, shouldAnimateInitial, isFirstDraw);
		this.isFirstDrawerRender = false;
	}

	/**
	 * SNAP POINT CALCULATION
	 */
	_getSnapPoints() {
		if (!this.cachedMeasurements.valid) {
			this._recalculateMeasurements();
		}

		const { maxDrawerHeight, midDrawerHeight } = this.cachedMeasurements;
		const snapPoints = [0]; // Always include closed

		// Add mid point if it's meaningful
		if (
			midDrawerHeight > this.MIN_MEANINGFUL_SNAP_DIFFERENCE &&
			maxDrawerHeight - midDrawerHeight > this.MIN_MEANINGFUL_SNAP_DIFFERENCE
		) {
			snapPoints.push(midDrawerHeight);
		}

		// Add max point if it's meaningful
		if (maxDrawerHeight > Math.max(...snapPoints) + this.MIN_MEANINGFUL_SNAP_DIFFERENCE) {
			snapPoints.push(maxDrawerHeight);
		}

		return snapPoints.sort((a, b) => a - b);
	}

	_getNextSnapPoint(currentHeight, direction = 'up') {
		const snapPoints = this._getSnapPoints();

		if (direction === 'up') {
			return (
				snapPoints.find(
					(point) => point > currentHeight + this.MIN_MEANINGFUL_SNAP_DIFFERENCE / 2
				) || snapPoints[snapPoints.length - 1]
			);
		} else {
			const lowerPoints = snapPoints.filter(
				(point) => point < currentHeight - this.MIN_MEANINGFUL_SNAP_DIFFERENCE / 2
			);
			return lowerPoints[lowerPoints.length - 1] || 0;
		}
	}

	_getNearestSnapPoint(currentHeight) {
		const snapPoints = this._getSnapPoints();
		let nearest = snapPoints[0];
		let minDistance = Math.abs(currentHeight - nearest);

		for (const point of snapPoints) {
			const distance = Math.abs(currentHeight - point);
			if (distance < minDistance) {
				minDistance = distance;
				nearest = point;
			}
		}

		return nearest;
	}

	/**
	 * Set drawer state from height
	 */
	_setDrawerStateFromHeight(height) {
		const { midDrawerHeight, maxDrawerHeight } = this.cachedMeasurements;
		const { MIN_MEANINGFUL_SNAP_DIFFERENCE } = this;

		// Edge case: very close to zero = closed
		if (height < MIN_MEANINGFUL_SNAP_DIFFERENCE / 2) {
			this.drawerState = DrawerState.CLOSED;
			logger.log('Drawer', `Height ${height} -> CLOSED (below threshold)`);
			return;
		}

		// Compute absolute distance from snap points
		const distanceToMid = Math.abs(height - midDrawerHeight);
		const distanceToFull = Math.abs(height - maxDrawerHeight);

		// If within snapping threshold, pick the closest valid snap
		if (
			midDrawerHeight > 0 &&
			distanceToMid < MIN_MEANINGFUL_SNAP_DIFFERENCE / 2 &&
			distanceToMid <= distanceToFull
		) {
			this.drawerState = DrawerState.MID;
			logger.log(
				'Drawer',
				`Height ${height} -> MID (within threshold, distance: ${distanceToMid})`
			);
		} else if (distanceToFull < MIN_MEANINGFUL_SNAP_DIFFERENCE / 2) {
			this.drawerState = DrawerState.FULL;
			logger.log(
				'Drawer',
				`Height ${height} -> FULL (within threshold, distance: ${distanceToFull})`
			);
		} else {
			// Not close enough to snap points, so pick the nearest one
			const closest = [
				{ state: DrawerState.CLOSED, distance: height },
				{
					state: DrawerState.MID,
					distance: midDrawerHeight > 0 ? distanceToMid : Infinity,
				},
				{ state: DrawerState.FULL, distance: distanceToFull },
			];

			closest.sort((a, b) => a.distance - b.distance);
			this.drawerState = closest[0].state;

			logger.log(
				'Drawer',
				`Height ${height} -> ${closest[0].state} (fallback to closest, distances: CLOSED=${height}, MID=${distanceToMid}, FULL=${distanceToFull})`
			);
		}
	}

	/**
	 * Update visual state based on current drawer state
	 */
	_updateDrawerVisualState() {
		if (!this.playerWrapper) return;

		const isOpen = this.drawerState !== DrawerState.CLOSED;
		const hadPlaylist = this.hasPlaylist;

		// Update playlist visibility
		this._updatePlaylistVisibility();

		// Update wrapper classes
		this.playerWrapper.classList.toggle('drawer-closed', !isOpen || !this.hasPlaylist);
		this.playerWrapper.classList.toggle('no-playlist', !this.hasPlaylist);

		// Update body classes for external CSS
		this._updateBodyDrawerState();

		// Update handle text
		this._updateHandleText();

		// Fire state change callback if needed
		const currentlyOpen = isOpen && this.hasPlaylist;
		if (this.lastDrawerState !== currentlyOpen) {
			this.lastDrawerState = currentlyOpen;
			if (this.options.callbacks.onDrawerStateChange) {
				this.options.callbacks.onDrawerStateChange(currentlyOpen);
			}
		}

		// Update CSS variables
		this._updateCSSVariables();
	}

	/**
	 * Update body drawer state classes
	 */
	_updateBodyDrawerState() {
		if (!document.body) return;

		document.body.classList.remove('yt-drawer-closed', 'yt-drawer-mid', 'yt-drawer-full');

		if (
			//this.isDrawerDragging ||
			!this.hasPlaylist ||
			this.options.customPlaylistMode === DrawerMode.DISABLED
		) {
			document.body.classList.add('yt-drawer-closed');
			return;
		}

		switch (this.drawerState) {
			case DrawerState.CLOSED:
				document.body.classList.add('yt-drawer-closed');
				break;
			case DrawerState.MID:
				document.body.classList.add('yt-drawer-mid');
				break;
			case DrawerState.FULL:
				document.body.classList.add('yt-drawer-full');
				break;
		}
	}

	/**
	 * Update playlist visibility state
	 */
	_updatePlaylistVisibility() {
		const hasItems = !!(this.options.currentPlaylist?.items?.length > 0);
		const isEnabled = this.options.customPlaylistMode !== DrawerMode.DISABLED;

		this.hasPlaylist = hasItems && isEnabled;

		logger.log(
			'Drawer',
			`Playlist visibility - HasItems: ${hasItems}, IsEnabled: ${isEnabled}, HasPlaylist: ${this.hasPlaylist}`
		);
	}

	/**
	 * Update handle text based on state
	 */
	_updateHandleText() {
		if (!this.drawerHeader) return;

		const isEffectivelyClosed = this.drawerState === DrawerState.CLOSED;

		if (isEffectivelyClosed) {
			this.drawerHeader.textContent = /^(?:my\s+)?mix/i.test(this._fullPlaylistTitle)
				? 'Mix'
				: 'Playlist';
		} else {
			this.drawerHeader.textContent = this._fullPlaylistTitle;
		}
	}

	/**
	 * Update CSS custom properties
	 */
	_updateCSSVariables() {
		if (!this.cachedMeasurements.valid) return;

		const { maxDrawerHeight, midDrawerHeight, controlsHeight, buttonGroupWidth } =
			this.cachedMeasurements;
		const wrapperHeight = this.playerWrapper?.offsetHeight || 0;
		const wrapperWidth = this.playerWrapper?.offsetWidth || 0;

		// Get video container height
		const videoElement = DOMUtils.getElement(this.playerContainerSelector);
		const videoHeight = videoElement ? videoElement.getBoundingClientRect().height : 0;

		// Calculate below-player height
		const navbarHeight = 48;
		const dragHandleHeight =
			this.options.customPlaylistMode !== DrawerMode.DISABLED
				? this.drawerState !== DrawerState.CLOSED
					? 70
					: 48
				: 0;
		const belowPlayerHeight = Math.max(
			window.innerHeight - navbarHeight - videoHeight - controlsHeight - dragHandleHeight,
			100
		);

		// Calculate max safe width for voice search button (right side of button group)
		const remainingWidth = wrapperWidth - buttonGroupWidth;
		const maxVoiceButtonWidth = remainingWidth / 2 - 20; // 20px buffer to allow 10px margin either side

		// Font size multiplier
		const fontMultiplier = this.options.customPlayerFontMultiplier || 1;

		// Set CSS variables
		const vars = {
			'--yt-player-controls-height': `${controlsHeight}px`,
			'--yt-player-wrapper-height': `${wrapperHeight}px`,
			'--yt-player-max-drawer-height': `${maxDrawerHeight}px`,
			'--yt-player-mid-drawer-height': `${midDrawerHeight}px`,
			'--yt-video-height': `${videoHeight}px`,
			'--yt-below-player-height': `${belowPlayerHeight}px`,
			'--yt-max-voice-button-width': `${maxVoiceButtonWidth}px`,
			'--yt-font-size-multiplier': fontMultiplier,
		};

		Object.entries(vars).forEach(([prop, value]) => {
			document.body.style.setProperty(prop, value);
		});
	}

	/**
	 * EVENT HANDLERS
	 */

	/**
	 * Handle window resize - invalidate measurements and recalculate
	 */
	_handleResize() {
		if (!this.isPlayerVisible) return;

		// Debounce resize handling
		clearTimeout(this.resizeTimeout);
		this.resizeTimeout = setTimeout(() => {
			this._invalidateAndRecalculateMeasurements();
			this._updateDrawerVisualState();
		}, 100);
	}

	/**
	 * Handle player controls class mutations
	 */
	_handlePlayerControlsMutation() {
		this._handleResize();
	}

	/**
	 * DRAWER INTERACTION HANDLERS
	 */
	_startDrawerDrag(event) {
		if (!this._canDragDrawer() || this._isCloseButtonClick(event)) return;
		if (event.type === 'mousedown' && event.button !== 0) return;

		this.isDrawerDragging = true;
		this.drawerInitialHeight = this.playerDrawer.offsetHeight;
		this.drawerDragStart = {
			y: event.touches ? event.touches[0].clientY : event.clientY,
			height: this.playerDrawer.offsetHeight,
		};

		// Disable transitions during drag
		this.playerDrawer.style.transition = 'none';

		// Add drag classes
		if (this.drawerHandle) this.drawerHandle.classList.add('dragging');
		document.body.classList.add('yt-player-body-dragging');

		logger.log('Drawer', 'Drawer drag started');

		// Add document listeners
		const moveEvent = event.touches ? 'touchmove' : 'mousemove';
		const endEvent = event.touches ? 'touchend' : 'mouseup';
		document.addEventListener(moveEvent, this._drawerDrag_bound, { passive: false });
		document.addEventListener(endEvent, this._stopDrawerDrag_bound);

		event.preventDefault();
	}

	_drawerDrag(event) {
		if (!this.isDrawerDragging || !this._canDragDrawer()) return;

		const currentY = event.touches ? event.touches[0].clientY : event.clientY;
		const deltaY = this.drawerDragStart.y - currentY; // Upward is positive
		let newHeight = this.drawerDragStart.height + deltaY;

		// Clamp to valid range
		newHeight = Math.max(0, Math.min(newHeight, this.cachedMeasurements.maxDrawerHeight));
		this.playerDrawer.style.height = `${newHeight}px`;

		const now = performance.now();
		if (now - this.lastDrawerUpdateTime > this.drawerUpdateThrottle) {
			this._setDrawerStateFromHeight(newHeight);
			this._updateDrawerVisualState();
			this.lastDrawerUpdateTime = now;
		}

		event.preventDefault();
	}

	_stopDrawerDrag() {
		if (!this.isDrawerDragging) return;

		this.isDrawerDragging = false;
		// Only suppress click if drawer actually moved
		if (this.drawerInitialHeight !== this.playerDrawer.offsetHeight) {
			this._suppressNextClick = true;
		}

		// Clean up drag state
		if (this.drawerHandle) this.drawerHandle.classList.remove('dragging');
		document.body.classList.remove('yt-player-body-dragging');

		// Remove document listeners
		document.removeEventListener('mousemove', this._drawerDrag_bound);
		document.removeEventListener('mouseup', this._stopDrawerDrag_bound);
		document.removeEventListener('touchmove', this._drawerDrag_bound);
		document.removeEventListener('touchend', this._stopDrawerDrag_bound);

		// Snap to the nearest snap point based on final height
		const currentHeight = this.playerDrawer.offsetHeight;
		const targetHeight = this._getNearestSnapPoint(currentHeight);

		// Fire user toggle callback
		if (this.options.callbacks.onDrawerUserToggle) {
			this.options.callbacks.onDrawerUserToggle(targetHeight > 0, targetHeight);
		}

		// Animate to the target height
		this._setDrawerHeight(targetHeight, true, false);
	}

	_handleDrawerClick(event) {
		if (this._suppressNextClick) {
			this._suppressNextClick = false;
			logger.log('Drawer', 'Click suppressed after drag');
			event.preventDefault();
			event.stopPropagation();
			return;
		}
		logger.log('Drawer', 'Drawer click detected');

		if (
			!this._canDragDrawer() ||
			this._isCloseButtonClick(event) ||
			this.isDrawerDragging ||
			(event.type === 'click' && event.button !== 0)
		) {
			logger.log('Drawer', 'Drawer click ignored - conditions not met');
			return;
		}

		const currentHeight = this.playerDrawer.offsetHeight;
		const snapPoints = this._getSnapPoints();

		// Find current position in snap points
		let currentIndex = 0;
		for (let i = 0; i < snapPoints.length; i++) {
			if (Math.abs(currentHeight - snapPoints[i]) < this.MIN_MEANINGFUL_SNAP_DIFFERENCE / 2) {
				currentIndex = i;
				break;
			}
		}

		// Cycle to next snap point
		const nextIndex = (currentIndex + 1) % snapPoints.length;
		const targetHeight = snapPoints[nextIndex];

		// Fire user toggle callback
		if (this.options.callbacks.onDrawerUserToggle) {
			this.options.callbacks.onDrawerUserToggle(targetHeight > 0, targetHeight);
		}

		// Animate to target
		this._setDrawerHeight(targetHeight, true, false);
	}

	_handleDrawerCloseButton() {
		if (!this._canDragDrawer()) return;

		if (this.options.callbacks.onDrawerUserToggle) {
			this.options.callbacks.onDrawerUserToggle(false, 0);
		}

		this.closeDrawer();
	}

	/**
	 * Helper methods for drawer interaction
	 */
	_canDragDrawer() {
		const canDrag =
			this.isPlayerVisible &&
			this.hasPlaylist &&
			this.options.customPlaylistMode !== DrawerMode.FIXED_FULLY_OPEN &&
			this.options.customPlaylistMode !== DrawerMode.FIXED_BELOW_VIDEO &&
			this.options.customPlaylistMode !== DrawerMode.DISABLED &&
			this.options.customPlaylistMode !== 'fixed-fully-open' &&
			this.options.customPlaylistMode !== 'fixed-below-video' &&
			this.options.customPlaylistMode !== 'disabled';

		/*logger.log(
			'Drawer',
			`Can drag drawer: ${canDrag} (visible: ${this.isPlayerVisible}, hasPlaylist: ${this.hasPlaylist}, mode: ${this.options.customPlaylistMode})`
		);*/
		return canDrag;
	}

	_isCloseButtonClick(event) {
		return (
			event.target === this.drawerCloseButton ||
			(this.drawerCloseButton && this.drawerCloseButton.contains(event.target))
		);
	}

	/**
	 * GESTURE HANDLERS
	 */
	_handleTouchStart(event) {
		this.touchStartInfo = {
			x: event.touches[0].clientX,
			y: event.touches[0].clientY,
			time: Date.now(),
			target: event.target,
			fingerCount: event.touches.length,
		};
		this.isSwipeGestureActive = true;
	}

	_handleTouchMove(event) {
		if (!this.isSwipeGestureActive) return;

		const touch = event.touches[0];
		const deltaX = touch.clientX - this.touchStartInfo.x;
		const deltaY = touch.clientY - this.touchStartInfo.y;

		// Prevent scrolling for horizontal swipes
		if (this.touchStartInfo.fingerCount === 1 && event.touches.length === 1) {
			if (
				Math.abs(deltaX) > Math.abs(deltaY) * (1 / this.SWIPE_VERTICAL_THRESHOLD_RATIO) &&
				Math.abs(deltaX) > 10
			) {
				event.preventDefault();
			}
		} else if (this.touchStartInfo.fingerCount === 2 && event.touches.length === 2) {
			if (!this.isDrawerDragging && !this.isSeekbarDragging) {
				event.preventDefault();
			}
		}
	}

	_handleTouchEnd(event) {
		if (!this.isSwipeGestureActive) {
			this.isSwipeGestureActive = false;
			return;
		}

		this.isSwipeGestureActive = false;

		// Don't process as gesture if dragging
		if (this.isSeekbarDragging || this.isDrawerDragging) return;

		const touch = event.changedTouches[0];
		const deltaX = touch.clientX - this.touchStartInfo.x;
		const deltaY = touch.clientY - this.touchStartInfo.y;
		const deltaTime = Date.now() - this.touchStartInfo.time;
		const fingerCount = this.touchStartInfo.fingerCount;

		// Ignore long presses
		if (deltaTime > this.SWIPE_TIME_THRESHOLD) return;

		let action = 'unassigned';

		if (fingerCount === 1) {
			// Single finger horizontal swipe
			if (
				Math.abs(deltaX) > this.SWIPE_DISTANCE_THRESHOLD &&
				Math.abs(deltaY) < Math.abs(deltaX) * this.SWIPE_VERTICAL_THRESHOLD_RATIO
			) {
				action =
					deltaX < 0
						? this.options.gestureSingleSwipeLeftAction
						: this.options.gestureSingleSwipeRightAction;
			}
		} else if (fingerCount === 2) {
			// Two finger gestures
			if (
				Math.abs(deltaX) > this.SWIPE_DISTANCE_THRESHOLD &&
				Math.abs(deltaY) < Math.abs(deltaX) * this.SWIPE_VERTICAL_THRESHOLD_RATIO
			) {
				// Horizontal swipe
				action =
					deltaX < 0
						? this.options.gestureTwoFingerSwipeLeftAction
						: this.options.gestureTwoFingerSwipeRightAction;
			} else if (
				Math.abs(deltaY) > this.SWIPE_DISTANCE_THRESHOLD &&
				Math.abs(deltaX) < Math.abs(deltaY) * this.SWIPE_VERTICAL_THRESHOLD_RATIO
			) {
				// Vertical swipe
				action =
					deltaY < 0
						? this.options.gestureTwoFingerSwipeUpAction
						: this.options.gestureTwoFingerSwipeDownAction;
			} else if (
				Math.abs(deltaX) < this.TAP_DISTANCE_THRESHOLD &&
				Math.abs(deltaY) < this.TAP_DISTANCE_THRESHOLD
			) {
				// Tap
				action = this.options.gestureTwoFingerPressAction;
			}
		}

		if (action && action !== 'unassigned') {
			this._triggerGestureAction(action);
		}
	}

	/**
	 * Execute gesture action
	 */
	_triggerGestureAction(actionName) {
		const actions = {
			previousVideoOnly: () => this.options.callbacks.onGesturePreviousOnly?.(),
			restartCurrentVideo: () => this.options.callbacks.onGestureRestartCurrent?.(),
			restartPreviousVideo: () => this.options.callbacks.onGestureRestartCurrent?.(),
			nextVideo: () => this.options.callbacks.onSkipClick?.(),
			playPause: () => {
				const currentState = this.playButton.classList.contains('playing')
					? 'playing'
					: 'paused';
				const newState = currentState === 'playing' ? 'paused' : 'playing';
				this.options.callbacks.onPlayPauseClick?.(newState, { source: 'gesture' });
			},
			toggleVoiceSearch: () => {
				if (this.voiceButton) {
					const currentState = this.voiceButton.classList.contains('listening')
						? 'listening'
						: 'normal';
					const newState = currentState === 'listening' ? 'normal' : 'listening';
					this.options.callbacks.onVoiceSearchClick?.(newState);
				}
			},
			seekBackward10: () => this.options.callbacks.onGestureSeek?.(-10),
			seekForward10: () => this.options.callbacks.onGestureSeek?.(10),
			togglePlaylist: () => {
				this._togglePlaylistDrawer();
				this.options.callbacks.onGestureTogglePlaylist?.();
			},
		};

		const actionFn = actions[actionName];
		if (actionFn) {
			actionFn();
			this._displayGestureFeedback(actionName);
		}
	}

	/**
	 * Toggle playlist drawer (for gesture)
	 */
	_togglePlaylistDrawer() {
		if (!this._canDragDrawer() || !this.hasPlaylist) return;

		const currentHeight = this.playerDrawer.offsetHeight;
		const snapPoints = this._getSnapPoints();

		// Find current position and go to next
		let targetHeight = snapPoints[0]; // Default to closed

		for (let i = 0; i < snapPoints.length; i++) {
			if (Math.abs(currentHeight - snapPoints[i]) < this.MIN_MEANINGFUL_SNAP_DIFFERENCE / 2) {
				const nextIndex = (i + 1) % snapPoints.length;
				targetHeight = snapPoints[nextIndex];
				break;
			}
		}

		if (this.options.callbacks.onDrawerUserToggle) {
			this.options.callbacks.onDrawerUserToggle(targetHeight > 0, targetHeight);
		}

		logger.log('Layout', `Toggling drawer to ${targetHeight}px`);

		this._setDrawerHeight(targetHeight, true, false);
	}

	/**
	 * Display gesture feedback
	 */
	_displayGestureFeedback(actionName) {
		if (!this.options.showGestureFeedback || !this.gestureFeedbackOverlay) return;

		const iconSVG = this._getGestureIconSVG(actionName);
		if (!iconSVG) return;

		this.gestureFeedbackOverlay.innerHTML = iconSVG;
		this.gestureFeedbackOverlay.classList.add('visible');

		clearTimeout(this.gestureFeedbackTimeout);
		this.gestureFeedbackTimeout = setTimeout(() => {
			if (this.gestureFeedbackOverlay) {
				this.gestureFeedbackOverlay.classList.remove('visible');
			}
		}, 700);
	}

	/**
	 * Get gesture icon SVG
	 */
	_getGestureIconSVG(actionName) {
		const style = 'style="width: 64px; height: 64px; fill: currentColor;"';
		const icons = {
			restartCurrentVideo: `<svg ${style} viewBox="0 0 24 24"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6s-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8S16.42 4 12 4z"/></svg>`,
			restartPreviousVideo: `<svg ${style} viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>`,
			previousVideoOnly: `<svg ${style} viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>`,
			nextVideo: `<svg ${style} viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>`,
			playPause: this.playButton?.classList.contains('paused')
				? `<svg ${style} viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`
				: `<svg ${style} viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`,
			toggleVoiceSearch: `<svg ${style} viewBox="0 0 24 24"><g><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"></path><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"></path></g></svg>`,
			togglePlaylist: `<svg ${style} viewBox="0 0 24 24"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zm0-10v2h14V7H7z"/></svg>`,
		};
		return icons[actionName] || '';
	}

	/**
	 * PLAYLIST HANDLERS
	 */
	_handlePlaylistScroll() {
		if (
			this.programmaticScrollInProgress ||
			!this.options.keepPlaylistFocused ||
			!this.hasPlaylist ||
			!this.playlistWrapper
		) {
			return;
		}

		clearTimeout(this.autoScrollFocusTimer);
		this.autoScrollFocusTimer = setTimeout(
			this._performAutoScrollFocus_bound,
			this.playlistScrollDebounceDelay
		);
	}

	_performAutoScrollFocus() {
		if (!this.options.keepPlaylistFocused || !this.hasPlaylist || !this.playlistWrapper) {
			return;
		}

		const activeItem = this.playlistWrapper.querySelector('.yt-playlist-item.active');
		if (activeItem) {
			this.programmaticScrollInProgress = true;
			this._scrollActiveItemIntoView(activeItem);
			setTimeout(() => {
				this.programmaticScrollInProgress = false;
			}, 500);
		}
	}

	_scrollActiveItemIntoView(activeItem, behavior = 'smooth') {
		if (!activeItem || !this.playlistWrapper || !activeItem.offsetParent) return;

		const previousItem = activeItem.previousElementSibling;
		const playlistHeight = this.playlistWrapper.offsetHeight;
		const itemHeight = activeItem.offsetHeight;

		let targetScrollTop = activeItem.offsetTop;
		if (previousItem && playlistHeight >= itemHeight * 3) {
			targetScrollTop = previousItem.offsetTop;
		}

		targetScrollTop = Math.max(0, targetScrollTop);
		const currentScrollTop = this.playlistWrapper.scrollTop;

		if (Math.abs(currentScrollTop - targetScrollTop) <= 20) return;

		requestAnimationFrame(() => {
			if (this.playlistWrapper) {
				this.playlistWrapper.scrollTo({
					top: targetScrollTop,
					behavior: behavior,
				});
			}
		});
	}

	/**
	 * SEEKBAR SETUP
	 */
	_setupSeekbarDrag(seekbarElement, handleElement, progressElement, isBackground) {
		if (!seekbarElement) return;

		let startClientX, initialTime;

		const onDragStart = (event) => {
			if (event.type === 'mousedown' && event.button !== 0) return;

			this.isSeekbarDragging = true;
			seekbarElement.classList.add('dragging');
			document.body.classList.add('yt-player-body-dragging');

			if (isBackground && this.detailsOverlayElement) {
				this.detailsOverlayElement.classList.add('yt-seeking-active');
			}

			startClientX = event.touches ? event.touches[0].clientX : event.clientX;
			initialTime = this.trackTime;

			const moveEvent = event.touches ? 'touchmove' : 'mousemove';
			const endEvent = event.touches ? 'touchend' : 'mouseup';
			document.addEventListener(moveEvent, onDrag, { passive: false });
			document.addEventListener(endEvent, onDragEnd);
			event.preventDefault();
		};

		const onDrag = (event) => {
			if (!this.isSeekbarDragging) return;

			const currentClientX = event.touches ? event.touches[0].clientX : event.clientX;
			const rect = seekbarElement.getBoundingClientRect();
			if (rect.width === 0) return;

			const deltaX = currentClientX - startClientX;
			const deltaTime = (deltaX / rect.width) * this.totalTime;
			let newTime = initialTime + deltaTime;
			newTime = Math.max(0, Math.min(this.totalTime, newTime));

			this.trackTime = newTime;
			this._updateTimerDisplay();
			this._updatePrevButtonVisualState();

			if (this.options.callbacks.onSeekbarUpdate) {
				const percentage = (this.totalTime > 0 ? this.trackTime / this.totalTime : 0) * 100;
				this.options.callbacks.onSeekbarUpdate(percentage, this.trackTime, false);
			}
			event.preventDefault();
		};

		const onDragEnd = () => {
			if (!this.isSeekbarDragging) return;

			this.isSeekbarDragging = false;
			seekbarElement.classList.remove('dragging');
			document.body.classList.remove('yt-player-body-dragging');

			if (isBackground && this.detailsOverlayElement) {
				this.detailsOverlayElement.classList.remove('yt-seeking-active');
			}

			document.removeEventListener('touchmove', onDrag);
			document.removeEventListener('touchend', onDragEnd);
			document.removeEventListener('mousemove', onDrag);
			document.removeEventListener('mouseup', onDragEnd);

			if (this.options.callbacks.onSeekbarUpdate) {
				const percentage = (this.totalTime > 0 ? this.trackTime / this.totalTime : 0) * 100;
				this.options.callbacks.onSeekbarUpdate(percentage, this.trackTime, true);
			}
		};

		// Click/tap to seek
		['mousedown', 'touchstart'].forEach((eventType) => {
			seekbarElement.addEventListener(
				eventType,
				(event) => {
					if (event.type === 'mousedown' && event.button !== 0) return;

					const rect = seekbarElement.getBoundingClientRect();
					if (rect.width === 0) return;

					const clientX = event.touches ? event.touches[0].clientX : event.clientX;
					const clickX = clientX - rect.left;
					const percentage = (clickX / rect.width) * 100;
					const newTime = Math.max(
						0,
						Math.min(this.totalTime, (percentage / 100) * this.totalTime)
					);

					this.trackTime = newTime;
					this._updateTimerDisplay();
					this._updatePrevButtonVisualState();

					if (this.options.callbacks.onSeekbarUpdate) {
						const newPercentage =
							(this.totalTime > 0 ? this.trackTime / this.totalTime : 0) * 100;
						this.options.callbacks.onSeekbarUpdate(newPercentage, this.trackTime, true);
					}

					onDragStart(event);
				},
				{ passive: false }
			);
		});

		// Handle drag start
		if (handleElement) {
			['mousedown', 'touchstart'].forEach((eventType) => {
				handleElement.addEventListener(eventType, onDragStart, { passive: false });
			});
		}
	}

	/**
	 * EVENT LISTENER SETUP
	 */
	_setupEventListeners() {
		if (!this.playButton) {
			logger.error('Events', 'Cannot setup event listeners, elements not found.', true);
			return;
		}

		// Seekbars
		this._setupSeekbarDrag(
			this.seekbarBackground,
			this.seekbarHandle,
			this.seekbarProgress,
			true
		);
		this._setupSeekbarDrag(
			this.seekbarInline,
			this.seekbarThumbInline,
			this.seekbarProgressInline,
			false
		);

		// Control buttons
		this.playButton.addEventListener('click', () => {
			if (!this.isPlayerVisible) return;

			let newState;
			if (this.playButton.classList.contains('paused')) newState = PlayState.PLAYING;
			else if (this.playButton.classList.contains('playing')) newState = PlayState.PAUSED;
			else if (this.playButton.classList.contains('buffering')) newState = PlayState.PAUSED;

			if (newState) {
				this.setPlayState(newState);
				const details = newState === PlayState.PAUSED ? { source: 'custom' } : null;
				this.options.callbacks.onPlayPauseClick?.(newState, details);
			}
		});

		this.prevButton.addEventListener('click', () => {
			if (!this.isPlayerVisible || this.isPrevButtonAnimating) return;

			const wasRestart = this.prevButton.classList.contains('restart');
			if (wasRestart) {
				this.isPrevButtonAnimating = true;
				this.isRestartIconLocked = true;
				this.prevButton.classList.add('animate');
				setTimeout(() => {
					this.prevButton.classList.remove('animate');
					this.isPrevButtonAnimating = false;
					this.isRestartIconLocked = false;
					this._updatePrevButtonVisualState();
				}, 600);
			}
			this.options.callbacks.onPreviousClick?.();
		});

		this.skipButton.addEventListener('click', () => {
			if (!this.isPlayerVisible) return;
			this.options.callbacks.onSkipClick?.();
		});

		if (this.voiceButton) {
			this.voiceButton.addEventListener('click', () => {
				if (!this.isPlayerVisible) return;

				const currentState = this.voiceButton.classList.contains('listening')
					? VoiceState.LISTENING
					: VoiceState.NORMAL;
				const nextState =
					currentState === 'listening' ? VoiceState.NORMAL : VoiceState.LISTENING;

				this.options.callbacks.onVoiceSearchClick?.(nextState);
			});
		}

		// Playlist interactions
		if (this.playlistWrapper) {
			// Use event delegation for playlist items
			this.playlistWrapper.addEventListener('click', (event) => {
				if (!this.isPlayerVisible || !this.hasPlaylist) return;

				const itemElement = event.target.closest('.yt-playlist-item');
				if (itemElement?.dataset.itemId) {
					const itemId = itemElement.dataset.itemId;
					const itemData = this.options.currentPlaylist.items?.find(
						(item) => String(item.id) === String(itemId)
					);
					this.options.callbacks.onPlaylistItemClick?.(
						itemId,
						itemData || { id: itemId }
					);
				}
			});

			this.playlistWrapper.addEventListener('scroll', this._handlePlaylistScroll_bound, {
				passive: true,
			});
		}

		// Global listeners
		if (this.isPlayerVisible) {
			window.addEventListener('resize', this._handleResize_bound);

			// Mutation observer for layout changes
			if (this.playerControls) {
				this.resizeObserver = new MutationObserver(
					this._handlePlayerControlsMutation_bound
				);
				this.resizeObserver.observe(this.playerControls, {
					attributes: true,
					attributeFilter: ['class'],
				});
			}

			// Gesture listeners
			if (this.options.enableGestures) {
				this._addGestureListeners();
			}
		}
	}

	/**
	 * Setup drawer interactions - called after playlist state is established
	 */
	_setupDrawerInteractions() {
		logger.log('Events', 'Setting up drawer interactions');

		// Remove any existing listeners first
		if (this.drawerHandle) {
			this.drawerHandle.removeEventListener('mousedown', this._startDrawerDrag_bound);
			this.drawerHandle.removeEventListener('touchstart', this._startDrawerDrag_bound);
			this.drawerHandle.removeEventListener('click', this._handleDrawerClick_bound);
		}
		if (this.drawerCloseButton) {
			this.drawerCloseButton.removeEventListener(
				'click',
				this._handleDrawerCloseButton_bound
			);
		}

		// Add listeners if drawer can be dragged
		if (this._canDragDrawer()) {
			logger.log('Events', 'Adding drawer interaction listeners');
			if (this.drawerHandle) {
				this.drawerHandle.addEventListener('mousedown', this._startDrawerDrag_bound);
				this.drawerHandle.addEventListener('touchstart', this._startDrawerDrag_bound, {
					passive: false,
				});
				this.drawerHandle.addEventListener('click', this._handleDrawerClick_bound);
			}
			if (this.drawerCloseButton) {
				this.drawerCloseButton.addEventListener(
					'click',
					this._handleDrawerCloseButton_bound
				);
			}
		} else {
			logger.log('Events', 'Drawer cannot be dragged, skipping interaction listeners');
		}
	}

	/**
	 * Add/remove gesture listeners
	 */
	_addGestureListeners() {
		document.body.addEventListener('touchstart', this._handleTouchStart_bound, {
			passive: true,
			capture: true,
		});
		document.body.addEventListener('touchmove', this._handleTouchMove_bound, {
			passive: false,
			capture: true,
		});
		document.body.addEventListener('touchend', this._handleTouchEnd_bound, {
			passive: true,
			capture: true,
		});
		document.body.addEventListener('touchcancel', this._handleTouchEnd_bound, {
			passive: true,
			capture: true,
		});
	}

	_removeGestureListeners() {
		document.body.removeEventListener('touchstart', this._handleTouchStart_bound, true);
		document.body.removeEventListener('touchmove', this._handleTouchMove_bound, true);
		document.body.removeEventListener('touchend', this._handleTouchEnd_bound, true);
		document.body.removeEventListener('touchcancel', this._handleTouchEnd_bound, true);
	}

	/**
	 * UPDATE METHODS
	 */
	_updateTimerDisplay() {
		if (!this.videoTimerElement || !this.seekbarProgress || !this.seekbarProgressInline) return;

		const cM = Math.floor(this.trackTime / 60);
		const cS = Math.floor(this.trackTime % 60);
		const tM = Math.floor(this.totalTime / 60);
		const tS = Math.floor(this.totalTime % 60);

		this.videoTimerElement.textContent = `${cM}:${cS.toString().padStart(2, '0')} / ${tM}:${tS
			.toString()
			.padStart(2, '0')}`;

		const percentage = (this.totalTime > 0 ? this.trackTime / this.totalTime : 0) * 100;
		this.seekbarProgress.style.width = `${percentage}%`;
		this.seekbarProgressInline.style.width = `${percentage}%`;
	}

	_updatePrevButtonVisualState() {
		if (
			!this.prevButton ||
			(this.isRestartIconLocked && this.prevButton.classList.contains('restart'))
		) {
			return;
		}

		if (this.options.previousButtonBehavior === 'alwaysPrevious') {
			if (!this.prevButton.classList.contains('previous')) {
				this.prevButton.classList.remove('restart');
				this.prevButton.classList.add('previous');
			}
		} else {
			// Smart mode
			const restartThreshold = 5;
			const shouldShowRestart = this.trackTime > restartThreshold;

			if (shouldShowRestart && !this.prevButton.classList.contains('restart')) {
				this.prevButton.classList.remove('previous');
				this.prevButton.classList.add('restart');
			} else if (!shouldShowRestart && !this.prevButton.classList.contains('previous')) {
				this.prevButton.classList.remove('restart');
				this.prevButton.classList.add('previous');
			}
		}
	}

	/**
	 * PLAYLIST METHODS
	 */
	_renderPlaylistItem(item, isActive) {
		const thumb =
			item.thumbnailUrl ||
			(typeof browser !== 'undefined' ? browser : chrome).runtime.getURL(
				'/assets/default_thumb.png'
			);

		return `
<div class="yt-playlist-item ${isActive ? 'active' : ''}" data-item-id="${item.id || ''}">
	<div class="yt-playlist-item-thumbnail" style="background-image: url('${thumb}');"></div>
	<div class="yt-playlist-item-info">
		<h3 class="yt-playlist-item-title" title="${item.title || ''}">${item.title || 'Unknown Title'}</h3>
		<p class="yt-playlist-item-artist" title="${item.artist || ''}">${
			item.artist || 'Unknown Artist'
		}</p>
	</div>
	<span class="yt-playlist-item-duration">${item.duration || '0:00'}</span>
</div>`;
	}

	/**
	 * PUBLIC API METHODS
	 */

	/**
	 * Show/hide player
	 */
	showPlayer() {
		if (this.isPlayerVisible || !this.playerWrapper) return;

		this.isPlayerVisible = true;
		this.playerWrapper.classList.remove('yt-player-hidden');

		// Re-attach listeners
		window.addEventListener('resize', this._handleResize_bound);
		if (this.playerControls && !this.resizeObserver) {
			this.resizeObserver = new MutationObserver(this._handlePlayerControlsMutation_bound);
			this.resizeObserver.observe(this.playerControls, {
				attributes: true,
				attributeFilter: ['class'],
			});
		}

		// Recalculate and restore state
		this._invalidateAndRecalculateMeasurements();
		this._updatePlaylistVisibility();
		this._updateDrawerVisualState();
	}

	hidePlayer() {
		if (!this.isPlayerVisible || !this.playerWrapper) return;

		this.isPlayerVisible = false;
		this.playerWrapper.classList.add('yt-player-hidden');

		// Remove listeners
		window.removeEventListener('resize', this._handleResize_bound);
		if (this.resizeObserver) {
			this.resizeObserver.disconnect();
		}
	}

	/**
	 * Layout control
	 */
	setLayout(layout) {
		if (this.playerControls) {
			this.playerControls.className = `yt-player-controls ${layout}`;
			this._invalidateAndRecalculateMeasurements();
		}
	}

	/**
	 * Resets drawer height to the customPlaylistMode setting
	 */
	openDrawerToDefault() {
		if (!this._canDragDrawer() || !this.hasPlaylist) return;

		let height = 0;
		if (this.options.customPlaylistMode === DrawerMode.BELOW_VIDEO)
			height = this.cachedMeasurements.midDrawerHeight;
		else if (this.options.customPlaylistMode === DrawerMode.OPENED)
			height = this.cachedMeasurements.maxDrawerHeight;

		logger.log(
			'Layout',
			`Opening drawer to: ${height}px, mode: ${this.options.customPlaylistMode}`
		);
		this._setDrawerHeight(height, true, false);
	}

	closeDrawer() {
		if (!this._canDragDrawer()) return;

		logger.log('Layout', 'Closing drawer');

		this._setDrawerHeight(0, true, false);
	}

	/**
	 * Playback state
	 */
	setPlayState(state) {
		if (!this.playButton) return;

		this.playButton.classList.remove(PlayState.PLAYING, PlayState.PAUSED, PlayState.BUFFERING);
		this.playButton.classList.add(state);

		this.currentPlayState = state;

		// Clear timer - host app should restart if needed
		if (this.trackTimer) {
			clearInterval(this.trackTimer);
			this.trackTimer = null;
		}
	}

	getPlayState() {
		return this.currentPlayState;
	}

	setVoiceSearchState(state) {
		if (!this.voiceButton) return;

		this.voiceButton.classList.remove(
			VoiceState.NORMAL,
			VoiceState.LISTENING,
			VoiceState.FAILED
		);
		this.voiceButton.classList.add(state);
	}

	setPreviousButtonState(state) {
		if (!this.prevButton) return;

		this.prevButton.classList.remove('previous', 'restart');
		this.prevButton.classList.add(state);
	}

	/**
	 * Time control
	 */
	setCurrentTime(currentTime, totalTime, triggerCallback = false) {
		this.trackTime = Math.max(0, Math.min(currentTime, totalTime));
		this.totalTime = Math.max(0, totalTime);

		this._updateTimerDisplay();
		this._updatePrevButtonVisualState();

		if (triggerCallback && this.options.callbacks.onSeekbarUpdate) {
			const percentage = (this.totalTime > 0 ? this.trackTime / this.totalTime : 0) * 100;
			this.options.callbacks.onSeekbarUpdate(percentage, this.trackTime, false);
		}
	}

	/**
	 * Video details
	 */
	setCurrentVideoDetails({ title, author, thumbnailUrl, currentTime, totalTime, videoId }) {
		if (this.videoTitleElement) this.videoTitleElement.textContent = title;
		if (this.videoAuthorElement) this.videoAuthorElement.textContent = author;
		if (this.videoAuthorCompactElement) this.videoAuthorCompactElement.textContent = author;

		if (this.thumbnailElement)
			this.thumbnailElement.style.backgroundImage = `url('${thumbnailUrl}')`;

		this.options.nowPlayingVideoDetails = {
			title,
			author,
			thumbnailUrl,
			currentTime,
			totalTime,
			videoId,
		};

		this.setCurrentTime(currentTime, totalTime);
	}

	/**
	 * Process items for duplicate handling based on user settings
	 */
	_processDuplicateItems(items) {
		if (!this.options.playlistRemoveSame) {
			return items;
		}

		const processedItems = [];
		const seenItems = new Set();

		items.forEach((item) => {
			let duplicateKey;

			if (!this.options.allowDifferentVersions) {
				// Only check title (ignore author), strip modifiers inside brackets
				duplicateKey = (item.title || '')
					.replace(/\([^\)]*\)/g, '')
					.toLowerCase()
					.replace(/[^a-z0-9 ]+/g, '') // Strip special characters
					.trim();
			} else {
				// Check if exact same version
				const author = (item.artist || item.author || '').toLowerCase().trim();
				const feat = (item.featuring || item.featuring || '').toLowerCase().trim();
				const title = (item.title || '').toLowerCase().trim();
				duplicateKey = `${author}|${feat}|${title}`.replace(/[^a-z0-9| ]+/g, '').trim();
			}

			if (seenItems.has(duplicateKey)) {
				// Mark as hidden but keep in the array
				processedItems.push({ ...item, hidden: true });
			} else {
				// First occurrence, keep visible
				seenItems.add(duplicateKey);
				processedItems.push({ ...item, hidden: false });
			}
		});

		return processedItems;
	}

	/**
	 * Playlist management
	 */
	updatePlaylist(newItems = []) {
		// Process items for duplicate handling
		if (this.options.playlistRemoveSame) {
			newItems = this._processDuplicateItems(newItems);
		}

		this.options.currentPlaylist.items = newItems;
		logger.log('Playlist', 'Updating playlist', newItems);

		if (!this.playlistWrapper || this.options.customPlaylistMode === DrawerMode.DISABLED) {
			this.hasPlaylist = false;
			this._updatePlaylistVisibility();
			return;
		}

		// Efficient DOM diffing
		const existingItems = Array.from(this.playlistWrapper.children);
		const existingMap = new Map();
		existingItems.forEach((el) => {
			const id = el.dataset.itemId;
			if (id) existingMap.set(id, el);
		});

		let activeElement = null;

		// Update/add items (only visible ones)
		let visibleIndex = 0;
		newItems.forEach((item) => {
			// Skip hidden items
			if (item.hidden) return;

			const itemId = String(item.id);
			const isActive = itemId === this.options.nowPlayingVideoDetails.videoId;
			let element = existingMap.get(itemId);

			if (element) {
				// Update existing
				element.classList.toggle('active', isActive);
				if (this.playlistWrapper.children[visibleIndex] !== element) {
					this.playlistWrapper.insertBefore(
						element,
						this.playlistWrapper.children[visibleIndex] || null
					);
				}
				existingMap.delete(itemId);
			} else {
				// Create new
				const tempDiv = document.createElement('div');
				tempDiv.innerHTML = this._renderPlaylistItem(item, isActive);
				element = tempDiv.firstElementChild;
				this.playlistWrapper.insertBefore(
					element,
					this.playlistWrapper.children[visibleIndex] || null
				);
			}

			if (isActive) activeElement = element;
			visibleIndex++;
		});

		// Remove old items
		existingMap.forEach((oldElement) => oldElement.remove());

		// Update state
		this._updatePlaylistVisibility();

		// Recalculate measurements if playlist state changed
		const hadPlaylistBefore = this.hasPlaylist;
		if (this.hasPlaylist !== hadPlaylistBefore) {
			logger.log('Playlist', 'Playlist state changed, recalculating measurements');
			this._invalidateAndRecalculateMeasurements();
			this._setupDrawerInteractions(); // Re-setup interactions
		}

		// If this is the first time we have a playlist, set initial drawer state
		if (this.hasPlaylist && this.isFirstDrawerRender) {
			logger.log('Playlist', 'First playlist received, setting initial drawer state');
			this._setInitialDrawerState();
		}

		this._updateDrawerVisualState();

		// Scroll to active item
		if (activeElement) {
			if (this.options.keepPlaylistFocused) {
				clearTimeout(this.autoScrollFocusTimer);
				this.programmaticScrollInProgress = false;
			}

			this._scrollActiveItemIntoView(activeElement, 'auto');
		}
	}

	setActivePlaylistItem(itemId) {
		if (!this.playlistWrapper || this.options.customPlaylistMode === DrawerMode.DISABLED) {
			return null;
		}

		const newItemIdStr = String(itemId);
		const currentActive = this.playlistWrapper.querySelector('.yt-playlist-item.active');

		// Find item data
		let itemData = null;
		if (this.options.currentPlaylist?.items) {
			itemData = this.options.currentPlaylist.items.find(
				(item) => String(item.id) === newItemIdStr
			);
		}

		// If already active, just scroll
		if (currentActive?.dataset.itemId === newItemIdStr) {
			if (this.options.keepPlaylistFocused) {
				clearTimeout(this.autoScrollFocusTimer);
				this.programmaticScrollInProgress = false;
			}
			this._scrollActiveItemIntoView(currentActive, 'smooth');
			return itemData;
		}

		// Update active state
		if (currentActive) currentActive.classList.remove('active');

		const newActive = this.playlistWrapper.querySelector(
			`.yt-playlist-item[data-item-id="${newItemIdStr}"]`
		);
		if (newActive) {
			newActive.classList.add('active');
			if (this.options.keepPlaylistFocused) {
				clearTimeout(this.autoScrollFocusTimer);
				this.programmaticScrollInProgress = false;
			}
			this._scrollActiveItemIntoView(newActive, 'smooth');
		}

		this.options.currentPlaylist.activeItemId = newItemIdStr;
		return itemData;
	}

	/**
	 * Get cached playlist data
	 */
	getCachedPlaylistData() {
		return {
			items: this.options.currentPlaylist?.items || [],
			activeItemId: this.options.currentPlaylist?.activeItemId || null,
		};
	}

	/**
	 * Check if a video ID is hidden and return navigation instruction
	 * @param {string} targetVideoId - The video ID to check
	 * @returns {Object|null} - Navigation instruction or null if no action needed
	 */
	checkHiddenItemNavigation(targetVideoId) {
		const playlistData = this.getCachedPlaylistData();
		if (!playlistData.items.length) return null;

		const targetItem = playlistData.items.find((item) => item.id === targetVideoId);
		if (!targetItem || !targetItem.hidden) return null;

		const currentVideoId = this.options.nowPlayingVideoDetails?.videoId;
		if (!currentVideoId) return null;

		const currentIndex = playlistData.items.findIndex((item) => item.id === currentVideoId);
		const targetIndex = playlistData.items.findIndex((item) => item.id === targetVideoId);

		if (currentIndex === -1 || targetIndex === -1) return null;

		const isMovingForward = currentIndex < targetIndex;

		if (isMovingForward) {
			// Moving forward, find next visible item
			const nextVisibleItem = playlistData.items
				.slice(targetIndex + 1)
				.find((item) => !item.hidden);
			if (nextVisibleItem) {
				return {
					action: 'navigate',
					direction: 'forward',
					videoId: nextVisibleItem.id,
				};
			}
		} else {
			// Moving backward, find previous visible item
			const prevVisibleItem = playlistData.items
				.slice(0, targetIndex)
				.reverse()
				.find((item) => !item.hidden);
			if (prevVisibleItem) {
				return {
					action: 'navigate',
					direction: 'backward',
					videoId: prevVisibleItem.id,
				};
			}
		}

		return {
			action: null,
		};
	}

	/**
	 * Handle content
	 */
	setHandleContent({ title, itemCount }) {
		this._fullPlaylistTitle = title;
		this.options.currentHandleTitle = title;

		if (this.drawerSubheader && typeof itemCount === 'number') {
			const text = itemCount === 1 ? '1 item' : `${itemCount} items`;
			this.drawerSubheader.textContent = text;
		}

		this._updateHandleText();
	}

	/**
	 * Settings
	 */
	setBottomControlsVisibility(visible) {
		this.options.showBottomControls = visible;
		if (this.playerWrapper) {
			this.playerWrapper.classList.toggle('bottom-controls-hidden', !visible);
			this._invalidateAndRecalculateMeasurements();
		}
	}

	setButtonVisibility(buttonName, visible) {
		if (buttonName === 'Previous') {
			this.options.showPreviousButton = visible;
			if (this.playerWrapper) {
				this.playerWrapper.classList.toggle('hide-prev-button', !visible);
			}
		} else if (buttonName === 'Skip') {
			this.options.showSkipButton = visible;
			if (this.playerWrapper) {
				this.playerWrapper.classList.toggle('hide-skip-button', !visible);
			}
		}
	}

	setFontSizeMultiplier(multiplier) {
		this.options.customPlayerFontMultiplier = multiplier;
		this._updateCSSVariables();
	}

	setPlaylistItemDensity(density) {
		this.options.playlistItemDensity = density;
		if (this.playerWrapper) {
			this.playerWrapper.classList.remove(
				'playlist-density-comfortable',
				'playlist-density-compact'
			);
			this.playerWrapper.classList.add(`playlist-density-${density}`);
		}
	}

	setMultilinePlaylistTitles(allow) {
		this.options.allowMultilinePlaylistTitles = allow;
		if (this.playerWrapper) {
			this.playerWrapper.classList.toggle('playlist-multiline-titles', allow);
		}
	}

	setShowGestureFeedback(enabled) {
		this.options.showGestureFeedback = enabled;
	}

	setKeepPlaylistFocused(enabled) {
		this.options.keepPlaylistFocused = enabled;
		if (!enabled) {
			clearTimeout(this.autoScrollFocusTimer);
			this.programmaticScrollInProgress = false;
		}
	}

	setGesturesEnabled(enabled) {
		if (this.options.enableGestures === enabled) return;

		this.options.enableGestures = enabled;
		if (enabled) {
			this._addGestureListeners();
		} else {
			this._removeGestureListeners();
		}
	}

	/**
	 * Cleanup
	 */
	destroy() {
		logger.log('Core', 'YTMediaPlayer destroyed.', true);

		// Clear timers
		clearInterval(this.trackTimer);
		clearTimeout(this.autoScrollFocusTimer);
		clearTimeout(this.gestureFeedbackTimeout);
		clearTimeout(this.resizeTimeout);

		// Remove body classes
		if (document.body) {
			document.body.classList.remove(
				'yt-drawer-closed',
				'yt-drawer-mid',
				'yt-drawer-full',
				'yt-player-body-dragging'
			);
		}

		// Remove global listeners
		window.removeEventListener('resize', this._handleResize_bound);
		if (this.resizeObserver) {
			this.resizeObserver.disconnect();
			this.resizeObserver = null;
		}

		// Remove gesture listeners
		this._removeGestureListeners();

		// Remove from DOM
		if (this.playerWrapper?.parentNode) {
			this.playerWrapper.parentNode.removeChild(this.playerWrapper);
		}

		// Clear CSS variables
		const cssVars = [
			'--yt-player-controls-height',
			'--yt-player-wrapper-height',
			'--yt-player-max-drawer-height',
			'--yt-player-mid-drawer-height',
			'--yt-video-height',
			'--yt-below-player-height',
			'--yt-max-voice-button-width',
		];
		cssVars.forEach((prop) => document.body.style.removeProperty(prop));

		// Nullify references
		this.playerWrapper = null;
		this.isPlayerVisible = false;
		Object.keys(this).forEach((key) => {
			if (key.endsWith('Element') || key.endsWith('Button') || key.endsWith('Wrapper')) {
				this[key] = null;
			}
		});
	}
}

// Export to global scope
if (typeof window !== 'undefined') {
	window.YTMediaPlayer = YTMediaPlayer;
	window.DrawerState = DrawerState;
	window.DrawerMode = DrawerMode;
	window.PlayState = PlayState;
	window.VoiceState = VoiceState;
}
