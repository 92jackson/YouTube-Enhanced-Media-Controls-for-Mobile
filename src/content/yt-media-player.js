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
			showRepeatButton: window.userSettings.showRepeatButton,
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
			gestureSensitivity: window.userSettings.gestureSensitivity,

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
				onReloadPlaylistClick: () => {},
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
		this.longPressTimer = null;

		// Auto-scroll state
		this.autoScrollFocusTimer = null;
		this.programmaticScrollInProgress = false;

		// Configuration constants
		this.MIN_MEANINGFUL_SNAP_DIFFERENCE = 40;
		this.playlistScrollDebounceDelay = 2500;
		
		// Initialize gesture thresholds based on sensitivity
		this._updateGestureThresholds();

		// Timers
		this.gestureFeedbackTimeout = null;
		this.measurementUpdateId = 0;

		// Full playlist title for handle text
		this._fullPlaylistTitle = this.options.currentHandleTitle;

		// Initialize
		this._initialize();
	}

	/**
	 * Toggle ad display mode and update the title accordingly
	 */
	setAdState(isAd) {
		this.isAdPlaying = !!isAd;
		if (this.playerWrapper) {
			if (this.isAdPlaying) {
				this.playerWrapper.classList.add('yt-ad-showing');
			} else {
				this.playerWrapper.classList.remove('yt-ad-showing');
			}
		}
	}

	/**
	 * Update gesture threshold values based on sensitivity setting
	 */
	_updateGestureThresholds() {
		const sensitivity = this.options.gestureSensitivity || 'normal';
		
		// Base threshold values (normal sensitivity)
		const baseSwipeDistance = 60;
		const baseTapDistance = 60;
		const baseSwipeTime = 500;
		const baseVerticalRatio = 0.7;
		
		// Sensitivity multipliers
		const multipliers = {
			low: { distance: 1.5, time: 0.8, ratio: 0.8 },    // Require more distance, less time, stricter ratio
			normal: { distance: 1.0, time: 1.0, ratio: 1.0 }, // Default values
			high: { distance: 0.7, time: 1.2, ratio: 1.2 }    // Require less distance, more time, looser ratio
		};
		
		const multiplier = multipliers[sensitivity] || multipliers.normal;
		
		this.SWIPE_DISTANCE_THRESHOLD = Math.round(baseSwipeDistance * multiplier.distance);
		this.TAP_DISTANCE_THRESHOLD = Math.round(baseTapDistance * multiplier.distance);
		this.SWIPE_TIME_THRESHOLD = Math.round(baseSwipeTime * multiplier.time);
		this.SWIPE_VERTICAL_THRESHOLD_RATIO = baseVerticalRatio * multiplier.ratio;
	}

	/**
	 * Main initialization method
	 */
	async _restoreAllFromMix() {
		const playlistId = this.options.currentPlaylist.listId;
		if (!playlistId || !window.userSettings.removedFromMix[playlistId]) return;

		delete window.userSettings.removedFromMix[playlistId];
		await window.saveUserSetting('removedFromMix', window.userSettings.removedFromMix);

		// Un-hide all items and update the playlist
		this.updatePlaylist(this.options.currentPlaylist.items);
	}

	/**
	 * Main initialization method
	 */
	_initialize() {
		logger.log('Core', 'YTMediaPlayer initialization started.', true);

		this._bindMethods();
		this._hideContextMenu_bound = this._hideContextMenu.bind(this);
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
	 * Create and inject DOM elements
	 */
	_injectHTML() {
		const tempDiv = document.createElement('div');
		tempDiv.appendChild(this._createPlayerElement());
		this.playerWrapper = tempDiv.firstElementChild;
	}

	/**
	 * Create complete DOM structure
	 */
	_createPlayerElement() {
		const initialThumbnail =
			this.options.nowPlayingVideoDetails.thumbnailUrl ||
			(typeof browser !== 'undefined' ? browser : chrome).runtime.getURL(
				'/assets/default_thumb.png'
			);

		const wrapperClasses = this._getWrapperClasses();

		// Create main wrapper
		const wrapper = document.createElement('div');
		wrapper.className = `yt-player-wrapper ${wrapperClasses}`;

		// Add playlist if not disabled
		if (this.options.customPlaylistMode !== DrawerMode.DISABLED) {
			const playlistElement = this._createPlaylistElement();
			this.playlistWrapper = playlistElement.querySelector('.yt-playlist-wrapper');
			wrapper.appendChild(playlistElement);
		}

		// Create player controls
		const playerControls = document.createElement('div');
		playerControls.className = `yt-player-controls ${this.options.initialLayout}`;

		// Create playing details
		const playingDetails = document.createElement('div');
		playingDetails.className = 'yt-playing-details';

		// Create seekbar background
		const seekbarBg = document.createElement('div');
		seekbarBg.className = 'yt-seekbar-background';
		const seekbarProgress = document.createElement('div');
		seekbarProgress.className = 'yt-seekbar-progress';
		const seekbarHandle = document.createElement('div');
		seekbarHandle.className = 'yt-seekbar-handle';
		seekbarProgress.appendChild(seekbarHandle);
		seekbarBg.appendChild(seekbarProgress);
		playingDetails.appendChild(seekbarBg);

		// Create details overlay
		const detailsOverlay = document.createElement('div');
		detailsOverlay.className = 'yt-details-overlay';

		// Create thumbnail
		const thumbnail = document.createElement('div');
		thumbnail.className = 'yt-thumbnail';
		thumbnail.style.backgroundImage = `url('${initialThumbnail}')`;
		detailsOverlay.appendChild(thumbnail);

		// Create text content
		const textContent = document.createElement('div');
		textContent.className = 'yt-text-content';

		// Create video title
		const videoTitle = document.createElement('div');
		videoTitle.className = 'yt-video-title';
		const titleText = this.options.nowPlayingVideoDetails.title || '';
		const authorText = this.options.nowPlayingVideoDetails.author || '';
		const adIndicator = document.createElement('span');
		adIndicator.className = 'yt-ad-indicator';
		adIndicator.textContent = 'AD. Up next:';
		videoTitle.appendChild(adIndicator);
		const videoTitleText = document.createElement('span');
		videoTitleText.className = 'yt-video-title-text';
		videoTitleText.textContent = titleText;
		videoTitle.appendChild(videoTitleText);
		const authorCompact = document.createElement('span');
		authorCompact.className = 'yt-video-author-compact';
		authorCompact.textContent = authorText;
		videoTitle.appendChild(authorCompact);
		textContent.appendChild(videoTitle);

		// Create video author
		const videoAuthor = document.createElement('div');
		videoAuthor.className = 'yt-video-author';
		videoAuthor.textContent = authorText;
		textContent.appendChild(videoAuthor);

		// Create playback info
		const playbackInfo = document.createElement('div');
		playbackInfo.className = 'yt-playback-info';
		const videoTimer = document.createElement('div');
		videoTimer.className = 'yt-video-timer';
		videoTimer.textContent = '0:00 / 0:00';
		playbackInfo.appendChild(videoTimer);

		// Create inline seekbar
		const seekbarInline = document.createElement('div');
		seekbarInline.className = 'yt-seekbar-inline';
		const seekbarProgressInline = document.createElement('div');
		seekbarProgressInline.className = 'yt-seekbar-progress-inline';
		const seekbarThumbInline = document.createElement('div');
		seekbarThumbInline.className = 'yt-seekbar-thumb-inline';
		seekbarProgressInline.appendChild(seekbarThumbInline);
		seekbarInline.appendChild(seekbarProgressInline);
		playbackInfo.appendChild(seekbarInline);

		textContent.appendChild(playbackInfo);
		detailsOverlay.appendChild(textContent);
		playingDetails.appendChild(detailsOverlay);
		playerControls.appendChild(playingDetails);

		// Create main controls
		const mainControls = document.createElement('div');
		mainControls.className = 'yt-main-controls';

		// Create left section
		const leftSection = document.createElement('div');
		leftSection.className = 'yt-left-section';
		leftSection.appendChild(this._createRepeatButton());
		mainControls.appendChild(leftSection);

		// Create button group
		const buttonGroup = document.createElement('div');
		buttonGroup.className = 'yt-button-group';
		buttonGroup.appendChild(this._createPreviousButton());
		buttonGroup.appendChild(this._createPlayButton());
		buttonGroup.appendChild(this._createSkipButton());
		mainControls.appendChild(buttonGroup);

		// Create right section
		const rightSection = document.createElement('div');
		rightSection.className = 'yt-right-section';
		if (this.options.showVoiceButton) {
			rightSection.appendChild(this._createVoiceButton());
		}
		mainControls.appendChild(rightSection);

		playerControls.appendChild(mainControls);
		wrapper.appendChild(playerControls);

		// Create gesture feedback overlay
		const gestureOverlay = document.createElement('div');
		gestureOverlay.className = 'yt-gesture-feedback-overlay';
		wrapper.appendChild(gestureOverlay);

		return wrapper;
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
	 * Create playlist element using DOM APIs
	 */
	_createPlaylistElement() {
		const fragment = document.createDocumentFragment();

		const itemCount = this.options.currentPlaylist?.items?.length || 0;
		const subheaderText = itemCount === 1 ? '1 item' : `${itemCount} items`;

		// Create restore all button
		const restoreAllButton = document.createElement('button');
		restoreAllButton.className = 'yt-playlist-restore-all-button yt-button-text';
		restoreAllButton.textContent = 'Restore all';
		let headerText = this.options.currentHandleTitle;

		if (this.options.customPlaylistMode === DrawerMode.CLOSED) {
			headerText = /^(?:my\s+)?mix/i.test(headerText) ? 'Mix' : 'Playlist';
		}

		// Create drag handle
		const dragHandle = document.createElement('div');
		dragHandle.className = 'yt-drawer-drag-handle';
		dragHandle.setAttribute('title', 'Drag to open/close playlist');

		// Create drag cue
		const dragCue = document.createElement('div');
		dragCue.className = 'yt-drawer-drag-cue';
		dragHandle.appendChild(dragCue);

		// Create close button
		const closeButton = document.createElement('button');
		closeButton.className = 'yt-drawer-close-button';
		closeButton.setAttribute('aria-label', 'Close playlist');
		closeButton.textContent = '×';
		dragHandle.appendChild(closeButton);

		// Create header content
		const headerContent = document.createElement('div');
		headerContent.className = 'yt-drawer-header-content';

		// Create header
		const header = document.createElement('h1');
		header.className = 'yt-drawer-header';
		header.textContent = headerText || '';
		headerContent.appendChild(header);

		// Create subheader container
		const subheaderContainer = document.createElement('div');
		subheaderContainer.className = 'yt-playlist-subheader-container';

		// Create subheader
		const subheader = document.createElement('p');
		subheader.className = 'yt-drawer-subheader';
		subheader.textContent = subheaderText || '';
		subheaderContainer.appendChild(subheader);
		subheaderContainer.appendChild(restoreAllButton);
		headerContent.appendChild(subheaderContainer);

		dragHandle.appendChild(headerContent);
		fragment.appendChild(dragHandle);

		// Create player drawer
		const playerDrawer = document.createElement('div');
		playerDrawer.className = 'yt-player-drawer';

		// Create playlist wrapper
		const playlistWrapper = document.createElement('div');
		playlistWrapper.className = 'yt-playlist-wrapper';
		playerDrawer.appendChild(playlistWrapper);

		// Create playlist spinner
		const playlistSpinner = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		playlistSpinner.setAttribute('class', 'yt-spinner');
		playlistSpinner.setAttribute('viewBox', '0 0 24 24');
		const bufferingCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
		bufferingCircle.setAttribute('cx', '12');
		bufferingCircle.setAttribute('cy', '12');
		bufferingCircle.setAttribute('r', '10');
		bufferingCircle.setAttribute('fill', 'none');
		bufferingCircle.setAttribute('stroke', 'currentColor');
		bufferingCircle.setAttribute('stroke-width', '2');
		bufferingCircle.setAttribute('stroke-linecap', 'round');
		bufferingCircle.setAttribute('stroke-dasharray', '31.416');
		bufferingCircle.setAttribute('stroke-dashoffset', '31.416');

		// Create animations
		const dashArrayAnim = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
		dashArrayAnim.setAttribute('attributeName', 'stroke-dasharray');
		dashArrayAnim.setAttribute('dur', '2s');
		dashArrayAnim.setAttribute('values', '0 31.416;15.708 15.708;0 31.416');
		dashArrayAnim.setAttribute('repeatCount', 'indefinite');
		bufferingCircle.appendChild(dashArrayAnim);

		const dashOffsetAnim = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
		dashOffsetAnim.setAttribute('attributeName', 'stroke-dashoffset');
		dashOffsetAnim.setAttribute('dur', '2s');
		dashOffsetAnim.setAttribute('values', '0;-15.708;-31.416');
		dashOffsetAnim.setAttribute('repeatCount', 'indefinite');
		bufferingCircle.appendChild(dashOffsetAnim);

		playlistSpinner.appendChild(bufferingCircle);

		const spinnerContainer = document.createElement('div');
		spinnerContainer.className = 'yt-playlist-spinner';
		spinnerContainer.appendChild(playlistSpinner);

		const reloadContainer = document.createElement('div');
		reloadContainer.className = 'yt-playlist-reload-container';
		const reloadLink = document.createElement('button');
		reloadLink.textContent = 'Reload playlist';
		reloadContainer.appendChild(reloadLink);
		spinnerContainer.appendChild(reloadContainer);

		playerDrawer.appendChild(spinnerContainer);

		fragment.appendChild(playerDrawer);

		return fragment;
	}

	/**
	 * Create button elements using DOM APIs
	 */
	_createPreviousButton() {
		const button = document.createElement('button');
		button.className = 'yt-control-button yt-prev-button previous';

		// Create previous icon SVG
		const previousSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		previousSvg.setAttribute('class', 'icon previous');
		previousSvg.setAttribute('viewBox', '0 0 24 24');
		const previousPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		previousPath.setAttribute('d', 'M6 6h2v12H6zm3.5 6l8.5 6V6z');
		previousSvg.appendChild(previousPath);
		button.appendChild(previousSvg);

		// Create restart icon SVG
		const restartSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		restartSvg.setAttribute('class', 'icon restart');
		restartSvg.setAttribute('viewBox', '0 0 24 24');
		const restartPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		restartPath.setAttribute(
			'd',
			'M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6s-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8S16.42 4 12 4z'
		);
		restartSvg.appendChild(restartPath);
		button.appendChild(restartSvg);

		return button;
	}

	_createPlayButton() {
		const button = document.createElement('button');
		button.className = 'yt-control-button yt-play-button paused';

		// Create paused icon SVG
		const pausedSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		pausedSvg.setAttribute('class', 'icon paused');
		pausedSvg.setAttribute('viewBox', '0 0 24 24');
		const pausedPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		pausedPath.setAttribute('d', 'M8 5v14l11-7z');
		pausedSvg.appendChild(pausedPath);
		button.appendChild(pausedSvg);

		// Create playing icon SVG
		const playingSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		playingSvg.setAttribute('class', 'icon playing');
		playingSvg.setAttribute('viewBox', '0 0 24 24');
		const playingPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		playingPath.setAttribute('d', 'M6 19h4V5H6v14zm8-14v14h4V5h-4z');
		playingSvg.appendChild(playingPath);
		button.appendChild(playingSvg);

		// Create buffering icon SVG with animation
		const bufferingSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		bufferingSvg.setAttribute('class', 'icon buffering');
		bufferingSvg.setAttribute('viewBox', '0 0 24 24');
		const bufferingCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
		bufferingCircle.setAttribute('cx', '12');
		bufferingCircle.setAttribute('cy', '12');
		bufferingCircle.setAttribute('r', '10');
		bufferingCircle.setAttribute('fill', 'none');
		bufferingCircle.setAttribute('stroke', 'currentColor');
		bufferingCircle.setAttribute('stroke-width', '2');
		bufferingCircle.setAttribute('stroke-linecap', 'round');
		bufferingCircle.setAttribute('stroke-dasharray', '31.416');
		bufferingCircle.setAttribute('stroke-dashoffset', '31.416');

		// Create animations
		const dashArrayAnim = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
		dashArrayAnim.setAttribute('attributeName', 'stroke-dasharray');
		dashArrayAnim.setAttribute('dur', '2s');
		dashArrayAnim.setAttribute('values', '0 31.416;15.708 15.708;0 31.416');
		dashArrayAnim.setAttribute('repeatCount', 'indefinite');
		bufferingCircle.appendChild(dashArrayAnim);

		const dashOffsetAnim = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
		dashOffsetAnim.setAttribute('attributeName', 'stroke-dashoffset');
		dashOffsetAnim.setAttribute('dur', '2s');
		dashOffsetAnim.setAttribute('values', '0;-15.708;-31.416');
		dashOffsetAnim.setAttribute('repeatCount', 'indefinite');
		bufferingCircle.appendChild(dashOffsetAnim);

		bufferingSvg.appendChild(bufferingCircle);
		button.appendChild(bufferingSvg);

		return button;
	}

	_createSkipButton() {
		const button = document.createElement('button');
		button.className = 'yt-control-button yt-skip-button';

		// Create skip icon SVG
		const skipSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		skipSvg.setAttribute('class', 'icon default');
		skipSvg.setAttribute('viewBox', '0 0 24 24');
		const skipPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		skipPath.setAttribute('d', 'M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z');
		skipSvg.appendChild(skipPath);
		button.appendChild(skipSvg);

		return button;
	}

	_createVoiceButton() {
		const button = document.createElement('button');
		button.className = 'yt-voice-search-button normal';

		// Create voice icon SVG
		const voiceSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		voiceSvg.setAttribute('class', 'icon default');
		voiceSvg.setAttribute('viewBox', '0 0 24 24');
		voiceSvg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
		voiceSvg.setAttribute('focusable', 'false');

		// Create group element
		const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');

		// Create first path (microphone)
		const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		path1.setAttribute(
			'd',
			'M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z'
		);
		group.appendChild(path1);

		// Create second path (stand)
		const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		path2.setAttribute(
			'd',
			'M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z'
		);
		group.appendChild(path2);

		voiceSvg.appendChild(group);
		button.appendChild(voiceSvg);

		return button;
	}

	_createRepeatButton() {
		const button = document.createElement('button');
		button.className = 'yt-repeat-button off';

		// Create repeat off icon SVG
		const repeatOffSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		repeatOffSvg.setAttribute('class', 'icon repeat-off');
		repeatOffSvg.setAttribute('viewBox', '0 0 24 24');
		const repeatOffPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		repeatOffPath.setAttribute(
			'd',
			'M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z'
		);
		repeatOffSvg.appendChild(repeatOffPath);
		button.appendChild(repeatOffSvg);

		// Create repeat on icon SVG
		const repeatOnSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		repeatOnSvg.setAttribute('class', 'icon repeat-on');
		repeatOnSvg.setAttribute('viewBox', '0 0 24 24');
		const repeatOnPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		repeatOnPath.setAttribute(
			'd',
			'M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4H13z'
		);
		repeatOnSvg.appendChild(repeatOnPath);
		button.appendChild(repeatOnSvg);

		return button;
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
		this.videoTitleElement = this.playerWrapper.querySelector('.yt-video-title-text');
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
		this.repeatButton = this.playerWrapper.querySelector('.yt-repeat-button');

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

		// Button visibility
		if (!this.options.showPreviousButton) {
			this.playerWrapper.classList.add('hide-prev-button');
		}
		if (!this.options.showSkipButton) {
			this.playerWrapper.classList.add('hide-skip-button');
		}

		// Repeat button visibility
		if (this.options.showRepeatButton === 'disabled') {
			this.playerWrapper.classList.add('hide-repeat-button');
		} else if (this.options.showRepeatButton === 'show-when-active') {
			this.playerWrapper.classList.add('hide-repeat-button-when-inactive');
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

		// Set initial repeat button state
		this.setRepeatButtonState(false);

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
		const hasItems = !!this.options.currentPlaylist?.items;
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
	 * Check if target is an interactive UI element that should not trigger gestures
	 */
	_isInteractiveElement(target) {
		// Check for buttons and interactive elements
		if (target.tagName === 'BUTTON' || target.closest('button')) {
			return true;
		}

		// Check for specific interactive classes
		const interactiveSelectors = [
			'.yt-playlist-restore-all-button',
			'.yt-player-control-button',
			'.yt-seekbar-handle',
			'.yt-seekbar-background',
			'.yt-drawer-close-button',
			'[data-action]',
		];

		for (const selector of interactiveSelectors) {
			if (target.matches && target.matches(selector)) {
				return true;
			}
			if (target.closest && target.closest(selector)) {
				return true;
			}
		}

		return false;
	}

	/**
	 * GESTURE HANDLERS
	 */
	_handleTouchStart(event) {
		// Block all gesture processing when context menu is open
		if (this.contextMenu && this.contextMenu.style.display === 'block') {
			this.isSwipeGestureActive = false;
			return;
		}

		// Don't process gestures on interactive UI elements
		if (this._isInteractiveElement(event.target)) {
			this.isSwipeGestureActive = false;
			return;
		}

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
		// Block all gesture processing when context menu is open
		if (this.contextMenu && this.contextMenu.style.display === 'block') {
			return;
		}

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
		// Block all gesture processing when context menu is open
		if (this.contextMenu && this.contextMenu.style.display === 'block') {
			this.isSwipeGestureActive = false;
			return;
		}

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
			// Clear any active playlist item long press timer when gesture is detected
			if (this.longPressTimer) {
				clearTimeout(this.longPressTimer);
				this.longPressTimer = null;
			}
			if (this.playlistItemTouchStart) {
				this.playlistItemTouchStart = null;
			}

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
			restartPreviousVideo: () => this.options.callbacks.onGestureSmartPrevious?.(),
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

		const iconSVG = this._createGestureIconSVG(actionName);
		if (!iconSVG) return;

		// Clear existing content and append DOM element
		this.gestureFeedbackOverlay.textContent = '';
		this.gestureFeedbackOverlay.appendChild(iconSVG);
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
	_createGestureIconSVG(actionName) {
		const iconPaths = {
			restartCurrentVideo:
				'M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6s-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8S16.42 4 12 4z',
			restartPreviousVideo: 'M6 6h2v12H6zm3.5 6l8.5 6V6z',
			previousVideoOnly: 'M6 6h2v12H6zm3.5 6l8.5 6V6z',
			nextVideo: 'M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z',
			playPause: this.playButton?.classList.contains('paused')
				? 'M8 5v14l11-7z'
				: 'M6 19h4V5H6v14zm8-14v14h4V5h-4z',
			toggleVoiceSearch: [
				'M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z',
				'M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z',
			],
			togglePlaylist:
				'M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zm0-10v2h14V7H7z',
		};

		const pathData = iconPaths[actionName];
		if (!pathData) return null;

		// Create SVG element using DOM methods
		const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		svg.setAttribute('width', '64');
		svg.setAttribute('height', '64');
		svg.setAttribute('viewBox', '0 0 24 24');
		svg.style.fill = 'currentColor';

		if (Array.isArray(pathData)) {
			// For icons with multiple paths (like toggleVoiceSearch)
			const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
			pathData.forEach((d) => {
				const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
				path.setAttribute('d', d);
				g.appendChild(path);
			});
			svg.appendChild(g);
		} else {
			// For icons with single path
			const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
			path.setAttribute('d', pathData);
			svg.appendChild(path);
		}

		return svg;
	}

	/**
	 * PLAYLIST HANDLERS
	 */
	_handlePlaylistScroll() {
		if (
			this.programmaticScrollInProgress ||
			!this.options.keepPlaylistFocused ||
			!this.hasPlaylist ||
			!this.playlistWrapper ||
			this._isContextMenuOpen()
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
		if (
			!this.options.keepPlaylistFocused ||
			!this.hasPlaylist ||
			!this.playlistWrapper ||
			this._isContextMenuOpen()
		) {
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
	 * Check if the context menu is currently open
	 * @returns {boolean} True if context menu is visible
	 */
	_isContextMenuOpen() {
		return this.contextMenu && this.contextMenu.style.display === 'flex' && this.contextMenu.classList.contains('visible');
	}

	/**
	 * Resume auto-scroll if context menu is closed
	 */
	_resumeAutoScrollIfNeeded() {
		// Only resume if context menu is closed and keepPlaylistFocused is enabled
		if (!this._isContextMenuOpen() && this.options.keepPlaylistFocused) {
			// Start the auto-scroll timer to focus on the current item
			this._performAutoScrollFocus();
		}
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
		// Restore all button listener
		const restoreBtn = this.playerWrapper.querySelector('.yt-playlist-restore-all-button');
		if (restoreBtn) {
			restoreBtn.addEventListener('click', (e) => {
				e.stopPropagation();
				this._restoreAllFromMix();
			});

			// Add touch support for better mobile interaction
			restoreBtn.addEventListener(
				'touchend',
				(e) => {
					e.preventDefault();
					e.stopPropagation();
					this._restoreAllFromMix();
				},
				{ passive: false }
			);
		}
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

		if (this.repeatButton) {
			this.repeatButton.addEventListener('click', () => {
				if (!this.isPlayerVisible) return;

				const isCurrentlyOn = this.repeatButton.classList.contains('on');
				const newState = isCurrentlyOn ? 'off' : 'on';

				this.repeatButton.classList.remove('on', 'off');
				this.repeatButton.classList.add(newState);

				this.options.callbacks.onRepeatClick?.(newState === 'on');
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
					this.options.callbacks.onPlaylistItemClick?.(itemId, true);
				}
			});

			this.playlistWrapper.addEventListener('scroll', this._handlePlaylistScroll_bound, {
				passive: true,
			});
		}

		const reloadLink = this.playerWrapper.querySelector('.yt-playlist-reload-container button');
		if (reloadLink) {
			reloadLink.addEventListener('click', (e) => {
				e.preventDefault();
				this.options.callbacks.onReloadPlaylistClick();
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
			const restartThreshold = window.userSettings.smartPreviousThreshold || 5;
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

	_createPlaylistItem(item, isActive) {
		const longPressDuration = 750; // ms

		const thumb =
			item.thumbnailUrl ||
			(typeof browser !== 'undefined' ? browser : chrome).runtime.getURL(
				'/assets/default_thumb.png'
			);

		// Create main container
		const container = document.createElement('div');
		container.className = `yt-playlist-item${isActive ? ' active' : ''}`;
		if (item.id) {
			container.setAttribute('data-item-id', item.id);
		}

		// Long press and context menu handling
		container.addEventListener('contextmenu', (e) => {
			e.preventDefault();
			this._showContextMenu(e.clientX, e.clientY, item.id);
		});

		container.addEventListener('touchstart', (e) => {
			this.playlistItemTouchStart = {
				x: e.touches[0].clientX,
				y: e.touches[0].clientY,
				time: Date.now(),
			};
			this.longPressTimer = setTimeout(() => {
				// Only show context menu if no significant movement occurred
				if (this.playlistItemTouchStart) {
					this._showContextMenu(e.touches[0].clientX, e.touches[0].clientY, item.id);
				}
			}, longPressDuration);
		});

		container.addEventListener('touchend', () => {
			clearTimeout(this.longPressTimer);
			this.playlistItemTouchStart = null;
		});

		container.addEventListener('touchmove', (e) => {
			if (this.playlistItemTouchStart) {
				const deltaX = Math.abs(e.touches[0].clientX - this.playlistItemTouchStart.x);
				const deltaY = Math.abs(e.touches[0].clientY - this.playlistItemTouchStart.y);

				// Cancel long press if movement exceeds threshold (gesture detected)
				if (deltaX > 15 || deltaY > 15) {
					clearTimeout(this.longPressTimer);
					this.playlistItemTouchStart = null;
				}
			}
		});

		// Create thumbnail
		const thumbnail = document.createElement('div');
		thumbnail.className = 'yt-playlist-item-thumbnail';
		thumbnail.style.backgroundImage = `url('${thumb}')`;
		container.appendChild(thumbnail);

		// Create info container
		const info = document.createElement('div');
		info.className = 'yt-playlist-item-info';

		// Create title
		const title = document.createElement('h3');
		title.className = 'yt-playlist-item-title';
		const titleText = item.title || 'Unknown Title';
		title.textContent = titleText;
		title.setAttribute('title', titleText);
		info.appendChild(title);

		// Create artist
		const artist = document.createElement('p');
		artist.className = 'yt-playlist-item-artist';
		const artistText = item.artist || 'Unknown Artist';
		artist.textContent = artistText;
		artist.setAttribute('title', artistText);
		info.appendChild(artist);

		container.appendChild(info);

		// Create duration
		const duration = document.createElement('span');
		duration.className = 'yt-playlist-item-duration';
		duration.textContent = item.duration || '0:00';
		container.appendChild(duration);

		// Create play-next indicator icon (hidden by default)
		const playNextIcon = document.createElement('div');
		playNextIcon.className = 'play-next-indicator';

		// Create SVG play icon
		const playSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		playSvg.setAttribute('viewBox', '0 0 24 24');
		playSvg.setAttribute('width', '12');
		playSvg.setAttribute('height', '12');
		playSvg.style.fill = 'currentColor';

		const playPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		playPath.setAttribute('d', 'M8 5v14l11-7z');
		playSvg.appendChild(playPath);
		playNextIcon.appendChild(playSvg);

		container.appendChild(playNextIcon);

		// Create repeat-current indicator icon (hidden by default)
		const repeatIcon = document.createElement('div');
		repeatIcon.className = 'repeat-current-indicator';

		// Create SVG repeat icon
		const repeatSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		repeatSvg.setAttribute('viewBox', '0 0 24 24');
		repeatSvg.setAttribute('width', '12');
		repeatSvg.setAttribute('height', '12');
		repeatSvg.style.fill = 'currentColor';

		const repeatPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		repeatPath.setAttribute(
			'd',
			'M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z'
		);
		repeatSvg.appendChild(repeatPath);
		repeatIcon.appendChild(repeatSvg);

		container.appendChild(repeatIcon);

		return container;
	}

	_createContextMenu() {
		// Create modal overlay
		const overlay = document.createElement('div');
		overlay.className = 'yt-context-menu-overlay';
		overlay.addEventListener('click', (e) => {
			if (e.target === overlay) {
				this._hideContextMenu();
			}
		});

		// Create modal container
		const modal = document.createElement('div');
		modal.className = 'yt-context-menu-modal';
		modal.addEventListener('click', (e) => e.stopPropagation());

		// Create header
		const header = document.createElement('div');
		header.className = 'yt-context-menu-header';

		// Thumbnail
		const thumbnail = document.createElement('div');
		thumbnail.className = 'yt-context-menu-thumbnail';
		header.appendChild(thumbnail);

		// Video info container
		const videoInfo = document.createElement('div');
		videoInfo.className = 'yt-context-menu-video-info';

		// Title
		const title = document.createElement('div');
		title.className = 'yt-context-menu-title';
		videoInfo.appendChild(title);

		// Author
		const author = document.createElement('div');
		author.className = 'yt-context-menu-author';
		videoInfo.appendChild(author);

		header.appendChild(videoInfo);
		modal.appendChild(header);

		// Create content area
		const content = document.createElement('div');
		content.className = 'yt-context-menu-content';

		// Play Next option
		const playNextOption = document.createElement('div');
		playNextOption.className = 'yt-context-menu-option';

		const playNextIcon = document.createElement('div');
		playNextIcon.className = 'yt-context-menu-option-icon';
		const playNextSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		playNextSvg.setAttribute('viewBox', '0 0 24 24');
		const playNextPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		playNextPath.setAttribute('d', 'M8 5v14l11-7z');
		playNextSvg.appendChild(playNextPath);
		playNextIcon.appendChild(playNextSvg);

		const playNextText = document.createElement('div');
		playNextText.className = 'yt-context-menu-option-text';
		playNextText.textContent = 'Play next';

		playNextOption.appendChild(playNextIcon);
		playNextOption.appendChild(playNextText);
		playNextOption.addEventListener('click', () => {
			this._setPlayNext(this.contextMenuVideoId);
			this._hideContextMenu();
		});
		content.appendChild(playNextOption);

		// Repeat Current Video option
		const repeatOption = document.createElement('div');
		repeatOption.className = 'yt-context-menu-option separator';

		const repeatIcon = document.createElement('div');
		repeatIcon.className = 'yt-context-menu-option-icon';
		const repeatSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		repeatSvg.setAttribute('viewBox', '0 0 24 24');
		const repeatPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		repeatPath.setAttribute(
			'd',
			'M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z'
		);
		repeatSvg.appendChild(repeatPath);
		repeatIcon.appendChild(repeatSvg);

		const repeatText = document.createElement('div');
		repeatText.className = 'yt-context-menu-option-text';
		repeatText.textContent = 'Play this on repeat';

		repeatOption.appendChild(repeatIcon);
		repeatOption.appendChild(repeatText);
		repeatOption.addEventListener('click', () => {
			this._setRepeatCurrent(this.contextMenuVideoId);
			this._hideContextMenu();
		});
		content.appendChild(repeatOption);

		// Remove from mix option
		const removeOption = document.createElement('div');
		removeOption.className = 'yt-context-menu-option';

		const removeIcon = document.createElement('div');
		removeIcon.className = 'yt-context-menu-option-icon';
		const removeSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		removeSvg.setAttribute('viewBox', '0 0 24 24');
		const removePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		removePath.setAttribute(
			'd',
			'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z'
		);
		removeSvg.appendChild(removePath);
		removeIcon.appendChild(removeSvg);

		const removeText = document.createElement('div');
		removeText.className = 'yt-context-menu-option-text';
		removeText.textContent = 'Remove from this mix';

		removeOption.appendChild(removeIcon);
		removeOption.appendChild(removeText);
		removeOption.addEventListener('click', () => {
			this._removeFromMix(this.contextMenuVideoId);
			this._hideContextMenu();
		});
		content.appendChild(removeOption);

		// Blacklist option
		const blacklistOption = document.createElement('div');
		blacklistOption.className = 'yt-context-menu-option separator';

		const blacklistIcon = document.createElement('div');
		blacklistIcon.className = 'yt-context-menu-option-icon';
		const blacklistSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		blacklistSvg.setAttribute('viewBox', '0 0 24 24');
		const blacklistPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		blacklistPath.setAttribute(
			'd',
			'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12c0-4.42 3.58-8 8-8 1.85 0 3.55.63 4.9 1.69L5.69 16.9C4.63 15.55 4 13.85 4 12zm8 8c-1.85 0-3.55-.63-4.9-1.69L18.31 7.1C19.37 8.45 20 10.15 20 12c0 4.42-3.58 8-8 8z'
		);
		blacklistSvg.appendChild(blacklistPath);
		blacklistIcon.appendChild(blacklistSvg);

		const blacklistText = document.createElement('div');
		blacklistText.className = 'yt-context-menu-option-text';
		blacklistText.textContent = 'Blacklist this video';

		blacklistOption.appendChild(blacklistIcon);
		blacklistOption.appendChild(blacklistText);
		blacklistOption.addEventListener('click', () => {
			this._blacklistVideo(this.contextMenuVideoId);
			this._hideContextMenu();
		});
		content.appendChild(blacklistOption);

		// Show Details option
		const detailsOption = document.createElement('div');
		detailsOption.className = 'yt-context-menu-option';

		const detailsIcon = document.createElement('div');
		detailsIcon.className = 'yt-context-menu-option-icon';
		const detailsSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		detailsSvg.setAttribute('viewBox', '0 0 24 24');
		const detailsPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		detailsPath.setAttribute(
			'd',
			'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z'
		);
		detailsSvg.appendChild(detailsPath);
		detailsIcon.appendChild(detailsSvg);

		const detailsText = document.createElement('div');
		detailsText.className = 'yt-context-menu-option-text';
		detailsText.textContent = 'Show details';

		detailsOption.appendChild(detailsIcon);
		detailsOption.appendChild(detailsText);
		detailsOption.addEventListener('click', () => {
			this._showDetailsInContextMenu();
		});
		content.appendChild(detailsOption);

		modal.appendChild(content);
		overlay.appendChild(modal);

		return overlay;
	}

	_showContextMenu(x, y, videoId) {
		// First hide any existing context menu to clean up previous state
		if (this.contextMenu && this.contextMenu.style.display === 'block') {
			this._hideContextMenu();
		}

		if (!this.contextMenu) {
			this.contextMenu = this._createContextMenu();
			document.body.appendChild(this.contextMenu);
		} else {
			// Reset to main menu content when reopening
			this._resetContextMenuToMain();
		}

		this.contextMenuVideoId = videoId;

		// Find video data from playlist
		const videoData = this.options.currentPlaylist?.items?.find((item) => item.id === videoId);
		if (videoData) {
			// Update header with video info
			const thumbnail = this.contextMenu.querySelector('.yt-context-menu-thumbnail');
			const title = this.contextMenu.querySelector('.yt-context-menu-title');
			const author = this.contextMenu.querySelector('.yt-context-menu-author');

			// Set thumbnail using the utility function
			const thumbnailUrl =
				MediaUtils.getStandardThumbnailUrl(videoId) || videoData.thumbnailUrl;
			if (thumbnailUrl) {
				thumbnail.style.backgroundImage = `url('${thumbnailUrl}')`;
			}

			// Set title and author
			title.textContent = videoData.title || 'Unknown Title';
			author.textContent = videoData.artist || 'Unknown Artist';
		}

		// Show modal
		this.contextMenu.style.display = 'flex';
		setTimeout(() => {
			this.contextMenu.classList.add('visible');
		}, 10);

		// Add context menu active class to the playlist item
		const playlistItem = this.playlistWrapper?.querySelector(`[data-item-id="${videoId}"]`);
		if (playlistItem) {
			playlistItem.classList.add('context-menu-active');
		}

		// Add click listener to close menu when clicking outside
		document.addEventListener('click', this._hideContextMenu_bound, true);
	}

	_hideContextMenu(event) {
		// If called from an event and the click is inside the context menu, don't close it
		if (event && this.contextMenu && this.contextMenu.contains(event.target)) {
			return;
		}

		// Remove context menu active class from the playlist item
		if (this.contextMenuVideoId) {
			const playlistItem = this.playlistWrapper?.querySelector(
				`[data-item-id="${this.contextMenuVideoId}"]`
			);
			if (playlistItem) {
				playlistItem.classList.remove('context-menu-active');
			}
		}

		if (this.contextMenu) {
			// Animate out
			this.contextMenu.classList.remove('visible');
			setTimeout(() => {
				this.contextMenu.style.display = 'none';
				// Resume auto-scroll after context menu is fully closed
				this._resumeAutoScrollIfNeeded();
			}, 200);
		}
		document.removeEventListener('click', this._hideContextMenu_bound, true);
	}

	/**
	 * Show a detailed dialog with all video information
	 * @param {string} videoId - The video ID to show details for
	 */
	/**
	 * Reset context menu to main menu content
	 */
	_resetContextMenuToMain() {
		if (!this.contextMenu) return;

		// Get the content area
		const content = this.contextMenu.querySelector('.yt-context-menu-content');
		if (!content) return;

		// Clear existing content
		content.innerHTML = '';

		// Recreate the main menu options
		// Play Next option
		const playNextOption = document.createElement('div');
		playNextOption.className = 'yt-context-menu-option';

		const playNextIcon = document.createElement('div');
		playNextIcon.className = 'yt-context-menu-option-icon';
		const playNextSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		playNextSvg.setAttribute('viewBox', '0 0 24 24');
		const playNextPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		playNextPath.setAttribute('d', 'M8 5v14l11-7z');
		playNextSvg.appendChild(playNextPath);
		playNextIcon.appendChild(playNextSvg);

		const playNextText = document.createElement('div');
		playNextText.className = 'yt-context-menu-option-text';
		playNextText.textContent = 'Play next';

		playNextOption.appendChild(playNextIcon);
		playNextOption.appendChild(playNextText);
		playNextOption.addEventListener('click', () => {
			this._setPlayNext(this.contextMenuVideoId);
			this._hideContextMenu();
		});
		content.appendChild(playNextOption);

		// Repeat Current Video option
		const repeatOption = document.createElement('div');
		repeatOption.className = 'yt-context-menu-option separator';

		const repeatIcon = document.createElement('div');
		repeatIcon.className = 'yt-context-menu-option-icon';
		const repeatSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		repeatSvg.setAttribute('viewBox', '0 0 24 24');
		const repeatPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		repeatPath.setAttribute(
			'd',
			'M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z'
		);
		repeatSvg.appendChild(repeatPath);
		repeatIcon.appendChild(repeatSvg);

		const repeatText = document.createElement('div');
		repeatText.className = 'yt-context-menu-option-text';
		repeatText.textContent = 'Play this on repeat';

		repeatOption.appendChild(repeatIcon);
		repeatOption.appendChild(repeatText);
		repeatOption.addEventListener('click', () => {
			this._setRepeatCurrent(this.contextMenuVideoId);
			this._hideContextMenu();
		});
		content.appendChild(repeatOption);

		// Remove from mix option
		const removeOption = document.createElement('div');
		removeOption.className = 'yt-context-menu-option';

		const removeIcon = document.createElement('div');
		removeIcon.className = 'yt-context-menu-option-icon';
		const removeSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		removeSvg.setAttribute('viewBox', '0 0 24 24');
		const removePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		removePath.setAttribute(
			'd',
			'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z'
		);
		removeSvg.appendChild(removePath);
		removeIcon.appendChild(removeSvg);

		const removeText = document.createElement('div');
		removeText.className = 'yt-context-menu-option-text';
		removeText.textContent = 'Remove from this mix';

		removeOption.appendChild(removeIcon);
		removeOption.appendChild(removeText);
		removeOption.addEventListener('click', () => {
			this._removeFromMix(this.contextMenuVideoId);
			this._hideContextMenu();
		});
		content.appendChild(removeOption);

		// Blacklist option
		const blacklistOption = document.createElement('div');
		blacklistOption.className = 'yt-context-menu-option separator';

		const blacklistIcon = document.createElement('div');
		blacklistIcon.className = 'yt-context-menu-option-icon';
		const blacklistSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		blacklistSvg.setAttribute('viewBox', '0 0 24 24');
		const blacklistPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		blacklistPath.setAttribute(
			'd',
			'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12c0-4.42 3.58-8 8-8 1.85 0 3.55.63 4.9 1.69L5.69 16.9C4.63 15.55 4 13.85 4 12zm8 8c-1.85 0-3.55-.63-4.9-1.69L18.31 7.1C19.37 8.45 20 10.15 20 12c0 4.42-3.58 8-8 8z'
		);
		blacklistSvg.appendChild(blacklistPath);
		blacklistIcon.appendChild(blacklistSvg);

		const blacklistText = document.createElement('div');
		blacklistText.className = 'yt-context-menu-option-text';
		blacklistText.textContent = 'Blacklist this video';

		blacklistOption.appendChild(blacklistIcon);
		blacklistOption.appendChild(blacklistText);
		blacklistOption.addEventListener('click', () => {
			this._blacklistVideo(this.contextMenuVideoId);
			this._hideContextMenu();
		});
		content.appendChild(blacklistOption);

		// Show Details option
		const detailsOption = document.createElement('div');
		detailsOption.className = 'yt-context-menu-option';

		const detailsIcon = document.createElement('div');
		detailsIcon.className = 'yt-context-menu-option-icon';
		const detailsSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		detailsSvg.setAttribute('viewBox', '0 0 24 24');
		const detailsPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		detailsPath.setAttribute(
			'd',
			'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z'
		);
		detailsSvg.appendChild(detailsPath);
		detailsIcon.appendChild(detailsSvg);

		const detailsText = document.createElement('div');
		detailsText.className = 'yt-context-menu-option-text';
		detailsText.textContent = 'Show details';

		detailsOption.appendChild(detailsIcon);
		detailsOption.appendChild(detailsText);
		detailsOption.addEventListener('click', () => {
			this._showDetailsInContextMenu();
		});
		content.appendChild(detailsOption);
	}

	/**
	 * Show details within the context menu
	 */
	_showDetailsInContextMenu() {
		// Find video data from playlist
		const videoData = this.options.currentPlaylist?.items?.find((item) => item.id === this.contextMenuVideoId);
		if (!videoData) {
			console.warn('Video data not found for ID:', this.contextMenuVideoId);
			return;
		}

		// Get the existing context menu modal
		const modal = document.querySelector('.yt-context-menu-modal');
		if (!modal) return;

		// Clear existing content
		const content = modal.querySelector('.yt-context-menu-content');
		if (!content) return;
		content.innerHTML = '';

		// Create back button
		const backOption = document.createElement('div');
		backOption.className = 'yt-context-menu-option';

		const backIcon = document.createElement('div');
		backIcon.className = 'yt-context-menu-option-icon';
		const backSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		backSvg.setAttribute('viewBox', '0 0 24 24');
		const backPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		backPath.setAttribute('d', 'M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z');
		backSvg.appendChild(backPath);
		backIcon.appendChild(backSvg);

		const backText = document.createElement('div');
		backText.className = 'yt-context-menu-option-text';
		backText.textContent = 'Back to menu';

		backOption.appendChild(backIcon);
		backOption.appendChild(backText);
		backOption.addEventListener('click', () => {
			this._resetContextMenuToMain();
		});
		content.appendChild(backOption);

		// Add separator
		const separator = document.createElement('div');
		separator.className = 'yt-context-menu-separator';
		content.appendChild(separator);

		// Create details content
		const detailsContainer = document.createElement('div');
		detailsContainer.className = 'yt-context-menu-details';

		// Basic details
		const basicDetails = [
			{ label: 'Title', value: videoData.title || 'Unknown Title' },
			{ label: 'Artist', value: videoData.artist || 'Unknown Artist' },
			{ label: 'Duration', value: videoData.duration || '0:00' },
			{ label: 'Video ID', value: videoData.id || 'Unknown' }
		];

		basicDetails.forEach(detail => {
			const row = document.createElement('div');
			row.className = 'yt-context-menu-detail-row';

			const label = document.createElement('div');
			label.className = 'yt-context-menu-detail-label';
			label.textContent = detail.label + ':';

			const value = document.createElement('div');
			value.className = 'yt-context-menu-detail-value';
			value.textContent = detail.value;

			row.appendChild(label);
			row.appendChild(value);
			detailsContainer.appendChild(row);
		});

		// Add parsed metadata if available
		if (videoData.parsedMetadata) {
			const metadata = videoData.parsedMetadata;
			
			// Add separator for parsed metadata
			const parsedSeparator = document.createElement('div');
			parsedSeparator.className = 'yt-context-menu-detail-separator';
			detailsContainer.appendChild(parsedSeparator);
			
			const parsedDetails = [
				{ label: 'Parsed Track', value: metadata.track || 'N/A' },
				{ label: 'Parsed Artist', value: metadata.artist || 'N/A' },
				{ label: 'Featuring', value: metadata.featuring || 'None' },
				{ label: 'Original Title', value: metadata.originalTitle || 'N/A' },
				{ label: 'Original Channel', value: metadata.originalChannel || 'N/A' },
				{ label: 'Parsed', value: metadata.parsed ? 'Yes' : 'No' },
				{ label: 'Parse Method', value: metadata.parseMethod || 'N/A' },
				{ label: 'Parse Confidence', value: metadata.parseConfidence || 'N/A' }
			];
			
			parsedDetails.forEach(detail => {
				const row = document.createElement('div');
				row.className = 'yt-context-menu-detail-row yt-context-menu-detail-parsed';

				const label = document.createElement('div');
				label.className = 'yt-context-menu-detail-label';
				label.textContent = detail.label + ':';

				const value = document.createElement('div');
				value.className = 'yt-context-menu-detail-value';
				value.textContent = detail.value;

				row.appendChild(label);
				row.appendChild(value);
				detailsContainer.appendChild(row);
			});
		}

		content.appendChild(detailsContainer);
	}

	async _removeFromMix(videoId) {
		const listId = this.options.currentPlaylist.listId;
		if (!listId) {
			logger.error('Playlist', 'Cannot remove from mix, no listId is set.');
			return;
		}

		const settings = window.userSettings;
		if (!settings.removedFromMix) {
			settings.removedFromMix = {};
		}
		if (!settings.removedFromMix[listId]) {
			settings.removedFromMix[listId] = [];
		}

		if (!settings.removedFromMix[listId].includes(videoId)) {
			settings.removedFromMix[listId].push(videoId);
			await window.saveUserSetting('removedFromMix', settings.removedFromMix);
		}

		this.updatePlaylist(this.options.currentPlaylist.items);

		if (this.options.callbacks.onPlaylistItemRemoved) {
			this.options.callbacks.onPlaylistItemRemoved(videoId);
		}
	}

	async _blacklistVideo(videoId) {
		// Find the video title from current playlist items
		let videoTitle = 'Unknown Title';
		if (this.options.currentPlaylist?.items) {
			const item = this.options.currentPlaylist.items.find((item) => item.id === videoId);
			if (item && item.title) {
				videoTitle = item.title;
			}
		}

		// Show confirmation dialog
		const confirmed = confirm(
			`Are you sure you want to blacklist "${videoTitle}"?\n\nThis will hide and prevent it from playing in all playlists.`
		);

		if (!confirmed) {
			return; // User cancelled, don't proceed with blacklisting
		}

		// Handle both old format (array of strings) and new format (array of objects)
		const currentBlacklist = window.userSettings.videoBlacklist || [];
		let newBlacklist;

		// Check if we're dealing with old format (strings) or new format (objects)
		if (currentBlacklist.length === 0 || typeof currentBlacklist[0] === 'string') {
			// Convert old format to new format and add new item
			newBlacklist = currentBlacklist
				.filter((item) => typeof item === 'string' && item !== videoId) // Remove duplicates from old format
				.map((id) => ({ id, title: 'Blacklisted Video' })); // Convert old entries
			newBlacklist.push({ id: videoId, title: videoTitle });
		} else {
			// Already new format, just add if not exists
			newBlacklist = currentBlacklist.filter((item) => item.id !== videoId);
			newBlacklist.push({ id: videoId, title: videoTitle });
		}

		await window.saveUserSetting('videoBlacklist', newBlacklist);
		this.updatePlaylist(this.options.currentPlaylist.items);

		if (this.options.callbacks.onPlaylistItemRemoved) {
			this.options.callbacks.onPlaylistItemRemoved(videoId);
		}
	}

	/**
	 * Set a video as "Play Next"
	 */
	_setPlayNext(videoId, repeats = false) {
		// Remove previous "next up" indicator
		this._clearPlayNextIndicator();

		// Set the new next video ID
		this.nextUpVideoId = videoId;

		// Add visual indicator to the selected item
		this._addPlayNextIndicator(videoId, repeats);

		// Trigger callback to content.js
		if (this.options.callbacks.onPlayNextSet) {
			this.options.callbacks.onPlayNextSet(videoId, repeats);
		}
	}

	/**
	 * Clear the "Play Next" indicator from all playlist items
	 */
	_clearPlayNextIndicator() {
		if (!this.playlistWrapper) return;

		const previousPlayNextItem = this.playlistWrapper.querySelector(
			'.yt-playlist-item.play-next'
		);
		if (previousPlayNextItem) {
			previousPlayNextItem.classList.remove('play-next');
		}

		const previousRepeatItem = this.playlistWrapper.querySelector(
			'.yt-playlist-item.repeat-current'
		);
		if (previousRepeatItem) {
			previousRepeatItem.classList.remove('repeat-current');
		}
	}

	/**
	 * Add "Play Next" indicator to a specific playlist item
	 */
	_addPlayNextIndicator(videoId, isRepeat = false) {
		if (!this.playlistWrapper) return;

		const playlistItem = this.playlistWrapper.querySelector(`[data-item-id="${videoId}"]`);
		if (playlistItem) {
			if (isRepeat) {
				playlistItem.classList.add('repeat-current');
			} else {
				playlistItem.classList.add('play-next');
			}
		}
	}

	/**
	 * Clear the next up video when it has been played
	 */
	clearPlayNext() {
		this._clearPlayNextIndicator();
		this.nextUpVideoId = null;
		// Update repeat button visual state
		this.setRepeatButtonState(false);
	}

	/**
	 * Set a video as "Repeat Current"
	 */
	_setRepeatCurrent(videoId) {
		// Use the same logic as play next but with repeats=true
		this._setPlayNext(videoId, true);
		// Update repeat button visual state
		this.setRepeatButtonState(true);
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

	setRepeatButtonState(isEnabled) {
		if (!this.repeatButton) return;

		this.repeatButton.classList.remove('on', 'off');
		this.repeatButton.classList.add(isEnabled ? 'on' : 'off');

		// Update player wrapper class for 'show when active' functionality
		if (this.playerWrapper) {
			this.playerWrapper.classList.toggle('repeat-active', isEnabled);
		}
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
	 * Process hidden items for blacklist, removed-from-mix, and duplicates
	 */
	_processHiddenItems(items, listId) {
		const blacklist = window.userSettings.videoBlacklist || [];
		const removed =
			(listId &&
				window.userSettings.removedFromMix &&
				window.userSettings.removedFromMix[listId]) ||
			[];

		const seenItems = new Set();
		const processedItems = [];

		items.forEach((item) => {
			const videoId = item.id;

			// Always start fresh
			let hidden = false;

			// Apply blacklist / removed-from-mix
			// Handle both old format (array of strings) and new format (array of objects)
			const isBlacklisted = blacklist.some((item) => {
				if (typeof item === 'string') {
					return item === videoId;
				} else if (typeof item === 'object' && item.id) {
					return item.id === videoId;
				}
				return false;
			});

			if (isBlacklisted || removed.includes(videoId)) {
				hidden = true;
			}

			// Handle duplicates (if enabled)
			if (this.options.playlistRemoveSame) {
				let duplicateKey;

				if (!this.options.allowDifferentVersions) {
					duplicateKey = (item.title || '')
						.replace(/\([^\)]*\)/g, '')
						.toLowerCase()
						.replace(/[^a-z0-9 ]+/g, '')
						.trim();
				} else {
					const author = (item.artist || item.author || '').toLowerCase().trim();
					const feat = (item.featuring || '').toLowerCase().trim();
					const title = (item.title || '').toLowerCase().trim();
					duplicateKey = `${author}|${feat}|${title}`.replace(/[^a-z0-9| ]+/g, '').trim();
				}

				if (seenItems.has(duplicateKey)) {
					hidden = true;
				} else {
					seenItems.add(duplicateKey);
				}
			}

			processedItems.push({ ...item, hidden });
		});

		return processedItems;
	}

	/**
	 * Playlist management
	 */
	updatePlaylist(newItems = null, listId = null, title = null) {
		if (listId) {
			this.options.currentPlaylist.listId = listId;
		} else {
			listId = this.options.currentPlaylist.listId;
		}
		logger.log('Playlist', 'Updating playlist', { newItems, listId, title });

		// Show/hide restore all button
		const hasRemovedItems = listId && window.userSettings.removedFromMix[listId]?.length > 0;
		this.playerWrapper.classList.toggle('yt-mix-items-removed', hasRemovedItems);

		if (
			!this.playlistWrapper ||
			this.options.customPlaylistMode === DrawerMode.DISABLED ||
			newItems === null
		) {
			this.hasPlaylist = false;
			this.playerWrapper.classList.remove('yt-playlist-loading');
			this._updatePlaylistVisibility();
			this._updateDrawerVisualState();
			this.options.currentPlaylist.items = null;
			return;
		}

		if (newItems.length === 0) {
			while (this.playlistWrapper.firstChild) {
				this.playlistWrapper.removeChild(this.playlistWrapper.firstChild);
			}
			this.playerWrapper.classList.add('yt-playlist-loading');
			this.hasPlaylist = true;
			this._updatePlaylistVisibility();
			this._updateDrawerVisualState();
			this.options.currentPlaylist.items = [];
			return;
		}

		this.playerWrapper.classList.remove('yt-playlist-loading');

		// Process items for hiding (blacklist, removed-from-mix, duplicates)
		newItems = this._processHiddenItems(newItems, listId);

		this.options.currentPlaylist.items = newItems;

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
				// Use DOM creation for secure element construction
				tempDiv.appendChild(this._createPlaylistItem(item, isActive));
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

		// Update header content
		if (this.hasPlaylist) {
			// Cache the title if provided
			if (title) {
				this.options.currentPlaylist.title = title;
			}

			// Use cached title if available
			const currentTitle = this.options.currentPlaylist.title;
			if (currentTitle) {
				// Count visible items (non-hidden)
				const visibleItemCount = newItems
					? newItems.filter((item) => !item.hidden).length
					: 0;
				this.setHandleContent({ title: currentTitle, itemCount: visibleItemCount });
			}
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
	 * Get the adjacent visible video relative to the given video ID
	 * @param {string} videoId - The video ID to start from
	 * @param {string} direction - The direction to check ('forward' or 'backward')
	 * @returns {Object|null} - The adjacent visible video item or null if not found
	 */
	getAdjacentVideo(videoId, direction) {
		const playlistData = this.getCachedPlaylistData();
		if (!playlistData.items.length) return null;

		const currentIndex = playlistData.items.findIndex((item) => item.id === videoId);
		if (currentIndex === -1) return null;

		if (direction === 'forward') {
			return playlistData.items.slice(currentIndex + 1).find((item) => !item.hidden) || null;
		} else if (direction === 'backward') {
			return (
				playlistData.items
					.slice(0, currentIndex)
					.reverse()
					.find((item) => !item.hidden) || null
			);
		}

		return null;
	}

	/**
	 * Check if a video ID is hidden and return navigation instruction
	 * @param {string} targetVideoId - The video ID to check
	 * @returns {Object|null} - Navigation instruction or null if no action needed
	 */
	checkHiddenItemNavigation(targetVideoId) {
		const playlistData = this.getCachedPlaylistData();
		if (!playlistData.items.length) {
			return null;
		}

		const targetItem = playlistData.items.find((item) => item.id === targetVideoId);
		logger.log('checkHiddenItemNavigation', `Target item:`, targetItem);
		if (!targetItem || !targetItem.hidden) {
			logger.log(
				'checkHiddenItemNavigation',
				'Target item not found or not hidden. No action needed.'
			);
			return null;
		}

		const currentVideoId = this.options.nowPlayingVideoDetails?.videoId;
		logger.log('checkHiddenItemNavigation', `Current videoId: ${currentVideoId}`);
		if (!currentVideoId) {
			logger.log('checkHiddenItemNavigation', 'Current videoId not found.');
			return null;
		}

		const currentIndex = playlistData.items.findIndex((item) => item.id === currentVideoId);
		const targetIndex = playlistData.items.findIndex((item) => item.id === targetVideoId);
		logger.log(
			'checkHiddenItemNavigation',
			`Current index: ${currentIndex}, Target index: ${targetIndex}`
		);

		if (currentIndex === -1 || targetIndex === -1) {
			logger.log('checkHiddenItemNavigation', 'Could not find current or target index.');
			return null;
		}

		const isMovingForward = currentIndex < targetIndex;
		const direction = isMovingForward ? 'forward' : 'backward';
		logger.log('checkHiddenItemNavigation', `Navigation direction: ${direction}`);

		const adjacent = this.getAdjacentVideo(targetVideoId, direction);
		logger.log('checkHiddenItemNavigation', `Adjacent video:`, adjacent);
		if (adjacent) {
			const result = {
				action: 'navigate',
				direction,
				videoId: adjacent.id,
			};
			logger.log('checkHiddenItemNavigation', 'Returning navigation action:', result);
			return result;
		}

		logger.log('checkHiddenItemNavigation', 'No adjacent video found. Returning no action.');
		return { action: null };
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
		} else if (buttonName === 'Repeat') {
			this.options.showRepeatButton = visible;
			if (this.playerWrapper) {
				// Remove all repeat button visibility classes
				this.playerWrapper.classList.remove(
					'hide-repeat-button',
					'hide-repeat-button-when-inactive'
				);

				// Apply appropriate class based on the setting
				if (visible === 'disabled') {
					this.playerWrapper.classList.add('hide-repeat-button');
				} else if (visible === 'show-when-active') {
					this.playerWrapper.classList.add('hide-repeat-button-when-inactive');
				}
				// 'always-show' doesn't need any additional classes
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

	setGestureSensitivity(sensitivity) {
		this.options.gestureSensitivity = sensitivity;
		this._updateGestureThresholds();
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
