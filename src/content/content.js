// content.js
/** @const {Object} Centralized CSS selectors used throughout the extension */
const CSS_SELECTORS = {
	// Video and player elements
	videoElement: '#player-container-id video',
	playerContainer: '#player-container-id',
	moviePlayer: '#movie_player',
	playPauseButton: 'button.player-control-play-pause-icon',
	previousButton: 'button[aria-label="Previous video"]',
	nextButton: 'button[aria-label="Next video"]',
	largePlayButton: 'button.ytp-large-play-button',
	unmuteButton: 'button.ytp-unmute',
	adSkipButton: 'button.ytp-ad-skip-button-modern',

	// Playlist elements
	playlistPanel: 'ytm-engagement-panel .engagement-panel-playlist',
	playlistContentWrapper:
		'ytm-engagement-panel .engagement-panel-playlist .engagement-panel-content-wrapper',
	playlistSpinner: 'ytm-section-list-renderer .spinner',
	playlistItems: 'ytm-playlist-panel-video-renderer',
	playlistItemLink: 'a[href*="/watch"]',
	playlistTitle: [
		'.playlist-engagement-panel-mix-title',
		'.playlist-engagement-panel-list-title',
	],
	playlistItemHeadline: [
		'.compact-media-item-headline span.yt-core-attributed-string',
		'h4.YtmCompactMediaItemHeadline',
	],
	playlistItemByline: [
		'.compact-media-item-byline span.yt-core-attributed-string',
		'.YtmCompactMediaItemByline',
	],
	playlistItemDuration: ['.badge-shape-wiz__text', 'ytm-thumbnail-overlay-time-status-renderer'],
	playlistCloseButton: 'ytm-button-renderer.icon-close button',
	playlistEntryPointButton:
		'ytm-playlist-panel-entry-point button[aria-label="Show playlist videos"]',
	playlistSpinner: 'ytm-section-list-renderer .spinner',

	// Video metadata elements
	metadataSection: 'ytm-slim-video-metadata-section-renderer',
	titleContainer: [
		'ytm-slim-video-metadata-renderer',
		'.slim-video-information-title-and-badges',
	],
	videoTitle: [
		'ytm-slim-video-metadata-section-renderer .title',
		'.slim-video-metadata-header h2',
		'.slim-video-information-title',
	],
	videoAuthor: [
		'ytm-slim-owner-renderer .ytm-channel-name',
		'.slim-owner-channel-name',
		'ytm-slim-video-metadata-renderer .byline-separated-item',
		'.slim-owner-bidi-wrapper a',
	],

	// Voice search elements
	voiceSearchDialog: 'ytm-voice-search-dialog-renderer',
	headerVoiceButton: 'button[aria-label="Search with your voice"]',
	headerSearchButton: 'button.topbar-menu-button-avatar-button[aria-label="Search YouTube"]',
	headerCloseSearchButton: 'ytm-mobile-topbar-renderer .mobile-topbar-back-arrow',
	dialogMicButton: 'ytm-voice-search-dialog-renderer .voice-search-mic-container',
	dialogCancelButton: 'ytm-voice-search-dialog-renderer button[aria-label*="Cancel"]',

	// Search elements
	searchSuggestions: '.yt-searchbox-suggestions-container',
	resultsPageTextSearchButton: 'button.search-bar-text',
	resultsItems: 'ytm-item-section-renderer ytm-video-with-context-renderer',
	resultsFirstVideoAnchor: 'ytm-video-with-context-renderer a.media-item-thumbnail-container',

	// Loading and buffering indicators
	playerSpinner: '.player-controls-spinner .spinner',
	mobileSpinner: 'ytm-spinner',

	// Dialog and popup elements
	dialogs: 'dialog',
	shoppingPopup: ['.ytm-bottom-sheet-overlay-container', 'ytm-bottom-sheet-overlay-renderer'],
	shoppingCloseButton: [
		'.ytm-bottom-sheet-overlay-renderer-close button',
		'.YtmBottomSheetOverlayRendererClose button',
	],

	pageContainerInert: '.page-container[inert]',
	chipCloudRenderer: 'ytm-related-chip-cloud-renderer',

	// Content filtering
	contentSection: 'ytm-rich-section-renderer',
	shortsTitle: 'h2.yt-shelf-header-layout__title',
	playableTitle: 'h2.rich-shelf-title',
};

/** @const {Object} Map of color names to their respective primary and secondary colors */
const COLOR_MAP = {
	red: { primary: '#ff0000', secondary: '#dd0000' },
	pink: { primary: '#ec407a', secondary: '#e91e63' },
	babypink: { primary: '#f5a9d0', secondary: '#f06292' },
	purple: { primary: '#9b59b6', secondary: '#8e44ad' },
	indigo: { primary: '#3f51b5', secondary: '#303f9f' },
	blue: { primary: '#3498db', secondary: '#2980b9' },
	teal: { primary: '#008080', secondary: '#006666' },
	cyan: { primary: '#00bcd4', secondary: '#0097a7' },
	green: { primary: '#2ecc71', secondary: '#27ae60' },
	lime: { primary: '#cddc39', secondary: '#afb42b' },
	yellow: { primary: '#f1c40f', secondary: '#f39c12' },
	orange: { primary: '#e67e22', secondary: '#d35400' },
	brown: { primary: '#795548', secondary: '#5d4037' },
	grey: { primary: '#9e9e9e', secondary: '#757575' },
};

logger.log('ContentJS', 'Script loaded', true); // Initial log, always posted

/** @type {YTMediaPlayer|null} Holds the instance of the custom media player UI. */
let ytPlayerInstance = null;

/** @type {YTCustomNavbar|null} Holds the instance of the custom navbar. */
let ytNavbarInstance = null;

/** @type {string|null} Tracks the YouTube video ID of the currently active video. */
let currentVideoId = null;

/** @type {string|null} Tracks the state of the last recorded player state */
let lastNativePlayerState = null;

/** @type {string|null} Stores the video ID that should be played next via "Play Next" context menu */
let nextUpVideoId = null;
let repeatIndefinitely = false;

/** @type {boolean} Flags if the user has manually interacted with the playlist drawer in the current session. */
let hasUserManuallyToggledDrawerThisSession = false;
/** @type {number|null} Stores the target height of the drawer set by manual user interaction for the current session. */
let manualDrawerTargetHeightThisSession = null;

/** @type {boolean} Flag to differentiate if a pause event was initiated by the custom player controls. */
let customControlsInitiatedPause = false;

/** @type {string[]} Holds a shuffled copy of keys from `COLOR_MAP` for sequential random color picking. */
let shuffledAccentColors = [];
/** @type {number} Index for the current color in `shuffledAccentColors`. */
let currentAccentColorIndex = 0;

/** @type {boolean} Tracks if the video was playing before voice search was activated, to restore state. */
let wasPlayingBeforeVoiceSearch = false;
/** @type {boolean} Ensures autoplay logic runs only once per video load. */
let initialAutoplayDoneForCurrentVideo = false;
/** @type {boolean} A flag to prevent concurrent executions of the `manageFeatures` function. */
let isManagingFeatures = false;
/** @type {boolean} Flags if the current video is being fetched late from the page metadata. */
let gettingLateVideoDetails = false;

let voiceSearchCancelledByUser = false;
let lastVoiceSearchMicState = window.VoiceState.NORMAL;

/** @type {Element|null} Stores the video element being observed for events. */
let observedVideoElement = null;
let luckyOverlayInstance = null;
let luckyEarlyClick = false;

// --- Buffer Detection Auto-Pause Variables ---
/** @type {number|null} Timestamp of the last buffering event for rapid detection */
let lastBufferingTimestamp = null;
/** @type {string|null} Video ID associated with the last buffer event */
let lastBufferVideoId = null;
/** @type {number|null} Video playback time (in seconds) at the last buffer event */
let lastBufferVideoTime = null;
/** @type {number[]} Timestamps of buffer events within the current detection window */
let bufferEventTimestamps = [];
/** @type {number|null} Timestamp when the current buffer event started */
let currentBufferStartTime = null;
/** @type {number|null} Timeout ID for the auto-pause resume functionality */
let bufferAutoPauseTimeout = null;
/** @type {boolean} Flag to track if auto-pause is currently active */
let isBufferAutoPauseActive = false;
/** @type {number|null} Timestamp of the last user seek operation */
let lastSeekTimestamp = null;
/** @type {number|null} Timestamp of the last play event */
let lastPlayTimestamp = null;
/** @type {boolean} Whether the player has played since the last buffer event */
let hasPlayedSinceLastBuffer = false;
/** @type {number} Grace period after seek to ignore buffer events (in milliseconds) */
const SEEK_BUFFER_GRACE_PERIOD = 2000; // 2 seconds

// --- Utility Classes & Helper Functions ---

/**
 * Handles experimental buffer detection and auto-pause functionality
 * @param {HTMLVideoElement} videoElement - The video element
 */
async function handleBufferDetectionAutoPause(videoElement) {
	// Only proceed if experimental buffer detection is enabled
	if (!window.userSettings.rapidBufferDetection) {
		return;
	}

	const currentTime = Date.now();
	const minBufferDuration = (window.userSettings.bufferDetectionMinDuration || 0.5) * 1000;

	// Calculate how long the current buffer event has been running
	let currentBufferDuration = 0;

	// If this is a new buffer event (no start time recorded), record the start time
	if (currentBufferStartTime === null) {
		currentBufferStartTime = currentTime;
		logger.log(
			'BufferDetection',
			`Buffer event started at ${currentTime}, minimum duration: ${minBufferDuration}ms`
		);
	} else {
		// Calculate duration for ongoing buffer event
		currentBufferDuration = currentTime - currentBufferStartTime;
	}

	// If the buffer event hasn't met the minimum duration, ignore it
	if (currentBufferDuration < minBufferDuration) {
		logger.log(
			'BufferDetection',
			`Ignoring buffer event - duration ${currentBufferDuration}ms is less than minimum ${minBufferDuration}ms`
		);
		return;
	}

	// Buffer event has met minimum duration, proceed with normal processing
	logger.log(
		'BufferDetection',
		`Buffer event qualified - duration: ${currentBufferDuration}ms >= minimum: ${minBufferDuration}ms`
	);

	// If current video time is less than the last recorded buffer video time, assume a rewind and ignore.
	if (lastBufferVideoTime !== null && videoElement.currentTime < lastBufferVideoTime) {
		logger.log(
			'BufferDetection',
			`Ignoring buffer event - video rewound. Current time: ${videoElement.currentTime}, Last buffer time: ${lastBufferVideoTime}`
		);
		lastBufferingTimestamp = Date.now(); // Update timestamp to prevent immediate re-trigger
		lastBufferVideoId = currentVideoId;
		lastBufferVideoTime = videoElement.currentTime;
		bufferEventTimestamps = [];
		currentBufferStartTime = null; // Reset buffer start time
		return;
	}

	const bufferThreshold = (window.userSettings.bufferDetectionThreshold || 3) * 1000;
	const requiredBufferEvents = Math.min(
		3,
		Math.max(1, parseInt(window.userSettings.bufferDetectionEventCount ?? 2))
	);
	const currentVideoIdNow = currentVideoId;

	logger.log(
		'BufferDetection',
		`Buffer event received. videoId=${currentVideoIdNow}, lastVideoId=${lastBufferVideoId}, required=${requiredBufferEvents}, thresholdMs=${bufferThreshold}`
	);

	// Check if we're within the grace period after a user seek
	if (lastSeekTimestamp && currentTime - lastSeekTimestamp < SEEK_BUFFER_GRACE_PERIOD) {
		logger.log(
			'BufferDetection',
			`Ignoring buffer event - within ${SEEK_BUFFER_GRACE_PERIOD}ms grace period after seek`
		);
		// Update timestamp but don't trigger auto-pause
		lastBufferingTimestamp = currentTime;
		// Do not count this buffer event in the window
		// Keep window timestamps unchanged
		hasPlayedSinceLastBuffer = false; // Reset legacy tracking on new buffer event
		currentBufferStartTime = null; // Reset buffer start time
		return;
	}

	// If video changed since the last buffer event, ignore carryover
	if (lastBufferVideoId && currentVideoIdNow && currentVideoIdNow !== lastBufferVideoId) {
		logger.log(
			'BufferDetection',
			`Ignoring buffer event - video changed from ${lastBufferVideoId} to ${currentVideoIdNow} (carryover prevented)`
		);
		// Reset baseline without counting this event
		lastBufferingTimestamp = currentTime;
		lastBufferVideoId = currentVideoIdNow;
		bufferEventTimestamps = [];
		currentBufferStartTime = null; // Reset buffer start time
		return;
	}

	// Update lastBufferVideoTime with the current video time
	lastBufferVideoTime = videoElement.currentTime;

	// Maintain window of buffer events and prune old entries
	bufferEventTimestamps = bufferEventTimestamps.filter(
		(ts) => currentTime - ts <= bufferThreshold
	);
	bufferEventTimestamps.push(currentTime);

	const windowStart = bufferEventTimestamps[0];
	const playedSinceWindowStart =
		!!lastPlayTimestamp && !!windowStart && lastPlayTimestamp >= windowStart;

	logger.log(
		'BufferDetection',
		`Window count=${bufferEventTimestamps.length}, playedSinceWindowStart=${playedSinceWindowStart}`
	);

	if (bufferEventTimestamps.length >= requiredBufferEvents) {
		// Only trigger auto-pause if the player has played since the detection window started
		if (!playedSinceWindowStart) {
			logger.log(
				'BufferDetection',
				'Ignoring buffer event - no play event occurred since window start (likely new video load)'
			);
			lastBufferingTimestamp = currentTime;
			lastBufferVideoId = currentVideoIdNow;
			currentBufferStartTime = null; // Reset buffer start time
			return;
		}

		// Rapid buffering detected after playing - trigger auto-pause
		if (!isBufferAutoPauseActive && !videoElement.paused) {
			isBufferAutoPauseActive = true;
			const pauseDuration = (window.userSettings.bufferDetectionPauseDuration || 5) * 1000;

			logger.log(
				'BufferDetection',
				`Buffering threshold hit (${requiredBufferEvents} events). Auto-pausing for ${
					pauseDuration / 1000
				}s`
			);

			// Start countdown in custom player if available
			if (ytPlayerInstance && ytPlayerInstance.startBufferCountdown) {
				ytPlayerInstance.startBufferCountdown(Math.ceil(pauseDuration / 1000));
			}

			// Pause the video using native method
			await native_handlePlayPause(window.PlayState.PAUSED, true);

			// Set timeout to resume playback
			bufferAutoPauseTimeout = setTimeout(async () => {
				if (isBufferAutoPauseActive && videoElement.paused) {
					logger.log('BufferDetection', 'Resuming playback after auto-pause');
					try {
						await native_handlePlayPause(window.PlayState.PLAYING, true);
					} catch (err) {
						logger.warn('BufferDetection', 'Failed to resume playback:', err);
					}
				}

				cleanupBufferDetectionAutoPause();
			}, pauseDuration);
		}
	}

	// Update the last buffering timestamp and reset play tracking
	lastBufferingTimestamp = currentTime;
	lastBufferVideoId = currentVideoIdNow;
	hasPlayedSinceLastBuffer = false;
	currentBufferStartTime = null; // Reset for next buffer event
}

/**
 * Cleans up buffer detection auto-pause state
 */
