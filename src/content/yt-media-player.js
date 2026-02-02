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
			enableLimitedHeightMode: window.userSettings.enableLimitedHeightMode,
			hideNavbarInLimitedHeightMode: window.userSettings.hideNavbarInLimitedHeightMode,
			enableFixedVideoHeight: window.userSettings.enableFixedVideoHeight,
			autoHidePlayerOnScroll: window.userSettings.autoHidePlayerOnScroll,
			hidePlayerForPanelActive: window.userSettings.hidePlayerForPanelActive,
			enableHorizontalPlaylistBelowVideo:
				window.userSettings.enableHorizontalPlaylistBelowVideo,
			customPlaylistMode: window.userSettings.customPlaylistMode,
			returnToDefaultModeOnVideoSelect: window.userSettings.returnToDefaultModeOnVideoSelect,
			showBottomControls: window.userSettings.showBottomControls,
			navbarShowHomeButton: window.userSettings.navbarShowHomeButton,

			// Appearance
			customPlayerTheme: window.userSettings.customPlayerTheme,
			customPlayerAccentColor: window.userSettings.customPlayerAccentColor,
			seekSkipSeconds: window.userSettings.seekSkipSeconds,
			bottomControlsDoubleClickDelay: window.userSettings.bottomControlsDoubleClickDelay,
			customPlayerFontMultiplier: window.userSettings.customPlayerFontMultiplier,
			playlistItemDensity: window.userSettings.playlistItemDensity,
			allowMultilinePlaylistTitles: window.userSettings.allowMultilinePlaylistTitles,
			playerTimeDisplayMode: window.userSettings.playerTimeDisplayMode,
			hideTimerDuration: window.userSettings.hideTimerDuration,
			hidePlaylistItemDurations: window.userSettings.hidePlaylistItemDurations,
			keepPlaylistFocused: window.userSettings.keepPlaylistFocused,
			enableTitleMarquee: window.userSettings.enableTitleMarquee !== false,
			titleContrastMode: window.userSettings.titleContrastMode || 'default',
			horizontalPlaylistDetailsInHeaderControls:
				window.userSettings.horizontalPlaylistDetailsInHeaderControls,
			horizontalPlaylistAlignment:
				window.userSettings.horizontalPlaylistAlignment || 'center-current',
			verticalPlaylistAlignment:
				window.userSettings.verticalPlaylistAlignment || 'align-item-before-top',

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
		this._previousActionId = null;

		// Auto-hide scroll tracking
		this.lastScrollY = 0;
		this.lastScrollContainer = window;
		this.scrollVelocity = 0;
		this.scrollDirection = 0; // 0 = none, 1 = up, -1 = down
		this.autoHideTimer = null;
		this.isAutoHidden = false;
		this.watchBelowPlayerElement = null;
		this.scrollEventCount = 0; // Debug counter
		this._lastOverlayScrollLeft = -1;
		this._overlaySuppressUntil = 0;

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
		this.lastBodyUpdateDrawerState = null;

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

		// Buffer auto-pause state
		this.isBufferAutoPauseActive = false;
		this.bufferAutoPauseCountdown = 0;
		this.bufferCountdownTimer = null;

		// Gesture state
		this.touchStartInfo = { x: 0, y: 0, time: 0, target: null, fingerCount: 0 };
		this.isSwipeGestureActive = false;
		this.longPressTimer = null;

		// Auto-scroll state
		this.autoScrollFocusTimer = null;
		this.programmaticScrollInProgress = false;

		// Configuration constants
		this.MIN_MEANINGFUL_SNAP_DIFFERENCE = 40;
		this.playlistScrollDebounceDelay =
			(window.userSettings.playlistScrollDebounceDelay || 2.5) * 1000;

		// Limited height mode configuration
		this.COMPACT_VIEWPORT_HEIGHT_THRESHOLD = 400;
		this._isLimitedHeightActive = false;

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
			low: { distance: 1.5, time: 0.8, ratio: 0.8 }, // Require more distance, less time, stricter ratio
			normal: { distance: 1.0, time: 1.0, ratio: 1.0 }, // Default values
			high: { distance: 0.7, time: 1.2, ratio: 1.2 }, // Require less distance, more time, looser ratio
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
		this._applyLimitedHeightMode();
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
		this._handlePlaylistTouchStart_bound = this._handlePlaylistTouchStart.bind(this);
		this._handlePlaylistTouchEnd_bound = this._handlePlaylistTouchEnd.bind(this);
		this._performAutoScrollFocus_bound = this._performAutoScrollFocus.bind(this);
		this._handleDrawerFocusButtonClick_bound = (event) => {
			event.preventDefault();
			event.stopPropagation();
			this._performAutoScrollFocus(false, true);
		};

		// Centered overlay handlers
		this._updateCenteredOverlayOnScroll_bound = this._updateCenteredOverlayOnScroll.bind(this);

		// Auto-hide scroll handlers
		this._handleScroll_bound = this._handleScroll.bind(this);
		this._handleScrollThrottled_bound = this._throttle(this._handleScroll_bound, 16); // ~60fps
	}

	/**
	 * Create and inject DOM elements
	 */
	_injectHTML() {
		const tempDiv = document.createElement('div');
		tempDiv.appendChild(this._createPlayerElement());
		this.playerWrapper = tempDiv.firstElementChild;

		logger.log('AutoHide', 'Player wrapper created:', !!this.playerWrapper);
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
		// Tooltip shown only when seeking if playerTimeDisplayMode is 'seek-tooltip'
		const seekTooltip = document.createElement('div');
		seekTooltip.className = 'yt-seek-tooltip';
		const seekTooltipCurrentText = document.createTextNode('0:00');
		const seekTooltipDurationSpan = document.createElement('span');
		seekTooltipDurationSpan.textContent = '/0:00';
		seekTooltip.appendChild(seekTooltipCurrentText);
		seekTooltip.appendChild(seekTooltipDurationSpan);
		seekbarBg.appendChild(seekTooltip);
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
		const videoTimerCurrentText = document.createTextNode('0:00');
		const videoTimerDurationSpan = document.createElement('span');
		videoTimerDurationSpan.textContent = '/0:00';
		videoTimer.appendChild(videoTimerCurrentText);
		videoTimer.appendChild(videoTimerDurationSpan);
		playbackInfo.appendChild(videoTimer);

		// Create inline seekbar
		const seekbarInline = document.createElement('div');
		seekbarInline.className = 'yt-seekbar-inline';
		const seekbarProgressInline = document.createElement('div');
		seekbarProgressInline.className = 'yt-seekbar-progress-inline';
		const seekbarThumbInline = document.createElement('div');
		seekbarThumbInline.className = 'yt-seekbar-thumb-inline';
		seekbarProgressInline.appendChild(seekbarThumbInline);
		// Inline seek tooltip (compact layout)
		const seekTooltipInline = document.createElement('div');
		seekTooltipInline.className = 'yt-seek-tooltip-inline';
		const seekTooltipInlineCurrentText = document.createTextNode('0:00');
		const seekTooltipInlineDurationSpan = document.createElement('span');
		seekTooltipInlineDurationSpan.textContent = '/0:00';
		seekTooltipInline.appendChild(seekTooltipInlineCurrentText);
		seekTooltipInline.appendChild(seekTooltipInlineDurationSpan);
		seekbarInline.appendChild(seekTooltipInline);
		seekbarInline.appendChild(seekbarProgressInline);
		playbackInfo.appendChild(seekbarInline);

		textContent.appendChild(playbackInfo);
		detailsOverlay.appendChild(textContent);
		playingDetails.appendChild(detailsOverlay);
		playerControls.appendChild(playingDetails);

		// Create main controls
		const mainControls = document.createElement('div');
		mainControls.className = 'yt-main-controls';

		const wrapControlSlot = (slotClassName, el) => {
			if (!el) return null;
			const slot = document.createElement('div');
			slot.className = `yt-control-slot ${slotClassName}`;
			slot.appendChild(el);
			return slot;
		};

		const lockedBottomControlActions = new Set(['play', 'limited-height-fab']);
		const usedBottomControlActions = new Set(lockedBottomControlActions);
		const appendBottomControlSlot = (parent, slotClassName, actionId) => {
			if (!actionId || actionId === 'none' || usedBottomControlActions.has(actionId)) {
				return;
			}
			const el = this._createBottomControlsElementForAction(actionId);
			if (!el) return;
			usedBottomControlActions.add(actionId);
			const wrapped = wrapControlSlot(slotClassName, el);
			if (wrapped) parent.appendChild(wrapped);
		};
		const appendLockedBottomControlSlot = (parent, slotClassName, actionId) => {
			if (!actionId || actionId === 'none') {
				return;
			}
			const el = this._createBottomControlsElementForAction(actionId);
			if (!el) return;
			const wrapped = wrapControlSlot(slotClassName, el);
			if (wrapped) parent.appendChild(wrapped);
		};

		// Create left section
		const leftSection = document.createElement('div');
		leftSection.className = 'yt-left-section';
		const leftSlot1Action = window.userSettings.layoutBottomLeftSlot1 || 'repeat';
		appendBottomControlSlot(leftSection, 'yt-bottom-left-slot1', leftSlot1Action);
		mainControls.appendChild(leftSection);

		// Create center section with seek buttons flanking the button group
		const centerSection = document.createElement('div');
		centerSection.className = 'yt-center-section';
		const buttonGroup = document.createElement('div');
		buttonGroup.className = 'yt-button-group';
		const centerSlot1Action = window.userSettings.layoutBottomCenterSlot1 || 'seek-back';
		const centerSlot2Action = window.userSettings.layoutBottomCenterSlot2 || 'previous';
		const centerSlot3Action = 'play';
		const centerSlot4Action = window.userSettings.layoutBottomCenterSlot4 || 'skip';
		const centerSlot5Action = window.userSettings.layoutBottomCenterSlot5 || 'seek-forward';

		appendBottomControlSlot(centerSection, 'yt-bottom-center-slot1', centerSlot1Action);

		appendBottomControlSlot(buttonGroup, 'yt-bottom-center-slot2', centerSlot2Action);
		appendLockedBottomControlSlot(buttonGroup, 'yt-bottom-center-slot3', centerSlot3Action);
		appendBottomControlSlot(buttonGroup, 'yt-bottom-center-slot4', centerSlot4Action);
		centerSection.appendChild(buttonGroup);

		appendBottomControlSlot(centerSection, 'yt-bottom-center-slot5', centerSlot5Action);
		mainControls.appendChild(centerSection);

		// Create right section
		const rightSection = document.createElement('div');
		rightSection.className = 'yt-right-section';
		const rightSlot1Action = window.userSettings.layoutBottomRightSlot1 || 'voice-search';
		const rightSlot2Action = 'limited-height-fab';

		appendBottomControlSlot(rightSection, 'yt-bottom-right-slot1', rightSlot1Action);
		appendLockedBottomControlSlot(rightSection, 'yt-bottom-right-slot2', rightSlot2Action);

		if (this.options.enableLimitedHeightMode && this.options.hideNavbarInLimitedHeightMode) {
			if (this._isLimitedHeightActive) {
				document.body.classList.add('yt-limited-height-mode-navbar-hidden');
			}
		} else {
			document.body.classList.remove('yt-limited-height-mode-navbar-hidden');
		}

		mainControls.appendChild(rightSection);

		playerControls.appendChild(mainControls);
		wrapper.appendChild(playerControls);

		// Create gesture feedback overlay
		const gestureOverlay = document.createElement('div');
		gestureOverlay.className = 'yt-gesture-feedback-overlay';
		wrapper.appendChild(gestureOverlay);

		// Create centered item overlay (shown while scrolling)
		const centeredOverlay = document.createElement('div');
		centeredOverlay.className = 'yt-horizontal-centered-item-popup';
		const coThumb = document.createElement('div');
		coThumb.className = 'yt-centered-thumb';
		const coText = document.createElement('div');
		coText.className = 'yt-centered-text';
		const coTitle = document.createElement('div');
		coTitle.className = 'yt-centered-title';
		const coArtist = document.createElement('div');
		coArtist.className = 'yt-centered-artist';
		coText.appendChild(coTitle);
		coText.appendChild(coArtist);
		centeredOverlay.appendChild(coThumb);
		centeredOverlay.appendChild(coText);
		wrapper.appendChild(centeredOverlay);

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

		return classes.join(' ');
	}

	/**
	 * Create FAB for limited height mode
	 */
	_createLimitedHeightFAB() {
		const fabContainer = document.createElement('div');
		fabContainer.className = 'yt-limited-height-fab';

		// Create speed dial container
		const speedDial = document.createElement('div');
		speedDial.className = 'yt-speed-dial';

		// Create main FAB button
		const mainFab = document.createElement('button');
		mainFab.className = 'yt-limited-height-fab-main';
		mainFab.setAttribute('aria-label', 'More options');

		// Create main button SVG using DOM APIs - match original voice search button size
		const mainSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		mainSvg.setAttribute('viewBox', '-10 -3 44 30');
		mainSvg.setAttribute('width', '30');
		mainSvg.setAttribute('height', '30');

		const mainPath1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		mainPath1.setAttribute('d', 'M3 18h18v-2H3v2z');
		mainSvg.appendChild(mainPath1);

		const mainPath2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		mainPath2.setAttribute('d', 'M3 13h18v-2H3v2z');
		mainSvg.appendChild(mainPath2);

		const mainPath3 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		mainPath3.setAttribute('d', 'M3 8h18V6H3z');
		mainSvg.appendChild(mainPath3);
		mainFab.appendChild(mainSvg);

		// Create speed dial actions container
		const speedDialActions = document.createElement('div');
		speedDialActions.className = 'yt-limited-height-fab-actions';

		const navbarActions = new Set(
			(Array.isArray(window.userSettings.navbarRightSlots)
				? window.userSettings.navbarRightSlots
				: []
			).filter((actionId) => typeof actionId === 'string' && actionId !== 'none')
		);

		// Add conditional buttons based on navbar layout
		if (this.options.navbarShowHomeButton) {
			const homeButton = document.createElement('button');
			homeButton.className = 'yt-limited-height-fab-action';
			homeButton.setAttribute('data-action', 'home');
			homeButton.setAttribute('aria-label', 'YouTube home');

			// Create YouTube logo SVG
			const homeSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
			homeSvg.setAttribute('id', 'yt-ringo2-svg_yt1');
			homeSvg.setAttribute('viewBox', '0 0 30 20');
			homeSvg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
			homeSvg.setAttribute('focusable', 'false');
			homeSvg.setAttribute('aria-hidden', 'true');

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

			homeSvg.appendChild(logoGroup);
			homeButton.appendChild(homeSvg);

			speedDialActions.appendChild(homeButton);
		}

		if (navbarActions.has('text-search')) {
			const textSearchButton = document.createElement('button');
			textSearchButton.className = 'yt-limited-height-fab-action';
			textSearchButton.setAttribute('data-action', 'text-search');
			textSearchButton.setAttribute('aria-label', 'Text search');

			const textSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
			textSvg.setAttribute('viewBox', '0 0 24 24');
			textSvg.setAttribute('width', '20');
			textSvg.setAttribute('height', '20');

			const textPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
			textPath.setAttribute(
				'd',
				'M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z'
			);
			textSvg.appendChild(textPath);
			textSearchButton.appendChild(textSvg);

			speedDialActions.appendChild(textSearchButton);
		}

		if (navbarActions.has('favourites')) {
			const favouritesButton = document.createElement('button');
			favouritesButton.className = 'yt-limited-height-fab-action';
			favouritesButton.setAttribute('data-action', 'favourites');
			favouritesButton.setAttribute('aria-label', 'Favorites');

			const favSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
			favSvg.setAttribute('viewBox', '0 0 24 24');
			favSvg.setAttribute('width', '20');
			favSvg.setAttribute('height', '20');

			const favPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
			favPath.setAttribute(
				'd',
				'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'
			);
			favSvg.appendChild(favPath);
			favouritesButton.appendChild(favSvg);

			speedDialActions.appendChild(favouritesButton);
		}

		if (navbarActions.has('video-toggle')) {
			const videoToggleButton = document.createElement('button');
			videoToggleButton.className = 'yt-limited-height-fab-action';
			videoToggleButton.setAttribute('data-action', 'video-toggle');
			videoToggleButton.setAttribute('aria-label', 'Toggle Video Player');

			const videoSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
			videoSvg.setAttribute('viewBox', '0 0 24 24');
			videoSvg.setAttribute('width', '20');
			videoSvg.setAttribute('height', '20');
			const videoPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');

			// Use different icons based on current state
			const isVideoHidden = document.body.classList.contains('yt-hide-video-player');
			if (isVideoHidden) {
				// Show video icon (when video is currently hidden)
				videoPath.setAttribute(
					'd',
					'M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4zM14 13h-3v3H9v-3H6v-2h3V8h2v3h3v2z'
				);
			} else {
				// Hide video icon (when video is currently visible)
				videoPath.setAttribute(
					'd',
					'M21 6.5l-4 4V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11zM9.5 16L8 14.5 10.5 12 8 9.5 9.5 8 12 10.5 14.5 8 16 9.5 13.5 12 16 14.5 14.5 16 12 13.5 9.5 16z'
				);
			}

			videoSvg.appendChild(videoPath);
			videoToggleButton.appendChild(videoSvg);

			speedDialActions.appendChild(videoToggleButton);
		}

		const bottomActions = new Set(
			Object.keys(window.userSettings)
				.filter((key) => key.startsWith('layoutBottom'))
				.map((key) => window.userSettings[key])
				.filter((actionId) => typeof actionId === 'string' && actionId !== 'none')
		);

		if (navbarActions.has('voice-search') || bottomActions.has('voice-search')) {
			const voiceButton = document.createElement('button');
			voiceButton.className = 'yt-limited-height-fab-action';
			voiceButton.setAttribute('data-action', 'voice-search');
			voiceButton.setAttribute('aria-label', 'Voice search');

			const voiceSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
			voiceSvg.setAttribute('viewBox', '0 0 24 24');
			voiceSvg.setAttribute('width', '20');
			voiceSvg.setAttribute('height', '20');

			const voicePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
			voicePath.setAttribute(
				'd',
				'M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z'
			);
			voiceSvg.appendChild(voicePath);
			voiceButton.appendChild(voiceSvg);

			speedDialActions.appendChild(voiceButton);
		}

		speedDial.appendChild(speedDialActions);
		speedDial.appendChild(mainFab);
		fabContainer.appendChild(speedDial);

		// Add event listeners - fix click target issue with proper event handling
		mainFab.addEventListener('click', (e) => {
			e.preventDefault();
			e.stopPropagation();
			speedDial.classList.toggle('yt-speed-dial-open');
		});

		// Handle speed dial actions - fix event delegation
		speedDialActions.addEventListener('click', (e) => {
			e.preventDefault();
			e.stopPropagation();
			const button = e.target.closest('.yt-limited-height-fab-action');
			if (button) {
				const action = button.getAttribute('data-action');
				this._handleSpeedDialAction(action);
				speedDial.classList.remove('yt-speed-dial-open');
			}
		});

		// Close speed dial when clicking outside
		document.addEventListener('click', (e) => {
			if (!fabContainer.contains(e.target)) {
				speedDial.classList.remove('yt-speed-dial-open');
			}
		});

		return fabContainer;
	}

	/**
	 * Handle speed dial actions by delegating to yt-navbar.js
	 */
	_handleSpeedDialAction(action) {
		// Get the custom navbar instance from window
		if (window.customNavbar && typeof window.customNavbar.handleAction === 'function') {
			window.customNavbar.handleAction(action);
		} else {
			// Fallback: try to call the individual methods directly
			switch (action) {
				case 'voice-search':
					if (
						window.customNavbar &&
						typeof window.customNavbar._handleVoiceSearchClick === 'function'
					) {
						window.customNavbar._handleVoiceSearchClick();
					}
					break;
				case 'text-search':
					if (
						window.customNavbar &&
						typeof window.customNavbar._handleTextSearchClick === 'function'
					) {
						window.customNavbar._handleTextSearchClick();
					}
					break;
				case 'home':
					if (
						window.customNavbar &&
						typeof window.customNavbar._handleLogoClick === 'function'
					) {
						window.customNavbar._handleLogoClick();
					}
					break;
				case 'favourites':
					if (
						window.customNavbar &&
						typeof window.customNavbar._handleFavouritesClick === 'function'
					) {
						window.customNavbar._handleFavouritesClick();
					}
					break;
				case 'video-toggle':
					if (
						window.customNavbar &&
						typeof window.customNavbar._handleVideoToggleClick === 'function'
					) {
						window.customNavbar._handleVideoToggleClick();
					}
					break;
			}
		}
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

		// Create header row container
		const headerRow = document.createElement('div');
		headerRow.className = 'yt-drawer-header-row';

		// Create close button
		const closeButton = document.createElement('button');
		closeButton.className = 'yt-drawer-close-button';
		closeButton.setAttribute('aria-label', 'Close playlist');
		const closeSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		closeSvg.setAttribute('viewBox', '0 0 24 24');
		const closePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		closePath.setAttribute(
			'd',
			'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z'
		);
		closeSvg.appendChild(closePath);
		closeButton.appendChild(closeSvg);
		// Create loop toggle button
		const loopButton = document.createElement('button');
		loopButton.className = 'yt-drawer-loop-toggle-button';
		loopButton.setAttribute('aria-label', 'Toggle snapshot loop');
		const loopSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		loopSvg.setAttribute('class', 'icon loop-toggle');
		loopSvg.setAttribute('viewBox', '0 0 24 24');
		const loopPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		loopPath.setAttribute(
			'd',
			'M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z'
		);
		loopSvg.appendChild(loopPath);
		loopButton.appendChild(loopSvg);

		// Group top-right controls
		const topRightControls = document.createElement('div');
		topRightControls.className = 'yt-drawer-top-right-controls';

		const focusButton = document.createElement('button');
		focusButton.className = 'yt-drawer-focus-current-button';
		focusButton.setAttribute('aria-label', 'Focus current item');
		const focusSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		focusSvg.setAttribute('class', 'icon focus-current');
		focusSvg.setAttribute('viewBox', '0 0 32 32');
		const focusPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		focusPath.setAttribute(
			'd',
			'M30,15H27.9492A12.0071,12.0071,0,0,0,17,4.0508V2H15V4.0508A12.0071,12.0071,0,0,0,4.0508,15H2v2H4.0508A12.0071,12.0071,0,0,0,15,27.9492V30h2V27.9492A12.0071,12.0071,0,0,0,27.9492,17H30ZM17,25.9492V22H15v3.9492A10.0166,10.0166,0,0,1,6.0508,17H10V15H6.0508A10.0166,10.0166,0,0,1,15,6.0508V10h2V6.0508A10.0166,10.0166,0,0,1,25.9492,15H22v2h3.9492A10.0166,10.0166,0,0,1,17,25.9492Z'
		);
		focusSvg.appendChild(focusPath);
		focusButton.appendChild(focusSvg);

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

		// Assemble header row
		headerRow.appendChild(headerContent);
		headerRow.appendChild(topRightControls);
		dragHandle.appendChild(headerRow);
		const shuffleButton = document.createElement('button');
		shuffleButton.className = 'yt-drawer-shuffle-toggle-button';
		shuffleButton.setAttribute('aria-label', 'Toggle snapshot shuffle');
		const shuffleSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		shuffleSvg.setAttribute('class', 'icon shuffle-toggle');
		shuffleSvg.setAttribute('viewBox', '-1 -3 29 29');
		const shufflePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		shufflePath.setAttribute(
			'd',
			'M384.528,638.166 C384.23,637.871 383.299,637.948 383,638.244 L383,641 L379,641 L375.465,636.161 L374.207,637.792 L378,642.909 L383,642.909 L383,645.781 C383.299,646.076 384.23,645.945 384.528,645.649 L388.771,642.442 C389.069,642.147 389.069,641.669 388.771,641.373 L384.528,638.166 L384.528,638.166 Z M383,628 L383,630.688 C383.299,630.982 384.23,631.105 384.528,630.811 L388.771,627.604 C389.069,627.308 389.069,626.829 388.771,626.534 L384.528,623.326 C384.23,623.031 383.299,622.861 383,623.156 L383,626 L378,626 L367,641 L363,641 C362.447,641 362,641.373 362,641.92 C362,642.466 362.447,643 363,643 L368,643 L379,628 L383,628 L383,628 Z M363,628 L367,628 L370.508,632.803 L371.766,631.172 C371.766,631.172 368.254,626.323 368,626 L363,626 C362.447,626 362,626.534 362,627.08 C362,627.627 362.447,628 363,628 L363,628 Z'
		);
		shufflePath.setAttribute('transform', 'translate(-362 -623)');
		shuffleSvg.appendChild(shufflePath);
		shuffleButton.appendChild(shuffleSvg);

		const headerSlot1Action = window.userSettings.layoutDrawerHeaderSlot1 || 'focus-current';
		const headerSlot2Action = window.userSettings.layoutDrawerHeaderSlot2 || 'shuffle-toggle';
		const headerSlot3Action = window.userSettings.layoutDrawerHeaderSlot3 || 'loop-toggle';
		const headerSlot4Action = window.userSettings.layoutDrawerHeaderSlot4 || 'close';

		const controlsByAction = {
			'focus-current': focusButton,
			'shuffle-toggle': shuffleButton,
			'shuffle-toggle-show-when-active': shuffleButton,
			'loop-toggle': loopButton,
			'loop-toggle-show-when-active': loopButton,
			close: closeButton,
		};

		const usedActions = new Set();
		[
			{ actionId: headerSlot1Action, slotClassName: 'yt-drawer-header-slot1' },
			{ actionId: headerSlot2Action, slotClassName: 'yt-drawer-header-slot2' },
			{ actionId: headerSlot3Action, slotClassName: 'yt-drawer-header-slot3' },
			{ actionId: headerSlot4Action, slotClassName: 'yt-drawer-header-slot4' },
		].forEach(({ actionId, slotClassName }) => {
			if (!actionId || actionId === 'none') {
				return;
			}
			const normalizedActionId =
				actionId === 'loop-toggle-show-when-active'
					? 'loop-toggle'
					: actionId === 'shuffle-toggle-show-when-active'
						? 'shuffle-toggle'
						: actionId;

			if (normalizedActionId === 'loop-toggle') {
				this._drawerLoopVisibilityMode =
					actionId === 'loop-toggle-show-when-active' ? 'active-only' : 'all';
			} else if (normalizedActionId === 'shuffle-toggle') {
				this._drawerShuffleVisibilityMode =
					actionId === 'shuffle-toggle-show-when-active' ? 'active-only' : 'all';
			}

			if (usedActions.has(normalizedActionId)) {
				return;
			}
			const el = controlsByAction[actionId];
			if (!el) {
				return;
			}
			el.classList.add(slotClassName);
			usedActions.add(normalizedActionId);
			topRightControls.appendChild(el);
		});
		fragment.appendChild(dragHandle);

		loopButton.addEventListener('click', async (ev) => {
			ev.stopPropagation();
			const currentListId = this.options.currentPlaylist?.listId;
			if (!currentListId) return;
			const activeId = window.userSettings.activeMixSnapshotId;
			const persisted = window.userSettings.mixSnapshots || {};
			const tempSnap = window.userSettings.tempMixSnapshot || null;
			let snap = null;
			let snapType = null;
			if (activeId && persisted[activeId] && activeId === currentListId) {
				snap = persisted[activeId];
				snapType = 'persisted';
			} else if (tempSnap && tempSnap.id === currentListId && activeId === tempSnap.id) {
				snap = tempSnap;
				snapType = 'temp';
			}
			if (!snap) {
				const items = (this.options.currentPlaylist?.items || []).map((it) => ({
					id: it.id,
					title: it.title,
					duration: it.duration,
				}));
				const title = this.options.currentPlaylist?.title || '';
				const newSnap = {
					id: currentListId,
					title,
					createdAt: Date.now(),
					items,
					loopEnabled: true,
					shuffleEnabled: false,
					shuffledOrder: null,
					shuffleStartId: null,
				};
				const ok1 = await window.saveUserSetting('tempMixSnapshot', newSnap);
				const ok2 = await window.saveUserSetting('activeMixSnapshotId', currentListId);
				if (ok1 && ok2) {
					const curVid = this.options.nowPlayingVideoDetails?.videoId;
					if (curVid) {
						const fullUrl = `https://m.youtube.com/watch?v=${curVid}`;
						window.location.href = fullUrl;
					}
				}
				return;
			}
			const newVal = !snap.loopEnabled;
			if (snapType === 'persisted') {
				const updated = Object.assign({}, persisted);
				updated[activeId] = Object.assign({}, updated[activeId], { loopEnabled: newVal });
				const ok = await window.saveUserSetting('mixSnapshots', updated);
				if (ok) {
					loopButton.classList.toggle('active', newVal);
					loopButton.setAttribute('aria-pressed', String(newVal));
					this._updateDrawerLoopButtonVisibility();
				}
			} else {
				const updatedTemp = Object.assign({}, snap, { loopEnabled: newVal });
				const ok = await window.saveUserSetting('tempMixSnapshot', updatedTemp);
				if (ok) {
					loopButton.classList.toggle('active', newVal);
					loopButton.setAttribute('aria-pressed', String(newVal));
					this._updateDrawerLoopButtonVisibility();
				}
			}
		});

		shuffleButton.addEventListener('click', async (ev) => {
			ev.stopPropagation();
			const currentListId = this.options.currentPlaylist?.listId;
			if (!currentListId) return;
			const activeId = window.userSettings.activeMixSnapshotId;
			const persisted = window.userSettings.mixSnapshots || {};
			const tempSnap = window.userSettings.tempMixSnapshot || null;
			let snap = null;
			let snapType = null;
			if (activeId && persisted[activeId] && activeId === currentListId) {
				snap = persisted[activeId];
				snapType = 'persisted';
			} else if (tempSnap && tempSnap.id === currentListId && activeId === tempSnap.id) {
				snap = tempSnap;
				snapType = 'temp';
			}
			const computeShuffle = (items) => {
				const ids = items.map((it) => it.id);
				let order = ids.slice();
				for (let i = order.length - 1; i > 0; i--) {
					const j = Math.floor(Math.random() * (i + 1));
					[order[i], order[j]] = [order[j], order[i]];
				}
				const curId = this.options.nowPlayingVideoDetails?.videoId;
				const startId = curId && ids.includes(curId) ? curId : order[0];
				const startIndex = order.indexOf(startId);
				if (startIndex > 0) {
					order = order.slice(startIndex).concat(order.slice(0, startIndex));
				}
				return { order, startId: order[0] };
			};
			if (!snap) {
				const items = (this.options.currentPlaylist?.items || []).map((it) => ({
					id: it.id,
					title: it.title,
					duration: it.duration,
				}));
				const title = this.options.currentPlaylist?.title || '';
				const shuf = computeShuffle(items);
				const newSnap = {
					id: currentListId,
					title,
					createdAt: Date.now(),
					items,
					loopEnabled: false,
					shuffleEnabled: true,
					shuffledOrder: shuf.order,
					shuffleStartId: shuf.startId,
				};
				const ok1 = await window.saveUserSetting('tempMixSnapshot', newSnap);
				const ok2 = await window.saveUserSetting('activeMixSnapshotId', currentListId);
				if (ok1 && ok2) {
					const curVid = this.options.nowPlayingVideoDetails?.videoId;
					if (curVid) {
						const fullUrl = `https://m.youtube.com/watch?v=${curVid}`;
						window.location.href = fullUrl;
					}
				}
				return;
			}
			const newVal = !snap.shuffleEnabled;
			let shuffledOrder = snap.shuffledOrder;
			let shuffleStartId = snap.shuffleStartId;
			if (newVal) {
				const items = snap.items || [];
				const shuf = computeShuffle(items);
				shuffledOrder = shuf.order;
				shuffleStartId = shuf.startId;
			} else {
				shuffledOrder = null;
				shuffleStartId = null;
			}
			if (snapType === 'persisted') {
				const updated = Object.assign({}, persisted);
				updated[activeId] = Object.assign({}, updated[activeId], {
					shuffleEnabled: newVal,
					shuffledOrder,
					shuffleStartId,
				});
				const ok = await window.saveUserSetting('mixSnapshots', updated);
				if (ok) {
					shuffleButton.classList.toggle('active', newVal);
					shuffleButton.setAttribute('aria-pressed', String(newVal));
					this._updateDrawerShuffleButtonVisibility();
				}
			} else {
				const updatedTemp = Object.assign({}, snap, {
					shuffleEnabled: newVal,
					shuffledOrder,
					shuffleStartId,
				});
				const ok = await window.saveUserSetting('tempMixSnapshot', updatedTemp);
				if (ok) {
					shuffleButton.classList.toggle('active', newVal);
					shuffleButton.setAttribute('aria-pressed', String(newVal));
					this._updateDrawerShuffleButtonVisibility();
				}
			}
		});

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
	_createBottomControlsElementForAction(actionId) {
		switch (actionId) {
			case 'none':
				return null;
			case 'repeat':
				if (!this._repeatVisibilityMode) {
					this._repeatVisibilityMode = 'always-show';
				}
				return this._createRepeatButton();
			case 'repeat-show-when-active':
				this._repeatVisibilityMode = 'show-when-active';
				return this._createRepeatButton();
			case 'seek-back':
				return this._createSeekBackButton();
			case 'previous':
				return this._createPreviousButton('previous');
			case 'restart-then-previous':
				return this._createPreviousButton('restart-then-previous');
			case 'play':
				return this._createPlayButton();
			case 'skip':
				return this._createSkipButton();
			case 'seek-forward':
				return this._createSeekForwardButton();
			case 'text-search':
			case 'favourites':
			case 'video-toggle':
			case 'debug-logs':
				return this._createNavbarActionButton(actionId);
			case 'voice-search':
				return this._createVoiceButton();
			case 'limited-height-fab':
				return this.options.enableLimitedHeightMode &&
					this.options.hideNavbarInLimitedHeightMode
					? this._createLimitedHeightFAB()
					: null;
			default:
				return null;
		}
	}

	_createNavbarActionButton(actionId) {
		const button = document.createElement('button');
		button.className = 'yt-control-button yt-navbar-action-button';
		button.setAttribute('data-action', actionId);

		const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		svg.setAttribute('class', 'icon default');
		svg.setAttribute('viewBox', '0 0 24 24');
		const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

		if (actionId === 'debug-logs') {
			path.setAttribute(
				'd',
				'M20,8H17.19C16.74,7.22 16.12,6.55 15.37,6.04L17,4.41L15.59,3L13.42,5.17C12.96,5.06 12.49,5 12,5C11.51,5 11.04,5.06 10.59,5.17L8.41,3L7,4.41L8.62,6.04C7.88,6.55 7.26,7.22 6.81,8H4V10H6.09C6.04,10.33 6,10.66 6,11V12H4V14H6V15C6,15.34 6.04,15.67 6.09,16H4V18H6.81C7.85,19.79 9.78,21 12,21C14.22,21 16.15,19.79 17.19,18H20V16H17.91C17.96,15.67 18,15.34 18,15V14H20V12H18V11C18,10.66 17.96,10.33 17.91,10H20V8M16,15A4,4 0 0,1 12,19A4,4 0 0,1 8,15V11A4,4 0 0,1 12,7A4,4 0 0,1 16,11V15M14,10V12L15.5,13.5L14.5,14.5L12.5,12.5V10H14Z'
			);
		} else if (actionId === 'video-toggle') {
			const isVideoHidden = document.body.classList.contains('yt-hide-video-player');
			path.setAttribute(
				'd',
				isVideoHidden
					? 'M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4zM14 13h-3v3H9v-3H6v-2h3V8h2v3h3v2z'
					: 'M21 6.5l-4 4V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11zM9.5 16L8 14.5 10.5 12 8 9.5 9.5 8 12 10.5 14.5 8 16 9.5 13.5 12 16 14.5 14.5 16 12 13.5 9.5 16z'
			);
		} else if (actionId === 'favourites') {
			path.setAttribute(
				'd',
				'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'
			);
		} else if (actionId === 'text-search') {
			path.setAttribute(
				'd',
				'M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z'
			);
		} else {
			return null;
		}

		svg.appendChild(path);
		button.appendChild(svg);

		button.addEventListener('click', () => {
			this._handleSpeedDialAction(actionId);
			if (actionId === 'video-toggle') {
				const nowHidden = document.body.classList.contains('yt-hide-video-player');
				path.setAttribute(
					'd',
					nowHidden
						? 'M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4zM14 13h-3v3H9v-3H6v-2h3V8h2v3h3v2z'
						: 'M21 6.5l-4 4V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11zM9.5 16L8 14.5 10.5 12 8 9.5 9.5 8 12 10.5 14.5 8 16 9.5 13.5 12 16 14.5 14.5 16 12 13.5 9.5 16z'
				);
			}
		});

		return button;
	}

	_createPreviousButton(actionId) {
		this._previousActionId = actionId || 'previous';
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
		const buttonContainer = document.createElement('div');
		buttonContainer.className = 'yt-play-button-container';

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

		// Create buffer countdown indicator
		const bufferCountdown = document.createElement('div');
		bufferCountdown.className = 'yt-buffer-countdown';

		buttonContainer.appendChild(button);
		buttonContainer.appendChild(bufferCountdown);

		return buttonContainer;
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

	_createSeekBackButton() {
		const button = document.createElement('button');
		button.className = 'yt-control-button yt-seek-back-button';
		const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		svg.setAttribute('class', 'icon default');
		svg.setAttribute('viewBox', '0 0 24 24');
		const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		path.setAttribute('d', 'M11 18l-6.5-6L11 6v12zM19 18l-6.5-6L19 6v12z');
		svg.appendChild(path);
		button.appendChild(svg);
		return button;
	}

	_createSeekForwardButton() {
		const button = document.createElement('button');
		button.className = 'yt-control-button yt-seek-forward-button';
		const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		svg.setAttribute('class', 'icon default');
		svg.setAttribute('viewBox', '0 0 24 24');
		const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		path.setAttribute('d', 'M13 6l6.5 6L13 18V6zM5 6l6.5 6L5 18V6z');
		svg.appendChild(path);
		button.appendChild(svg);
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
			this.drawerFocusButton = this.playerWrapper.querySelector(
				'.yt-drawer-focus-current-button'
			);
			this.drawerLoopButton = this.playerWrapper.querySelector(
				'.yt-drawer-loop-toggle-button'
			);
			this.drawerShuffleButton = this.playerWrapper.querySelector(
				'.yt-drawer-shuffle-toggle-button'
			);
			this.drawerHeader = this.playerWrapper.querySelector('.yt-drawer-header');
			this.drawerSubheader = this.playerWrapper.querySelector('.yt-drawer-subheader');
			this.playlistWrapper = this.playerWrapper.querySelector('.yt-playlist-wrapper');
		}

		// Video details
		this.thumbnailElement = this.playerWrapper.querySelector('.yt-thumbnail');
		this.videoTitleElement = this.playerWrapper.querySelector('.yt-video-title-text');
		this.videoTitleContainerElement = this.playerWrapper.querySelector('.yt-video-title');
		this.videoAuthorElement = this.playerWrapper.querySelector('.yt-video-author');
		this.videoAuthorCompactElement = this.playerWrapper.querySelector(
			'.yt-video-author-compact'
		);
		this.videoTimerElement = this.playerWrapper.querySelector('.yt-video-timer');
		this.videoTimerDurationSpan = this.videoTimerElement
			? this.videoTimerElement.querySelector('span')
			: null;
		this.seekTooltipElement = this.playerWrapper.querySelector('.yt-seek-tooltip');
		this.seekTooltipInlineElement = this.playerWrapper.querySelector('.yt-seek-tooltip-inline');

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
		this.bufferCountdown = this.playerWrapper.querySelector('.yt-buffer-countdown');
		this.skipButton = this.playerWrapper.querySelector('.yt-skip-button');
		this.seekBackButton = this.playerWrapper.querySelector('.yt-seek-back-button');
		this.seekForwardButton = this.playerWrapper.querySelector('.yt-seek-forward-button');
		this.voiceButton = this.playerWrapper.querySelector('.yt-voice-search-button');
		this.repeatButton = this.playerWrapper.querySelector('.yt-repeat-button');

		// Gesture feedback
		this.gestureFeedbackOverlay = this.playerWrapper.querySelector(
			'.yt-gesture-feedback-overlay'
		);

		// Centered item overlay
		this.centeredOverlayElement = this.playerWrapper.querySelector(
			'.yt-horizontal-centered-item-popup'
		);
		this.centeredOverlayTitle = this.playerWrapper.querySelector('.yt-centered-title');
		this.centeredOverlayArtist = this.playerWrapper.querySelector('.yt-centered-artist');
		this.centeredOverlayThumb = this.playerWrapper.querySelector('.yt-centered-thumb');
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

		// Playlist item duration visibility
		if (this.options.hidePlaylistItemDurations) {
			this.playerWrapper.classList.add('hide-durations');
		}

		// Timer mode
		this.setPlayerTimeDisplayMode(this.options.playerTimeDisplayMode);
		if (this.options.hideTimerDuration && this.playerControls) {
			this.playerControls.classList.add('timer-hide-duration');
		}

		// Auto-hide setting class - add to body when auto-hide is enabled
		if (this.options.autoHidePlayerOnScroll) {
			document.body.classList.add('yt-auto-hide-active');
		}

		// Hide player for panel active setting - add to body when enabled
		if (this.options.hidePlayerForPanelActive) {
			document.body.classList.add('yt-player-hide-for-panel-active');
		}

		const repeatVisibilityMode = this._repeatVisibilityMode || 'always-show';
		this.playerWrapper.classList.remove(
			'hide-repeat-button',
			'hide-repeat-button-when-inactive'
		);
		if (repeatVisibilityMode === 'disabled') {
			this.playerWrapper.classList.add('hide-repeat-button');
		} else if (repeatVisibilityMode === 'show-when-active') {
			this.playerWrapper.classList.add('hide-repeat-button-when-inactive');
		}

		this.playerWrapper.classList.toggle(
			'yt-per-letter-contrast',
			this.options.titleContrastMode === 'per-letter' &&
				!(this.playerControls && this.playerControls.classList.contains('compact'))
		);
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

		this._initLetterSpans();
		this._updateContrastingTextColors();
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

		// Calculate mid drawer height (below video or metadata section)
		let midDrawerHeight = 0;
		if (maxDrawerHeight > 0) {
			const isVideoPlayerHidden = document.body.classList.contains('yt-hide-video-player');

			if (isVideoPlayerHidden) {
				// When video is hidden, use the metadata section height
				const metadataElement = DOMUtils.getElement(
					'ytm-slim-video-metadata-section-renderer'
				);
				logger.log('Measurements', `Metadata section element found: ${!!metadataElement}`);
				if (metadataElement) {
					const metadataRect = metadataElement.getBoundingClientRect();
					const playerWrapperRect = this.playerWrapper.getBoundingClientRect();
					const targetDrawerTopY = metadataRect.bottom;
					const spaceAvailable = playerWrapperRect.bottom - targetDrawerTopY;

					logger.log(
						'Measurements',
						`Metadata section calculations (metadataRect: ${metadataRect}, playerWrapperRect: ${playerWrapperRect}, targetDrawerTopY: ${targetDrawerTopY}px, spaceAvailable: ${spaceAvailable}px)`
					);

					midDrawerHeight = Math.max(
						0,
						spaceAvailable - controlsHeight - OPEN_HANDLE_HEIGHT
					);
				}
			} else {
				// Original logic for when video is visible
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

					midDrawerHeight = Math.max(
						0,
						spaceAvailable - controlsHeight - OPEN_HANDLE_HEIGHT
					);
				}
			}

			// Ensure mid height is meaningfully different from max
			if (maxDrawerHeight - midDrawerHeight < this.MIN_MEANINGFUL_SNAP_DIFFERENCE) {
				logger.log('Measurements', `Mid height too close to max, setting to 0`);
				midDrawerHeight = 0;
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

		// Initalise marquee
		this.setTitleMarqueeEnabled(this.options.enableTitleMarquee);
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

		// Set CSS custom property for dynamic calculations (CSS will handle the height)
		if (this._isLimitedHeightActive) {
			const viewport =
				window.visualViewport && window.visualViewport.height
					? window.visualViewport.height
					: window.innerHeight;
			const navbarHidden =
				!!document.body &&
				document.body.classList.contains('yt-limited-height-mode-navbar-hidden');
			const baseHeight = navbarHidden ? viewport : Math.max(0, viewport - 48);
			const limitedDrawerHeight = Math.max(0, Math.round(baseHeight * 0.6));
			this.playerWrapper.style.setProperty('--drawer-height-px', `${limitedDrawerHeight}px`);
		} else {
			this.playerWrapper.style.setProperty('--drawer-height-px', `${targetHeight}px`);
		}

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
		document.body.classList.remove('yt-horizontal-playlist');
		document.body.classList.remove('yt-fixed-video-height');

		// Apply fixed video height class if enabled
		if (this.options.enableFixedVideoHeight) {
			document.body.classList.add('yt-fixed-video-height');
		}

		if (
			//this.isDrawerDragging ||
			!this.hasPlaylist ||
			this.options.customPlaylistMode === DrawerMode.DISABLED
		) {
			document.body.classList.add('yt-drawer-closed');
			// Ensure wrapper horizontal class is cleared when drawer is closed/disabled
			if (this.playlistWrapper) {
				this.playlistWrapper.classList.remove('horizontal-playlist');
			}
			return;
		}

		// Determine horizontal playlist activation
		const horizontalActive =
			this._isLimitedHeightActive ||
			(!!this.options?.enableHorizontalPlaylistBelowVideo &&
				this.drawerState !== DrawerState.FULL);

		// Toggle horizontal playlist classes on body and wrapper
		if (horizontalActive) {
			document.body.classList.add('yt-horizontal-playlist');
			if (this.playlistWrapper) {
				this.playlistWrapper.classList.add('horizontal-playlist');
				this.playlistWrapper.classList.toggle(
					'horizontal-align-left',
					this.options.horizontalPlaylistAlignment === 'align-current-left'
				);
				if (this.options.horizontalPlaylistAlignment === 'align-current-left') {
					const padVar = getComputedStyle(this.playerWrapper).getPropertyValue(
						'--drawer-height-px'
					);
					const base = parseFloat(padVar) || 0;
					const px = Math.max(0, Math.round(base * 0.03));
					this.playlistWrapper.style.scrollPaddingLeft = `${px}px`;
				} else {
					this.playlistWrapper.style.scrollPaddingLeft = '';
				}
			}
		} else if (this.playlistWrapper) {
			this.playlistWrapper.classList.remove('horizontal-playlist');
			this.playlistWrapper.classList.remove('horizontal-align-left');
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

		// Update centered overlay and edge padding depending on horizontal state
		if (horizontalActive) {
			if (this.options.horizontalPlaylistAlignment === 'center-current') {
				this._updatePlaylistEdgePaddingForCentering();
			} else if (this.playlistWrapper) {
				this.playlistWrapper.style.paddingLeft = '0px';
				this.playlistWrapper.style.paddingRight = '0px';
			}
		} else {
			this._hideCenteredOverlay(true);
			if (this.playlistWrapper) {
				this.playlistWrapper.style.paddingLeft = '0px';
				this.playlistWrapper.style.paddingRight = '0px';
			}
		}

		// Add immediate auto-scroll focus after layout change
		if (this.hasPlaylist && this.drawerState !== this.lastBodyUpdateDrawerState) {
			this._performAutoScrollFocus(true);
		}
		this.lastBodyUpdateDrawerState = this.drawerState;
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
			// Clear header first
			this.drawerHeader.textContent = '';

			// Create "Playing next" label
			const playingNextLabel = document.createElement('div');
			playingNextLabel.className = 'yt-drawer-playing-next-label';
			playingNextLabel.textContent = 'Playing next';
			this.drawerHeader.appendChild(playingNextLabel);

			// Get the next track title
			let nextTrackTitle = null;

			// Check if there's a "Play Next" video set (from context menu)
			if (this.nextUpVideoId) {
				const playlistData = this.getCachedPlaylistData();
				const nextUpItem = playlistData.items.find(
					(item) => item.id === this.nextUpVideoId
				);
				if (nextUpItem && nextUpItem.title) {
					nextTrackTitle = nextUpItem.title;
				}
			} else {
				// Get the naturally next track in the playlist
				const currentVideoId = this.options.nowPlayingVideoDetails?.videoId;
				if (currentVideoId) {
					const nextVideo = this.getAdjacentVideo(currentVideoId, 'forward');
					if (nextVideo && nextVideo.title) {
						nextTrackTitle = nextVideo.title;
					}
				}
			}

			// Add the track title if found
			if (nextTrackTitle) {
				const trackTitleElement = document.createElement('div');
				trackTitleElement.className = 'yt-drawer-track-title';
				trackTitleElement.textContent = nextTrackTitle;
				this.drawerHeader.appendChild(trackTitleElement);
			}
		} else {
			// Clear header first
			this.drawerHeader.textContent = '';

			// Check if this is a mix (use original title for badge check)
			const isSnap =
				window.userSettings.activeMixSnapshotId &&
				this.options.currentPlaylist &&
				this.options.currentPlaylist.listId === window.userSettings.activeMixSnapshotId;
			const isMix = /^(?:my\s+)?mix/i.test(
				this._originalPlaylistTitle || this._fullPlaylistTitle
			);

			if (isSnap) {
				const snapBadge = document.createElement('span');
				snapBadge.className = 'yt-mix-badge';
				snapBadge.textContent = 'Snap';
				this.drawerHeader.appendChild(snapBadge);
			} else if (isMix) {
				// Add Mix badge before title
				const mixBadge = document.createElement('span');
				mixBadge.className = 'yt-mix-badge';
				mixBadge.textContent = 'Mix';
				this.drawerHeader.appendChild(mixBadge);
			} else if (this._originalPlaylistTitle || this._fullPlaylistTitle) {
				// Add List badge for non-mix playlists
				const listBadge = document.createElement('span');
				listBadge.className = 'yt-mix-badge';
				listBadge.textContent = 'List';
				this.drawerHeader.appendChild(listBadge);
			}

			// Add title text (strip prefix from original titles only)
			let displayTitle = this._fullPlaylistTitle;

			// Check if we're displaying the original title (not a custom/edited one)
			const isDisplayingOriginalTitle =
				this._originalPlaylistTitle &&
				this._fullPlaylistTitle === this._originalPlaylistTitle;

			if (isDisplayingOriginalTitle) {
				displayTitle = StringUtils.stripMixPrefix(displayTitle, true);
			}

			const titleText = document.createTextNode(displayTitle);
			this.drawerHeader.appendChild(titleText);
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

		// Get video container height - if video player is hidden, use 0
		const isVideoPlayerHidden = document.body.classList.contains('yt-hide-video-player');
		const videoElement = DOMUtils.getElement(this.playerContainerSelector);
		const videoHeight = isVideoPlayerHidden
			? 0
			: videoElement
				? videoElement.getBoundingClientRect().height
				: 0;

		// Calculate below-player height
		const navbarHeight = 48;
		const dragHandleHeight =
			this.options.customPlaylistMode !== DrawerMode.DISABLED && this.hasPlaylist
				? this.drawerState !== DrawerState.CLOSED
					? 70
					: 48
				: 0;
		const belowPlayerHeight = Math.max(
			window.visualViewport.height -
				navbarHeight -
				videoHeight -
				controlsHeight -
				dragHandleHeight,
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
			'--yt-drag-handle-height': `${dragHandleHeight}px`,
			'--yt-max-voice-button-width': `${maxVoiceButtonWidth}px`,
			'--yt-font-size-multiplier': fontMultiplier,
			'--yt-viewport-width': `${wrapperWidth}px`,
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
			this._applyLimitedHeightMode();
			this._invalidateAndRecalculateMeasurements();
			this._updateDrawerVisualState();
			this._updatePlaylistEdgePaddingForCentering();
			if (this.playerDrawer && this.cachedMeasurements.valid) {
				const currentHeight = this.playerDrawer.offsetHeight;
				const clampedHeight = Math.max(
					0,
					Math.min(currentHeight, this.cachedMeasurements.maxDrawerHeight)
				);
				const target = this._getNearestSnapPoint(clampedHeight);
				this._setDrawerHeight(target, false, false);
			}
			this.setTitleMarqueeEnabled(this.options.enableTitleMarquee);
			this._updateContrastingTextColors();
		}, 100);
	}

	/**
	 * Apply or remove compact split-screen mode based on viewport height and setting
	 */
	_applyLimitedHeightMode() {
		const enabled = !!this.options.enableLimitedHeightMode;
		const shouldCompact =
			enabled && window.innerHeight <= this.COMPACT_VIEWPORT_HEIGHT_THRESHOLD;

		if (shouldCompact && !this._isLimitedHeightActive) {
			this._isLimitedHeightActive = true;
			document.body.classList.add('yt-limited-height-mode');
			// Add navbar-hidden class if hideNavbarInLimitedHeightMode is enabled
			if (this.options.hideNavbarInLimitedHeightMode) {
				document.body.classList.add('yt-limited-height-mode-navbar-hidden');
			}
			// Switch controls to compact layout
			this.setLayout('compact');
			// Tighten playlist items for horizontal mode
			this.setPlaylistItemDensity('compact');
			// Ensure bottom controls remain visible in compact
			this.setBottomControlsVisibility(true);
			// Ensure first/last items can be centered in horizontal scrolling
			this._updatePlaylistEdgePaddingForCentering();
			logger.log('Layout', 'Limited height mode enabled');
			return;
		}

		if (!shouldCompact && this._isLimitedHeightActive) {
			this._isLimitedHeightActive = false;
			document.body.classList.remove(
				'yt-limited-height-mode',
				'yt-limited-height-mode-navbar-hidden'
			);
			// Restore default layout
			this.setLayout(this.options.initialLayout || 'normal');
			// Restore playlist density from settings
			this.setPlaylistItemDensity(window.userSettings.playlistItemDensity);
			// Clear edge padding when leaving horizontal mode
			if (this.playlistWrapper) {
				this.playlistWrapper.style.paddingLeft = '0px';
				this.playlistWrapper.style.paddingRight = '0px';
			}
			logger.log('Layout', 'Limited height mode disabled');
		}
	}

	/**
	 * Compute and apply horizontal edge padding so first/last item can be centered
	 */
	_updatePlaylistEdgePaddingForCentering() {
		if (!this._isHorizontalPlaylistActive() || !this.playlistWrapper || !this.hasPlaylist)
			return;

		// Collect current visible playlist items
		const items = Array.from(this.playlistWrapper.querySelectorAll('.yt-playlist-item'));
		if (!items.length) {
			this.playlistWrapper.style.paddingLeft = '0px';
			this.playlistWrapper.style.paddingRight = '0px';
			return;
		}

		const first = items[0];
		const last = items[items.length - 1];
		const wrapperWidth = this.playlistWrapper.clientWidth;

		// Calculate padding so item centers align with wrapper center
		const firstWidth = first.offsetWidth;
		const lastWidth = last.offsetWidth || firstWidth;
		const leftPad = Math.max(0, Math.round(wrapperWidth / 2 - firstWidth / 2));
		const rightPad = Math.max(0, Math.round(wrapperWidth / 2 - lastWidth / 2));

		this.playlistWrapper.style.paddingLeft = `${leftPad}px`;
		this.playlistWrapper.style.paddingRight = `${rightPad}px`;
	}

	/**
	 * Handle player controls class mutations
	 */
	_handlePlayerControlsMutation() {
		this._handleResize();
	}

	/**
	 * AUTO-HIDE SCROLL HANDLERS
	 */

	/**
	 * Throttle function for smooth scroll performance
	 */
	_throttle(func, limit) {
		let lastCall = 0;
		return function () {
			const now =
				typeof performance !== 'undefined' && performance.now
					? performance.now()
					: Date.now();
			if (now - lastCall >= limit) {
				lastCall = now;
				func.apply(this, arguments);
			} else {
				logger.log('AutoHide', 'Scroll throttled');
			}
		};
	}

	/**
	 * Handle scroll events for auto-hide functionality
	 */
	_handleScroll(event) {
		if (!this.options.autoHidePlayerOnScroll || !this.isPlayerVisible) {
			logger.log(
				'AutoHide',
				'Scroll handler skipped - autoHide:',
				this.options.autoHidePlayerOnScroll,
				'visible:',
				this.isPlayerVisible,
				'wrapper:',
				!!this.playerWrapper
			);
			return;
		}

		logger.log(
			'AutoHide',
			'Scroll event fired! Player wrapper exists:',
			!!this.playerWrapper,
			'count:',
			++this.scrollEventCount
		);

		let scrollContainer = event && event.currentTarget ? event.currentTarget : window;
		let currentScrollY =
			scrollContainer === window
				? window.scrollY || document.documentElement.scrollTop || 0
				: scrollContainer.scrollTop;

		let scrollDelta = currentScrollY - this.lastScrollY;
		if (this.lastScrollContainer !== scrollContainer) {
			scrollDelta = 0;
		}

		// Update scroll velocity (smoothed)
		this.scrollVelocity = this.scrollVelocity * 0.8 + scrollDelta * 0.2;

		// Determine scroll direction - even more sensitive detection
		let newDirection = 0;
		if (scrollDelta > 0.1) {
			newDirection = -1; // Scrolling down
		} else if (scrollDelta < -0.1) {
			newDirection = 1; // Scrolling up
		}

		// Only update direction if it's a meaningful change
		if (newDirection !== 0) {
			this.scrollDirection = newDirection;
		}

		// Safety zone: always show player when near top of page, but allow hiding if scrolling down from top
		const safetyZoneThreshold = scrollContainer === window ? 30 : 10;
		const isInSafetyZone = currentScrollY < safetyZoneThreshold;

		// Special case: if we're at the very top (scrollY=0) and scrolling down, allow hiding
		const allowHideFromTop = currentScrollY === 0 && scrollDelta > 0;

		logger.log(
			'AutoHide',
			`Scroll: Y=${currentScrollY}, delta=${scrollDelta}, velocity=${
				this.scrollVelocity
			}, direction=${this.scrollDirection}, safety=${isInSafetyZone}, hidden=${
				this.isAutoHidden
			}, container=${scrollContainer === window ? 'window' : '.watch-below-the-player'}`
		);

		// Hide player when scrolling down with sufficient velocity - very low threshold
		if (
			this.scrollDirection === -1 &&
			this.scrollVelocity > 0.5 &&
			(!isInSafetyZone || allowHideFromTop) &&
			!this.isAutoHidden
		) {
			logger.log('AutoHide', 'Triggering auto-hide');
			this._autoHidePlayer();
		}
		// Show player with stricter criteria to avoid false toggles during downward scroll
		else if (this.isAutoHidden) {
			const shouldShowFromUpward = this.scrollDirection === 1 && this.scrollVelocity < -0.5;
			const shouldShowFromSafety = isInSafetyZone && this.scrollVelocity <= 0.2;
			if (shouldShowFromUpward || shouldShowFromSafety) {
				logger.log('AutoHide', 'Triggering auto-show');
				this._autoShowPlayer();
			}
		}

		this.lastScrollY = currentScrollY;
		this.lastScrollContainer = scrollContainer;
	}

	/**
	 * Auto-hide the player with delay
	 */
	_autoHidePlayer() {
		logger.log('AutoHide', 'Auto-hide called');
		clearTimeout(this.autoHideTimer);
		this.autoHideTimer = null;
		if (this.playerWrapper && this.isPlayerVisible) {
			this.isAutoHidden = true;
			document.body.classList.add('yt-auto-hidden-player');
			logger.log('AutoHide', 'Player auto-hidden - class added to body');
		} else {
			logger.log('AutoHide', 'Auto-hide conditions not met:', {
				hasWrapper: !!this.playerWrapper,
				isVisible: this.isPlayerVisible,
				scrollDirection: this.scrollDirection,
			});
		}
	}

	/**
	 * Manual test method for auto-hide functionality
	 */
	testAutoHide() {
		logger.log('AutoHide', 'Manual test - forcing auto-hide');
		if (this.playerWrapper && this.isPlayerVisible) {
			this.isAutoHidden = true;
			this.playerWrapper.classList.add('yt-auto-hidden');
			logger.log('AutoHide', 'Manual test - player auto-hidden');
		} else {
			logger.log(
				'AutoHide',
				'Manual test failed - wrapper:',
				!!this.playerWrapper,
				'visible:',
				this.isPlayerVisible
			);
		}
	}

	/**
	 * Get current auto-hide debug state
	 */
	getAutoHideState() {
		return {
			autoHideEnabled: this.options.autoHidePlayerOnScroll,
			isPlayerVisible: this.isPlayerVisible,
			isAutoHidden: this.isAutoHidden,
			hasWrapper: !!this.playerWrapper,
			wrapperClassList: this.playerWrapper ? Array.from(this.playerWrapper.classList) : [],
			scrollEventCount: this.scrollEventCount,
			lastScrollY: this.lastScrollY,
			scrollVelocity: this.scrollVelocity,
			scrollDirection: this.scrollDirection,
			hasWatchBelowPlayer: !!this.watchBelowPlayerElement,
		};
	}

	/**
	 * Manual test method for auto-show functionality
	 */
	testAutoShow() {
		logger.log('AutoHide', 'Manual test - forcing auto-show');
		if (this.playerWrapper && this.isAutoHidden) {
			this.isAutoHidden = false;
			this.playerWrapper.classList.remove('yt-auto-hidden');
			logger.log('AutoHide', 'Manual test - player auto-shown');
		} else {
			logger.log(
				'AutoHide',
				'Manual test failed - wrapper:',
				!!this.playerWrapper,
				'hidden:',
				this.isAutoHidden
			);
		}
	}

	/**
	 * Auto-show the player immediately
	 */
	_autoShowPlayer() {
		logger.log('AutoHide', 'Auto-show called');
		clearTimeout(this.autoHideTimer);
		if (this.playerWrapper && this.isAutoHidden) {
			this.isAutoHidden = false;
			document.body.classList.remove('yt-auto-hidden-player');
			logger.log('AutoHide', 'Player auto-shown - class removed from body');
		} else {
			logger.log('AutoHide', 'Auto-show conditions not met:', {
				hasWrapper: !!this.playerWrapper,
				isAutoHidden: this.isAutoHidden,
			});
		}
	}

	/**
	 * DRAWER INTERACTION HANDLERS
	 */
	_startDrawerDrag(event) {
		if (!this._canDragDrawer() || this._isCloseButtonClick(event)) return;
		if (this._isInteractiveElement(event.target)) return;
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
		// Set CSS custom property for dynamic calculations (CSS will handle the height)
		this.playerWrapper.style.setProperty('--drawer-height-px', `${newHeight}px`);

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
			'.yt-drawer-loop-toggle-button',
			'[data-action]',
			'ytm-related-chip-cloud-renderer',
			'.ytm-infocards-creator-custom-url-buttons',
			'ytm-engagement-panel',
			'yt-drawer-focus-current-button',
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
			// In horizontal mode, allow native horizontal scrolling within the playlist wrapper
			const inPlaylistArea =
				this.playlistWrapper &&
				(this.touchStartInfo.target === this.playlistWrapper ||
					(this.touchStartInfo.target.closest &&
						this.touchStartInfo.target.closest('.yt-playlist-wrapper')));
			if (
				Math.abs(deltaX) > Math.abs(deltaY) * (1 / this.SWIPE_VERTICAL_THRESHOLD_RATIO) &&
				Math.abs(deltaX) > 10
			) {
				if (!(this._isHorizontalPlaylistActive() && inPlaylistArea)) {
					event.preventDefault();
				}
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
				// In horizontal mode, when swiping within the playlist area, do not trigger single-finger gestures
				const inPlaylistArea =
					this.playlistWrapper &&
					(this.touchStartInfo.target === this.playlistWrapper ||
						(this.touchStartInfo.target.closest &&
							this.touchStartInfo.target.closest('.yt-playlist-wrapper')));
				if (this._isHorizontalPlaylistActive() && inPlaylistArea) {
					return;
				}
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
				if (!this.playButton) return;
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
			seekBackward10: () =>
				this.options.callbacks.onGestureSeek?.(-this.options.seekSkipSeconds),
			seekForward10: () =>
				this.options.callbacks.onGestureSeek?.(this.options.seekSkipSeconds),
			togglePlaylist: () => {
				this._togglePlaylistDrawer();
				this.options.callbacks.onGestureTogglePlaylist?.();
			},
			toggleFavourites: () => {
				this.options.callbacks.onGestureToggleFavourites?.();
			},
			toggleVideoPlayer: () => {
				this.options.callbacks.onGestureToggleVideoPlayer?.();
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
			toggleFavourites:
				'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
			toggleVideoPlayer:
				'M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4zM14 13h-3v3H9v-3H6v-2h3V8h2v3h3v2z',
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
			!this.hasPlaylist ||
			!this.playlistWrapper ||
			this._isContextMenuOpen()
		) {
			return;
		}

		this._updateDrawerFocusButtonVisibility();
		if (this._overlaySuppressUntil && Date.now() < this._overlaySuppressUntil) {
			return;
		}

		clearTimeout(this.autoScrollFocusTimer);
		this.playlistWrapper.classList.add('scrolling');
		if (this.playlistTouchActive) {
			return;
		}
		this.autoScrollFocusTimer = setTimeout(() => {
			this.playlistWrapper.classList.remove('scrolling');
			this._lastOverlayScrollLeft = -1;
			this._performAutoScrollFocus_bound();
			this._updateDrawerFocusButtonVisibility();
		}, this.playlistScrollDebounceDelay);
	}

	_handlePlaylistTouchStart() {
		if (
			this.programmaticScrollInProgress ||
			!this.hasPlaylist ||
			!this.playlistWrapper ||
			this._isContextMenuOpen()
		) {
			return;
		}
		this._updateDrawerFocusButtonVisibility();
		this.playlistTouchActive = true;
		clearTimeout(this.autoScrollFocusTimer);
		this.playlistWrapper.classList.add('scrolling');
	}

	_handlePlaylistTouchEnd() {
		if (
			this.programmaticScrollInProgress ||
			!this.hasPlaylist ||
			!this.playlistWrapper ||
			this._isContextMenuOpen()
		) {
			return;
		}
		this.playlistTouchActive = false;
		clearTimeout(this.autoScrollFocusTimer);
		this.autoScrollFocusTimer = setTimeout(() => {
			this.playlistWrapper.classList.remove('scrolling');
			this._lastOverlayScrollLeft = -1;
			this._performAutoScrollFocus_bound();
			this._updateDrawerFocusButtonVisibility();
		}, this.playlistScrollDebounceDelay);
	}
	/**
	 * Update the centered item overlay during horizontal compact scrolling
	 */
	_updateCenteredOverlayOnScroll() {
		if (!this._isHorizontalPlaylistActive() || !this.playlistWrapper || !this.hasPlaylist)
			return;

		if (this._overlaySuppressUntil && Date.now() < this._overlaySuppressUntil) return;
		if (!this.playlistWrapper.classList.contains('scrolling')) return;
		const currentX = this.playlistWrapper.scrollLeft;
		const minDelta = this.options.horizontalPlaylistAlignment === 'align-current-left' ? 8 : 2;
		if (
			typeof this._lastOverlayScrollLeft === 'number' &&
			Math.abs(currentX - this._lastOverlayScrollLeft) < minDelta
		) {
			return;
		}
		this._lastOverlayScrollLeft = currentX;

		const items = Array.from(this.playlistWrapper.querySelectorAll('.yt-playlist-item'));
		if (!items.length || !this.centeredOverlayElement) return;

		const useLeftAlign = this.options.horizontalPlaylistAlignment === 'align-current-left';
		const anchorX = (() => {
			if (useLeftAlign) {
				const sp = parseInt(
					getComputedStyle(this.playlistWrapper).getPropertyValue('scroll-padding-left')
				);
				return this.playlistWrapper.scrollLeft + (isNaN(sp) ? 0 : sp);
			}
			return this.playlistWrapper.scrollLeft + this.playlistWrapper.clientWidth / 2;
		})();
		let closestItem = null;
		let closestDist = Infinity;
		for (const item of items) {
			const itemAnchor = useLeftAlign
				? item.offsetLeft
				: item.offsetLeft + item.offsetWidth / 2;
			const dist = Math.abs(itemAnchor - anchorX);
			if (dist < closestDist) {
				closestDist = dist;
				closestItem = item;
			}
		}

		if (!closestItem) return;

		// Highlight centered item
		this.playlistWrapper
			.querySelectorAll('.yt-playlist-item.centered')
			.forEach((el) => el.classList.remove('centered'));
		closestItem.classList.add('centered');

		// Update overlay content
		const titleEl = closestItem.querySelector('.yt-playlist-item-title');
		const artistEl = closestItem.querySelector('.yt-playlist-item-artist');
		const thumbEl = closestItem.querySelector('.yt-playlist-item-thumbnail');

		const useHeaderControlsOverlay =
			!!this.options.horizontalPlaylistDetailsInHeaderControls &&
			this._isHorizontalPlaylistActive();

		if (useHeaderControlsOverlay) {
			if (this._isLimitedHeightActive) {
				// Reduced height mode: overlay in playing details area
				this._ensureControlsCenteredOverlay();
				if (this.controlsCenteredOverlayTitle) {
					this.controlsCenteredOverlayTitle.textContent = titleEl?.textContent || '';
				}
				if (this.controlsCenteredOverlayArtist) {
					this.controlsCenteredOverlayArtist.textContent = artistEl?.textContent || '';
				}
				if (this.controlsCenteredOverlayThumb && thumbEl) {
					this.controlsCenteredOverlayThumb.style.backgroundImage =
						thumbEl.style.backgroundImage || '';
				}
				if (this.controlsCenteredOverlay) {
					this.controlsCenteredOverlay.classList.add('visible');
				}
			} else {
				// Normal height: overlay in drawer header content
				this._ensureDrawerCenteredOverlay();
				if (this.drawerCenteredOverlayTitle) {
					this.drawerCenteredOverlayTitle.textContent = titleEl?.textContent || '';
				}
				if (this.drawerCenteredOverlayArtist) {
					this.drawerCenteredOverlayArtist.textContent = artistEl?.textContent || '';
				}
				if (this.drawerCenteredOverlayThumb && thumbEl) {
					this.drawerCenteredOverlayThumb.style.backgroundImage =
						thumbEl.style.backgroundImage || '';
				}
				if (this.drawerCenteredOverlay) {
					this.drawerCenteredOverlay.classList.add('visible');
				}
			}
		} else {
			// Default centered overlay
			if (this.centeredOverlayTitle) {
				this.centeredOverlayTitle.textContent = titleEl?.textContent || '';
			}
			if (this.centeredOverlayArtist) {
				this.centeredOverlayArtist.textContent = artistEl?.textContent || '';
			}
			if (this.centeredOverlayThumb && thumbEl) {
				this.centeredOverlayThumb.style.backgroundImage =
					thumbEl.style.backgroundImage || '';
			}

			if (this.centeredOverlayElement) {
				this.centeredOverlayElement.classList.add('visible');
			}
		}

		// Hide on idle
		clearTimeout(this.centeredOverlayHideTimer);
		this.centeredOverlayHideTimer = setTimeout(() => {
			this._hideCenteredOverlay();
		}, this.playlistScrollDebounceDelay + 1000);
	}

	_hideCenteredOverlay(resetHighlight = true) {
		if (!this.centeredOverlayElement) return;
		this.centeredOverlayElement.classList.remove('visible');
		if (this.drawerCenteredOverlay) {
			this.drawerCenteredOverlay.classList.remove('visible');
		}
		if (this.controlsCenteredOverlay) {
			this.controlsCenteredOverlay.classList.remove('visible');
		}
		clearTimeout(this.centeredOverlayHideTimer);
		this._overlaySuppressUntil = Date.now() + 300;
		if (resetHighlight && this.playlistWrapper) {
			this.playlistWrapper
				.querySelectorAll('.yt-playlist-item.centered')
				.forEach((el) => el.classList.remove('centered'));
		}
	}

	_ensureDrawerCenteredOverlay() {
		if (!this.playerWrapper) return;
		const headerContent = this.playerWrapper.querySelector('.yt-drawer-header-content');
		if (!headerContent) return;
		if (!this.drawerCenteredOverlay) {
			const overlay = document.createElement('div');
			overlay.className = 'yt-horizontal-centered-item-overlay yt-drawer-centered-overlay';
			const thumb = document.createElement('div');
			thumb.className = 'yt-overlay-thumb';
			const text = document.createElement('div');
			text.className = 'yt-overlay-text';
			const title = document.createElement('div');
			title.className = 'yt-overlay-title';
			const artist = document.createElement('div');
			artist.className = 'yt-overlay-artist';
			text.appendChild(title);
			text.appendChild(artist);
			overlay.appendChild(thumb);
			overlay.appendChild(text);
			headerContent.appendChild(overlay);

			this.drawerCenteredOverlay = overlay;
			this.drawerCenteredOverlayThumb = thumb;
			this.drawerCenteredOverlayTitle = title;
			this.drawerCenteredOverlayArtist = artist;
		}
	}

	_ensureControlsCenteredOverlay() {
		if (!this.playerWrapper) return;
		const detailsOverlay = this.playerWrapper.querySelector('.yt-details-overlay');
		if (!detailsOverlay) return;
		if (!this.controlsCenteredOverlay) {
			const overlay = document.createElement('div');
			overlay.className = 'yt-horizontal-centered-item-overlay yt-controls-centered-overlay';
			const thumb = document.createElement('div');
			thumb.className = 'yt-overlay-thumb';
			const text = document.createElement('div');
			text.className = 'yt-overlay-text';
			const title = document.createElement('div');
			title.className = 'yt-overlay-title';
			const artist = document.createElement('div');
			artist.className = 'yt-overlay-artist';
			text.appendChild(title);
			text.appendChild(artist);
			overlay.appendChild(thumb);
			overlay.appendChild(text);
			detailsOverlay.appendChild(overlay);

			this.controlsCenteredOverlay = overlay;
			this.controlsCenteredOverlayThumb = thumb;
			this.controlsCenteredOverlayTitle = title;
			this.controlsCenteredOverlayArtist = artist;
		}
	}

	_performAutoScrollFocus(immediate = false, force = false) {
		if (
			((!this.options.keepPlaylistFocused || this._isContextMenuOpen()) &&
				!immediate &&
				!force) ||
			!this.hasPlaylist ||
			!this.playlistWrapper
		) {
			return;
		}

		const activeItem = this.playlistWrapper.querySelector('.yt-playlist-item.active');
		if (activeItem) {
			this.programmaticScrollInProgress = true;
			this._scrollActiveItemIntoView(activeItem, immediate ? 'instant' : 'smooth');
			setTimeout(() => {
				this.programmaticScrollInProgress = false;
			}, 500);
			this._updateDrawerFocusButtonVisibility();
		}
	}

	_isActiveItemVisible() {
		if (!this.playlistWrapper) return true;
		const activeItem = this.playlistWrapper.querySelector('.yt-playlist-item.active');
		if (!activeItem) return true;
		const containerRect = this.playlistWrapper.getBoundingClientRect();
		const itemRect = activeItem.getBoundingClientRect();
		if (this._isHorizontalPlaylistActive()) {
			return itemRect.left >= containerRect.left && itemRect.right <= containerRect.right;
		}
		return itemRect.top >= containerRect.top && itemRect.bottom <= containerRect.bottom;
	}

	_updateDrawerFocusButtonVisibility() {
		if (this.drawerFocusButton) {
			const shouldShow =
				!this.options.keepPlaylistFocused &&
				this.hasPlaylist &&
				!!this.playlistWrapper &&
				!this._isActiveItemVisible();
			this.drawerFocusButton.classList.toggle('visible', shouldShow);
		}
		this._updateDrawerCloseButtonVisibility();
		this._updateDrawerLoopButtonVisibility();
		this._updateDrawerShuffleButtonVisibility();
	}

	_updateDrawerCloseButtonVisibility() {
		if (!this.drawerCloseButton) return;
		const shouldShow = !!this.hasPlaylist && this._canDragDrawer();
		this.drawerCloseButton.classList.toggle('visible', shouldShow);
	}

	_updateDrawerLoopButtonVisibility() {
		if (!this.drawerLoopButton) return;
		const mode = this._drawerLoopVisibilityMode || 'all';
		const activeId = window.userSettings.activeMixSnapshotId;
		const listId = this.options.currentPlaylist?.listId;
		const persisted = (window.userSettings.mixSnapshots || {})[activeId];
		const tempSnap = window.userSettings.tempMixSnapshot;
		const isActiveSnap =
			!!activeId &&
			!!listId &&
			listId === activeId &&
			(!!persisted || (tempSnap && tempSnap.id === activeId));
		const shouldShow =
			mode === 'hidden'
				? false
				: mode === 'all'
					? !!this.hasPlaylist
					: mode === 'active-only'
						? isActiveSnap
						: isActiveSnap;
		this.drawerLoopButton.classList.toggle('visible', !!shouldShow);
		let enabled = false;
		if (isActiveSnap) {
			const snap = persisted || tempSnap;
			enabled = !!snap?.loopEnabled;
		}
		this.drawerLoopButton.classList.toggle('active', enabled);
		this.drawerLoopButton.setAttribute('aria-pressed', String(enabled));
	}

	_updateDrawerShuffleButtonVisibility() {
		if (!this.drawerShuffleButton) return;
		const mode = this._drawerShuffleVisibilityMode || 'all';
		const activeId = window.userSettings.activeMixSnapshotId;
		const listId = this.options.currentPlaylist?.listId;
		const persisted = (window.userSettings.mixSnapshots || {})[activeId];
		const tempSnap = window.userSettings.tempMixSnapshot;
		const isActiveSnap =
			!!activeId &&
			!!listId &&
			listId === activeId &&
			(!!persisted || (tempSnap && tempSnap.id === activeId));
		const shouldShow =
			mode === 'hidden'
				? false
				: mode === 'all'
					? !!this.hasPlaylist
					: mode === 'active-only'
						? isActiveSnap
						: isActiveSnap;
		this.drawerShuffleButton.classList.toggle('visible', !!shouldShow);
		let enabled = false;
		if (isActiveSnap) {
			const snap = persisted || tempSnap;
			enabled = !!snap?.shuffleEnabled;
		}
		this.drawerShuffleButton.classList.toggle('active', enabled);
		this.drawerShuffleButton.setAttribute('aria-pressed', String(enabled));
	}
	_scrollActiveItemIntoView(activeItem, behavior = 'smooth') {
		if (!activeItem || !this.playlistWrapper || !activeItem.offsetParent) return;

		// In horizontal mode, scroll along X.
		if (this._isHorizontalPlaylistActive()) {
			const wrapperWidth = this.playlistWrapper.clientWidth;
			const itemWidth = activeItem.offsetWidth;
			let targetScrollLeft;
			if (this.options.horizontalPlaylistAlignment === 'align-current-left') {
				targetScrollLeft = activeItem.offsetLeft;
			} else {
				const itemCenter = activeItem.offsetLeft + itemWidth / 2;
				targetScrollLeft = itemCenter - wrapperWidth / 2;
			}

			// Clamp to valid scroll range
			const maxScrollLeft = Math.max(0, this.playlistWrapper.scrollWidth - wrapperWidth);
			targetScrollLeft = Math.max(0, Math.min(targetScrollLeft, maxScrollLeft));

			const currentScrollLeft = this.playlistWrapper.scrollLeft;

			if (Math.abs(currentScrollLeft - targetScrollLeft) <= 20) return;

			requestAnimationFrame(() => {
				if (this.playlistWrapper) {
					this.playlistWrapper.scrollTo({
						left: targetScrollLeft,
						behavior,
					});
				}
			});

			return;
		}

		// Default vertical behavior
		const playlistHeight = this.playlistWrapper.offsetHeight;
		const itemHeight = activeItem.offsetHeight;

		let targetScrollTop;
		if (this.options.verticalPlaylistAlignment === 'center-current') {
			targetScrollTop = activeItem.offsetTop - Math.max(0, (playlistHeight - itemHeight) / 2);
		} else if (this.options.verticalPlaylistAlignment === 'align-current-top') {
			targetScrollTop = activeItem.offsetTop;
		} else {
			const previousItem = activeItem.previousElementSibling;
			targetScrollTop = activeItem.offsetTop;
			if (previousItem && playlistHeight >= itemHeight * 3) {
				targetScrollTop = previousItem.offsetTop;
			}
		}

		targetScrollTop = Math.max(0, targetScrollTop);
		const currentScrollTop = this.playlistWrapper.scrollTop;

		if (Math.abs(currentScrollTop - targetScrollTop) <= 20) return;

		requestAnimationFrame(() => {
			if (this.playlistWrapper) {
				this.playlistWrapper.scrollTo({
					top: targetScrollTop,
					behavior,
				});
			}
		});
	}

	/**
	 * Determine if the playlist is currently in a horizontal scrolling layout
	 * This is true when limited height mode is active OR when the below-video
	 * horizontal playlist option is active and the drawer is not fully open.
	 */
	_isHorizontalPlaylistActive() {
		return (
			(!!document.body && document.body.classList.contains('yt-horizontal-playlist')) ||
			this._isLimitedHeightActive
		);
	}

	/**
	 * Check if the context menu is currently open
	 * @returns {boolean} True if context menu is visible
	 */
	_isContextMenuOpen() {
		return (
			this.contextMenu &&
			this.contextMenu.style.display === 'flex' &&
			this.contextMenu.classList.contains('visible')
		);
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
			const isCompact =
				this.playerControls && this.playerControls.classList.contains('compact');
			if (isBackground && isCompact && this.seekbarInline) {
				this.seekbarInline.classList.add('dragging');
			}
			document.body.classList.add('yt-player-body-dragging');

			// Show tooltip if mode is seek-tooltip
			if (this.options.playerTimeDisplayMode === 'seek-tooltip') {
				const useInlineTooltip =
					this.playerControls && this.playerControls.classList.contains('compact');
				const tooltip = useInlineTooltip
					? this.seekTooltipInlineElement
					: isBackground
						? this.seekTooltipElement
						: this.seekTooltipInlineElement;
				if (tooltip) {
					tooltip.style.display = 'block';
				}
			}

			if (
				isBackground &&
				this.detailsOverlayElement &&
				!(this.playerControls && this.playerControls.classList.contains('compact'))
			) {
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
			const percentage = (this.totalTime > 0 ? this.trackTime / this.totalTime : 0) * 100;
			if (this.seekbarProgressInline)
				this.seekbarProgressInline.style.width = `${percentage}%`;
			if (this.seekbarProgress) this.seekbarProgress.style.width = `${percentage}%`;
			this._updateTimerDisplay();
			this._updatePrevButtonVisualState();

			// Update tooltip content/position when seeking
			if (this.options.playerTimeDisplayMode === 'seek-tooltip') {
				const useInlineTooltip =
					this.playerControls && this.playerControls.classList.contains('compact');
				const tooltip = useInlineTooltip
					? this.seekTooltipInlineElement
					: isBackground
						? this.seekTooltipElement
						: this.seekTooltipInlineElement;
				const posRect =
					useInlineTooltip && this.seekbarInline
						? this.seekbarInline.getBoundingClientRect()
						: rect;

				if (tooltip && posRect.width > 0) {
					const percentage =
						(this.totalTime > 0 ? this.trackTime / this.totalTime : 0) * 100;
					this._updateSeekTooltipText(tooltip);
					const px = Math.max(
						0,
						Math.min(posRect.width, (percentage / 100) * posRect.width)
					);
					tooltip.style.left = `${px}px`;
				}
			}

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
			const isCompact =
				this.playerControls && this.playerControls.classList.contains('compact');
			if (isBackground && isCompact && this.seekbarInline) {
				this.seekbarInline.classList.remove('dragging');
			}
			document.body.classList.remove('yt-player-body-dragging');

			// Hide tooltip after drag
			if (this.options.playerTimeDisplayMode === 'seek-tooltip') {
				const useInlineTooltip =
					this.playerControls && this.playerControls.classList.contains('compact');
				const tooltip = useInlineTooltip
					? this.seekTooltipInlineElement
					: isBackground
						? this.seekTooltipElement
						: this.seekTooltipInlineElement;
				if (tooltip) {
					tooltip.style.display = 'none';
				}
			}

			if (
				isBackground &&
				this.detailsOverlayElement &&
				!(this.playerControls && this.playerControls.classList.contains('compact'))
			) {
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
					const newPercentage =
						(this.totalTime > 0 ? this.trackTime / this.totalTime : 0) * 100;
					if (this.seekbarProgressInline)
						this.seekbarProgressInline.style.width = `${newPercentage}%`;
					if (this.seekbarProgress)
						this.seekbarProgress.style.width = `${newPercentage}%`;
					this._updateTimerDisplay();
					this._updatePrevButtonVisualState();

					if (this.options.playerTimeDisplayMode === 'seek-tooltip') {
						const useInlineTooltip =
							this.playerControls &&
							this.playerControls.classList.contains('compact');
						const tooltip = useInlineTooltip
							? this.seekTooltipInlineElement
							: isBackground
								? this.seekTooltipElement
								: this.seekTooltipInlineElement;
						if (tooltip) {
							const posRect =
								useInlineTooltip && this.seekbarInline
									? this.seekbarInline.getBoundingClientRect()
									: rect;
							if (posRect.width > 0) {
								this._updateSeekTooltipText(tooltip);
								const px = Math.max(
									0,
									Math.min(posRect.width, (newPercentage / 100) * posRect.width)
								);
								tooltip.style.left = `${px}px`;
								tooltip.style.display = 'block';
							}
						}
					}

					if (this.options.callbacks.onSeekbarUpdate) {
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

	_setupBottomControlsGestures() {
		if (!this.playerWrapper) return;

		const getDoubleClickDelay = () =>
			Math.max(
				120,
				Math.min(800, parseInt(window.userSettings?.bottomControlsDoubleClickDelay) || 260)
			);
		const HOLD_TRIGGER_DELAY = 350;
		const HOLD_REPEAT_INTERVAL = 160;
		const HOLD_REPEAT_SEEK_STEP = 2;

		const slotConfigs = [
			{
				slotClass: 'yt-bottom-left-slot1',
				baseKey: 'layoutBottomLeftSlot1',
				defaultAction: 'repeat',
			},
			{
				slotClass: 'yt-bottom-center-slot1',
				baseKey: 'layoutBottomCenterSlot1',
				defaultAction: 'seek-back',
			},
			{
				slotClass: 'yt-bottom-center-slot2',
				baseKey: 'layoutBottomCenterSlot2',
				defaultAction: 'previous',
			},
			{
				slotClass: 'yt-bottom-center-slot3',
				baseKey: 'layoutBottomCenterSlot3',
				defaultAction: 'play',
			},
			{
				slotClass: 'yt-bottom-center-slot4',
				baseKey: 'layoutBottomCenterSlot4',
				defaultAction: 'skip',
			},
			{
				slotClass: 'yt-bottom-center-slot5',
				baseKey: 'layoutBottomCenterSlot5',
				defaultAction: 'seek-forward',
			},
			{
				slotClass: 'yt-bottom-right-slot1',
				baseKey: 'layoutBottomRightSlot1',
				defaultAction: 'voice-search',
			},
			{
				slotClass: 'yt-bottom-right-slot2',
				baseKey: 'layoutBottomRightSlot2',
				defaultAction: 'limited-height-fab',
			},
		];

		const lockedPrimaryActions = {
			layoutBottomCenterSlot3: 'play',
			layoutBottomRightSlot2: 'limited-height-fab',
		};

		const getPrimaryAction = (baseKey, fallback) => {
			if (lockedPrimaryActions[baseKey]) return lockedPrimaryActions[baseKey];
			return window.userSettings?.[baseKey] || fallback;
		};

		const getDoubleAction = (baseKey) =>
			window.userSettings?.[`${baseKey}DoubleAction`] || 'none';
		const getHoldAction = (baseKey) => window.userSettings?.[`${baseKey}HoldAction`] || 'none';

		const isSeekAction = (actionId) => actionId === 'seek-back' || actionId === 'seek-forward';
		const getSeekDirection = (actionId) => (actionId === 'seek-forward' ? 1 : -1);

		for (const { slotClass, baseKey, defaultAction } of slotConfigs) {
			const slotEl = this.playerWrapper.querySelector(`.yt-control-slot.${slotClass}`);
			if (!slotEl) continue;

			const buttonEl =
				slotEl.querySelector('.yt-limited-height-fab-main') ||
				slotEl.querySelector('button');
			if (!buttonEl) continue;

			let clickTimeout = null;
			let holdTimeout = null;
			let holdInterval = null;
			let lastClickAt = 0;
			let didHold = false;
			let pointerDownActive = false;
			let activePointerId = null;

			const clearTimers = () => {
				if (clickTimeout) {
					clearTimeout(clickTimeout);
					clickTimeout = null;
				}
				if (holdTimeout) {
					clearTimeout(holdTimeout);
					holdTimeout = null;
				}
				if (holdInterval) {
					clearInterval(holdInterval);
					holdInterval = null;
				}
			};

			const stopHold = () => {
				if (holdTimeout) {
					clearTimeout(holdTimeout);
					holdTimeout = null;
				}
				if (holdInterval) {
					clearInterval(holdInterval);
					holdInterval = null;
				}
				this._clearBottomControlHoldIcon(buttonEl);
			};

			const executeAction = (actionId, { isGesture } = {}) => {
				if (!this.isPlayerVisible) return;
				if (!actionId || actionId === 'none') return;
				this._executeBottomControlAction(actionId, buttonEl);
				if (isGesture) {
					this._showBottomControlGestureIcon(buttonEl, actionId);
				}
			};

			const startHold = () => {
				const holdAction = getHoldAction(baseKey);
				if (!holdAction || holdAction === 'none') return;
				didHold = false;
				if (holdTimeout) clearTimeout(holdTimeout);
				holdTimeout = setTimeout(() => {
					didHold = true;
					this._setBottomControlHoldIcon(buttonEl, holdAction);
					if (isSeekAction(holdAction)) {
						const dir = getSeekDirection(holdAction);
						holdInterval = setInterval(() => {
							this.options.callbacks.onGestureSeek?.(dir * HOLD_REPEAT_SEEK_STEP);
						}, HOLD_REPEAT_INTERVAL);
						return;
					}
					executeAction(holdAction);
				}, HOLD_TRIGGER_DELAY);
			};

			const handleSingleClick = () => {
				const primaryAction = getPrimaryAction(baseKey, defaultAction);
				executeAction(primaryAction);
			};

			const handleClick = (e) => {
				e.preventDefault();
				e.stopPropagation();
				e.stopImmediatePropagation();
				if (didHold) {
					didHold = false;
					return;
				}
				const doubleAction = getDoubleAction(baseKey);
				if (!doubleAction || doubleAction === 'none') {
					handleSingleClick();
					return;
				}
				const DOUBLE_CLICK_DELAY = getDoubleClickDelay();
				const now = Date.now();
				if (now - lastClickAt <= DOUBLE_CLICK_DELAY) {
					lastClickAt = 0;
					if (clickTimeout) {
						clearTimeout(clickTimeout);
						clickTimeout = null;
					}
					executeAction(doubleAction, { isGesture: true });
					return;
				}
				lastClickAt = now;
				if (clickTimeout) clearTimeout(clickTimeout);
				clickTimeout = setTimeout(() => {
					clickTimeout = null;
					handleSingleClick();
				}, DOUBLE_CLICK_DELAY);
			};

			const onPointerDown = (e) => {
				if (typeof e.button === 'number' && e.button !== 0) return;
				if (pointerDownActive) return;
				pointerDownActive = true;
				activePointerId = typeof e.pointerId === 'number' ? e.pointerId : 'mouse';
				if (window.PointerEvent && typeof buttonEl.setPointerCapture === 'function') {
					try {
						buttonEl.setPointerCapture(e.pointerId);
					} catch (err) {}
				}
				stopHold();
				startHold();
			};

			const onPointerUp = (e) => {
				if (!pointerDownActive) return;
				if (typeof e.pointerId === 'number' && activePointerId !== e.pointerId) return;
				pointerDownActive = false;
				activePointerId = null;
				if (window.PointerEvent && typeof buttonEl.releasePointerCapture === 'function') {
					try {
						buttonEl.releasePointerCapture(e.pointerId);
					} catch (err) {}
				}
				stopHold();
			};

			const onPointerCancel = (e) => {
				if (!pointerDownActive) return;
				if (typeof e.pointerId === 'number' && activePointerId !== e.pointerId) return;
				pointerDownActive = false;
				activePointerId = null;
				clearTimers();
				didHold = false;
			};

			const isEventFromButton = (e) => {
				const path = typeof e.composedPath === 'function' ? e.composedPath() : null;
				if (path && Array.isArray(path)) return path.includes(buttonEl);
				return buttonEl.contains(e.target);
			};

			const onGlobalPointerDown = (e) => {
				if (!isEventFromButton(e)) return;
				onPointerDown(e);
			};

			const onGlobalPointerUp = (e) => {
				if (!pointerDownActive) return;
				onPointerUp(e);
			};

			const onGlobalPointerCancel = (e) => {
				if (!pointerDownActive) return;
				onPointerCancel(e);
			};

			if (window.PointerEvent) {
				buttonEl.addEventListener('pointerdown', onPointerDown, { passive: false });
				buttonEl.addEventListener('pointerup', onPointerUp, { passive: false });
				buttonEl.addEventListener('pointercancel', onPointerCancel, { passive: false });
				buttonEl.addEventListener('lostpointercapture', onPointerUp, { passive: false });
				window.addEventListener('pointerdown', onGlobalPointerDown, {
					passive: false,
					capture: true,
				});
				window.addEventListener('pointerup', onGlobalPointerUp, {
					passive: false,
					capture: true,
				});
				window.addEventListener('pointercancel', onGlobalPointerCancel, {
					passive: false,
					capture: true,
				});
			} else {
				buttonEl.addEventListener('mousedown', onPointerDown, { passive: false });
				buttonEl.addEventListener('mouseup', onPointerUp, { passive: false });
				buttonEl.addEventListener('mouseleave', onPointerUp, { passive: false });
				buttonEl.addEventListener('touchstart', onPointerDown, { passive: false });
				buttonEl.addEventListener('touchend', onPointerUp, { passive: false });
				buttonEl.addEventListener('touchcancel', onPointerCancel, { passive: false });
				window.addEventListener('mousedown', onGlobalPointerDown, {
					passive: false,
					capture: true,
				});
				window.addEventListener('mouseup', onGlobalPointerUp, {
					passive: false,
					capture: true,
				});
				window.addEventListener('touchstart', onGlobalPointerDown, {
					passive: false,
					capture: true,
				});
				window.addEventListener('touchend', onGlobalPointerUp, {
					passive: false,
					capture: true,
				});
				window.addEventListener('touchcancel', onGlobalPointerCancel, {
					passive: false,
					capture: true,
				});
			}

			buttonEl.addEventListener(
				'contextmenu',
				(e) => {
					e.preventDefault();
				},
				{ passive: false }
			);
			buttonEl.addEventListener('click', handleClick, { passive: false, capture: true });
		}
	}

	_executeBottomControlAction(actionId, buttonEl) {
		if (!this.isPlayerVisible) return;

		if (actionId === 'play') {
			if (!this.playButton) return;
			let newState;
			if (this.playButton.classList.contains('paused')) newState = PlayState.PLAYING;
			else if (this.playButton.classList.contains('playing')) newState = PlayState.PAUSED;
			else if (this.playButton.classList.contains('buffering')) newState = PlayState.PAUSED;
			if (!newState) return;
			this.setPlayState(newState);
			const details = newState === PlayState.PAUSED ? { source: 'custom' } : null;
			this.options.callbacks.onPlayPauseClick?.(newState, details);
			return;
		}

		if (actionId === 'previous' || actionId === 'restart-then-previous') {
			if (!this.prevButton || this.isPrevButtonAnimating) return;
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
			this.options.callbacks.onPreviousClick?.(actionId);
			return;
		}

		if (actionId === 'skip') {
			this.options.callbacks.onSkipClick?.();
			return;
		}

		if (actionId === 'seek-back' || actionId === 'seek-forward') {
			const secs = Number(this.options.seekSkipSeconds) || 10;
			const dir = actionId === 'seek-forward' ? 1 : -1;
			this.options.callbacks.onGestureSeek?.(dir * secs);
			return;
		}

		if (actionId === 'voice-search') {
			if (!this.voiceButton) return;
			const currentState = this.voiceButton.classList.contains('listening')
				? VoiceState.LISTENING
				: VoiceState.NORMAL;
			const nextState =
				currentState === 'listening' ? VoiceState.NORMAL : VoiceState.LISTENING;
			this.options.callbacks.onVoiceSearchClick?.(nextState);
			return;
		}

		if (actionId === 'repeat') {
			if (!this.repeatButton) return;
			const isCurrentlyOn = this.repeatButton.classList.contains('on');
			const newState = isCurrentlyOn ? 'off' : 'on';
			this.repeatButton.classList.remove('on', 'off');
			this.repeatButton.classList.add(newState);
			this.options.callbacks.onRepeatClick?.(newState === 'on');
			return;
		}

		if (actionId === 'limited-height-fab') {
			const fab = buttonEl?.closest?.('.yt-limited-height-fab');
			const speedDial = fab?.querySelector?.('.yt-speed-dial');
			if (speedDial) {
				speedDial.classList.toggle('yt-speed-dial-open');
			}
			return;
		}

		if (
			actionId === 'text-search' ||
			actionId === 'favourites' ||
			actionId === 'video-toggle' ||
			actionId === 'debug-logs'
		) {
			this._handleSpeedDialAction(actionId);
			if (actionId === 'video-toggle') {
				const path = buttonEl?.querySelector?.('svg path');
				if (path) {
					const nowHidden = document.body.classList.contains('yt-hide-video-player');
					path.setAttribute(
						'd',
						nowHidden
							? 'M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4zM14 13h-3v3H9v-3H6v-2h3V8h2v3h3v2z'
							: 'M21 6.5l-4 4V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11zM9.5 16L8 14.5 10.5 12 8 9.5 9.5 8 12 10.5 14.5 8 16 9.5 13.5 12 16 14.5 14.5 16 12 13.5 9.5 16z'
					);
				}
			}
			return;
		}
	}

	_showBottomControlGestureIcon(buttonEl, actionId) {
		if (!buttonEl) return;

		const iconSVG = this._createBottomActionIconSVG(actionId);
		if (!iconSVG) return;

		const existing = Array.from(buttonEl.querySelectorAll('svg'));
		existing.forEach((svg) => {
			svg.style.setProperty('display', 'none', 'important');
		});

		buttonEl.insertBefore(iconSVG, buttonEl.firstChild);

		clearTimeout(buttonEl._ytGestureIconTimeoutId);
		buttonEl._ytGestureIconTimeoutId = setTimeout(() => {
			if (iconSVG.parentNode === buttonEl) {
				buttonEl.removeChild(iconSVG);
			}
			existing.forEach((svg) => {
				svg.style.removeProperty('display');
			});
		}, 650);
	}

	_setBottomControlHoldIcon(buttonEl, actionId) {
		if (!buttonEl) return;
		this._clearBottomControlHoldIcon(buttonEl);

		const iconSVG = this._createBottomActionIconSVG(actionId);
		if (!iconSVG) return;

		const existing = Array.from(buttonEl.querySelectorAll('svg'));
		existing.forEach((svg) => {
			svg.style.setProperty('display', 'none', 'important');
		});

		buttonEl.insertBefore(iconSVG, buttonEl.firstChild);
		buttonEl._ytHoldIconSvg = iconSVG;
		buttonEl._ytHoldIconHiddenSvgs = existing;
	}

	_clearBottomControlHoldIcon(buttonEl) {
		if (!buttonEl) return;
		const iconSVG = buttonEl._ytHoldIconSvg;
		if (iconSVG && iconSVG.parentNode === buttonEl) {
			buttonEl.removeChild(iconSVG);
		}
		const hidden = buttonEl._ytHoldIconHiddenSvgs;
		if (hidden && Array.isArray(hidden)) {
			hidden.forEach((svg) => {
				svg.style.removeProperty('display');
			});
		}
		buttonEl._ytHoldIconSvg = null;
		buttonEl._ytHoldIconHiddenSvgs = null;
	}

	_createBottomActionIconSVG(actionId) {
		const iconPaths = {
			previous: 'M6 6h2v12H6zm3.5 6l8.5 6V6z',
			skip: 'M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z',
			'seek-back': 'M11 18l-6.5-6L11 6v12zM19 18l-6.5-6L19 6v12z',
			'seek-forward': 'M13 6l6.5 6L13 18V6zM5 6l6.5 6L5 18V6z',
			repeat: 'M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z',
			play: this.playButton?.classList.contains('paused')
				? 'M8 5v14l11-7z'
				: 'M6 19h4V5H6v14zm8-14v14h4V5h-4z',
			'voice-search': [
				'M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z',
				'M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z',
			],
			'limited-height-fab': 'M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z',
			'text-search':
				'M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
			favourites:
				'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
			'video-toggle':
				'M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4zM14 13h-3v3H9v-3H6v-2h3V8h2v3h3v2z',
			'debug-logs':
				'M20,8H17.19C16.74,7.22 16.12,6.55 15.37,6.04L17,4.41L15.59,3L13.42,5.17C12.96,5.06 12.49,5 12,5C11.51,5 11.04,5.06 10.59,5.17L8.41,3L7,4.41L8.62,6.04C7.88,6.55 7.26,7.22 6.81,8H4V10H6.09C6.04,10.33 6,10.66 6,11V12H4V14H6V15C6,15.34 6.04,15.67 6.09,16H4V18H6.81C7.85,19.79 9.78,21 12,21C14.22,21 16.15,19.79 17.19,18H20V16H17.91C17.96,15.67 18,15.34 18,15V14H20V12H18V11C18,10.66 17.96,10.33 17.91,10H20V8M16,15A4,4 0 0,1 12,19A4,4 0 0,1 8,15V11A4,4 0 0,1 12,7A4,4 0 0,1 16,11V15M14,10V12L15.5,13.5L14.5,14.5L12.5,12.5V10H14Z',
		};

		const pathData = iconPaths[actionId];
		if (!pathData) return null;

		const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		svg.setAttribute('width', '24');
		svg.setAttribute('height', '24');
		svg.setAttribute('viewBox', '0 0 24 24');
		svg.style.fill = 'currentColor';

		if (Array.isArray(pathData)) {
			const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
			pathData.forEach((d) => {
				const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
				path.setAttribute('d', d);
				g.appendChild(path);
			});
			svg.appendChild(g);
		} else {
			const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
			path.setAttribute('d', pathData);
			svg.appendChild(path);
		}

		return svg;
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

		this._setupBottomControlsGestures();

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
			this.playlistWrapper.addEventListener(
				'touchstart',
				this._handlePlaylistTouchStart_bound,
				{ passive: true }
			);
			this.playlistWrapper.addEventListener('touchend', this._handlePlaylistTouchEnd_bound, {
				passive: true,
			});
			this.playlistWrapper.addEventListener(
				'touchcancel',
				this._handlePlaylistTouchEnd_bound,
				{ passive: true }
			);

			// Independent listener to update centered overlay during any scroll
			this.playlistWrapper.addEventListener(
				'scroll',
				this._updateCenteredOverlayOnScroll_bound,
				{
					passive: true,
				}
			);
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

			// Auto-hide scroll listeners
			if (this.options.autoHidePlayerOnScroll) {
				logger.log(
					'AutoHide',
					'Setting up auto-hide scroll listeners, wrapper:',
					!!this.playerWrapper
				);
				// Listen for scroll events on body
				window.addEventListener('scroll', this._handleScrollThrottled_bound, {
					passive: true,
				});

				// Also listen for scroll events on .watch-below-the-player element if it exists
				this.watchBelowPlayerElement = document.querySelector('.watch-below-the-player');
				if (this.watchBelowPlayerElement) {
					this.watchBelowPlayerElement.addEventListener(
						'scroll',
						this._handleScrollThrottled_bound,
						{ passive: true }
					);
					logger.log(
						'AutoHide',
						'Added scroll listener to .watch-below-the-player element'
					);
				} else {
					logger.log('AutoHide', '.watch-below-the-player element not found');
				}
				// Initialize scroll position - detect which container is scrollable
				if (
					this.watchBelowPlayerElement &&
					this.watchBelowPlayerElement.scrollHeight >
						this.watchBelowPlayerElement.clientHeight
				) {
					this.lastScrollY = this.watchBelowPlayerElement.scrollTop;
				} else {
					this.lastScrollY = window.scrollY;
				}
				this.scrollVelocity = 0;
				this.scrollDirection = 0;
			} else {
				logger.log('AutoHide', 'Auto-hide disabled, skipping scroll listeners');
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

		if (this.drawerFocusButton) {
			this.drawerFocusButton.removeEventListener(
				'click',
				this._handleDrawerFocusButtonClick_bound
			);
			this.drawerFocusButton.addEventListener(
				'click',
				this._handleDrawerFocusButtonClick_bound
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

		this._updateDrawerFocusButtonVisibility();
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

		const currentText = `${cM}:${cS.toString().padStart(2, '0')}`;
		const durationText = `/${tM}:${tS.toString().padStart(2, '0')}`;

		if (
			this.videoTimerElement.firstChild &&
			this.videoTimerElement.firstChild.nodeType === Node.TEXT_NODE
		) {
			this.videoTimerElement.firstChild.nodeValue = currentText;
		} else {
			this.videoTimerElement.textContent = '';
			this.videoTimerElement.appendChild(document.createTextNode(currentText));
		}
		if (this.videoTimerDurationSpan) {
			this.videoTimerDurationSpan.textContent = durationText;
		} else {
			const span = document.createElement('span');
			span.textContent = durationText;
			this.videoTimerElement.appendChild(span);
			this.videoTimerDurationSpan = span;
		}

		const percentage = (this.totalTime > 0 ? this.trackTime / this.totalTime : 0) * 100;
		this.seekbarProgress.style.width = `${percentage}%`;
		this.seekbarProgressInline.style.width = `${percentage}%`;
		this._updateContrastingTextColors();
	}

	_initLetterSpans() {
		if (
			this.options.titleContrastMode !== 'per-letter' ||
			(this.playerControls && this.playerControls.classList.contains('compact'))
		) {
			this._removeTitleClone();
			const restore = (el) => {
				if (!el) return;
				const txt = el.textContent || '';
				el.textContent = txt;
			};
			restore(this.videoTitleElement);
			restore(this.videoAuthorElement);
			this.titleLetterSpans = [];
			this.cloneLetterSpans = [];
			this.authorLetterSpans = [];
			return;
		}
		const targets = [];
		if (this.videoTitleElement) targets.push({ el: this.videoTitleElement, key: 'title' });
		if (this.videoAuthorElement) targets.push({ el: this.videoAuthorElement, key: 'author' });
		this.titleLetterSpans = [];
		this.cloneLetterSpans = [];
		this.authorLetterSpans = [];
		for (let i = 0; i < targets.length; i++) {
			const el = targets[i].el;
			const key = targets[i].key;
			const text = el.textContent || '';
			while (el.firstChild) el.removeChild(el.firstChild);
			const frag = document.createDocumentFragment();
			const spans = [];
			for (let j = 0; j < text.length; j++) {
				const ch = text[j];
				const s = document.createElement('span');
				s.className = 'yt-letter-span';
				s.textContent = ch;
				frag.appendChild(s);
				spans.push(s);
			}
			el.appendChild(frag);
			if (key === 'title') this.titleLetterSpans = spans;
			else this.authorLetterSpans = spans;
		}
	}

	_contrastTextForRgb(str) {
		const nums = (str || '').match(/\d+(\.\d+)?/g) || [];
		let r = 0;
		let g = 0;
		let b = 0;
		if (nums.length >= 3) {
			r = parseFloat(nums[0]);
			g = parseFloat(nums[1]);
			b = parseFloat(nums[2]);
		}
		const yiq = (r * 299 + g * 587 + b * 114) / 1000;
		return yiq >= 150 ? '#111111' : '#f0f0f0';
	}

	_parseCssColorToRgb(str) {
		const hexMatch = (str || '').match(/#([0-9a-fA-F]{3,6})/);
		if (hexMatch) {
			let hex = hexMatch[1];
			if (hex.length === 3)
				hex = hex
					.split('')
					.map((c) => c + c)
					.join('');
			const r = parseInt(hex.slice(0, 2), 16);
			const g = parseInt(hex.slice(2, 4), 16);
			const b = parseInt(hex.slice(4, 6), 16);
			return { r, g, b };
		}
		const rgbMatch = (str || '').match(/rgba?\(([^)]+)\)/);
		if (rgbMatch) {
			const nums = rgbMatch[1].split(',').map((n) => parseFloat(n.trim()));
			return { r: nums[0] || 0, g: nums[1] || 0, b: nums[2] || 0 };
		}
		return null;
	}

	_contrastTextForBackground(el) {
		const cs = getComputedStyle(el);
		const bgColor = cs.backgroundColor;
		const isTransparent = /rgba?\(\s*0+\s*,\s*0+\s*,\s*0+\s*(?:,\s*0\s*)?\)/i.test(bgColor);
		if (!isTransparent) {
			return this._contrastTextForRgb(bgColor);
		}
		const bgImg = cs.backgroundImage;
		if (bgImg && bgImg !== 'none') {
			const colors = [];
			let m;
			const hexRe = /#([0-9a-fA-F]{3,6})/g;
			while ((m = hexRe.exec(bgImg)) !== null) colors.push(m[0]);
			const rgbRe = /rgba?\([^)]+\)/g;
			let m2;
			while ((m2 = rgbRe.exec(bgImg)) !== null) colors.push(m2[0]);
			if (colors.length) {
				let sum = 0;
				let count = 0;
				for (let i = 0; i < colors.length; i++) {
					const rgb = this._parseCssColorToRgb(colors[i]);
					if (rgb) {
						const yiq = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
						sum += yiq;
						count++;
					}
				}
				const avg = count ? sum / count : 0;
				return avg >= 150 ? '#111111' : '#f0f0f0';
			}
		}
		return '#f0f0f0';
	}

	_updateContrastingTextColors() {
		if (
			this.options.titleContrastMode !== 'per-letter' ||
			(this.playerControls && this.playerControls.classList.contains('compact'))
		) {
			const clear = (arr) => {
				if (!arr || arr.length === 0) return;
				for (let i = 0; i < arr.length; i++) {
					arr[i].style.backgroundImage = '';
					arr[i].style.webkitBackgroundClip = '';
					arr[i].style.backgroundClip = '';
					arr[i].style.webkitTextFillColor = '';
					arr[i].style.color = '';
				}
			};
			clear(this.titleLetterSpans);
			clear(this.cloneLetterSpans);
			clear(this.authorLetterSpans);
			if (this.videoTimerElement) {
				this.videoTimerElement.style.backgroundImage = '';
				this.videoTimerElement.style.webkitBackgroundClip = '';
				this.videoTimerElement.style.backgroundClip = '';
				this.videoTimerElement.style.webkitTextFillColor = '';
				this.videoTimerElement.style.color = '';
			}
			return;
		}
		let trackEl = this.seekbarBackground;
		let progressEl = this.seekbarProgress;
		if (!trackEl || trackEl.offsetParent === null) {
			trackEl = this.seekbarInline;
			progressEl = this.seekbarProgressInline;
		}
		if (!trackEl || !progressEl) return;
		const progressRect = progressEl.getBoundingClientRect();
		const boundary = progressRect.right;
		const bgTextColor = this._contrastTextForBackground(trackEl);
		const progressColor = getComputedStyle(progressEl).backgroundColor;
		const progressTextColor = this._contrastTextForRgb(progressColor);
		const apply = (arr) => {
			if (!arr || arr.length === 0) return;
			for (let i = 0; i < arr.length; i++) {
				const r = arr[i].getBoundingClientRect();
				const left = r.left;
				const right = r.right;
				if (boundary <= left) {
					arr[i].style.backgroundImage = '';
					arr[i].style.webkitBackgroundClip = '';
					arr[i].style.backgroundClip = '';
					arr[i].style.webkitTextFillColor = '';
					arr[i].style.color = bgTextColor;
					continue;
				}
				if (boundary >= right) {
					arr[i].style.backgroundImage = '';
					arr[i].style.webkitBackgroundClip = '';
					arr[i].style.backgroundClip = '';
					arr[i].style.webkitTextFillColor = '';
					arr[i].style.color = progressTextColor;
					continue;
				}
				const pos = Math.max(0, Math.min(1, (boundary - left) / r.width)) * 100;
				const grad = `linear-gradient(to right, ${progressTextColor} ${pos}%, ${bgTextColor} ${pos}%)`;
				arr[i].style.backgroundImage = grad;
				arr[i].style.webkitBackgroundClip = 'text';
				arr[i].style.backgroundClip = 'text';
				arr[i].style.color = 'transparent';
				arr[i].style.webkitTextFillColor = 'transparent';
			}
		};
		apply(this.titleLetterSpans);
		apply(this.cloneLetterSpans);
		apply(this.authorLetterSpans);
		if (this.videoTimerElement) {
			const r = this.videoTimerElement.getBoundingClientRect();
			const left = r.left;
			const right = r.right;
			if (boundary <= left) {
				this.videoTimerElement.style.backgroundImage = '';
				this.videoTimerElement.style.webkitBackgroundClip = '';
				this.videoTimerElement.style.backgroundClip = '';
				this.videoTimerElement.style.webkitTextFillColor = '';
				this.videoTimerElement.style.color = bgTextColor;
			} else if (boundary >= right) {
				this.videoTimerElement.style.backgroundImage = '';
				this.videoTimerElement.style.webkitBackgroundClip = '';
				this.videoTimerElement.style.backgroundClip = '';
				this.videoTimerElement.style.webkitTextFillColor = '';
				this.videoTimerElement.style.color = progressTextColor;
			} else {
				const pos = Math.max(0, Math.min(1, (boundary - left) / r.width)) * 100;
				const grad = `linear-gradient(to right, ${progressTextColor} ${pos}%, ${bgTextColor} ${pos}%)`;
				this.videoTimerElement.style.backgroundImage = grad;
				this.videoTimerElement.style.webkitBackgroundClip = 'text';
				this.videoTimerElement.style.backgroundClip = 'text';
				this.videoTimerElement.style.color = 'transparent';
				this.videoTimerElement.style.webkitTextFillColor = 'transparent';
			}
		}
	}

	_clearTextColorStyles() {
		const clear = (arr) => {
			if (!arr || arr.length === 0) return;
			for (let i = 0; i < arr.length; i++) {
				arr[i].style.backgroundImage = '';
				arr[i].style.webkitBackgroundClip = '';
				arr[i].style.backgroundClip = '';
				arr[i].style.webkitTextFillColor = '';
				arr[i].style.color = '';
			}
		};
		clear(this.titleLetterSpans);
		clear(this.cloneLetterSpans);
		clear(this.authorLetterSpans);
		if (this.videoTimerElement) {
			this.videoTimerElement.style.backgroundImage = '';
			this.videoTimerElement.style.webkitBackgroundClip = '';
			this.videoTimerElement.style.backgroundClip = '';
			this.videoTimerElement.style.webkitTextFillColor = '';
			this.videoTimerElement.style.color = '';
		}
	}

	_startMarqueeColorSync() {
		if (
			this.options.titleContrastMode !== 'per-letter' ||
			(this.playerControls && this.playerControls.classList.contains('compact'))
		) {
			this._stopMarqueeColorSync();
			return;
		}
		const container =
			this.videoTitleContainerElement ||
			(this.videoTitleElement && this.videoTitleElement.parentElement);
		if (!container) return;
		if (!container.classList.contains('marquee')) {
			this._stopMarqueeColorSync();
			return;
		}
		if (!this.titleLetterSpans || this.titleLetterSpans.length === 0) this._initLetterSpans();
		this._ensureTitleCloneForMarquee();
		if (this._marqueeColorSyncActive) return;
		this._marqueeColorSyncActive = true;
		const step = () => {
			if (!this._marqueeColorSyncActive) return;
			this._updateContrastingTextColors();
			this._marqueeColorRafId = requestAnimationFrame(step);
		};
		this._marqueeColorRafId = requestAnimationFrame(step);
	}

	_stopMarqueeColorSync() {
		this._marqueeColorSyncActive = false;
		if (this._marqueeColorRafId) {
			cancelAnimationFrame(this._marqueeColorRafId);
			this._marqueeColorRafId = null;
		}
	}

	_ensureTitleCloneForMarquee() {
		const container =
			this.videoTitleContainerElement ||
			(this.videoTitleElement && this.videoTitleElement.parentElement);
		const textEl =
			this.videoTitleElement ||
			(container && container.querySelector('.yt-video-title-text'));
		if (!container || !textEl) return;
		if (!container.classList.contains('marquee')) return;
		const existing = textEl.querySelector('.yt-title-clone');
		if (existing) return;
		const gapRaw = getComputedStyle(container).getPropertyValue('--yt-title-marquee-gap');
		let gapPx = 24;
		if (gapRaw) {
			const m = gapRaw.match(/\d+\.?\d*/);
			if (m) gapPx = parseFloat(m[0]);
		}
		const clone = document.createElement('span');
		clone.className = 'yt-title-clone';
		clone.style.display = 'inline-block';
		clone.style.marginLeft = `${gapPx}px`;
		const spans = [];
		const isPerLetter =
			this.options.titleContrastMode === 'per-letter' &&
			!(this.playerControls && this.playerControls.classList.contains('compact'));
		if (isPerLetter && this.titleLetterSpans && this.titleLetterSpans.length > 0) {
			for (let i = 0; i < this.titleLetterSpans.length; i++) {
				const s = document.createElement('span');
				s.className = 'yt-letter-span';
				s.textContent = this.titleLetterSpans[i].textContent;
				clone.appendChild(s);
				spans.push(s);
			}
		} else {
			const srcText =
				(this.videoTitleElement && this.videoTitleElement.textContent) ||
				(textEl && textEl.textContent) ||
				'';
			clone.textContent = srcText;
		}
		textEl.appendChild(clone);
		this.cloneLetterSpans = spans;
		textEl.setAttribute('data-marquee', '');
	}

	_removeTitleClone() {
		const container =
			this.videoTitleContainerElement ||
			(this.videoTitleElement && this.videoTitleElement.parentElement);
		const textEl =
			this.videoTitleElement ||
			(container && container.querySelector('.yt-video-title-text'));
		if (!textEl) return;
		const existing = textEl.querySelector('.yt-title-clone');
		if (existing) textEl.removeChild(existing);
		this.cloneLetterSpans = [];
		textEl.removeAttribute('data-marquee');
	}

	_updateSeekTooltipText(tooltipEl) {
		if (!tooltipEl) return;
		let cM = Math.floor(this.trackTime / 60);
		let cS = Math.floor(this.trackTime % 60);
		let tM = Math.floor(this.totalTime / 60);
		let tS = Math.floor(this.totalTime % 60);
		const currentText = `${cM}:${cS.toString().padStart(2, '0')}`;
		const durationText = `/${tM}:${tS.toString().padStart(2, '0')}`;
		if (tooltipEl.firstChild && tooltipEl.firstChild.nodeType === Node.TEXT_NODE) {
			tooltipEl.firstChild.nodeValue = currentText;
		} else {
			tooltipEl.textContent = '';
			tooltipEl.appendChild(document.createTextNode(currentText));
		}
		let span = tooltipEl.querySelector('span');
		if (span) {
			span.textContent = durationText;
		} else {
			span = document.createElement('span');
			span.textContent = durationText;
			tooltipEl.appendChild(span);
		}
	}

	_formatTimerText(cM, cS, tM, tS) {
		if (typeof cM !== 'number') {
			cM = Math.floor(this.trackTime / 60);
			cS = Math.floor(this.trackTime % 60);
			tM = Math.floor(this.totalTime / 60);
			tS = Math.floor(this.totalTime % 60);
		}
		const current = `${cM}:${cS.toString().padStart(2, '0')}`;
		if (this.options.hideTimerDuration) return current;
		return `${current} / ${tM}:${tS.toString().padStart(2, '0')}`;
	}

	setPlayerTimeDisplayMode(mode) {
		this.options.playerTimeDisplayMode = mode || 'always';
		if (this.playerControls) {
			this.playerControls.classList.remove('timer-hide', 'timer-seek-tooltip');
			if (this.options.playerTimeDisplayMode === 'hide') {
				this.playerControls.classList.add('timer-hide');
			} else if (this.options.playerTimeDisplayMode === 'seek-tooltip') {
				this.playerControls.classList.add('timer-seek-tooltip');
			}
		}
	}

	setHidePlaylistItemDurations(enabled) {
		this.options.hidePlaylistItemDurations = !!enabled;
		if (this.playerWrapper) {
			this.playerWrapper.classList.toggle('hide-durations', !!enabled);
		}
	}

	setHideTimerDuration(enabled) {
		this.options.hideTimerDuration = !!enabled;
		if (this.playerControls) {
			this.playerControls.classList.toggle('timer-hide-duration', !!enabled);
		}
	}

	_updatePrevButtonVisualState() {
		if (
			!this.prevButton ||
			(this.isRestartIconLocked && this.prevButton.classList.contains('restart'))
		) {
			return;
		}

		if ((this._previousActionId || 'previous') !== 'restart-then-previous') {
			if (!this.prevButton.classList.contains('previous')) {
				this.prevButton.classList.remove('restart');
				this.prevButton.classList.add('previous');
			}
		} else {
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
			MediaUtils.getStandardThumbnailUrl(item.id) ||
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

		// Create playing now indicator icon (hidden by default)
		const playingNowIcon = document.createElement('div');
		playingNowIcon.className = 'playing-now-indicator';

		// Create SVG play icon
		const playSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		playSvg.setAttribute('viewBox', '0 0 24 24');
		playSvg.setAttribute('width', '12');
		playSvg.setAttribute('height', '12');
		playSvg.style.fill = 'currentColor';

		const playPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		playPath.setAttribute('d', 'M8 5v14l11-7z');
		playSvg.appendChild(playPath);
		playingNowIcon.appendChild(playSvg);

		container.appendChild(playingNowIcon);

		// Create play-next indicator icon (hidden by default)
		const playNextIcon = document.createElement('div');
		playNextIcon.className = 'play-next-indicator';

		// Create SVG play next icon
		const playNextSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		playNextSvg.setAttribute('viewBox', '0 0 256 256');
		playNextSvg.setAttribute('width', '12');
		playNextSvg.setAttribute('height', '12');
		playNextSvg.style.fill = 'currentColor';

		const playNextPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		playNextPath.setAttribute(
			'd',
			'M144,192a8.00008,8.00008,0,0,1-8,8H40a8,8,0,0,1,0-16h96A8.00008,8.00008,0,0,1,144,192ZM40,72H216a8,8,0,0,0,0-16H40a8,8,0,0,0,0,16Zm96,48H40a8,8,0,0,0,0,16h96a8,8,0,0,0,0-16Zm108.24023,33.21582-64-40A8.00044,8.00044,0,0,0,168,120v80a8.00043,8.00043,0,0,0,12.24023,6.78418l64-40a8.00062,8.00062,0,0,0,0-13.56836Z'
		);
		playNextSvg.appendChild(playNextPath);
		playNextIcon.appendChild(playNextSvg);

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
		const durationBadge = document.createElement('div');
		durationBadge.className = 'yt-context-menu-duration';
		thumbnail.appendChild(durationBadge);
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

		this._createMainMenuOptions(content);

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

	/**
	 * Creates and appends the main menu options to the given content element.
	 * @param {HTMLElement} content - The content element to append options to.
	 */
	_createMainMenuOptions(content) {
		// Play Next option
		const playNextOption = document.createElement('div');
		playNextOption.className = 'yt-context-menu-option';

		const playNextIcon = document.createElement('div');
		playNextIcon.className = 'yt-context-menu-option-icon';

		const playNextSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		playNextSvg.setAttribute('viewBox', '0 0 256 256');
		playNextSvg.setAttribute('width', '12');
		playNextSvg.setAttribute('height', '12');

		const playNextPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		playNextPath.setAttribute(
			'd',
			'M144,192a8.00008,8.00008,0,0,1-8,8H40a8,8,0,0,1,0-16h96A8.00008,8.00008,0,0,1,144,192ZM40,72H216a8,8,0,0,0,0-16H40a8,8,0,0,0,0,16Zm96,48H40a8,8,0,0,0,0,16h96a8,8,0,0,0,0-16Zm108.24023,33.21582-64-40A8.00044,8.00044,0,0,0,168,120v80a8.00043,8.00043,0,0,0,12.24023,6.78418l64-40a8.00062,8.00062,0,0,0,0-13.56836Z'
		);
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

		// Repeat option
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
			const durationEl = this.contextMenu.querySelector('.yt-context-menu-duration');

			// Set thumbnail using the utility function
			const thumbnailUrl =
				MediaUtils.getStandardThumbnailUrl(videoId) || videoData.thumbnailUrl;
			if (thumbnailUrl) {
				thumbnail.style.backgroundImage = `url('${thumbnailUrl}')`;
			}

			// Set title and author
			title.textContent = videoData.title || 'Unknown Title';
			author.textContent = videoData.artist || 'Unknown Artist';
			if (durationEl) {
				const d =
					(videoData && videoData.duration) ||
					this.options.nowPlayingVideoDetails?.duration ||
					'0:00';
				durationEl.textContent = d;
			}
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
		this._createMainMenuOptions(content);

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
		const videoData = this.options.currentPlaylist?.items?.find(
			(item) => item.id === this.contextMenuVideoId
		);
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
			{ label: 'Video ID', value: videoData.id || 'Unknown' },
		];

		basicDetails.forEach((detail) => {
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
				{ label: 'Parse Confidence', value: metadata.parseConfidence || 'N/A' },
			];

			parsedDetails.forEach((detail) => {
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

		logger.log('AutoHide', 'showPlayer called - making player visible');
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

		// Re-attach auto-hide scroll listeners
		if (this.options.autoHidePlayerOnScroll) {
			logger.log(
				'AutoHide',
				'Re-attaching auto-hide scroll listeners, player visible:',
				this.isPlayerVisible
			);

			// Listen for scroll events on body
			window.addEventListener('scroll', this._handleScrollThrottled_bound, { passive: true });

			// Also listen for scroll events on .watch-below-the-player element if it exists
			if (this.watchBelowPlayerElement) {
				this.watchBelowPlayerElement.addEventListener(
					'scroll',
					this._handleScrollThrottled_bound,
					{ passive: true }
				);
			}

			// Initialize scroll position - detect which container is scrollable
			if (
				this.watchBelowPlayerElement &&
				this.watchBelowPlayerElement.scrollHeight >
					this.watchBelowPlayerElement.clientHeight
			) {
				this.lastScrollY = this.watchBelowPlayerElement.scrollTop;
			} else {
				this.lastScrollY = window.scrollY;
			}
			this.scrollVelocity = 0;
			this.scrollDirection = 0;
			this.scrollEventCount = 0; // Reset debug counter
		}

		// Reset auto-hide state
		this._autoShowPlayer();
		// Reset scroll position - detect which container is scrollable
		if (
			this.watchBelowPlayerElement &&
			this.watchBelowPlayerElement.scrollHeight > this.watchBelowPlayerElement.clientHeight
		) {
			this.lastScrollY = this.watchBelowPlayerElement.scrollTop;
		} else {
			this.lastScrollY = window.scrollY;
		}

		// Recalculate and restore state
		this._invalidateAndRecalculateMeasurements();
		this._updatePlaylistVisibility();
		this._updateDrawerVisualState();
	}

	hidePlayer() {
		if (!this.isPlayerVisible || !this.playerWrapper) return;

		logger.log('AutoHide', 'hidePlayer called - hiding player');
		this.isPlayerVisible = false;
		this.playerWrapper.classList.add('yt-player-hidden');

		// Remove listeners
		window.removeEventListener('resize', this._handleResize_bound);
		if (this.resizeObserver) {
			this.resizeObserver.disconnect();
		}

		// Remove auto-hide scroll listeners
		window.removeEventListener('scroll', this._handleScrollThrottled_bound);
		if (this.watchBelowPlayerElement) {
			this.watchBelowPlayerElement.removeEventListener(
				'scroll',
				this._handleScrollThrottled_bound
			);
		}
		clearTimeout(this.autoHideTimer);
	}

	/**
	 * Layout control
	 */
	setLayout(layout) {
		if (this.playerControls) {
			const cls = this.playerControls.classList;
			cls.remove('compact', 'large');
			if (layout === 'compact' || layout === 'large') cls.add(layout);
			if (this.playerWrapper) {
				this.playerWrapper.classList.toggle(
					'yt-per-letter-contrast',
					this.options.titleContrastMode === 'per-letter' && layout !== 'compact'
				);
			}
			this._initLetterSpans();
			this._updateContrastingTextColors();
			this.setTitleMarqueeEnabled(this.options.enableTitleMarquee);
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

	/**
	 * Start buffer auto-pause countdown display
	 */
	startBufferCountdown(seconds = 3) {
		if (!this.bufferCountdown) return;

		this.isBufferAutoPauseActive = true;
		this.bufferAutoPauseCountdown = seconds;

		// Show countdown element
		this.bufferCountdown.classList.add('visible');
		this.bufferCountdown.textContent = seconds.toString();

		// Clear any existing timer
		if (this.bufferCountdownTimer) {
			clearInterval(this.bufferCountdownTimer);
		}

		// Start countdown timer
		this.bufferCountdownTimer = setInterval(() => {
			this.bufferAutoPauseCountdown--;
			this.bufferCountdown.textContent = this.bufferAutoPauseCountdown.toString();

			if (this.bufferAutoPauseCountdown <= 0) {
				this.stopBufferCountdown();
			}
		}, 1000);
	}

	/**
	 * Stop buffer auto-pause countdown display
	 */
	stopBufferCountdown() {
		if (!this.bufferCountdown) return;

		this.isBufferAutoPauseActive = false;
		this.bufferAutoPauseCountdown = 0;

		// Hide countdown element
		this.bufferCountdown.classList.remove('visible');

		// Clear timer
		if (this.bufferCountdownTimer) {
			clearInterval(this.bufferCountdownTimer);
			this.bufferCountdownTimer = null;
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
		this._stopMarqueeColorSync();
		this._clearTextColorStyles();
		this._removeTitleClone();
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
		this._initLetterSpans();
		logger.log('TitleMarquee', 'Title updated');
	}

	/**
	 * Process hidden items for blacklist, removed-from-mix, duplicates, and Christmas music
	 */
	_processHiddenItems(items, listId, playlistTitle = '') {
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

			// Apply Christmas music filtering if not already hidden
			if (!hidden && window.userSettings.christmasMusicFilter !== 'disabled') {
				const christmasSettings = {
					christmasMusicFilter: window.userSettings.christmasMusicFilter,
					christmasStartDate: window.userSettings.christmasStartDate,
					christmasEndDate: window.userSettings.christmasEndDate,
					christmasBypassOnPlaylistTitle:
						window.userSettings.christmasBypassOnPlaylistTitle,
				};

				const videoData = {
					title: item.title || '',
					artist: item.artist || item.author || '',
					playlistTitle: playlistTitle || '',
				};

				if (shouldFilterChristmasMusic(videoData, christmasSettings)) {
					hidden = true;
				}
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
		newItems = this._processHiddenItems(newItems, listId, title);

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

		// Update edge padding for centering extremes in horizontal mode
		this._updatePlaylistEdgePaddingForCentering();

		// Scroll to active item
		if (activeElement) {
			if (this.options.keepPlaylistFocused) {
				clearTimeout(this.autoScrollFocusTimer);
				this.programmaticScrollInProgress = false;
			}

			this._scrollActiveItemIntoView(activeElement, 'instant');
			this._updateDrawerFocusButtonVisibility();
		}

		// Apply repeat indicator when sticky repeat is active and current item exists
		const currentVid = this.options.nowPlayingVideoDetails?.videoId;
		if (
			this.hasPlaylist &&
			window.userSettings.repeatStickyAcrossVideos &&
			window.userSettings.repeatCurrentlyOn &&
			currentVid &&
			(!this.nextUpVideoId || this.nextUpVideoId === currentVid)
		) {
			this.nextUpVideoId = currentVid;
			this._addPlayNextIndicator(currentVid, true);
			this.setRepeatButtonState(true);
		}

		// Update header content
		if (this.hasPlaylist) {
			// Cache the title if provided
			if (title) {
				this.options.currentPlaylist.title = title;
			}

			// Use cached title if available
			let currentTitle = this.options.currentPlaylist.title;
			let originalTitle = currentTitle; // Store original title for mix badge check

			// Check if this playlist matches a renamed favorite mix
			if (currentTitle && listId && window.userSettings?.favouriteMixes) {
				const favourites = window.userSettings.favouriteMixes;
				const matchingFavourite = favourites.find((fav) => fav.playlistId === listId);
				if (matchingFavourite && matchingFavourite.customTitle) {
					currentTitle = matchingFavourite.customTitle;
				}
			}

			if (currentTitle) {
				// Count visible items (non-hidden)
				const visibleItemCount = newItems
					? newItems.filter((item) => !item.hidden).length
					: 0;
				this.setHandleContent({
					title: currentTitle,
					originalTitle: originalTitle,
					itemCount: visibleItemCount,
				});
			}
			this._updateDrawerFocusButtonVisibility();
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
			if (this.options.keepPlaylistFocused) {
				clearTimeout(this.autoScrollFocusTimer);
				this.programmaticScrollInProgress = false;
			}
			newActive.classList.add('active');
			this._scrollActiveItemIntoView(newActive, 'smooth');
			this._updateDrawerFocusButtonVisibility();
		}

		this.options.currentPlaylist.activeItemId = newItemIdStr;
		this._updateDrawerFocusButtonVisibility();
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
	setHandleContent({ title, originalTitle, itemCount }) {
		this._fullPlaylistTitle = title;
		this._originalPlaylistTitle = originalTitle || title; // Store original title for mix badge check
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
		if (buttonName === 'Repeat') {
			return;
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

	setBottomControlsDoubleClickDelay(delayMs) {
		this.options.bottomControlsDoubleClickDelay = delayMs;
	}

	setKeepPlaylistFocused(enabled) {
		this.options.keepPlaylistFocused = enabled;
		if (!enabled) {
			clearTimeout(this.autoScrollFocusTimer);
			this.programmaticScrollInProgress = false;
		}
		this._updateDrawerFocusButtonVisibility();
	}

	setTitleMarqueeEnabled(enabled) {
		this.options.enableTitleMarquee = !!enabled;
		const container =
			this.videoTitleContainerElement ||
			(this.videoTitleElement && this.videoTitleElement.parentElement);
		if (!container) return;

		const textEl = this.videoTitleElement || container.querySelector('.yt-video-title-text');
		this._removeTitleClone();
		DOMUtils.setMarquee(container, textEl, enabled);
		const isMarqueeActive = container.classList.contains('marquee');
		if (enabled && isMarqueeActive) {
			this._ensureTitleCloneForMarquee();
			if (
				this.options.titleContrastMode === 'per-letter' &&
				!(this.playerControls && this.playerControls.classList.contains('compact'))
			) {
				this._startMarqueeColorSync();
			} else {
				this._stopMarqueeColorSync();
			}
		} else {
			this._stopMarqueeColorSync();
			this._removeTitleClone();
		}
	}

	setTitleContrastMode(mode) {
		this.options.titleContrastMode = mode === 'per-letter' ? 'per-letter' : 'default';
		if (this.playerWrapper) {
			this.playerWrapper.classList.toggle(
				'yt-per-letter-contrast',
				this.options.titleContrastMode === 'per-letter' &&
					!(this.playerControls && this.playerControls.classList.contains('compact'))
			);
		}
		this._initLetterSpans();
		this._updateContrastingTextColors();
		this.setTitleMarqueeEnabled(this.options.enableTitleMarquee);
	}

	setClassSetting(key, enabled) {
		switch (key) {
			case 'hideTimerDuration':
				if (this.playerControls) {
					this.playerControls.classList.toggle('timer-hide-duration', !!enabled);
				}
				this.options.hideTimerDuration = !!enabled;
				break;
			case 'enableTitleMarquee':
				logger.log('TitleMarquee', 'Setting changed:', !!enabled);
				this.setTitleMarqueeEnabled(!!enabled);
				break;
			case 'autoHidePlayerOnScroll':
				document.body.classList.toggle('yt-auto-hide-active', !!enabled);
				this.options.autoHidePlayerOnScroll = !!enabled;
				if (!enabled && this.isAutoHidden) {
					this._autoShowPlayer();
				}
				break;
			case 'hidePlayerForPanelActive':
				document.body.classList.toggle('yt-player-hide-for-panel-active', !!enabled);
				this.options.hidePlayerForPanelActive = !!enabled;
				break;
			default:
				this.options[key] = enabled;
		}
	}

	setPlaylistScrollDebounceDelay(delay) {
		this.playlistScrollDebounceDelay = delay * 1000;
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
		clearTimeout(this.autoHideTimer);

		// Remove body classes
		if (document.body) {
			document.body.classList.remove(
				'yt-drawer-closed',
				'yt-drawer-mid',
				'yt-drawer-full',
				'yt-player-body-dragging',
				'yt-limited-height-mode-navbar-hidden'
			);
		}

		// Remove global listeners
		window.removeEventListener('resize', this._handleResize_bound);
		window.removeEventListener('scroll', this._handleScrollThrottled_bound);
		if (this.watchBelowPlayerElement) {
			this.watchBelowPlayerElement.removeEventListener(
				'scroll',
				this._handleScrollThrottled_bound
			);
		}
		if (this.resizeObserver) {
			this.resizeObserver.disconnect();
			this.resizeObserver = null;
		}

		// Remove gesture listeners
		this._removeGestureListeners();
		this._stopMarqueeColorSync();

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
