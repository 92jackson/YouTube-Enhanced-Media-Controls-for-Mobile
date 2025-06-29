// content.js
/** @const {Object} Centralized CSS selectors used throughout the extension */
const CSS_SELECTORS = {
	// Video and player elements
	videoElement: '#player-container-id video',
	playerContainer: '#player-container-id',
	playPauseButton: 'button.player-control-play-pause-icon',
	previousButton: 'button[aria-label="Previous video"]',
	nextButton: 'button[aria-label="Next video"]',
	largePlayButton: 'button.ytp-large-play-button',
	unmuteButton: 'button.ytp-unmute',

	// Playlist elements
	playlistPanel: 'ytm-engagement-panel',
	playlistContentWrapper: 'ytm-engagement-panel .engagement-panel-content-wrapper',
	playlistItems: 'ytm-playlist-panel-video-renderer',
	playlistItemLink: 'a[href*="/watch"]',
	playlistTitle: [
		'.playlist-engagement-panel-mix-title',
		'.playlist-engagement-panel-list-title',
	],
	playlistItemHeadline: '.compact-media-item-headline span.yt-core-attributed-string',
	playlistItemByline: '.compact-media-item-byline span.yt-core-attributed-string',
	playlistItemDuration: '.badge-shape-wiz__text',
	playlistCloseButton: 'ytm-button-renderer.icon-close button',
	playlistEntryPointButton:
		'ytm-playlist-panel-entry-point button[aria-label="Show playlist videos"]',

	// Video metadata elements
	metadataSection: 'ytm-slim-video-metadata-section-renderer',
	titleContainer: [
		'ytm-slim-video-metadata-renderer',
		'.slim-video-information-title-and-badges',
	],
	videoTitle: [
		'ytm-slim-video-metadata-section-renderer .title',
		'.slim-video-metadata-header h2',
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

	// Loading and buffering indicators
	playerSpinner: '.player-controls-spinner .spinner',
	mobileSpinner: 'ytm-spinner',

	// Dialog and popup elements
	dialogs: 'dialog',
	shoppingPopup: '.ytm-bottom-sheet-overlay-container',
	shoppingCloseButton: '.ytm-bottom-sheet-overlay-renderer-close button',
};

/** @const {Object} Map of color names to their respective primary and secondary colors */
const COLOR_MAP = {
	red: { primary: '#ff0000', secondary: '#dd0000' },
	pink: { primary: '#ec407a', secondary: '#e91e63' },
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

/** @type {boolean} Flags if the user has manually interacted with the playlist drawer in the current session. */
let hasUserManuallyToggledDrawerThisSession = false;
/** @type {number|null} Stores the target height of the drawer set by manual user interaction for the current session. */
let manualDrawerTargetHeightThisSession = null;

/** @type {boolean} Flag to differentiate if a pause event was initiated by the custom player controls. */
let customControlsInitiatedPause = false;
/** @type {string|null} Stores the ID of the last item scrolled to in the native playlist to prevent redundant scrolls. */
let lastScrolledItemId = null;

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

// --- Utility Classes & Helper Functions ---

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
	 * Finds playlist container with retry logic
	 * @param {number} [timeout] - How long to wait
	 * @returns {Promise<Element|null>}
	 */
	static async findPlaylistContainerAsync(timeout = 3000) {
		const immediate = DOMUtils.getElement(CSS_SELECTORS.playlistPanel);
		if (immediate) {
			logger.log(
				'DOMHelper',
				'Playlist panel found immediately, checking if items are loaded'
			);

			// Check if playlist items have actually loaded
			const contentWrapper = immediate.querySelector(CSS_SELECTORS.playlistContentWrapper);
			if (contentWrapper) {
				const playlistItems = contentWrapper.querySelectorAll(CSS_SELECTORS.playlistItems);
				logger.log('DOMHelper', `Found ${playlistItems.length} playlist items`);

				if (playlistItems.length > 1) {
					logger.log('DOMHelper', 'Playlist items already loaded, returning container');
					return immediate;
				}
			}

			logger.log('DOMHelper', 'Playlist panel found but items not loaded, waiting for items');

			// Wait for playlist items to load with timeout
			try {
				await new Promise((resolve, reject) => {
					const checkInterval = setInterval(() => {
						const wrapper = immediate.querySelector(
							CSS_SELECTORS.playlistContentWrapper
						);
						if (wrapper) {
							const items = wrapper.querySelectorAll(CSS_SELECTORS.playlistItems);
							if (items.length > 1) {
								logger.log(
									'DOMHelper',
									`Playlist items loaded: ${items.length} items found`
								);
								clearInterval(checkInterval);
								resolve();
							}
						}
					}, 100);

					setTimeout(() => {
						clearInterval(checkInterval);
						reject(new Error('Timeout waiting for playlist items'));
					}, 500); // Half second timeout
				});

				return immediate;
			} catch {
				logger.log(
					'DOMHelper',
					'Playlist items failed to load, attempting to refresh playlist'
				);

				// Close playlist panel
				const closeButton = immediate.querySelector(CSS_SELECTORS.playlistCloseButton);
				if (closeButton) {
					logger.log('DOMHelper', 'Clicking close button to refresh playlist');
					closeButton.click();

					// Short delay
					await new Promise((resolve) => setTimeout(resolve, 200));

					// Reopen playlist panel
					const entryPointButton = document.querySelector(
						CSS_SELECTORS.playlistEntryPointButton
					);
					if (entryPointButton) {
						logger.log('DOMHelper', 'Clicking entry point button to reopen playlist');
						entryPointButton.click();

						// Short delay then return the container
						await new Promise((resolve) => setTimeout(resolve, 200));
						return immediate;
					} else {
						logger.warn(
							'DOMHelper',
							'Entry point button not found for reopening playlist'
						);
					}
				} else {
					logger.warn('DOMHelper', 'Close button not found in playlist panel');
				}

				return immediate;
			}
		}

		try {
			return await DOMUtils.waitForElement(CSS_SELECTORS.playlistPanel, document, timeout);
		} catch {
			logger.warn('DOMHelper', 'Playlist container not found after waiting');
			return null;
		}
	}

	/**
	 * Finds title container with retry logic
	 * @param {number} [timeout] - How long to wait
	 * @returns {Promise<Element|null>}
	 */
	static async findTitleContainerAsync(timeout = 2000) {
		const selectors = CSS_SELECTORS.titleContainer;

		for (const selector of selectors) {
			const immediate = DOMUtils.getElement(selector);
			if (immediate) return immediate;
		}

		for (const selector of selectors) {
			try {
				return await DOMUtils.waitForElement(selector, document, timeout);
			} catch {
				// Try next selector
			}
		}

		logger.warn('DOMHelper', 'Title container not found after waiting');
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

		// Update time if video element is available
		if (
			video &&
			!ytPlayerInstance.isSeekbarDragging &&
			!isNaN(video.duration) &&
			video.duration > 0
		) {
			ytPlayerInstance.setCurrentTime(video.currentTime, video.duration);
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
function setThemeCSS(colorName, colors = {}) {
	if (colorName === 'adaptive' && !colors.primary) colorName = 'red';

	const selectedColors = COLOR_MAP[colorName] || COLOR_MAP.red;
	const { primary, secondary } = colors.primary ? colors : selectedColors;

	// Set CSS custom properties used by the stylesheet
	document.body.classList.remove('yt-theme-light', 'yt-theme-dark', 'yt-theme-system');
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
}

/**
 * Sets adaptive colors based on thumbnail URL or applies user-selected accent color
 * @param {string} url - The thumbnail URL to extract colors from
 */
async function setAdaptiveColors(url) {
	if (
		window.userSettings.customPlayerAccentColor === 'adaptive' ||
		window.userSettings.customPlayerAccentColor === 'adaptiveMatch'
	) {
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
	let displayAuthor = DOMUtils.getText(CSS_SELECTORS.videoAuthor) || 'Unknown Artist';

	// Apply parsing preference if enabled
	if (
		window.userSettings.enableCustomPlayer &&
		window.userSettings.parsingPreference === 'parsed'
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

			// Apply parsing preference
			if (
				window.userSettings.enableCustomPlayer &&
				window.userSettings.parsingPreference === 'parsed'
			) {
				const parsedInfo = MediaUtils.parseTitleToMusicMetadata(itemTitle, itemArtist);
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
			});
		});

		logger.log('Parser', `getPlaylistItemsFromPage found ${playlistItems.length} items.`);
	}

	return {
		items: playlistItems,
		playlistTitle: playlistTitle || 'Playlist',
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
		if (DOMUtils.isElementVisible(element)) {
			if (DOMUtils.clickElement(element)) {
				logger.log('NativePlayer', `Clicked preemptive ${button.name} button`);
				clickedPreemptive = true;
				await new Promise((r) => setTimeout(r, 200));
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

	DOMUtils.clickElement(CSS_SELECTORS.previousButton);
	logger.log('NativePlayer', '[Standard] Previous video button clicked');
}

async function _handleSmartPrevious() {
	await handlePreemptiveYouTubeButtons();

	const videoElement = DOMHelper.findVideoElement();
	if (videoElement) {
		if (videoElement.currentTime > 5) {
			videoElement.currentTime = 0.5; // Restart from 0.5s - not 0s to avoid SponsorBlock breaking feature
			if (ytPlayerInstance && ytPlayerInstance.isPlayerVisible) {
				ytPlayerInstance.setCurrentTime(
					videoElement.currentTime,
					videoElement.duration,
					true
				);
			}
			logger.log('NativePlayer', '[Smart] Video restarted');
		} else {
			DOMUtils.clickElement(CSS_SELECTORS.previousButton);
			logger.log('NativePlayer', '[Smart] Previous video button clicked');
		}
	} else {
		DOMUtils.clickElement(CSS_SELECTORS.previousButton);
		logger.log('NativePlayer', '[Smart] Previous video button clicked');
	}
}

/**
 * Enhanced skip handling
 */
async function native_handleSkip() {
	await handlePreemptiveYouTubeButtons();
	DOMUtils.clickElement(CSS_SELECTORS.nextButton);
	logger.log('NativePlayer', 'Next video button clicked');
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
function customPlayer_onPlaylistItemClick(itemId) {
	const playlistItemEl = DOMUtils.getElement(
		`${CSS_SELECTORS.playlistItems} a[href*="v=${itemId}"]`
	);
	if (playlistItemEl) {
		playlistItemEl.click();
	} else {
		// Fallback navigation
		const params = new URLSearchParams(window.location.search);
		const listId = params.get('list');
		let newUrl = `/watch?v=${itemId}`;
		if (listId) {
			newUrl += `&list=${listId}`;
			const playlist = getPlaylistItemsFromPage();
			const itemIndex = playlist.items.findIndex((item) => item.id === itemId);
			if (itemIndex !== -1) newUrl += `&index=${itemIndex + 1}`;
		}
		window.location.href = newUrl;
	}

	if (
		userSettings.returnToDefaultModeOnVideoSelect &&
		!userSettings.customPlaylistMode.startsWith('fixed-')
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
	_handleSmartPrevious();
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

// --- Enhanced Voice Search Handling ---

/**
 * Handles voice search button clicks in the custom player
 * @param {string} requestedState - The requested voice search state ('listening' or 'normal')
 */
async function customPlayer_onVoiceSearchClick(requestedState) {
	if (!window.userSettings.showVoiceSearchButton || !ytPlayerInstance) return;

	const dialog = DOMUtils.getElement(CSS_SELECTORS.voiceSearchDialog);
	if (requestedState === 'listening') {
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
		logger.log('VoiceSearch', "Set custom voice search state to 'listening'.");
	} else if (micClasses.includes('voice-search-mic-state-try-again')) {
		ytPlayerInstance.setVoiceSearchState(window.VoiceState.FAILED);
		logger.log('VoiceSearch', "Set custom voice search state to 'failed'.");
	} else {
		ytPlayerInstance.setVoiceSearchState(window.VoiceState.NORMAL);
		logger.log('VoiceSearch', "Set custom voice search state to 'normal' (default).");
	}
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

// --- Enhanced Observer Setup ---

/** @type {Element|null} Stores the video element being observed for events. */
let observedVideoElement = null;

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

	logger.log('Observers', 'Setting up observers for custom player.');

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
		},
		onPlay: () => {
			if (ytPlayerInstance && ytPlayerInstance.isPlayerVisible) {
				ytPlayerInstance.setPlayState(window.PlayState.PLAYING);
			}
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
		},
		onEnded: () => {
			if (ytPlayerInstance && ytPlayerInstance.isPlayerVisible) {
				ytPlayerInstance.setPlayState(window.PlayState.PAUSED);
			}
		},
		onLoadedData: async () => {
			logger.log('Observers', "Video 'loadeddata' event fired.");
			if (!ytPlayerInstance || !ytPlayerInstance.isPlayerVisible) return;

			let state = window.PlayState.PAUSED;
			if (!videoElement.paused && !videoElement.seeking) {
				state =
					videoElement.readyState >= 3
						? window.PlayState.PLAYING
						: window.PlayState.BUFFERING;
			}
			ytPlayerInstance.setPlayState(state);

			let newTotalTime = 0;
			if (!isNaN(videoElement.duration) && videoElement.duration > 0) {
				newTotalTime = videoElement.duration;
			}

			await handleLateVideoDetails();
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

	// Playlist observer - wait for native playlist container
	if (
		window.userSettings.enableCustomPlayer &&
		window.userSettings.customPlaylistMode !== 'disabled'
	) {
		const playlistContainer = await DOMHelper.findPlaylistContainerAsync(5000);
		if (playlistContainer) {
			let playlistUpdateDebounceTimer = null;
			observerManager.create(
				'playlist',
				playlistContainer,
				() => {
					clearTimeout(playlistUpdateDebounceTimer);
					playlistUpdateDebounceTimer = setTimeout(() => {
						if (!ytPlayerInstance || !ytPlayerInstance.isPlayerVisible) return;

						logger.log('Observers', 'Debounced playlist update triggered.');
						const data = getPlaylistItemsFromPage();
						ytPlayerInstance.updatePlaylist(data.items);
						ytPlayerInstance.setHandleContent({
							title: data.playlistTitle || 'Up Next',
							itemCount: data.items.length,
						});
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
		} else {
			logger.warn('Observers', 'Playlist container not found, playlist updates may not work');
		}
	} else {
		observerManager.disconnect('playlist');
	}
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

/**
 * Fixes native playlist scroll to show the currently playing item
 * @param {string} activeVideoId - The ID of the currently active video
 */
function doFixNativePlaylistScroll(activeVideoId) {
	logger.log(
		'Standalone',
		`Attempting to fix native playlist scroll for video ${activeVideoId}.`
	);
	if (!userSettings.fixNativePlaylistScroll || !PageUtils.isVideoWatchPage() || !activeVideoId)
		return;
	if (activeVideoId === lastScrolledItemId) return;

	const scrollWrapper = DOMUtils.getElement(CSS_SELECTORS.playlistContentWrapper);
	const nativeSelectedItem = DOMUtils.getElement(
		`${CSS_SELECTORS.playlistItems} a[href*="v=${activeVideoId}"]`
	);

	if (scrollWrapper && nativeSelectedItem && nativeSelectedItem.offsetHeight > 0) {
		setTimeout(() => {
			const currentScrollWrapper = DOMUtils.getElement(CSS_SELECTORS.playlistContentWrapper);
			const currentNativeSelectedItem = DOMUtils.getElement(
				`${CSS_SELECTORS.playlistItems} a[href*="v=${activeVideoId}"]`
			);

			if (
				!currentScrollWrapper ||
				!currentNativeSelectedItem ||
				currentNativeSelectedItem.offsetHeight === 0
			)
				return;

			const wrapperRect = currentScrollWrapper.getBoundingClientRect();
			const itemRect = currentNativeSelectedItem.getBoundingClientRect();
			const scrollTopAdjustment =
				itemRect.top - wrapperRect.top + currentScrollWrapper.scrollTop;

			currentScrollWrapper.scrollTo({
				top: scrollTopAdjustment - 12, // 12px top padding adjustment
				behavior: 'smooth',
			});

			logger.log('Standalone', `Adjusted native playlist scroll for item ${activeVideoId}.`);
			lastScrolledItemId = activeVideoId;
		}, 1000);
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
				}

				initialAutoplayDoneForCurrentVideo = false;

				const videoDetails = await getVideoDetailsFromPage();
				const initialDetailsWithMarker = {
					...videoDetails,
					videoId: newVideoId,
				};

				const playlistData = getPlaylistItemsFromPage();

				currentVideoId = newVideoId;

				ytPlayerInstance = new window.YTMediaPlayer({
					playerContainerSelector: CSS_SELECTORS.playerContainer,
					nowPlayingVideoDetails: initialDetailsWithMarker,
					currentPlaylist: playlistData,
					currentHandleTitle: playlistData.playlistTitle || 'Up Next',
					callbacks: {
						onPlayPauseClick: customPlayer_onPlayPauseClick,
						onPreviousClick: customPlayer_onPreviousClick,
						onSkipClick: customPlayer_onSkipClick,
						onSeekbarUpdate: customPlayer_onSeekbarUpdate,
						onPlaylistItemClick: customPlayer_onPlaylistItemClick,
						onVoiceSearchClick: customPlayer_onVoiceSearchClick,
						onDrawerUserToggle: customPlayer_onDrawerUserToggle,
						onGestureSeek: customPlayer_onGestureSeek,
						onGestureTogglePlaylist: customPlayer_onGestureTogglePlaylist,
						onGestureRestartCurrent: customPlayer_onGestureRestartCurrent,
						onGesturePreviousOnly: customPlayer_onGesturePreviousOnly,
						onGestureSmartPrevious: customPlayer_onGestureSmartPrevious,
					},
				});

				document.body.appendChild(ytPlayerInstance.playerWrapper);
				document.body.classList.add('yt-custom-controls-drawn');
				ytPlayerInstance.setHandleContent({
					title: playlistData.playlistTitle || 'Up Next',
					itemCount: playlistData.items.length,
				});
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
					let cachedTotalSeconds = 0;
					if (
						ytPlayerInstance &&
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
		}
		return;
	}

	if (!ytNavbarInstance) {
		logger.log('Lifecycle', 'CREATING new custom navbar.');
		ytNavbarInstance = new window.YTCustomNavbar({});
	} else {
		ytNavbarInstance.updateLinks({
			showMixes: window.userSettings.navbarShowMixes,
			showPlaylists: window.userSettings.navbarShowPlaylists,
			showLive: window.userSettings.navbarShowLive,
			showMusic: window.userSettings.navbarShowMusic,
			showTextSearch: window.userSettings.navbarShowTextSearch,
			showVoiceSearch: window.userSettings.navbarShowVoiceSearch,
			showHomeButton: window.userSettings.navbarShowHomeButton,
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

	// Native playlist scroll fix feature
	featureManager.register('nativePlaylistScroll', {
		isEnabled: () =>
			userSettings.fixNativePlaylistScroll &&
			PageUtils.isVideoWatchPage() &&
			(!userSettings.enableCustomPlayer ||
				window.userSettings.customPlaylistMode === 'disabled'),
		initialize: async () => {
			if (!featureManager.observerManager.get('nativePlaylistScroll')) {
				logger.log(
					'Standalone',
					'Initializing native playlist scroll observer (waiting for container)...'
				);

				// Wait for playlist container to load
				const playlistContainer = await DOMHelper.findPlaylistContainerAsync(5000);
				if (playlistContainer) {
					featureManager.observerManager.create(
						'nativePlaylistScroll',
						playlistContainer,
						() => {
							if (
								userSettings.fixNativePlaylistScroll &&
								PageUtils.isVideoWatchPage()
							) {
								if (currentVideoId) {
									doFixNativePlaylistScroll(currentVideoId);
								}
							}
						},
						{
							childList: true,
							subtree: true,
							attributes: true,
							attributeFilter: ['selected', 'class'],
						},
						'Standalone'
					);

					// Initial check after setup
					setTimeout(() => {
						if (currentVideoId) {
							doFixNativePlaylistScroll(currentVideoId);
						}
					}, 500); // Small delay to let playlist render
				} else {
					logger.warn(
						'Standalone',
						'Could not initialize native playlist scroll - container not found'
					);
				}
			}
		},
		cleanup: () => {
			featureManager.observerManager.disconnect('nativePlaylistScroll');
			lastScrolledItemId = null;
		},
		logContext: 'Standalone - Fix Native Playlist',
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
	};

	Object.entries(bodyClasses).forEach(([className, shouldHave]) => {
		document.body.classList.toggle(className, shouldHave);
	});

	// Manage core components
	await manageCustomPlayerLifecycle();
	await manageCustomNavbarLifecycle();

	// Manage standalone features
	await featureManager.manageAll();

	const isOnVideoPage = PageUtils.isVideoWatchPage();

	// Handle autoplay
	if (isOnVideoPage && window.userSettings.autoPlayPreference === 'attemptUnmuted') {
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

				if (ytNavbarInstance) {
					ytNavbarInstance._handleNavigation();
				}

				// Check if new video should be skipped based on if it's hidden in playlist
				let newVideoId = PageUtils.getCurrentVideoIdFromUrl();
				if (ytPlayerInstance && newVideoId) {
					const navigationResult = ytPlayerInstance.checkHiddenItemNavigation(newVideoId);
					if (navigationResult) {
						if (navigationResult.action === 'navigate') {
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

				if (
					ytPlayerInstance &&
					ytPlayerInstance.hasPlaylist &&
					!DOMUtils.getElement(CSS_SELECTORS.playlistPanel)
				) {
					logger.log(
						'Manager',
						'Native playlist panel removed, clearing custom playlist'
					);
					ytPlayerInstance.updatePlaylist([]);
					observerManager.disconnect('playlist');
				}

				if (!isManagingFeatures && isOnVideoPage) {
					if (!ytPlayerInstance && DOMHelper.findVideoElement()) {
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
					}

					await handleLateVideoDetails();
				}

				lastNativePlayerState = playerStateNow;
			}

			handleVoiceSearchDialogChanges();
			handleSearchSuggestionsChanges();
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

				for (const key in changes) {
					if (key === 'customPlayerTheme' || key === 'customPlayerAccentColor') {
						themeUpdateNeeded = true;
					}

					if (window.userSettings.hasOwnProperty(key)) {
						settingsUpdated = true;
						const newValue = changes[key].newValue;
						window.userSettings[key] = newValue;
						logger.log('Settings', `Setting '${key}' changed to:`, newValue);

						if (key === 'autoPlayPreference' && newValue !== 'attemptUnmuted') {
							initialAutoplayDoneForCurrentVideo = false;
						}

						if (ytPlayerInstance) {
							const rebuildSettings = [
								'enableCustomPlayer',
								'customPlaylistMode',
								'showVoiceSearchButton',
								'enableCustomNavbar',
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
									returnToDefaultModeOnVideoSelect: () => {
										if (ytPlayerInstance && ytPlayerInstance.options) {
											ytPlayerInstance.options.returnToDefaultModeOnVideoSelect =
												newValue;
										}
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
									showGestureFeedback: () =>
										ytPlayerInstance.setShowGestureFeedback(newValue),
									enableGestures: () =>
										ytPlayerInstance.setGesturesEnabled(newValue),
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
										const data = getPlaylistItemsFromPage();
										ytPlayerInstance.updatePlaylist(data.items);
									},
									allowDifferentVersions: () => {
										ytPlayerInstance.options.allowDifferentVersions = newValue;
										const data = getPlaylistItemsFromPage();
										ytPlayerInstance.updatePlaylist(data.items);
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
								];
								if (navbarSettings.includes(key) && ytNavbarInstance) {
									const linkOptions = {
										showMixes: window.userSettings.navbarShowMixes,
										showPlaylists: window.userSettings.navbarShowPlaylists,
										showLive: window.userSettings.navbarShowLive,
										showMusic: window.userSettings.navbarShowMusic,
										showTextSearch: window.userSettings.navbarShowTextSearch,
										showVoiceSearch: window.userSettings.navbarShowVoiceSearch,
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
						setAdaptiveColors(MediaUtils.getStandardThumbnailUrl(currentVideoId));
					}
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
	applyTheme();

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

// Load settings and initialize features
/*(async () => {
	await window.loadUserSettings();
	logger.log('Main', 'User settings loaded and applied.');

	// Apply initial accent color after settings are loaded
	if (window.userSettings.customPlayerAccentColor) {
		applyTheme();
	}

	// Initial feature management after settings are loaded
	await featureManager.manageAll();
})();*/

main();