function cleanupBufferDetectionAutoPause() {
	if (bufferAutoPauseTimeout) {
		clearTimeout(bufferAutoPauseTimeout);
		bufferAutoPauseTimeout = null;
	}

	// Stop countdown in custom player if available
	if (ytPlayerInstance && ytPlayerInstance.stopBufferCountdown) {
		ytPlayerInstance.stopBufferCountdown();
	}

	isBufferAutoPauseActive = false;
	lastBufferingTimestamp = null;
	lastBufferVideoId = null;
	lastSeekTimestamp = null;
	lastPlayTimestamp = null;
	hasPlayedSinceLastBuffer = false;
	bufferEventTimestamps = [];
	currentBufferStartTime = null;
}

/**
 * Checks if an ad is currently playing by inspecting #movie_player classes
 * @returns {boolean}
 */

/**
 * Centralized DOM helper functions for common element operations
 */
class DOMHelper {
	/**
	 * Finds the main video element with enhanced error handling
	 * @returns {HTMLVideoElement|null}
	 */
	static findVideoElement() {
		const video = DOMUtils.getElement(CSS_SELECTORS.videoElement);
		if (video && video.tagName === 'VIDEO') {
			return video;
		}
		logger.warn('DOMHelper', 'Video element not found or invalid');
		return null;
	}

	/**
	 * Checks if an ad is currently playing by inspecting #movie_player classes
	 * @returns {boolean}
	 */
	static isAdPlaying() {
		const player = DOMUtils.getElement(CSS_SELECTORS.moviePlayer);
		return (
			player?.classList.contains('ad-showing') ||
			player?.classList.contains('ad-interrupting')
		);
	}

	/**
	 * Finds playlist container with retry logic
	 * @param {number} [timeout] - How long to wait
	 * @returns {Promise<Element|null>}
	 */
	static async findPlaylistContainerAsync(timeout = 3000) {
		const playlistPanel = await DOMUtils.waitForElement(
			CSS_SELECTORS.playlistPanel,
			document,
			timeout
		);

		if (playlistPanel) {
			logger.log('DOMHelper', 'Playlist panel found');
			handleStuckPlaylist(playlistPanel);
			return playlistPanel;
		}

		logger.log('DOMHelper', 'Playlist panel not found');
		return null;
	}

	/**
	 * Finds dialog elements by content text
	 * @param {string} contentText - Text to search for in dialog
	 * @returns {Element|null}
	 */
	static findDialogByContent(contentText) {
		return Array.from(document.querySelectorAll(CSS_SELECTORS.dialogs)).find((d) =>
			d.textContent.includes(contentText)
		);
	}
}

/**
 * Enhanced observer management with retry logic for SPA timing
 */
class ObserverManager {
	constructor() {
		this.observers = new Map();
		this.pendingObservers = new Map(); // Track observers waiting for elements
	}

	/**
	 * Creates observer with retry logic for SPA timing
	 * @param {string} name - Unique name for the observer
	 * @param {string|Element} targetOrSelector - Element or selector to observe
	 * @param {Function} callback - Callback function
	 * @param {MutationObserverInit} options - Observer options
	 * @param {string} [logContext] - Context for logging
	 * @param {number} [retryTimeout] - How long to wait for element (default: 5000ms)
	 */
	async createWithRetry(
		name,
		targetOrSelector,
		callback,
		options,
		logContext = 'Observer',
		retryTimeout = 5000
	) {
		this.disconnect(name); // Clean up existing

		const isSelector = typeof targetOrSelector === 'string';
		let target = isSelector ? DOMUtils.getElement(targetOrSelector) : targetOrSelector;

		if (!target && isSelector) {
			// Element doesn't exist yet, wait for it
			logger.log(logContext, `Observer '${name}' waiting for element: ${targetOrSelector}`);

			try {
				target = await DOMUtils.waitForElement(targetOrSelector, document, retryTimeout);
				logger.log(
					logContext,
					`Observer '${name}' found delayed element: ${targetOrSelector}`
				);
			} catch (error) {
				logger.warn(
					logContext,
					`Observer '${name}' timeout waiting for element: ${targetOrSelector}`
				);
				return null;
			}
		}

		if (!target) {
			logger.warn(logContext, `Cannot create observer '${name}': target element not found`);
			return null;
		}

		return this.create(name, target, callback, options, logContext);
	}

	/**
	 * Creates and manages a MutationObserver
	 * @param {string} name - Unique name for the observer
	 * @param {Element} target - Element to observe
	 * @param {Function} callback - Callback function
	 * @param {MutationObserverInit} options - Observer options
	 * @param {string} [logContext] - Context for logging
	 */
	create(name, target, callback, options, logContext = 'Observer') {
		this.disconnect(name); // Clean up existing observer

		if (!target) {
			logger.warn(logContext, `Cannot create observer '${name}': target element not found`);
			return null;
		}

		try {
			const observer = new MutationObserver((mutations) => {
				try {
					callback(mutations);
				} catch (error) {
					logger.error(logContext, `Observer '${name}' callback error:`, error);
				}
			});

			observer.observe(target, options);
			this.observers.set(name, { observer, logContext });
			logger.log(logContext, `Observer '${name}' created and started`);
			return observer;
		} catch (error) {
			logger.error(logContext, `Failed to create observer '${name}':`, error);
			return null;
		}
	}

	/**
	 * Disconnects a specific observer
	 * @param {string} name
	 */
	disconnect(name) {
		const observerData = this.observers.get(name);
		if (observerData) {
			observerData.observer.disconnect();
			this.observers.delete(name);
			logger.log(observerData.logContext, `Observer '${name}' disconnected`);
		}
	}

	/**
	 * Disconnects all observers
	 */
	disconnectAll() {
		for (const [name, observerData] of this.observers) {
			observerData.observer.disconnect();
			logger.log(observerData.logContext, `Observer '${name}' disconnected (cleanup)`);
		}
		this.observers.clear();
	}

	/**
	 * Gets an observer by name
	 * @param {string} name
	 * @returns {MutationObserver|null}
	 */
	get(name) {
		const observerData = this.observers.get(name);
		return observerData ? observerData.observer : null;
	}
}

/**
 * Centralized player state management
 */
class PlayerStateManager {
	/**
	 * Gets the current native player state with enhanced logic
	 * @returns {string} "playing", "paused", "buffering", or "ended"
	 */
	static getNativePlayerState() {
		const video = DOMHelper.findVideoElement();

		if (video) {
			if (video.ended) return window.PlayState.PAUSED;
			if (video.seeking || video.readyState < 3) return window.PlayState.BUFFERING;
			if (video.paused) return window.PlayState.PAUSED;
			return window.PlayState.PLAYING;
		}

		// Fallback checks
		if (DOMUtils.isElementVisible(CSS_SELECTORS.largePlayButton)) {
			return window.PlayState.PAUSED;
		}

		const controlBtn = DOMUtils.getElement(CSS_SELECTORS.playPauseButton);
		if (controlBtn && DOMUtils.isElementVisible(controlBtn)) {
			const label = DOMUtils.getAttribute(controlBtn, 'aria-label')?.toLowerCase() || '';
			if (label.includes('pause')) return window.PlayState.PLAYING;
			if (label.includes('play') || label.includes('replay')) return window.PlayState.PAUSED;
		}

		// Check for buffering indicators
		const spinnerVisible = [CSS_SELECTORS.playerSpinner, CSS_SELECTORS.mobileSpinner].some(
			(selector) => DOMUtils.isElementVisible(selector)
		);
		if (spinnerVisible) return window.PlayState.BUFFERING;

		return window.PlayState.PAUSED; // default fallback
	}

	/**
	 * Syncs custom player state with native player
	 */
	static syncCustomPlayerState() {
		if (!ytPlayerInstance || !ytPlayerInstance.isPlayerVisible) return;

		const nativeState = this.getNativePlayerState();
		const video = DOMHelper.findVideoElement();

		let currentTime = video?.currentTime || 0;
		let duration = video?.duration || 0;

		// If we auto skip ads, dont show the ad timer
		if (!window.userSettings.autoSkipAds && DOMHelper.isAdPlaying()) {
			currentTime = 0;
			duration = 0;
		}

		if (
			video &&
			!ytPlayerInstance.isSeekbarDragging &&
			!isNaN(video.duration) &&
			video.duration > 0
		) {
			// Update time if video element is available
			ytPlayerInstance.setCurrentTime(currentTime, duration);
		}

		// Update play state
		if (ytPlayerInstance.getPlayState() !== nativeState) {
			logger.log(
				'Observers',
				`Native player state has changed to ${nativeState}. Updating custom player state.`
			);
			ytPlayerInstance.setPlayState(nativeState);
		}
	}
}

/**
 * Feature registry system for managing extension features
 */
class FeatureManager {
	constructor() {
		this.features = new Map();
		this.observerManager = new ObserverManager();
	}

	/**
	 * Registers a feature with its handlers
	 * @param {string} name - Feature name
	 * @param {Object} config - Feature configuration
	 */
	register(name, config) {
		this.features.set(name, {
			isEnabled: () => config.isEnabled(),
			initialize: config.initialize || (() => {}),
			cleanup: config.cleanup || (() => {}),
			logContext: config.logContext || name,
		});
	}

	/**
	 * Manages all registered features based on their enabled state
	 */
	async manageAll() {
		for (const [name, feature] of this.features) {
			try {
				if (feature.isEnabled()) {
					await feature.initialize();
					logger.log(feature.logContext, `Feature '${name}' initialized`);
				} else {
					await feature.cleanup();
					logger.log(feature.logContext, `Feature '${name}' cleaned up`);
				}
			} catch (error) {
				logger.error(feature.logContext, `Feature '${name}' management error:`, error);
			}
		}
	}

	/**
	 * Cleans up all features
	 */
	cleanupAll() {
		for (const [name, feature] of this.features) {
			try {
				feature.cleanup();
			} catch (error) {
				logger.error(feature.logContext, `Feature '${name}' cleanup error:`, error);
			}
		}
		this.observerManager.disconnectAll();
	}
}

// Global instances
const observerManager = new ObserverManager();
const featureManager = new FeatureManager();

/**
 * Helper function to handle getting late video details when title is missing
 */
async function handleLateVideoDetails() {
	if (!ytPlayerInstance) return;
	if (
		ytPlayerInstance.options.nowPlayingVideoDetails.title === null &&
		DOMUtils.isElementVisible(CSS_SELECTORS.metadataSection) &&
		!gettingLateVideoDetails
	) {
		logger.log('VideoDetails', 'Getting late details for video');
		gettingLateVideoDetails = true;
		const pageDetails = await getVideoDetailsFromPage();
		pageDetails.videoId = PageUtils.getCurrentVideoIdFromUrl();
		ytPlayerInstance.setCurrentVideoDetails(pageDetails);
		gettingLateVideoDetails = false;
	}
}

/**
 * Applies accent color based on user settings - handles both specific colors and randomization
 */
function applyTheme() {
	if (window.userSettings.customPlayerAccentColor === 'randomize') {
		// Handle randomization logic
		if (
			shuffledAccentColors.length === 0 ||
			currentAccentColorIndex >= shuffledAccentColors.length
		) {
			shuffledAccentColors = [...Object.keys(COLOR_MAP)];
			ArrayUtils.shuffleArray(shuffledAccentColors);
			currentAccentColorIndex = 0;
			logger.log('AccentColor', 'Shuffled accent colors:', shuffledAccentColors);
		}

		const colorToApply = shuffledAccentColors[currentAccentColorIndex];
		currentAccentColorIndex++;
		logger.log(
			'AccentColor',
			`Applying sequential random accent color -> ${colorToApply} (index: ${
				currentAccentColorIndex - 1
			})`
		);
		setThemeCSS(colorToApply);
	} else {
		// Apply specific color
		setThemeCSS(window.userSettings.customPlayerAccentColor);
	}
}

/**
 * Sets the accent color CSS custom properties
 * @param {string} colorName - The name of the color from the predefined map
 * @param {object} colors - The colors to apply if adaptive
 */
/**
 * Updates the browser's theme-color meta tag
 * @param {string} accentColor - The current accent color
 */
function updateBrowserThemeColor(accentColor) {
	const setting = window.userSettings.applyThemeColorToBrowser;
	if (setting === 'disabled') return;

	let themeColorMeta = document.querySelector('meta[name="theme-color"]');
	if (!themeColorMeta) {
		themeColorMeta = document.createElement('meta');
		themeColorMeta.name = 'theme-color';
		document.head.appendChild(themeColorMeta);
	}

	let colorToUse;
	if (setting === 'accent') {
		colorToUse = accentColor;
	} else if (setting === 'theme') {
		// Get theme color based on current theme
		const theme = window.userSettings.customPlayerTheme;

		// Define theme-specific navbar background colors (matching CSS --yt-player-bg-secondary)
		const themeColors = {
			dark: '#0f0f0f',
			light: '#ffffff',
			red: '#ff0000',
			blue: '#3498db',
			green: '#2ecc71',
			purple: '#9b59b6',
			orange: '#e67e22',
			pink: '#e91e63',
			teal: '#008080',
			yellow: '#f1c40f',
			babypink: '#f5a9d0',
			indigo: '#3f51b5',
			cyan: '#00bcd4',
			lime: '#cddc39',
			brown: '#795548',
			grey: '#9e9e9e',
		};

		if (theme === 'system') {
			// System theme - detect current preference
			const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
			colorToUse = isDark ? '#0f0f0f' : '#ffffff';
		} else {
			// Use theme-specific color or fallback to dark theme
			colorToUse = themeColors[theme] || '#0f0f0f';
		}
	}

	themeColorMeta.content = colorToUse;
	logger.log(
		'ThemeColor',
		`Updated browser theme color to: ${colorToUse} (mode: ${setting}, theme: ${window.userSettings.customPlayerTheme})`
	);
}

/**
 * Sets theme CSS properties and updates browser theme color
 * @param {string} colorName - The color name from COLOR_MAP
 * @param {object} colors - Optional custom colors object
 */
function setThemeCSS(colorName, colors = {}) {
	if (colorName === 'adaptive' && !colors.primary) colorName = 'red';

	const selectedColors = COLOR_MAP[colorName] || COLOR_MAP.red;
	const { primary, secondary } = colors.primary ? colors : selectedColors;

	// Set CSS custom properties used by the stylesheet
	document.body.classList.remove(
		'yt-theme-light',
		'yt-theme-dark',
		'yt-theme-system',
		'yt-theme-red',
		'yt-theme-pink',
		'yt-theme-babypink',
		'yt-theme-purple',
		'yt-theme-indigo',
		'yt-theme-blue',
		'yt-theme-teal',
		'yt-theme-cyan',
		'yt-theme-green',
		'yt-theme-lime',
		'yt-theme-yellow',
		'yt-theme-orange',
		'yt-theme-brown',
		'yt-theme-grey'
	);
	document.body.classList.add(`yt-theme-${window.userSettings.customPlayerTheme}`);

	if (colorName !== 'adaptive' || colors.primary || !PageUtils.isVideoWatchPage()) {
		document.body.style.setProperty('--yt-player-accent-primary', primary);
		document.body.style.setProperty('--yt-player-accent-secondary', secondary);
		document.body.style.setProperty(
			'--yt-player-accent-primary-alpha-bg',
			ColorUtils.hexToRgba(primary, 0.08)
		);
		document.body.style.setProperty(
			'--yt-player-accent-primary-alpha-bg-hover',
			ColorUtils.hexToRgba(primary, 0.12)
		);
	}

	// Update browser theme color (called for all cases to handle theme changes)
	updateBrowserThemeColor(primary);
}

/**
 * Sets adaptive colors based on thumbnail URL or applies user-selected accent color
 * @param {string} url - The thumbnail URL to extract colors from
 */
async function setAdaptiveColors(url) {
	if (window.userSettings.customPlayerAccentColor === 'adaptive') {
		try {
			logger.log('AccentColor', `Fetching adaptive colors for thumbnail: ${url}`);
			const colors = await ColorUtils.getAdaptiveColorFromThumbnail(url);
			setThemeCSS('adaptive', colors);
		} catch (error) {
			logger.error('AccentColor', `Failed to fetch adaptive colors: ${error}`);
			setThemeCSS('red'); // fallback
		}
	} else {
		setThemeCSS(window.userSettings.customPlayerAccentColor);
	}
}

// --- Enhanced Data Fetching Functions ---

/**
 * Enhanced video details scraping with SPA timing awareness
 */
async function getVideoDetailsFromPage() {
	// Wait for the metadata section with longer timeout for SPA
	try {
		await DOMUtils.waitForElement(CSS_SELECTORS.metadataSection, document, 5000);
	} catch {
		logger.warn('Parser', 'Video metadata section took longer than expected to load');
	}

	const videoElement = DOMHelper.findVideoElement();
	const currentVidId = PageUtils.getCurrentVideoIdFromUrl();

	// Get title with fallback chain
	let rawTitle = DOMUtils.getText(CSS_SELECTORS.videoTitle) || document.title;

	// Clean YouTube suffix
	if (rawTitle.toLowerCase().endsWith(' - youtube')) {
		rawTitle = rawTitle.substring(0, rawTitle.length - ' - youtube'.length).trim();
	}
	logger.log('Parser', `getVideoDetailsFromPage found raw title: "${rawTitle}"`);

	let displayTitle = rawTitle;
	let displayAuthor = DOMUtils.getText(CSS_SELECTORS.videoAuthor) || 'Unknown Author';

	// Apply parsing preference
	if (
		window.userSettings.enableCustomPlayer &&
		(window.userSettings.parsingPreference === 'parsed' ||
			(window.userSettings.parsingPreference === 'mixesAndPlaylists' &&
				PageUtils.isPlaylistPage()) ||
			(window.userSettings.parsingPreference === 'mixesOnly' &&
				PageUtils.isPlaylistPage() &&
				/^(?:my\s+)?mix/i.test(DOMUtils.getText(CSS_SELECTORS.playlistTitle) || '')))
	) {
		const parsedInfo = MediaUtils.parseTitleToMusicMetadata(rawTitle, displayAuthor);
		if (parsedInfo) {
			displayTitle = parsedInfo.track;
			if (parsedInfo.artist) {
				displayAuthor =
					parsedInfo.artist +
					(parsedInfo.featuring ? ' (ft. ' + parsedInfo.featuring + ')' : '');
			}
		}
	}

	return {
		title: displayTitle || 'Video Title',
		author: displayAuthor,
		thumbnailUrl: MediaUtils.getStandardThumbnailUrl(currentVidId),
		currentTime: videoElement ? videoElement.currentTime : 0,
		totalTime: videoElement && !isNaN(videoElement.duration) ? videoElement.duration : 0,
		videoId: currentVidId,
	};
}

/**
 * Enhanced playlist scraping with timing awareness
 */
function getPlaylistItemsFromPage() {
	const playlistItems = [];

	// Check if playlist panel has loaded yet
	const playlistPanel = DOMUtils.getElement(CSS_SELECTORS.playlistPanel);
	if (!playlistPanel) {
		logger.log('Parser', 'Playlist panel not yet loaded, returning empty playlist');
		return {
			items: [],
			playlistTitle: 'Loading...',
		};
	}

	const playlistTitle = DOMUtils.getText(CSS_SELECTORS.playlistTitle);

	const playlistItemElements = DOMUtils.getElement(
		CSS_SELECTORS.playlistItems,
		playlistPanel,
		true
	);
	if (playlistItemElements) {
		playlistItemElements.forEach((itemEl) => {
			const linkElement = DOMUtils.getElement(CSS_SELECTORS.playlistItemLink, itemEl);
			if (!linkElement) return;

			const urlParams = new URLSearchParams(new URL(linkElement.href).search);
			const videoId = urlParams.get('v');

			// Extract metadata
			const titleEl = itemEl.querySelector(CSS_SELECTORS.playlistItemHeadline);
			const artistEl = itemEl.querySelector(CSS_SELECTORS.playlistItemByline);
			const durationEl = itemEl.querySelector(CSS_SELECTORS.playlistItemDuration);

			const rawItemTitle = titleEl ? titleEl.textContent.trim() : 'Unknown Title';
			let itemTitle = rawItemTitle;
			let itemArtist = artistEl ? artistEl.textContent.trim() : 'Unknown Artist';
			const duration = durationEl ? durationEl.textContent.trim() : '0:00';

			// Apply parsing preference and get parsed metadata
			let parsedInfo = null;
			if (
				window.userSettings.enableCustomPlayer &&
				(window.userSettings.parsingPreference === 'parsed' ||
					(window.userSettings.parsingPreference === 'mixesAndPlaylists' &&
						PageUtils.isPlaylistPage()) ||
					(window.userSettings.parsingPreference === 'mixesOnly' &&
						PageUtils.isPlaylistPage() &&
						/^(?:my\s+)?mix/i.test(playlistTitle)))
			) {
				parsedInfo = MediaUtils.parseTitleToMusicMetadata(itemTitle, itemArtist);
				if (parsedInfo) {
					itemTitle = parsedInfo.track;
					itemArtist =
						parsedInfo.artist +
						(parsedInfo.featuring ? ' (ft. ' + parsedInfo.featuring + ')' : '');
				}
			}

			playlistItems.push({
				id: videoId || `no-id-${Date.now()}-${Math.random()}`,
				title: itemTitle,
				artist: itemArtist,
				duration,
				thumbnailUrl: MediaUtils.getStandardThumbnailUrl(videoId),
				// Include parsed metadata if available
				parsedMetadata: parsedInfo || {
					artist: itemArtist,
					featuring: null,
					track: itemTitle,
					originalTitle: rawItemTitle,
					originalChannel: itemArtist,
					parsed: false,
					parseMethod: 'none',
					parseConfidence: 'low',
				},
			});
		});

		logger.log('Parser', `getPlaylistItemsFromPage found ${playlistItems.length} items.`);
	}

	return {
		items: playlistItems,
		playlistTitle: playlistTitle || 'Mix',
	};
}

// --- Enhanced Native Player Interaction ---

/**
 * Enhanced preemptive button handling
 * @returns {Promise<boolean>}
 */
async function handlePreemptiveYouTubeButtons() {
	let clickedPreemptive = false;

	const buttonsToCheck = [
		{ selector: CSS_SELECTORS.unmuteButton, name: 'unmute' },
		{ selector: CSS_SELECTORS.largePlayButton, name: 'large play' },
	];

	for (const button of buttonsToCheck) {
		const element = DOMUtils.getElement(button.selector);
		if (element) {
			const style = window.getComputedStyle(element);
			if (style.display !== 'none') {
				if (DOMUtils.clickElement(element)) {
					logger.log('NativePlayer', `Clicked preemptive ${button.name} button`);
					clickedPreemptive = true;
					await new Promise((r) => setTimeout(r, 200));
				}
			}
		}
	}

	return clickedPreemptive;
}

/**
 * Enhanced play/pause handling with better error recovery
 * @param {"playing"|"paused"} requestedState
 * @param {boolean} [sourceIsCustomPlayer=false]
 */
async function native_handlePlayPause(requestedState, sourceIsCustomPlayer = false) {
	if (!sourceIsCustomPlayer) cleanupBufferDetectionAutoPause();

	await handlePreemptiveYouTubeButtons();

	const video = DOMHelper.findVideoElement();
	if (!video) {
		logger.warn('NativePlayer', 'Video element not found, falling back to UI button');
		return clickNativePlayPause(requestedState, sourceIsCustomPlayer);
	}

	try {
		if (requestedState === window.PlayState.PLAYING) {
			if (video.paused || video.ended) {
				await video.play();
				logger.log('NativePlayer', 'Video play() called successfully');
			}
		} else if (requestedState === window.PlayState.PAUSED) {
			if (!video.paused) {
				if (sourceIsCustomPlayer) customControlsInitiatedPause = true;
				video.pause();
				logger.log('NativePlayer', 'Video pause() called successfully');
			}
		}
	} catch (err) {
		logger.warn('NativePlayer', 'Direct video control failed, falling back to UI button:', err);
		clickNativePlayPause(requestedState, sourceIsCustomPlayer);
	}
}

/**
 * Clicks the native play/pause button based on requested state
 * @param {string} requestedState - The desired play state
 * @param {boolean} [sourceIsCustomPlayer=false] - Whether the request came from custom player
 */
function clickNativePlayPause(requestedState, sourceIsCustomPlayer = false) {
	const buttonSelector = CSS_SELECTORS.playPauseButton;
	const state = PlayerStateManager.getNativePlayerState();

	if (requestedState === 'playing' && state !== 'playing') {
		DOMUtils.clickElement(buttonSelector);
	} else if (requestedState === 'paused' && state === 'playing') {
		if (sourceIsCustomPlayer) customControlsInitiatedPause = true;
		DOMUtils.clickElement(buttonSelector);
	}
}

/**
 * Enhanced previous handling with better logic separation
 */
function native_handlePrevious() {
	if (window.userSettings.previousButtonBehavior === 'alwaysPrevious') {
		_handleStandardPrevious();
	} else {
		_handleSmartPrevious();
	}
}

/**
 * Handles standard previous button behavior - always goes to previous video
 */
async function _handleStandardPrevious() {
	await handlePreemptiveYouTubeButtons();

	if (!handlePreviousWhenAdPlayingInPlaylist()) {
		DOMUtils.clickElement(CSS_SELECTORS.previousButton);
		logger.log('NativePlayer', '[Standard] Previous video button clicked');
	}
}

async function _handleRestartCurrent() {
	const videoElement = DOMHelper.findVideoElement();
	if (videoElement) {
		videoElement.currentTime = 1; // Restart from 1s - not 0s to avoid SponsorBlock breaking feature
		if (ytPlayerInstance && ytPlayerInstance.isPlayerVisible) {
			ytPlayerInstance.setCurrentTime(videoElement.currentTime, videoElement.duration, true);
		}
		logger.log('NativePlayer', '[Restart] Video restarted');
	}
}

/**
 * Navigates to a specific video using YouTube's SPA routing without page reload
 * @param {string} videoId - The video ID to navigate to
 */
function _navigateToVideo(videoId) {
	if (!videoId) {
		logger.warn('Navigation', 'Cannot navigate: videoId is null or undefined');
		return;
	}

	// Construct the watch URL
	const watchUrl = `/watch?v=${videoId}`;

	// Preserve playlist parameter if currently on a playlist page
	const currentPlaylistId = PageUtils.getCurrentPlaylistIdFromUrl();
	const finalUrl = currentPlaylistId ? `${watchUrl}&list=${currentPlaylistId}` : watchUrl;

	logger.log('Navigation', `Navigating to video ${videoId} via SPA routing: ${finalUrl}`);

	// Use YouTube's SPA routing pattern
	window.history.pushState({}, '', finalUrl);
	window.dispatchEvent(new PopStateEvent('popstate'));
}

async function _handleSmartPrevious() {
	await handlePreemptiveYouTubeButtons();
	logger.log('NativePlayer', '[Smart] Checking previous video button');
	if (!handlePreviousWhenAdPlayingInPlaylist()) {
		const videoElement = DOMHelper.findVideoElement();
		if (videoElement) {
			const threshold = window.userSettings.smartPreviousThreshold || 5;
			if (videoElement.currentTime > threshold) {
				_handleRestartCurrent();
			} else {
				DOMUtils.clickElement(CSS_SELECTORS.previousButton);
				logger.log('NativePlayer', '[Smart] Previous video button clicked');
			}
		} else {
			DOMUtils.clickElement(CSS_SELECTORS.previousButton);
			logger.log('NativePlayer', '[Smart] Previous video button clicked');
		}
	}
}

/**
 * Handles previous button behavior when an ad is playing in the playlist
 * @returns {boolean} - Whether the previous video was successfully called in the playlist
 */
function handlePreviousWhenAdPlayingInPlaylist() {
	if (DOMHelper.isAdPlaying()) {
		// Attempt to skip to previous video in playlist
		if (PageUtils.isPlaylistPage()) {
			const previousVideo = ytPlayerInstance.getAdjacentVideo(
				PageUtils.getCurrentVideoIdFromUrl(),
				'backward'
			);
			if (previousVideo) {
				customPlayer_onPlaylistItemClick(previousVideo.id);
				logger.log('NativePlayer', 'Ad playing, going to previous video in playlist');
				return true;
			}
		}
	}
	return false;
}

/**
 * Observes for the ad skip button and clicks it when it appears
 */
let skipAdTimeout;
let adSkipObserver = null;
function observeAndClickSkipButton() {
	adSkipObserver = new MutationObserver((mutations, obs) => {
		const adSkipButton = DOMUtils.getElement(CSS_SELECTORS.adSkipButton);
		if (adSkipButton) {
			obs.disconnect(); // Stop observing mutations once the button is found

			const clickInterval = setInterval(() => {
				const adSkipButton = DOMUtils.getElement(CSS_SELECTORS.adSkipButton);
				if (adSkipButton) {
					DOMUtils.clickElement(adSkipButton);
					logger.log('NativePlayer', 'Attempting to press ad skip button');
				} else {
					logger.log('NativePlayer', 'Ad skip button successfully pressed');
					clearInterval(clickInterval);
				}
			}, 100);

			// Clear the interval after the main timeout
			setTimeout(() => {
				clearInterval(clickInterval);
			}, 4900); // Slightly less than the main timeout
		}
	});

	const playerContainer = DOMUtils.getElement(CSS_SELECTORS.playerContainer);
	if (playerContainer) {
		adSkipObserver.observe(playerContainer, { childList: true, subtree: true });
	}

	// Fallback timeout to prevent the observer from running indefinitely
	skipAdTimeout = setTimeout(() => {
		adSkipObserver.disconnect();
	}, 5000);
}

/**
 * Handles the end of an ad by skipping to the next video
 */
async function handleEndOfAd() {
	logger.log(
		'NativePlayer',
		'Ad already seeked to end, skipping to next video in playlist (if available)'
	);

	if (PageUtils.isPlaylistPage()) {
		const nextVideo = ytPlayerInstance.getAdjacentVideo(
			PageUtils.getCurrentVideoIdFromUrl(),
			'forward'
		);
		if (nextVideo) {
			customPlayer_onPlaylistItemClick(nextVideo.id);
			logger.log('NativePlayer', 'Skipping to next video in playlist');
			return;
		}
	}
}

/**
 * Enhanced skip handling, first checks if an ad is playing, if it is, it seeks
 * it to the end, if not, it clicks the native skip button
 * @param {boolean} [resquestByAdSkip=false] - Whether the skip was requested by ad skip feature
 */
async function native_handleSkip(resquestByAdSkip = false) {
	handlePreemptiveAdMuting(true);

	// Disconnect any existing observer
	if (adSkipObserver) {
		adSkipObserver.disconnect();
		clearTimeout(skipAdTimeout);
	}

	// If we're repeating, clear the repeat when skipping to next video
	if (!resquestByAdSkip) {
		clearRepeatMode();
	}

	await handlePreemptiveYouTubeButtons();
	if (DOMHelper.isAdPlaying()) {
		const video = DOMHelper.findVideoElement();
		if (!resquestByAdSkip && window.userSettings.autoSkipAds) {
			handleEndOfAd();
		} else {
			video.currentTime = video.duration;
			logger.log('NativePlayer', 'Ad seeked to end');
			observeAndClickSkipButton();
		}
	} else {
		// Check if there's a "Play Next" video set and play it
		if (!playNextVideo()) {
			// If no "Play Next" video was set, use default skip behavior
			DOMUtils.clickElement(CSS_SELECTORS.nextButton);
			logger.log('NativePlayer', 'Next video button clicked');
		}
	}
}

/**
 * Enhanced seekbar update handling
 * @param {number} _ - Unused percentage parameter
 * @param {number} newTimeSeconds - New time in seconds
 * @param {boolean} isFinal - Whether this is the final update
 */
function native_handleSeekbarUpdate(_, newTimeSeconds, isFinal) {
	const video = DOMHelper.findVideoElement();
	if (video && isFinal && typeof video.currentTime === 'number') {
		// Record seek timestamp for buffer detection
		lastSeekTimestamp = Date.now();
		video.currentTime = newTimeSeconds;
		logger.log('NativePlayer', `Seekbar updated to ${newTimeSeconds}s`);
	}
}

/**
 * Enhanced seek handling with bounds checking
 * @param {number} seconds - Seconds to seek (positive or negative)
 */
function native_handleSeek(seconds) {
	const video = DOMHelper.findVideoElement();
	if (video && typeof video.currentTime === 'number' && !isNaN(video.duration)) {
		// Record seek timestamp for buffer detection
		lastSeekTimestamp = Date.now();
		const newTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
		video.currentTime = newTime;
		logger.log('NativePlayer', `Seeked ${seconds}s to ${newTime}s`);

		if (ytPlayerInstance && ytPlayerInstance.isPlayerVisible) {
			ytPlayerInstance.setCurrentTime(video.currentTime, video.duration, true);
		}
	}
}
// --- Custom Player Callback Functions ---

/**
 * Handles user toggle of the custom player drawer
 * @param {boolean} isOpen - Whether the drawer is open
 * @param {number} targetHeight - The target height for the drawer
 */
function customPlayer_onDrawerUserToggle(isOpen, targetHeight) {
	logger.log(
		'Drawer',
		`User manually toggled drawer. New target height: ${targetHeight}. This state will persist for the session.`
	);
	hasUserManuallyToggledDrawerThisSession = true;
	manualDrawerTargetHeightThisSession = targetHeight;
}

/**
 * Handles play/pause button clicks in the custom player
 * @param {string} requestedState - The requested play state
 * @param {Object} details - Additional details about the click
 */
function customPlayer_onPlayPauseClick(requestedState, details) {
	native_handlePlayPause(requestedState, details && details.source === 'custom');
}

/**
 * Handles previous button clicks in the custom player
 */
function customPlayer_onPreviousClick() {
	native_handlePrevious();
}

/**
 * Handles skip button clicks in the custom player
 */
function customPlayer_onSkipClick() {
	native_handleSkip();
}

/**
 * Handles repeat button clicks in the custom player
 * @param {boolean} isEnabled - Whether repeat mode is enabled
 */
function customPlayer_onRepeatClick(isEnabled) {
	logger.log('RepeatButton', `Repeat mode ${isEnabled ? 'enabled' : 'disabled'}`);

	if (isEnabled) {
		// Enable repeat mode for current video
		if (currentVideoId && ytPlayerInstance) {
			repeatIndefinitely = true;
			nextUpVideoId = currentVideoId;
			ytPlayerInstance._setRepeatCurrent(currentVideoId);
			logger.log('RepeatButton', `Set repeat for current video: ${currentVideoId}`);
		}
	} else {
		// Disable repeat mode
		clearRepeatMode();
	}
}

/**
 * Handles seekbar updates in the custom player
 * @param {number} newTimePercentage - The new time as a percentage
 * @param {number} newTimeSeconds - The new time in seconds
 * @param {boolean} isFinal - Whether this is the final update
 */
function customPlayer_onSeekbarUpdate(newTimePercentage, newTimeSeconds, isFinal) {
	native_handleSeekbarUpdate(newTimePercentage, newTimeSeconds, isFinal);
}

/**
 * Handles playlist item clicks in the custom player
 * @param {string} itemId - The ID of the playlist item to play
 */
function customPlayer_onPlaylistItemClick(itemId, manualClick = false) {
	// If we're repeating and the requested video is different, clear the repeat
	if (repeatIndefinitely && nextUpVideoId && itemId !== nextUpVideoId) {
		clearRepeatMode();
	}

	// Reset any buffer detection
	cleanupBufferDetectionAutoPause();

	const playlistItemEl = DOMUtils.getElement(
		`${CSS_SELECTORS.playlistItems} a[href*="v=${itemId}"]`
	);
	if (playlistItemEl) {
		logger.log('PlaylistClick', 'Clicking playlist item', playlistItemEl);
		handlePreemptiveAdMuting(true);
		playlistItemEl.click();
	} else {
		// Fallback navigation
		_navigateToVideo(itemId);
	}

	if (
		userSettings.returnToDefaultModeOnVideoSelect &&
		!userSettings.customPlaylistMode.startsWith('fixed-') &&
		manualClick
	) {
		logger.log(
			'Drawer',
			"Video selected, resetting manual drawer state due to 'Return to Default Mode' setting."
		);

		if (hasUserManuallyToggledDrawerThisSession) ytPlayerInstance.openDrawerToDefault();

		hasUserManuallyToggledDrawerThisSession = false;
		manualDrawerTargetHeightThisSession = null;
	}
}

/**
 * Handles gesture-based seeking in the custom player
 * @param {number} seconds - The number of seconds to seek
 */
function customPlayer_onGestureSeek(seconds) {
	native_handleSeek(seconds);
}

/**
 * Handles gesture-based playlist toggle in the custom player
 */
function customPlayer_onGestureTogglePlaylist() {
	logger.log('Gestures', 'Playlist toggled via gesture.');
}

/**
 * Handles gesture-based restart of current video in the custom player
 */
function customPlayer_onGestureRestartCurrent() {
	_handleRestartCurrent();
}

/**
 * Handles gesture-based previous video navigation (always goes to previous)
 */
async function customPlayer_onGesturePreviousOnly() {
	_handleStandardPrevious();
}

/**
 * Handles gesture-based smart previous navigation (restarts current or goes to previous)
 */
async function customPlayer_onGestureSmartPrevious() {
	_handleSmartPrevious();
}

/**
 * Handles gesture-based toggle of the Favourites dialog
 */
function customPlayer_onGestureToggleFavourites() {
	logger.log('Gestures', 'Favourites dialog toggled via gesture.');
	if (ytNavbarInstance) {
		ytNavbarInstance.toggleFavouritesDialog();
	}
}

/**
 * Handles gesture-based toggle of the video player visibility
 */
function customPlayer_onGestureToggleVideoPlayer() {
	logger.log('Gestures', 'Video player visibility toggled via gesture.');
	if (ytNavbarInstance) {
		ytNavbarInstance._handleVideoToggleClick();
	}
}

function customPlayer_onReloadPlaylistClick() {
	logger.log('Event Handlers', 'Reload Playlist clicked');
	const playlistPanel = DOMUtils.getElement(CSS_SELECTORS.playlistPanel);
	if (playlistPanel) {
		handleStuckPlaylist(playlistPanel, false, true);
	}
}

function customPlayer_onPlaylistItemRemoved(removedVideoId) {
	logger.log(
		'Callbacks',
		`Playlist item removed: ${removedVideoId}, Current video: ${currentVideoId}`
	);
	if (removedVideoId === currentVideoId) {
		logger.log('Callbacks', 'Current video was removed, playing next.');
		const nextVideo = ytPlayerInstance.getAdjacentVideo(removedVideoId, 'forward');
		if (nextVideo) {
			customPlayer_onPlaylistItemClick(nextVideo.id);
		} else {
			logger.log('Callbacks', 'No next video found in playlist.');
		}
	}
}

function customPlayer_onPlayNextSet(videoId, repeats = false) {
	logger.log('Callbacks', `Play Next set to video: ${videoId}, repeats: ${repeats}`);
	nextUpVideoId = videoId;
	repeatIndefinitely = repeats;

	if (repeats && currentVideoId !== videoId) playNextVideo();
}

/**
 * Clears the repeat mode state and visual indicators
 */
function clearRepeatMode() {
	if (repeatIndefinitely) {
		logger.log('RepeatMode', 'Clearing repeat mode');
		repeatIndefinitely = false;
		nextUpVideoId = null;
		if (ytPlayerInstance) {
			ytPlayerInstance.clearPlayNext();
		}
	}
}

/**
 * Play the next video that was set via "Play Next" context menu
 */
function playNextVideo() {
	if (!nextUpVideoId) {
		logger.log('PlayNext', 'No next video set, using default next video logic.');
		return false;
	}

	if (repeatIndefinitely && nextUpVideoId === currentVideoId) {
		logger.log('PlayNext', 'Repeating current video');
		_handleRestartCurrent();

		// Backup method: If page navigates away, force navigation back to current video
		setTimeout(() => {
			const currentUrlVideoId = PageUtils.getCurrentVideoIdFromUrl();
			if (currentUrlVideoId !== currentVideoId && repeatIndefinitely) {
				logger.log(
					'PlayNext',
					`Page navigated away during repeat (${currentUrlVideoId} !== ${currentVideoId}), forcing navigation back`
				);
				_navigateToVideo(currentVideoId);
			}
		}, 1000); // Check after 1 second

		return true;
	}

	if (PageUtils.isPlaylistPage()) {
		logger.log('PlayNext', `Playing next video: ${nextUpVideoId}`);
		customPlayer_onPlaylistItemClick(nextUpVideoId);
	}

	// Clear the next up video and indicator only if not repeating indefinitely
	if (!repeatIndefinitely) {
		if (ytPlayerInstance) {
			ytPlayerInstance.clearPlayNext();
		}
		nextUpVideoId = null;
	}

	return true;
}

// --- Enhanced Voice Search Handling ---

/**
 * Handles voice search button clicks in the custom player
 * @param {string} requestedState - The requested voice search state ('listening' or 'normal')
 */
async function customPlayer_onVoiceSearchClick(requestedState) {
	if (!window.userSettings.showVoiceSearchButton || !ytPlayerInstance) return;

	const dialog = DOMUtils.getElement(CSS_SELECTORS.voiceSearchDialog);
	if (requestedState === 'listening') {
		voiceSearchCancelledByUser = false;
		if (DOMUtils.isElementVisible(dialog)) {
			logger.log(
				'VoiceSearch',
				'Voice search activation requested: Dialog already open, clicking mic button.'
			);
			DOMUtils.clickElement(CSS_SELECTORS.dialogMicButton);
		} else {
			logger.log(
				'VoiceSearch',
				'Voice search activation requested: Dialog not open, clicking header voice button.'
			);

			await DOMUtils.clickElement(CSS_SELECTORS.headerVoiceButton, {
				primeSelectorOrElement: CSS_SELECTORS.headerSearchButton,
				primeReadySelectorOrElement: CSS_SELECTORS.headerCloseSearchButton,
				primeUndoSelectorOrElement: CSS_SELECTORS.headerCloseSearchButton,
			});
		}
	} else if (requestedState === 'normal') {
		if (DOMUtils.isElementVisible(dialog)) {
			voiceSearchCancelledByUser = true;
			logger.log(
				'VoiceSearch',
				'Voice search cancellation requested: Dialog open, clicking cancel button.'
			);
			DOMUtils.clickElement(CSS_SELECTORS.dialogCancelButton);
		} else {
			logger.log(
				'VoiceSearch',
				'Voice search cancellation requested: Dialog not open, no action needed.'
			);
		}
	}
}

/**
 * Handles changes to the voice search dialog visibility and state
 */
function handleVoiceSearchDialogChanges() {
	const voiceDialog = DOMUtils.getElement(CSS_SELECTORS.voiceSearchDialog);
	const isDialogVisible = DOMUtils.isElementVisible(voiceDialog);
	const hasDialogClass = document.body.classList.contains('yt-native-search-dialog');

	if (isDialogVisible && !hasDialogClass) {
		logger.log(
			'VoiceSearch',
			'Native voice search dialog opened. Adding body class and updating custom controls.'
		);
		document.body.classList.add('yt-native-search-dialog');

		if (ytPlayerInstance && window.userSettings.showVoiceSearchButton) {
			ytPlayerInstance.setVoiceSearchState('listening'); // Initial state when dialog opens
			logger.log(
				'VoiceSearch',
				"Set custom voice search state to 'listening' (dialog opened)."
			);

			const currentNativeState = PlayerStateManager.getNativePlayerState();
			if (currentNativeState === window.PlayState.PLAYING) {
				wasPlayingBeforeVoiceSearch = true;
				native_handlePlayPause(window.PlayState.PAUSED, false);
			} else {
				wasPlayingBeforeVoiceSearch = false;
			}

			setupVoiceDialogStateObserver(voiceDialog);
		}
	} else if (!isDialogVisible && hasDialogClass) {
		logger.log(
			'VoiceSearch',
			'Native voice search dialog closed. Removing body class and resetting custom controls.'
		);
		document.body.classList.remove('yt-native-search-dialog');

		if (ytPlayerInstance && window.userSettings.showVoiceSearchButton) {
			ytPlayerInstance.setVoiceSearchState('normal'); // Reset state when dialog closes
			logger.log('VoiceSearch', "Set custom voice search state to 'normal' (dialog closed).");

			if (wasPlayingBeforeVoiceSearch) {
				native_handlePlayPause(window.PlayState.PLAYING, false);
				wasPlayingBeforeVoiceSearch = false;
			}
		}

		observerManager.disconnect('voiceDialog');

		maybeFeelingLuckyAfterVoiceSearch();
	}
}

/**
 * Sets up observer for voice dialog state changes
 * @param {Element} voiceDialog - The voice dialog element to observe
 */
async function setupVoiceDialogStateObserver(voiceDialog) {
	if (!window.userSettings.showVoiceSearchButton || !ytPlayerInstance || !voiceDialog) {
		logger.log(
			'VoiceSearch',
			'Skipping voice dialog state observer setup: prerequisites not met.'
		);
		return;
	}

	try {
		// Wait a bit for the mic button to fully render and get its final classes
		const micButton = await DOMUtils.waitForElement(
			CSS_SELECTORS.dialogMicButton,
			voiceDialog,
			3000
		);
		if (!micButton) {
			logger.warn(
				'VoiceSearch',
				'Native mic button not found in voice search dialog after waiting. Observer setup failed.'
			);
			return;
		}
		logger.log(
			'VoiceSearch',
			`Native mic button found for observer. Initial classes: ${micButton.className}`
		);

		observerManager.create(
			'voiceDialog',
			micButton,
			() => {
				if (!ytPlayerInstance) {
					logger.log(
						'VoiceSearch',
						'ytPlayerInstance is null in voiceDialog observer callback, disconnecting.'
					);
					observerManager.disconnect('voiceDialog');
					return;
				}

				const currentDialog = DOMUtils.getElement(CSS_SELECTORS.voiceSearchDialog);
				if (
					!DOMUtils.isElementVisible(currentDialog) ||
					!DOMUtils.isElementVisible(micButton)
				) {
					logger.log(
						'VoiceSearch',
						'Voice dialog not visible, disconnecting voiceDialog observer.'
					);
					observerManager.disconnect('voiceDialog'); // Disconnect if dialog is no longer visible
					return;
				}

				// Update state based on mic button classes
				setVoiceSearchMicState(micButton);
			},
			{
				attributes: true,
				attributeFilter: ['class'],
			},
			'VoiceSearch'
		);

		// Set initial state immediately after observer creation, with a small delay
		setTimeout(() => {
			if (!ytPlayerInstance || !micButton.isConnected) {
				// Check if micButton is still in DOM
				logger.log(
					'VoiceSearch',
					'Skipping initial state set: ytPlayerInstance or micButton not available.'
				);
				return;
			}

			// Set the inital mic button state
			setVoiceSearchMicState(micButton);
		}, 100); // Small delay to allow classes to settle
	} catch (error) {
		logger.error('VoiceSearch', 'Error setting up voice dialog state observer:', error);
	}
}

/**
 * Sets the microphone state for voice search based on button classes
 * @param {Element} dialogMicButton - The microphone button element
 */
function setVoiceSearchMicState(dialogMicButton) {
	const micClasses = dialogMicButton.className;
	logger.log('VoiceSearch', `Native voice search mic button state changed: ${micClasses}`);

	// Check for specific state classes
	if (
		micClasses.includes('voice-search-mic-state-listening') ||
		micClasses.includes('voice-search-mic-state-speaking')
	) {
		ytPlayerInstance.setVoiceSearchState(window.VoiceState.LISTENING);
		lastVoiceSearchMicState = window.VoiceState.LISTENING;
		logger.log('VoiceSearch', "Set custom voice search state to 'listening'.");
	} else if (micClasses.includes('voice-search-mic-state-try-again')) {
		ytPlayerInstance.setVoiceSearchState(window.VoiceState.FAILED);
		lastVoiceSearchMicState = window.VoiceState.FAILED;
		logger.log('VoiceSearch', "Set custom voice search state to 'failed'.");
	} else {
		ytPlayerInstance.setVoiceSearchState(window.VoiceState.NORMAL);
		lastVoiceSearchMicState = window.VoiceState.NORMAL;
		logger.log('VoiceSearch', "Set custom voice search state to 'normal' (default).");
	}
}

function maybeFeelingLuckyAfterVoiceSearch() {
	logger.log(
		'FeelingLucky',
		`Post-voice-search check; enabled=${!!window.userSettings
			.voiceSearchFeelingLucky}, cancelled=${!!voiceSearchCancelledByUser}, lastState=${lastVoiceSearchMicState}`
	);
	if (!window.userSettings.voiceSearchFeelingLucky) {
		logger.log('FeelingLucky', 'Disabled by user setting');
		return;
	}
	if (voiceSearchCancelledByUser) {
		logger.log('FeelingLucky', 'Cancelled by user; skipping');
		voiceSearchCancelledByUser = false;
		return;
	}
	if (lastVoiceSearchMicState === window.VoiceState.FAILED) {
		logger.log('FeelingLucky', 'Mic state indicates failure; skipping');
		return;
	}
	logger.log('FeelingLucky', 'Starting results watcher');
	startFeelingLuckyWatcher();
}

/**
 * LuckyPreviewOverlay
 * Manages the voice-search "I'm Feeling Lucky" preview overlay lifecycle.
 * Responsibilities:
 * - Create overlay UI with playlist-themed styles
 * - Run spinner → transition → countdown via embedded SVG progress
 * - Update thumbnail/title from the first-result anchor
 * - Forward user clicks from the thumbnail/title wrapper to the anchor
 * - Handle cancel and perform clean teardown
 * Usage:
 * - const inst = LuckyPreviewOverlay.show({ onCancel })
 * - inst.updateFromAnchor(anchor) once the href is available
 */
class LuckyPreviewOverlay {
	static show(opts = {}) {
		const inst = new LuckyPreviewOverlay(opts);
		document.body.appendChild(inst.overlay);
		return inst;
	}
	constructor(opts = {}) {
		this.onCancel = typeof opts.onCancel === 'function' ? opts.onCancel : null;
		this.countdownDuration =
			typeof opts.countdownDuration === 'number' ? opts.countdownDuration : 2000;
		this.spinnerSpeed = typeof opts.spinnerSpeed === 'number' ? opts.spinnerSpeed : 1000;
		this.anchor = null;
		this.earlyClicked = false;
		this.countdownStarted = false;
		this.overlay = document.createElement('div');
		this.overlay.className = 'yt-lucky-preview-overlay';
		this.progressWrapper = document.createElement('div');
		this.progressWrapper.className = 'yt-lucky-progress-wrapper';
		this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		this.svg.setAttribute('class', 'yt-lucky-progress-svg');
		this.svg.setAttribute('viewBox', '0 0 200 200');
		const bg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
		bg.setAttribute('class', 'yt-lucky-progress-bg');
		bg.setAttribute('cx', '100');
		bg.setAttribute('cy', '100');
		bg.setAttribute('r', '90');
		const seg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
		seg.setAttribute('class', 'yt-lucky-progress-segment');
		seg.setAttribute('cx', '100');
		seg.setAttribute('cy', '100');
		seg.setAttribute('r', '90');
		this.svg.appendChild(bg);
		this.svg.appendChild(seg);
		this.progressWrapper.appendChild(this.svg);
		this.modal = document.createElement('div');
		this.modal.className = 'yt-lucky-preview-modal';
		this.clickWrapper = document.createElement('div');
		this.clickWrapper.className = 'yt-lucky-preview-click-wrapper';
		this.thumb = document.createElement('img');
		this.thumb.className = 'yt-lucky-preview-thumb';
		this.title = document.createElement('div');
		this.title.className = 'yt-lucky-preview-title';
		this.title.textContent = 'Preparing first result';
		this.actions = document.createElement('div');
		this.actions.className = 'yt-lucky-preview-actions';
		this.cancelLink = document.createElement('button');
		this.cancelLink.className = 'yt-lucky-preview-cancel-link';
		this.cancelLink.textContent = 'Cancel';
		this.actions.appendChild(this.cancelLink);
		this.clickWrapper.appendChild(this.thumb);
		this.clickWrapper.appendChild(this.title);
		this.modal.appendChild(this.clickWrapper);
		this.modal.appendChild(this.actions);
		this.overlay.appendChild(this.progressWrapper);
		this.overlay.appendChild(this.modal);
		this.segment = seg;
		this.radius = 90;
		this.circumference = 2 * Math.PI * this.radius;
		this.state = 'spinner';
		this.animationFrame = null;
		this.startTime = null;
		this.spinnerRotation = 0;
		this.transitionStartRotation = 0;
		this.transitionTargetRotation = 0;
		this.transitionStartTime = 0;
		this.transitionDuration = 0;
		this.countdownStartTime = 0;
		this.segment.style.strokeDasharray = this.circumference;
		this.segment.style.strokeDashoffset = this.circumference;
		this.startSpinner();
		this.cancelLink.addEventListener('click', (e) => {
			e.stopPropagation();
			this.close();
			if (this.onCancel) this.onCancel();
		});
		this.clickWrapper.addEventListener('click', (e) => {
			e.stopPropagation();
			this.earlyClicked = true;
			luckyEarlyClick = true;
			if (this.anchor) this.anchor.click();
			this.close();
		});
		this.overlay.addEventListener('click', () => {
			this.close();
			if (this.onCancel) this.onCancel();
		});
	}
	updateFromAnchor(anchor) {
		this.anchor = anchor;
		let vid = null;
		try {
			const u = new URL(anchor.href);
			vid = u.searchParams.get('v');
		} catch (e) {}
		const itemEl = anchor.closest(CSS_SELECTORS.resultsItems) || anchor.parentElement;
		const h3El = itemEl ? itemEl.querySelector('h3') : null;
		const titleText = (h3El && h3El.textContent ? h3El.textContent.trim() : '') || '';
		if (vid) {
			const url = MediaUtils.getStandardThumbnailUrl
				? MediaUtils.getStandardThumbnailUrl(vid)
				: Utils.getStandardThumbnailUrl(vid);
			this.thumb.src = url;
		}
		if (titleText) this.title.textContent = titleText;
		if (!this.countdownStarted) {
			this.countdownStarted = true;
			this.startTransition();
		}
	}
	close() {
		if (this.overlay && this.overlay.parentNode)
			this.overlay.parentNode.removeChild(this.overlay);
		if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
	}
	startSpinner() {
		this.state = 'spinner';
		this.startTime = performance.now();
		this.animateSpinner();
	}
	animateSpinner() {
		if (this.state !== 'spinner') return;
		const now = performance.now();
		const elapsed = now - this.startTime;
		this.spinnerRotation = (elapsed / this.spinnerSpeed) * 360;
		const segmentPercent = 0.3;
		const offset = this.circumference * (1 - segmentPercent);
		this.segment.style.strokeDashoffset = offset;
		this.segment.style.transform = `rotate(${this.spinnerRotation}deg)`;
		this.segment.style.transformOrigin = '100px 100px';
		this.animationFrame = requestAnimationFrame(() => this.animateSpinner());
	}
	startTransition() {
		if (this.state !== 'spinner') return;
		this.state = 'transitioning';
		if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
		const currentRotation = this.spinnerRotation % 360;
		const remainingToZero = 360 - currentRotation;
		this.transitionStartRotation = currentRotation;
		this.transitionTargetRotation = currentRotation + remainingToZero;
		this.transitionStartTime = performance.now();
		this.transitionDuration = (remainingToZero / 360) * this.spinnerSpeed;
		this.animateTransition();
	}
	animateTransition() {
		const now = performance.now();
		const elapsed = now - this.transitionStartTime;
		const progress = Math.min(elapsed / this.transitionDuration, 1);
		const ease = 1 - Math.pow(1 - progress, 3);
		const rotation =
			this.transitionStartRotation +
			(this.transitionTargetRotation - this.transitionStartRotation) * ease;
		const segmentPercent = 0.3 * (1 - ease);
		const offset = this.circumference * (1 - segmentPercent);
		this.segment.style.strokeDashoffset = offset;
		this.segment.style.transform = `rotate(${rotation}deg)`;
		if (progress < 1) {
			this.animationFrame = requestAnimationFrame(() => this.animateTransition());
		} else {
			this.startCountdown();
		}
	}
	startCountdown() {
		this.state = 'countdown';
		this.segment.style.transform = 'rotate(0deg)';
		this.segment.style.strokeDashoffset = this.circumference;
		this.countdownStartTime = performance.now();
		this.animateCountdown();
	}
	animateCountdown() {
		if (this.state !== 'countdown') return;
		const now = performance.now();
		const elapsed = now - this.countdownStartTime;
		const progress = Math.min(elapsed / this.countdownDuration, 1);
		const offset = this.circumference * (1 - progress);
		this.segment.style.strokeDashoffset = offset;
		if (progress < 1) {
			this.animationFrame = requestAnimationFrame(() => this.animateCountdown());
		} else {
			this.complete();
		}
	}
	complete() {
		this.state = 'complete';
		if (this.anchor && !this.earlyClicked && typeof this.anchor.click === 'function')
			this.anchor.click();
		this.close();
	}
}

/**
 * startFeelingLuckyWatcher
 * Monitors for results page after voice search and orchestrates Lucky navigation.
 * If preview is enabled, shows the overlay immediately and updates it when the
 * first-result anchor href is available; otherwise, clicks the anchor directly.
 */
function startFeelingLuckyWatcher() {
	const start = Date.now();
	const maxWait = 5000;
	const interval = 200;
	let luckyPreviewShown = false;
	let luckyCancelled = false;
	luckyEarlyClick = false;
	const tick = async () => {
		if (!window.userSettings.voiceSearchFeelingLucky) {
			logger.log('FeelingLucky', 'Disabled during watcher; aborting');
			return;
		}
		const onResults = PageUtils.isResultsPage();
		logger.log('FeelingLucky', `Watcher tick; onResults=${onResults}`);
		if (onResults) {
			if (window.userSettings.voiceSearchFeelingLuckyPreview && !luckyPreviewShown) {
				luckyPreviewShown = true;
				if (luckyOverlayInstance) luckyOverlayInstance.close();
				luckyOverlayInstance = LuckyPreviewOverlay.show({
					onCancel: () => {
						luckyCancelled = true;
					},
					countdownDuration: 3000,
					spinnerSpeed: 1000,
				});
			}
			try {
				let anchor = DOMUtils.getElement(CSS_SELECTORS.resultsFirstVideoAnchor);
				if (!anchor) {
					logger.log(
						'FeelingLucky',
						`Waiting for first result anchor: ${CSS_SELECTORS.resultsFirstVideoAnchor}`
					);
					anchor = await DOMUtils.waitForElement(
						CSS_SELECTORS.resultsFirstVideoAnchor,
						document,
						2000
					);
				}
				if (anchor) {
					const resolveUrl = (el) => {
						const href = el && el.href;
						let url = null;
						if (href && typeof href === 'string' && href.length > 0) url = href;

						logger.log('FeelingLucky', `Anchor url resolve hrefProp=${href || ''}`);
						return url;
					};
					let targetUrl = resolveUrl(anchor);
					if (!targetUrl) {
						const deadline = Date.now() + 2000;
						const poll = () => {
							if (!window.userSettings.voiceSearchFeelingLucky) {
								logger.log('FeelingLucky', 'Disabled during poll; aborting');
								return;
							}
							if (luckyCancelled) {
								logger.log(
									'FeelingLucky',
									'Preview cancelled by user; not clicking (poll)'
								);
								return;
							}
							if (Date.now() > deadline) {
								logger.warn('FeelingLucky', 'Anchor href still missing after wait');
								return;
							}
							anchor =
								DOMUtils.getElement(CSS_SELECTORS.resultsFirstVideoAnchor) ||
								anchor;
							targetUrl = resolveUrl(anchor);
							if (targetUrl) {
								if (window.userSettings.voiceSearchFeelingLuckyPreview) {
									if (luckyOverlayInstance)
										luckyOverlayInstance.updateFromAnchor(anchor);
								} else {
									logger.log(
										'FeelingLucky',
										'Clicking first result anchor (poll)'
									);
									anchor.click();
								}
								return;
							}
							setTimeout(poll, 100);
						};
						poll();
						return;
					}
					if (luckyCancelled) {
						logger.log('FeelingLucky', 'Preview cancelled by user; not clicking');
						return;
					}
					if (window.userSettings.voiceSearchFeelingLuckyPreview && luckyPreviewShown) {
						if (luckyOverlayInstance) luckyOverlayInstance.updateFromAnchor(anchor);
					} else {
						logger.log('FeelingLucky', 'Clicking first result anchor');
						anchor.click();
					}
					return;
				}
				logger.warn('FeelingLucky', 'No anchor found for first result');
			} catch (e) {
				logger.warn('FeelingLucky', `Error locating anchor: ${e && e.message}`);
			}
		}
		if (Date.now() - start < maxWait) {
			setTimeout(tick, interval);
		} else {
			logger.warn('FeelingLucky', 'Timed out waiting for results page');
		}
	};
	setTimeout(tick, 100);
}

/**
 * Handles changes to the search suggestions visibility
 */
function handleSearchSuggestionsChanges() {
	if (!document.body.classList.contains('yt-custom-controls-drawn')) {
		return;
	}

	const suggestionsContainer = DOMUtils.getElement(CSS_SELECTORS.searchSuggestions);
	const isSuggestionsVisible =
		suggestionsContainer && !suggestionsContainer.hasAttribute('hidden');
	const hasSuggestionsClass = document.body.classList.contains('yt-native-search-suggestions');

	if (isSuggestionsVisible && !hasSuggestionsClass) {
		logger.log(
			'SearchSuggestions',
			'Native search suggestions container visible. Adding body class.'
		);
		document.body.classList.add('yt-native-search-suggestions');
	} else if (!isSuggestionsVisible && hasSuggestionsClass) {
		logger.log(
			'SearchSuggestions',
			'Native search suggestions container hidden. Removing body class.'
		);
		document.body.classList.remove('yt-native-search-suggestions');
	}
}

/**
 * Handles ads based on user settings
 */
async function handleAdSkipAndReporting(forcePreemptiveMute = false) {
	if (window.userSettings.autoSkipAds && DOMHelper.isAdPlaying()) {
		handlePreemptiveAdMuting(forcePreemptiveMute);
		await native_handleSkip(true);
	} else if (ytPlayerInstance) {
		ytPlayerInstance.setAdState(DOMHelper.isAdPlaying());
	}
}

let mutedAdPreventionActive = false;
function handlePreemptiveAdMuting(forcePreemptiveMute = false) {
	if (!window.userSettings.autoSkipAds) return;

	const isAd = DOMHelper.isAdPlaying();
	if (!mutedAdPreventionActive && (isAd || forcePreemptiveMute)) {
		observedVideoElement.muted = true;
		mutedAdPreventionActive = true;
		if (forcePreemptiveMute) logger.log('AdMuting', 'Preemptively muting for potential ad');
		else logger.log('AdMuting', 'Ad detected, muted');
	} else if (!isAd && mutedAdPreventionActive) {
		observedVideoElement.muted = false;
		mutedAdPreventionActive = false;
		logger.log('AdMuting', 'Unmuted following ended ad/video confirmed not ad');
	}
}

// --- Enhanced Observer Setup ---
/**
 * Sets up observers for the custom player page events
 */
async function setupCustomPlayerPageObservers() {
	const videoElement = DOMHelper.findVideoElement();
	if (!videoElement) {
		logger.warn('Observers', 'Video element not found for custom player observers.');
		return;
	}

	// Clean up previous observers if video element changed
	if (observedVideoElement && observedVideoElement._customListeners) {
		cleanupSpecificVideoObservers(observedVideoElement);
	}
	observedVideoElement = videoElement;
	if (observedVideoElement._customListeners) return;

	handleAdSkipAndReporting(true);

	// Video element event listeners
	const eventHandlers = {
		onTimeUpdate: () => {
			if (
				ytPlayerInstance &&
				ytPlayerInstance.isPlayerVisible &&
				!ytPlayerInstance.isSeekbarDragging &&
				!isNaN(videoElement.duration) &&
				videoElement.duration > 0
			) {
				PlayerStateManager.syncCustomPlayerState();
			}

			// Video about to end, handle repeat play
			if (videoElement.currentTime >= videoElement.duration - 1 && repeatIndefinitely) {
				playNextVideo();
			}
		},
		onPlay: () => {
			if (ytPlayerInstance && ytPlayerInstance.isPlayerVisible) {
				ytPlayerInstance.setPlayState(window.PlayState.PLAYING);
			}

			// Update play state tracking for buffer detection
			lastPlayTimestamp = Date.now();
			hasPlayedSinceLastBuffer = true;

			// Reset buffer start time when playback resumes (buffering ended)
			currentBufferStartTime = null;

			handlePreemptiveAdMuting();
		},
		onPause: () => {
			if (ytPlayerInstance && ytPlayerInstance.isPlayerVisible) {
				ytPlayerInstance.setPlayState(window.PlayState.PAUSED);
			}

			if (customControlsInitiatedPause) {
				customControlsInitiatedPause = false;
			}

			// Auto-click dialogs if enabled
			if (window.userSettings.autoClickContinueWatching) {
				setTimeout(() => {
					checkForAndAutoCloseNativeDialogs();
				}, 250);
			}
		},
		onWaiting: () => {
			if (ytPlayerInstance && ytPlayerInstance.isPlayerVisible) {
				ytPlayerInstance.setPlayState(window.PlayState.BUFFERING);
			}

			// Handle rapid buffer detection auto-pause
			handleBufferDetectionAutoPause(videoElement);
		},
		onEnded: () => {
			if (ytPlayerInstance && ytPlayerInstance.isPlayerVisible) {
				ytPlayerInstance.setPlayState(window.PlayState.PAUSED);
			}

			// Check if there's a "Play Next" video set (including repeat) and play it
			//if (!playNextVideo()) {
			// If no "Play Next" video was set, use default behavior
			handlePreemptiveAdMuting(true);
			//}

			if (!PageUtils.isPlaylistPage()) playNextVideo();
		},
		onLoadedData: async () => {
			logger.log('Observers', "Video 'loadeddata' event fired.");
			if (!ytPlayerInstance || !ytPlayerInstance.isPlayerVisible) return;

			handleAdSkipAndReporting();

			let state = window.PlayState.PAUSED;
			if (!videoElement.paused && !videoElement.seeking) {
				state =
					videoElement.readyState >= 3
						? window.PlayState.PLAYING
						: window.PlayState.BUFFERING;
			}
			ytPlayerInstance.setPlayState(state);
		},
	};

	// Add event listeners
	Object.entries(eventHandlers).forEach(([name, handler]) => {
		const eventName = name.replace('on', '').toLowerCase();
		if (eventName === 'play') {
			videoElement.addEventListener('play', handler);
			videoElement.addEventListener('playing', handler);
		} else {
			videoElement.addEventListener(eventName, handler);
		}
	});

	videoElement._customListeners = eventHandlers;
}

/**
 * Cleans up observers for a specific video element
 * @param {Element} videoElem - The video element to clean up observers for
 */
function cleanupSpecificVideoObservers(videoElem) {
	if (videoElem && videoElem._customListeners) {
		Object.entries(videoElem._customListeners).forEach(([name, handler]) => {
			const eventName = name.replace('on', '').toLowerCase();
			if (eventName === 'play') {
				videoElem.removeEventListener('play', handler);
				videoElem.removeEventListener('playing', handler);
			} else {
				videoElem.removeEventListener(eventName, handler);
			}
		});
		delete videoElem._customListeners;
		if (observedVideoElement === videoElem) observedVideoElement = null;
	}

	// Clean up buffer detection auto-pause state
	cleanupBufferDetectionAutoPause();
}

/**
 * Cleans up all custom player observers
 */
function cleanupAllCustomPlayerObservers() {
	if (observedVideoElement) {
		cleanupSpecificVideoObservers(observedVideoElement);
	}
	observerManager.disconnect('playlist');
	observerManager.disconnect('voiceDialog');
	observerManager.disconnect('title');
	logger.log('Observers', 'Custom player observers cleaned up.');
}

/**
 * Handles changes to the native playlist panel
 */
let stuckPlaylistTimeout = null;
function handleStuckPlaylist(playlistContainer, itemsFound = false, forceReload = false) {
	if (!window.userSettings.autoReloadStuckPlaylist && !forceReload) return;

	const spinner = playlistContainer.querySelector(CSS_SELECTORS.playlistSpinner);

	if ((spinner && !stuckPlaylistTimeout && !itemsFound) || forceReload) {
		logger.log('Observers', 'Playlist spinner detected.');
		stuckPlaylistTimeout = setTimeout(
			() => {
				logger.warn('Observers', 'Playlist seems stuck, attempting to refresh.');
				const closeButton = DOMUtils.getElement(CSS_SELECTORS.playlistCloseButton);
				if (closeButton) {
					DOMUtils.clickElement(closeButton);
					setTimeout(() => {
						const entryPoint = DOMUtils.getElement(
							CSS_SELECTORS.playlistEntryPointButton
						);
						if (entryPoint) {
							DOMUtils.clickElement(entryPoint);
						}
					}, 500);
				}
				stuckPlaylistTimeout = null;
			},
			forceReload ? 100 : 3000
		);
	} else if (stuckPlaylistTimeout) {
		clearTimeout(stuckPlaylistTimeout);
	}
}

/**
 * Hides a content section by setting its display style to 'none'.
 * @param {HTMLElement} section - The content section to hide.
 */
function hideContentSection(section) {
	if (section && section.style.display !== 'none') {
		section.style.display = 'none';
		logger.log('ContentFilter', 'Hidden section:', section);
	}
}

/**
 * Checks a given content section for "Shorts" or "YouTube Playable" titles and hides it if the corresponding setting is enabled.
 * @param {HTMLElement} section - The content section to check.
 */
function checkAndHideContent(section) {
	if (!section) return;

	logger.log('ContentFilter', 'Checking section:', section);

	const shortsTitle = DOMUtils.getElement(CSS_SELECTORS.shortsTitle, section);
	const playablesTitle = DOMUtils.getElement(CSS_SELECTORS.playableTitle, section);

	if (
		shortsTitle &&
		shortsTitle.textContent.includes('Shorts') &&
		window.userSettings.hideShorts
	) {
		logger.log('ContentFilter', 'Hiding Shorts section:', section);
		hideContentSection(section);
	} else if (
		playablesTitle &&
		playablesTitle.textContent.includes('YouTube Playable') &&
		window.userSettings.hidePlayables
	) {
		logger.log('ContentFilter', 'Hiding Playable section:', section);
		hideContentSection(section);
	} else {
		logger.log('ContentFilter', 'Not hiding section:', section);
	}
}

/**
 * Initializes content filtering by observing for new content sections and hiding them based on user settings.
 */
function initContentFiltering() {
	logger.log('ContentFilter', 'Initializing content filtering.');

	// Initial check for existing sections
	const sections = DOMUtils.getElement(CSS_SELECTORS.contentSection, document, true);
	if (sections) {
		sections.forEach(checkAndHideContent);
	}

	// Observe for new sections being added to the DOM
	observerManager.createWithRetry(
		'contentFilter',
		'body', // Observe the body for changes
		(mutations) => {
			mutations.forEach((mutation) => {
				mutation.addedNodes.forEach((node) => {
					if (node.nodeType === 1 && node.matches(CSS_SELECTORS.contentSection)) {
						checkAndHideContent(node);
					} else if (node.nodeType === 1) {
						// Check for ytm-rich-section-renderer within added nodes
						const childSections = node.querySelectorAll(CSS_SELECTORS.contentSection);
						if (childSections) {
							childSections.forEach(checkAndHideContent);
						}
					}
				});
			});
		},
		{ childList: true, subtree: true },
		'ContentFilter'
	);
}

// Guard to prevent recursive auto-reopen loops on playlist pages
let playlistAutoReopenInProgress = false;
let playlistAutoReopenAttempts = 0;
const PLAYLIST_AUTO_REOPEN_MAX_ATTEMPTS = 3;

function handleNativePlaylistChanges() {
	const playlistContainer = DOMUtils.getElement(CSS_SELECTORS.playlistPanel);
	const playlistEntryPoint = DOMUtils.getElement(CSS_SELECTORS.playlistEntryPointButton);
	const isOnPlaylistPage = PageUtils.isPlaylistPage();

	// Check if playlist is minimized (entry point exists but panel doesn't)
	if (!playlistContainer && playlistEntryPoint && isOnPlaylistPage) {
		// Avoid spamming clicks; cap auto-reopen attempts
		if (
			playlistAutoReopenInProgress &&
			playlistAutoReopenAttempts >= PLAYLIST_AUTO_REOPEN_MAX_ATTEMPTS
		) {
			logger.warn(
				'Observers',
				`Playlist minimized; auto-reopen attempts exhausted (${playlistAutoReopenAttempts}). Skipping.`
			);
			return;
		}

		playlistAutoReopenInProgress = true;
		playlistAutoReopenAttempts++;
		logger.log(
			'Observers',
			`Playlist is minimized, reopening automatically (attempt ${playlistAutoReopenAttempts})`
		);

		// Clean up existing observer since the element will be recreated
		if (observerManager.get('playlist')) {
			logger.log('Observers', 'Disconnecting existing playlist observer before reopening');
			observerManager.disconnect('playlist');
		}

		DOMUtils.clickElement(playlistEntryPoint);

		// Wait for panel to appear, then re-run this function
		setTimeout(() => {
			handleNativePlaylistChanges();
		}, 300);
		return;
	}

	if (playlistContainer && !observerManager.get('playlist')) {
		if (
			window.userSettings.enableCustomPlayer &&
			window.userSettings.customPlaylistMode !== 'disabled'
		) {
			let playlistUpdateDebounceTimer = null;
			observerManager.create(
				'playlist',
				playlistContainer,
				() => {
					handleStuckPlaylist(playlistContainer);
					clearTimeout(playlistUpdateDebounceTimer);

					playlistUpdateDebounceTimer = setTimeout(() => {
						if (!ytPlayerInstance || !ytPlayerInstance.isPlayerVisible) return;

						logger.log('Observers', 'Debounced playlist update triggered.');
						const data = getPlaylistItemsFromPage();
						if (data.items.length === 0) {
							handleStuckPlaylist(playlistContainer, true);
						}
						ytPlayerInstance.updatePlaylist(
							data.items,
							PageUtils.getCurrentPlaylistIdFromUrl(),
							data.playlistTitle || 'Mix'
						);
					}, 150);
				},
				{
					childList: true,
					subtree: true,
					attributes: true,
					attributeFilter: ['class', 'selected'],
					attributeOldValue: true,
				},
				'Observers'
			);

			// Playlist panel is present and observer attached; clear auto-reopen guard
			playlistAutoReopenInProgress = false;
			playlistAutoReopenAttempts = 0;
		}
	} else if (!playlistContainer && observerManager.get('playlist')) {
		// Only clear if we're not on a playlist page or entry point doesn't exist
		if (!isOnPlaylistPage || !playlistEntryPoint) {
			if (ytPlayerInstance && ytPlayerInstance.hasPlaylist) {
				logger.log('Manager', 'Native playlist panel removed, clearing custom playlist');
				ytPlayerInstance.updatePlaylist(PageUtils.isPlaylistPage() ? [] : null);
				observerManager.disconnect('playlist');
			}
		}
	}
}

/**
 * Prevents the page container from being inert
 */
function preventPageContainerInert() {
	const pageContainerInert = DOMUtils.getElement(CSS_SELECTORS.pageContainerInert);
	if (pageContainerInert && ytPlayerInstance && ytPlayerInstance.hasPlaylist) {
		pageContainerInert.removeAttribute('inert');
	}

	const chipCloudRenderer = DOMUtils.getElement(CSS_SELECTORS.chipCloudRenderer);
	if (chipCloudRenderer && chipCloudRenderer.classList.contains('chips-visible')) {
		document.body.classList.add('chip-cloud-present');
		chipCloudRenderer.classList.remove('chips-fixed-positioning');
	} else {
		document.body.classList.remove('chip-cloud-present');
	}
}

// --- Standalone Features ---

/**
 * Attempts standalone autoplay based on user settings
 */
async function attemptStandaloneAutoPlay() {
	if (window.userSettings.autoPlayPreference !== 'attemptUnmuted') return;
	if (initialAutoplayDoneForCurrentVideo) return;

	if (
		ytPlayerInstance &&
		ytPlayerInstance.playerWrapper &&
		ytPlayerInstance.playerWrapper.classList.contains('yt-voice-search-active-custom')
	) {
		logger.log('Autoplay', 'Voice search active, skipping autoplay attempt.');
		return;
	}

	logger.log('Autoplay', 'Attempting unmuted auto-play...');
	initialAutoplayDoneForCurrentVideo = true;

	setTimeout(async () => {
		const videoElement = DOMHelper.findVideoElement();
		if (videoElement) {
			if (
				ytPlayerInstance &&
				ytPlayerInstance.playerWrapper &&
				ytPlayerInstance.playerWrapper.classList.contains('yt-voice-search-active-custom')
			) {
				logger.log(
					'Autoplay',
					'Voice search became active during autoplay timeout, aborting play.'
				);
				return;
			}
			logger.log('Autoplay', 'Video element found. Attempting auto-play action.');
			await native_handlePlayPause('playing', false);
		} else {
			logger.log('Autoplay', 'Video element not found or state unclear for auto-play.');
		}
	}, 300);
}

/**
 * Checks for and automatically closes native dialogs based on user settings
 */
function checkForAndAutoCloseNativeDialogs() {
	if (!userSettings.autoClickContinueWatching) return;

	// Continue watching dialog
	const dialog = DOMHelper.findDialogByContent('Continue watching?');
	if (dialog) {
		const yesBtn = Array.from(dialog.querySelectorAll('button')).find(
			(b) =>
				b.textContent.toLowerCase() === 'yes' ||
				DOMUtils.getAttribute(b, 'aria-label')?.toLowerCase() === 'yes'
		);
		if (yesBtn) {
			logger.log('Standalone', "Auto-clicking 'Continue watching?' dialog.");
			yesBtn.click();
		}
	}

	// Shopping popup
	const shoppingPopup = DOMUtils.getElement(CSS_SELECTORS.shoppingPopup);
	const closeBtn = DOMUtils.getElement(CSS_SELECTORS.shoppingCloseButton);
	if (shoppingPopup && closeBtn) {
		logger.log('Standalone', "Auto-closing 'Ready to shop?' popup.");
		closeBtn.click();
	}
}

// --- Enhanced Lifecycle Management ---

/**
 * Manages the lifecycle of the custom player (creation, updates, destruction)
 */
async function manageCustomPlayerLifecycle() {
	if (!window.userSettings.enableCustomPlayer) {
		if (ytPlayerInstance) {
			logger.log('Lifecycle', 'Custom player disabled. DESTROYING player.');
			ytPlayerInstance.destroy();
			ytPlayerInstance = null;
			window.ytPlayerInstance = null; // Clean up global reference
			currentVideoId = null;
			cleanupAllCustomPlayerObservers();
			hasUserManuallyToggledDrawerThisSession = false;
			manualDrawerTargetHeightThisSession = null;
			document.body.classList.remove('yt-custom-controls-drawn');
		}
		return;
	}

	const isOnVideoPage = PageUtils.isVideoWatchPage();
	const newVideoId = PageUtils.getCurrentVideoIdFromUrl();
	const videoElement = DOMHelper.findVideoElement();

	if (isOnVideoPage && newVideoId && videoElement) {
		try {
			await DOMUtils.waitForElement(CSS_SELECTORS.playerContainer);
			logger.log('Lifecycle', 'Video element found.');

			if (
				!ytPlayerInstance ||
				!ytPlayerInstance.playerWrapper ||
				!ytPlayerInstance.playerWrapper.isConnected
			) {
				logger.log(
					'Lifecycle',
					'No active instance found or wrapper disconnected. CREATING new player.'
				);

				if (ytPlayerInstance) {
					logger.log(
						'Lifecycle',
						'Stale ytPlayerInstance found, destroying before recreating.'
					);
					ytPlayerInstance.destroy();
					ytPlayerInstance = null;
					window.ytPlayerInstance = null; // Clean up global reference
				}

				initialAutoplayDoneForCurrentVideo = false;

				const videoDetails = await getVideoDetailsFromPage();
				const initialDetailsWithMarker = {
					...videoDetails,
					videoId: newVideoId,
				};

				currentVideoId = newVideoId;

				ytPlayerInstance = new window.YTMediaPlayer({
					playerContainerSelector: CSS_SELECTORS.playerContainer,
					nowPlayingVideoDetails: initialDetailsWithMarker,
					callbacks: {
						onPlayPauseClick: customPlayer_onPlayPauseClick,
						onPreviousClick: customPlayer_onPreviousClick,
						onSkipClick: customPlayer_onSkipClick,
						onRepeatClick: customPlayer_onRepeatClick,
						onSeekbarUpdate: customPlayer_onSeekbarUpdate,
						onPlaylistItemClick: customPlayer_onPlaylistItemClick,
						onVoiceSearchClick: customPlayer_onVoiceSearchClick,
						onDrawerUserToggle: customPlayer_onDrawerUserToggle,
						onGestureSeek: customPlayer_onGestureSeek,
						onGestureTogglePlaylist: customPlayer_onGestureTogglePlaylist,
						onGestureToggleFavourites: customPlayer_onGestureToggleFavourites,
						onGestureToggleVideoPlayer: customPlayer_onGestureToggleVideoPlayer,
						onGestureRestartCurrent: customPlayer_onGestureRestartCurrent,
						onGesturePreviousOnly: customPlayer_onGesturePreviousOnly,
						onGestureSmartPrevious: customPlayer_onGestureSmartPrevious,
						onReloadPlaylistClick: customPlayer_onReloadPlaylistClick,
						onPlaylistItemRemoved: customPlayer_onPlaylistItemRemoved,
						onPlayNextSet: customPlayer_onPlayNextSet,
					},
				});

				// Make ytPlayerInstance globally accessible
				window.ytPlayerInstance = ytPlayerInstance;

				// Initialize playlist with proper data immediately
				if (PageUtils.isPlaylistPage()) {
					const playlistData = getPlaylistItemsFromPage();
					ytPlayerInstance.updatePlaylist(
						playlistData.items,
						PageUtils.getCurrentPlaylistIdFromUrl(),
						playlistData.playlistTitle
					);
				} else {
					ytPlayerInstance.updatePlaylist(null, null);
				}

				document.body.appendChild(ytPlayerInstance.playerWrapper);
				document.body.classList.add('yt-custom-controls-drawn');
				await setupCustomPlayerPageObservers();
				setAdaptiveColors(initialDetailsWithMarker.thumbnailUrl);
			} else {
				if (currentVideoId !== newVideoId) {
					logger.log(
						'Lifecycle',
						`New video detected (${newVideoId}). UPDATING existing player.`
					);
					currentVideoId = newVideoId;
					initialAutoplayDoneForCurrentVideo = false;

					let detailsFromCache = null;
					if (
						PageUtils.isPlaylistPage() &&
						ytPlayerInstance &&
						ytPlayerInstance.options.currentPlaylist.items &&
						ytPlayerInstance.options.currentPlaylist.items.length > 0
					) {
						detailsFromCache = ytPlayerInstance.setActivePlaylistItem(newVideoId);
					}

					if (detailsFromCache) {
						logger.log(
							'Lifecycle',
							`Updating details immediately from cached playlist item for ${newVideoId}.`
						);
						const detailsToSet = {
							title: detailsFromCache.title,
							author: detailsFromCache.artist,
							thumbnailUrl: MediaUtils.getStandardThumbnailUrl(newVideoId),
							currentTime: 0,
							totalTime: MediaUtils.parseDurationStringToSeconds(
								detailsFromCache.duration
							),
							videoId: newVideoId,
						};
						ytPlayerInstance.setCurrentVideoDetails(detailsToSet);
						setAdaptiveColors(detailsToSet.thumbnailUrl);
					} else {
						logger.log(
							'Lifecycle',
							`Item ${newVideoId} not in cache or no playlist. Setting to "Loading..."`
						);
						const loadingDetails = {
							title: null,
							author: null,
							thumbnailUrl: MediaUtils.getStandardThumbnailUrl(newVideoId),
							currentTime: 0,
							totalTime: 0,
							videoId: newVideoId,
						};
						if (ytPlayerInstance) {
							ytPlayerInstance.setCurrentVideoDetails(loadingDetails);
							setAdaptiveColors(loadingDetails.thumbnailUrl);
						}
					}
				}

				if (
					ytPlayerInstance &&
					ytPlayerInstance.options.enableDebugLogging !==
						window.userSettings.enableDebugLogging
				) {
					ytPlayerInstance.options.enableDebugLogging =
						window.userSettings.enableDebugLogging;
					logger.log(
						'Lifecycle',
						`YTMediaPlayer debug logging updated to: ${userSettings.enableDebugLogging}`
					);
				}

				// Update gesture action settings
				const gestureSettings = [
					'gestureSingleSwipeLeftAction',
					'gestureSingleSwipeRightAction',
					'gestureTwoFingerSwipeUpAction',
					'gestureTwoFingerSwipeDownAction',
					'gestureTwoFingerSwipeLeftAction',
					'gestureTwoFingerSwipeRightAction',
					'gestureTwoFingerPressAction',
				];
				gestureSettings.forEach((setting) => {
					ytPlayerInstance.options[setting] = window.userSettings[setting];
				});
				ytPlayerInstance.setKeepPlaylistFocused(window.userSettings.keepPlaylistFocused);
			}

			if (ytPlayerInstance && ytPlayerInstance.isPlayerVisible) {
				ytPlayerInstance.showPlayer();
			}

			handleAdSkipAndReporting();
		} catch (error) {
			logger.error('Lifecycle', 'Video element not found, timeout.', error);
		}
	} else {
		if (ytPlayerInstance) {
			logger.log(
				'Lifecycle',
				'Navigated away from watch page or no video ID. DESTROYING player.'
			);
			ytPlayerInstance.destroy();
			ytPlayerInstance = null;
			currentVideoId = null;
			initialAutoplayDoneForCurrentVideo = false;
			cleanupAllCustomPlayerObservers();
			hasUserManuallyToggledDrawerThisSession = false;
			manualDrawerTargetHeightThisSession = null;
			document.body.classList.remove('yt-custom-controls-drawn');
		}
	}
}

/**
 * Manages the lifecycle of the custom navbar (creation, updates, destruction)
 */
async function manageCustomNavbarLifecycle() {
	if (!window.userSettings.enableCustomNavbar || !window.userSettings.enableCustomPlayer) {
		if (ytNavbarInstance) {
			logger.log('Lifecycle', 'Custom navbar disabled. DESTROYING navbar.');
			ytNavbarInstance.destroy();
			ytNavbarInstance = null;
			// Clean up window.customNavbar reference
			window.customNavbar = null;
		}
		return;
	}

	if (!ytNavbarInstance) {
		logger.log('Lifecycle', 'CREATING new custom navbar.');
		ytNavbarInstance = new window.YTCustomNavbar({});
		// Assign to window.customNavbar for FAB integration
		window.customNavbar = ytNavbarInstance;
	} else {
		ytNavbarInstance.updateLinks({
			showMixes: window.userSettings.navbarShowMixes,
			showPlaylists: window.userSettings.navbarShowPlaylists,
			showLive: window.userSettings.navbarShowLive,
			showMusic: window.userSettings.navbarShowMusic,
			showTextSearch: window.userSettings.navbarShowTextSearch,
			showVoiceSearch: window.userSettings.navbarShowVoiceSearch,
			showHomeButton: window.userSettings.navbarShowHomeButton,
			showFavourites: window.userSettings.navbarShowFavourites,
			enableDebugLogging: window.userSettings.enableDebugLogging,
		});
	}
}

// --- Feature Registration ---

/**
 * Registers all available features with the feature manager
 */
function registerFeatures() {
	// Continue Watching feature
	featureManager.register('continueWatching', {
		isEnabled: () => window.userSettings.autoClickContinueWatching,
		initialize: () => {
			if (!featureManager.observerManager.get('continueWatching')) {
				logger.log('Standalone', "Initializing 'Continue Watching' observer.");
				featureManager.observerManager.create(
					'continueWatching',
					document.body,
					() => {
						checkForAndAutoCloseNativeDialogs();
					},
					{
						childList: true,
						subtree: true,
					},
					'Standalone'
				);
			}
		},
		cleanup: () => {
			featureManager.observerManager.disconnect('continueWatching');
		},
		logContext: 'Standalone - Continue Watching',
	});

	// --- Background Player Feature ---
	featureManager.register('backgroundPlayer', {
		isEnabled: () => window.userSettings.allowBackgroundPlay,
		initialize: () => {
			if (!window._ytmcBackgroundPlayer && window.BackgroundPlayer) {
				window._ytmcBackgroundPlayer = new window.BackgroundPlayer();
				window._ytmcBackgroundPlayer.enable();
				logger.log('BackgroundPlayer', 'BackgroundPlayer feature initialized.');
			}
		},
		cleanup: () => {
			if (window._ytmcBackgroundPlayer) {
				window._ytmcBackgroundPlayer.disable();
				window._ytmcBackgroundPlayer = null;
				logger.log('BackgroundPlayer', 'BackgroundPlayer feature cleaned up.');
			}
		},
		logContext: 'Standalone - BackgroundPlayer',
	});

	// --- Media Session Handlers Feature ---
	featureManager.register('mediaSessionHandlers', {
		isEnabled: () => window.userSettings.enableMediaSessionHandlers,
		initialize: () => {
			if ('mediaSession' in navigator) {
				// Store interval ID for cleanup
				window.mediaSessionInterval = null;

				// Function to set our custom handlers
				const setCustomHandlers = () => {
					navigator.mediaSession.setActionHandler('previoustrack', () => {
						logger.log('MediaSession', 'Custom prev track handler triggered');
						_handleStandardPrevious();
					});

					navigator.mediaSession.setActionHandler('nexttrack', () => {
						logger.log('MediaSession', 'Custom next track handler triggered');
						native_handleSkip();
					});
				};

				// Set handlers immediately
				setCustomHandlers();

				// Re-apply handlers every second to prevent YouTube from overriding them
				window.mediaSessionInterval = setInterval(setCustomHandlers, 1000);

				logger.log(
					'MediaSession',
					'Custom media session handlers registered with periodic re-application'
				);
			} else {
				logger.warn('MediaSession', 'MediaSession API not available in this browser');
			}
		},
		cleanup: () => {
			if ('mediaSession' in navigator) {
				// Clear the interval
				if (window.mediaSessionInterval) {
					clearInterval(window.mediaSessionInterval);
					window.mediaSessionInterval = null;
				}

				// Reset to default handlers
				navigator.mediaSession.setActionHandler('previoustrack', null);
				navigator.mediaSession.setActionHandler('nexttrack', null);
				logger.log(
					'MediaSession',
					'Media session handlers reset to default and interval cleared'
				);
			}
		},
		logContext: 'Standalone - MediaSession',
	});
}

// --- Enhanced Main Feature Management ---

/**
 * Manages all features based on current settings and page state
 */
async function manageFeatures() {
	if (isManagingFeatures) {
		logger.log('Manager', 'manageFeatures already in progress, skipping.');
		return;
	}
	isManagingFeatures = true;
	logger.log('Manager', 'Managing features based on settings...', window.userSettings);

	// Update body classes
	const bodyClasses = {
		'yt-custom-playlist-active':
			window.userSettings.enableCustomPlayer &&
			window.userSettings.customPlaylistMode !== 'disabled',
		'yt-auto-continue-active': window.userSettings.autoClickContinueWatching,
		'yt-custom-voice-search-active':
			window.userSettings.enableCustomPlayer && window.userSettings.showVoiceSearchButton,
		'yt-playlist-light': window.userSettings.playlistColorMode === 'light',
		'yt-playlist-dark': window.userSettings.playlistColorMode === 'dark',
		'yt-hide-video-player': window.userSettings.hideVideoPlayer,
	};

	Object.entries(bodyClasses).forEach(([className, shouldHave]) => {
		document.body.classList.toggle(className, shouldHave);
	});

	// Manage core components
	await manageCustomPlayerLifecycle();
	await manageCustomNavbarLifecycle();

	// Manage standalone features
	await featureManager.manageAll();

	// Handle autoplay
	if (
		PageUtils.isVideoWatchPage() &&
		window.userSettings.autoPlayPreference === 'attemptUnmuted'
	) {
		await attemptStandaloneAutoPlay();
	}

	isManagingFeatures = false;
}

// --- Enhanced Event Listeners and Observers ---

/**
 * Initializes event listeners and observers for navigation and feature management
 */
function initializeEventListenersAndObservers() {
	let lastUrl = PageUtils.getCurrentUrl();

	if (observerManager.get('navigation')) observerManager.disconnect('navigation');
	logger.log('Manager', 'Initializing main navigation observer.', true);

	observerManager.create(
		'navigation',
		document.body,
		async (mutations) => {
			const url = PageUtils.getCurrentUrl();

			if (url !== lastUrl) {
				logger.log(
					'Manager',
					`URL changed from ${lastUrl} to ${url}. Re-evaluating features.`
				);
				lastUrl = url;

				// Reset buffer detection state when video changes
				cleanupBufferDetectionAutoPause();

				if (ytNavbarInstance) {
					ytNavbarInstance._handleNavigation();
				}

				// Check if we have a custom "Play Next" video queued and should navigate to it
				// This prevents race conditions with YouTube's native navigation
				if (nextUpVideoId && PageUtils.isVideoWatchPage()) {
					const currentVideoId = PageUtils.getCurrentVideoIdFromUrl();
					// Only trigger if we're not already on the next video
					if (currentVideoId !== nextUpVideoId) {
						logger.log(
							'Manager',
							`URL changed detected, checking for custom next video. Current: ${currentVideoId}, Next queued: ${nextUpVideoId}`
						);
						// Use a small delay to ensure YouTube's navigation is complete
						if (playNextVideo()) {
							logger.log(
								'Manager',
								'Custom next video navigation triggered from URL change'
							);
							return;
						}
					}
				}

				// Check if new video should be skipped based on if it's hidden in playlist
				let newVideoId = PageUtils.getCurrentVideoIdFromUrl();
				if (ytPlayerInstance && newVideoId) {
					const navigationResult = ytPlayerInstance.checkHiddenItemNavigation(newVideoId);
					if (navigationResult) {
						if (navigationResult.action === 'navigate') {
							logger.log(
								'Manager',
								'New video is hidden in playlist, navigating to next video.',
								navigationResult
							);
							customPlayer_onPlaylistItemClick(navigationResult.videoId);
							return;
						}
					}
				}

				await manageFeatures();
				applyTheme();
			} else {
				const isOnVideoPage = PageUtils.isVideoWatchPage();
				const playerStateNow = PlayerStateManager.getNativePlayerState();

				if (!isManagingFeatures && isOnVideoPage) {
					const currentVideoElement = DOMHelper.findVideoElement();
					if (!ytPlayerInstance && currentVideoElement) {
						logger.log(
							'Manager',
							'[Observer]: Native video element appeared. Triggering feature management.'
						);
						await manageFeatures();
					} else if (ytPlayerInstance && !ytPlayerInstance.playerWrapper.isConnected) {
						logger.log(
							'Manager',
							'[Observer]: Custom player was disconnected from DOM. Triggering feature management for cleanup.'
						);
						await manageFeatures();
					} else if (
						currentVideoElement &&
						currentVideoElement !== observedVideoElement
					) {
						logger.log(
							'Manager',
							'[Observer]: Video element reference changed. Reattaching custom player observers.'
						);
						await setupCustomPlayerPageObservers();
					}

					await handleLateVideoDetails();
				}

				lastNativePlayerState = playerStateNow;
			}

			handleVoiceSearchDialogChanges();
			handleSearchSuggestionsChanges();
			handleNativePlaylistChanges();
			preventPageContainerInert();
		},
		{ childList: true, subtree: true },
		'Manager'
	);

	// Popstate listener
	window.addEventListener('popstate', () => {
		if (ytNavbarInstance) {
			ytNavbarInstance._handleNavigation();
		}
	});

	// Settings change listener
	if (window.storageApi) {
		window.storageApi.onChanged.addListener(async (changes, namespace) => {
			if (namespace === 'local') {
				let playerRebuildNeeded = false;
				let settingsUpdated = false;
				let themeUpdateNeeded = false;
				let playlistNeedsReloading = false;
				const changedSettings = {};

				for (const key in changes) {
					if (
						key === 'defaultPlayerLayout' ||
						key === 'customPlayerTheme' ||
						key === 'customPlayerAccentColor' ||
						key === 'playlistColorMode' ||
						key === 'applyThemeColorToBrowser' ||
						key === 'hideVideoPlayer' ||
						key === 'enableLimitedHeightMode' ||
						key === 'hideNavbarInLimitedHeightMode' ||
						key === 'enableHorizontalPlaylistBelowVideo' ||
						key === 'enableFixedVideoHeight'
					) {
						themeUpdateNeeded = true;
					}

					if (window.userSettings.hasOwnProperty(key)) {
						settingsUpdated = true;
						const newValue = changes[key].newValue;
						window.userSettings[key] = newValue;
						changedSettings[key] = newValue;

						if (key === 'autoPlayPreference' && newValue !== 'attemptUnmuted') {
							initialAutoplayDoneForCurrentVideo = false;
						}

						if (ytPlayerInstance) {
							const rebuildSettings = [
								'enableCustomPlayer',
								'defaultPlayerLayout',
								'customPlaylistMode',
								'showVoiceSearchButton',
								'enableCustomNavbar',
								'showRepeatButton',
								'hideVideoPlayer',
								'enableLimitedHeightMode',
								'hideNavbarInLimitedHeightMode',
								'enableHorizontalPlaylistBelowVideo',
								'horizontalPlaylistDetailsInHeaderControls',
								'enableFixedVideoHeight',
							];
							if (rebuildSettings.includes(key)) {
								playerRebuildNeeded = true;
								if (key === 'customPlaylistMode') {
									hasUserManuallyToggledDrawerThisSession = false;
									manualDrawerTargetHeightThisSession = null;
									if (
										ytPlayerInstance &&
										(newValue === 'fixed-fully-open' ||
											newValue === 'fixed-below-video')
									) {
										ytPlayerInstance.options.customPlaylistMode = newValue;
									}
								}
							} else {
								// Handle non-rebuild settings
								const settingHandlers = {
									autoHidePlayerOnScroll: () => {
										ytPlayerInstance.setClassSetting(
											'autoHidePlayerOnScroll',
											newValue
										);
									},
									hidePlayerForPanelActive: () => {
										ytPlayerInstance.setClassSetting(
											'hidePlayerForPanelActive',
											newValue
										);
									},
									returnToDefaultModeOnVideoSelect: () => {
										if (ytPlayerInstance && ytPlayerInstance.options) {
											ytPlayerInstance.options.returnToDefaultModeOnVideoSelect =
												newValue;
										}
									},
									applyThemeColorToBrowser: () => {
										// Re-apply theme to update browser theme color
										applyTheme();
									},
									showBottomControls: () =>
										ytPlayerInstance.setBottomControlsVisibility(newValue),
									defaultPlayerLayout: () => ytPlayerInstance.setLayout(newValue),
									customPlayerAccentColor: () => {
										if (newValue === 'randomize') {
											shuffledAccentColors = [];
											currentAccentColorIndex = 0;
										}
									},
									showPreviousButton: () =>
										ytPlayerInstance.setButtonVisibility('Previous', newValue),
									showSkipButton: () =>
										ytPlayerInstance.setButtonVisibility('Skip', newValue),
									customPlayerFontMultiplier: () =>
										ytPlayerInstance.setFontSizeMultiplier(newValue),
									playlistItemDensity: () =>
										ytPlayerInstance.setPlaylistItemDensity(newValue),
									allowMultilinePlaylistTitles: () =>
										ytPlayerInstance.setMultilinePlaylistTitles(newValue),
									keepPlaylistFocused: () =>
										ytPlayerInstance.setKeepPlaylistFocused(newValue),
									playlistScrollDebounceDelay: () =>
										ytPlayerInstance.setPlaylistScrollDebounceDelay(newValue),
									christmasMusicFilter: () => {
										playlistNeedsReloading = true;
									},
									christmasStartDate: () => {
										playlistNeedsReloading = true;
									},
									christmasEndDate: () => {
										playlistNeedsReloading = true;
									},
									christmasBypassOnPlaylistTitle: () => {
										playlistNeedsReloading = true;
									},
									showGestureFeedback: () =>
										ytPlayerInstance.setShowGestureFeedback(newValue),
									enableGestures: () =>
										ytPlayerInstance.setGesturesEnabled(newValue),
									gestureSensitivity: () =>
										ytPlayerInstance.setGestureSensitivity(newValue),
									enableDebugLogging: () => {
										if (ytPlayerInstance && ytPlayerInstance.options) {
											ytPlayerInstance.options.enableDebugLogging = newValue;
											logger.log(
												'Settings',
												`YTMediaPlayer debug logging explicitly set to: ${newValue}`
											);
										}
									},
									playlistRemoveSame: () => {
										ytPlayerInstance.options.playlistRemoveSame = newValue;
										playlistNeedsReloading = true;
									},
									allowDifferentVersions: () => {
										ytPlayerInstance.options.allowDifferentVersions = newValue;
										playlistNeedsReloading = true;
									},
									videoBlacklist: () => {
										playlistNeedsReloading = true;
									},
									playerTimeDisplayMode: () => {
										if (ytPlayerInstance) {
											ytPlayerInstance.setPlayerTimeDisplayMode(newValue);
										}
									},
									hideTimerDuration: () => {
										setClassSetting('hideTimerDuration', newValue);
									},
									hidePlaylistItemDurations: () => {
										ytPlayerInstance.setHidePlaylistItemDurations(newValue);
									},
									enableTitleMarquee: () => {
										ytPlayerInstance.setClassSetting(
											'enableTitleMarquee',
											newValue
										);
									},
								};

								// Handle navbar settings
								const navbarSettings = [
									'navbarShowMixes',
									'navbarShowPlaylists',
									'navbarShowLive',
									'navbarShowMusic',
									'navbarShowTextSearch',
									'navbarShowVoiceSearch',
									'navbarShowFavourites',
									'navbarShowVideoToggle',
								];
								if (navbarSettings.includes(key) && ytNavbarInstance) {
									const linkOptions = {
										showMixes: window.userSettings.navbarShowMixes,
										showPlaylists: window.userSettings.navbarShowPlaylists,
										showLive: window.userSettings.navbarShowLive,
										showMusic: window.userSettings.navbarShowMusic,
										showTextSearch: window.userSettings.navbarShowTextSearch,
										showVoiceSearch: window.userSettings.navbarShowVoiceSearch,
										showHomeButton: window.userSettings.navbarShowHomeButton,
										showFavourites: window.userSettings.navbarShowFavourites,
										showVideoToggle: window.userSettings.navbarShowVideoToggle,
									};
									ytNavbarInstance.updateLinks(linkOptions);
								}

								// Handle gesture settings
								const gestureSettings = [
									'gestureSingleSwipeLeftAction',
									'gestureSingleSwipeRightAction',
									'gestureTwoFingerSwipeUpAction',
									'gestureTwoFingerSwipeDownAction',
									'gestureTwoFingerSwipeLeftAction',
									'gestureTwoFingerSwipeRightAction',
									'gestureTwoFingerPressAction',
									'gestureSensitivity',
								];
								if (
									gestureSettings.includes(key) &&
									ytPlayerInstance &&
									ytPlayerInstance.options
								) {
									ytPlayerInstance.options[key] = newValue;
								}

								const handler = settingHandlers[key];
								if (handler) handler();
							}
						}
					}

					if (themeUpdateNeeded) {
						applyTheme();
						// Only call setAdaptiveColors if the accent color is actually set to adaptive mode
						if (window.userSettings.customPlayerAccentColor === 'adaptive') {
							setAdaptiveColors(MediaUtils.getStandardThumbnailUrl(currentVideoId));
						}
					}
				}

				// Log all changed settings in one go
				if (settingsUpdated && Object.keys(changedSettings).length > 0) {
					logger.log('Settings', 'Settings changed:', changedSettings);
				}

				if (settingsUpdated) {
					logger.log(
						'Manager',
						'Settings changed, re-evaluating features.',
						userSettings
					);
					if (playerRebuildNeeded) {
						logger.log(
							'Manager',
							'Structural setting changed. Forcing player rebuild.'
						);
						if (ytPlayerInstance) {
							ytPlayerInstance.destroy();
						}
						ytPlayerInstance = null;
						currentVideoId = null;
						initialAutoplayDoneForCurrentVideo = false;
					}

					// Handle playlist reloading for Christmas filter settings
					if (playlistNeedsReloading && ytPlayerInstance) {
						logger.log(
							'Settings',
							'Reloading playlist to apply Christmas filter changes'
						);
						const data = getPlaylistItemsFromPage();
						ytPlayerInstance.updatePlaylist(
							data.items,
							PageUtils.getCurrentPlaylistIdFromUrl(),
							ytPlayerInstance.options.currentPlaylist.title
						);
					}

					initContentFiltering();
					await manageFeatures();
				}
			}
		});
	}

	// Visibility change listener
	document.addEventListener('visibilitychange', async () => {
		if (
			userSettings.enableCustomPlayer &&
			ytPlayerInstance &&
			ytPlayerInstance.isPlayerVisible &&
			!document.hidden
		) {
			PlayerStateManager.syncCustomPlayerState();
		}
	});
}

/**
 * Removes the loading splash screen with fade animation
 */
function removeSplashScreen() {
	const splash = document.getElementById('splash-screen');
	if (splash) {
		setTimeout(() => {
			document.documentElement.classList.remove('yt-pageload');
			splash.style.opacity = '0';
			logger.log('Splash', 'Removing loading splash');
			setTimeout(() => splash.remove(), 2000);
		}, 1000);
	} else {
		document.documentElement.classList.remove('yt-pageload');
	}
}

// --- Main Entry Point ---

/**
 * Main entry point for the content script - initializes all features and settings
 */
async function main() {
	logger.log('Settings', 'attempting Loading user settings');
	await loadUserSettings();
	registerFeatures();
	initializeEventListenersAndObservers();
	initContentFiltering();
	applyTheme();

	// Initialize update notification system
	if (window.updateNotification) {
		window.updateNotification.init();
	}

	if (document.readyState === 'complete' || document.readyState === 'interactive') {
		setTimeout(() => manageFeatures(), 500);
		removeSplashScreen();
	} else {
		document.addEventListener('DOMContentLoaded', () =>
			setTimeout(() => {
				manageFeatures();
				removeSplashScreen();
			}, 500)
		);
	}
}
main();
