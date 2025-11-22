/**
 * @type {object}
 * @description Default user settings. These are used as a fallback if
 *              `chrome.storage.sync` is unavailable or if specific settings
 *              are not found in storage. They are overridden by stored settings
 *              upon successful loading.
 */
window.userSettings = {
	lastKnownVersion: '0.0.0',
	showUpdateNotifications: true,
	enableCustomPlayer: true,
	defaultPlayerLayout: 'normal',
	enableLimitedHeightMode: true,
	hideNavbarInLimitedHeightMode: false,
	enableHorizontalPlaylistBelowVideo: false,
	horizontalPlaylistDetailsInHeaderControls: false,
	enableFixedVideoHeight: false,
	autoHidePlayerOnScroll: false,
	hidePlayerForPanelActive: false,
	customPlaylistMode: 'below-video',
	returnToDefaultModeOnVideoSelect: false,
	autoClickContinueWatching: true,
	parsingPreference: 'mixesAndPlaylists',
	showBottomControls: true,
	hideVideoPlayer: false,
	showVoiceSearchButton: true,
	autoPlayPreference: 'attemptUnmuted',
	previousButtonBehavior: 'smart',
	fixNativePlaylistScroll: false,
	autoReloadStuckPlaylist: true,
	allowBackgroundPlay: false,
	customPlayerTheme: 'system',
	customPlayerAccentColor: 'adaptive',
	applyThemeColorToBrowser: 'theme', // 'disable', 'theme', 'accent'
	showPreviousButton: true,
	showSkipButton: true,
	customPlayerFontMultiplier: 1,
	playlistItemDensity: 'comfortable',
	allowMultilinePlaylistTitles: false,
	keepPlaylistFocused: false,
	playlistScrollDebounceDelay: 2.5,
	playlistColorMode: 'theme',
	enableGestures: true,
	gestureSingleSwipeLeftAction: 'previousVideoOnly',
	gestureSingleSwipeRightAction: 'nextVideo',
	gestureTwoFingerSwipeUpAction: 'toggleVoiceSearch',
	gestureTwoFingerSwipeDownAction: 'playPause',
	gestureTwoFingerSwipeLeftAction: 'unassigned',
	gestureTwoFingerSwipeRightAction: 'unassigned',
	gestureTwoFingerPressAction: 'toggleFavourites',
	showGestureFeedback: true,
	enableDebugLogging: false,
	enableCustomNavbar: true,
	navbarShowMixes: false,
	navbarShowPlaylists: false,
	navbarShowLive: false,
	navbarShowMusic: false,
	navbarShowTextSearch: true,
	navbarShowVoiceSearch: false,
	navbarShowHomeButton: true,
	navbarShowFavourites: true,
	favouritesDialogFilter: 'all', // 'all', 'mixes', 'playlists', 'videos'
	favouritesDialogSort: 'newestFirst', // 'newestFirst', 'oldestFirst', 'aToZ', 'zToA'
	navbarShowVideoToggle: false,
	playlistRemoveSame: false,
	allowDifferentVersions: false,
	videoBlacklist: [],
	removedFromMix: {},
	favouriteMixes: [],
	enableMediaSessionHandlers: true,
	alwaysHideDesktopBanner: false,
	spoofUserAgent: false,
	autoSkipAds: false,
	showRepeatButton: 'show-when-active',
	smartPreviousThreshold: 5,
	gestureSensitivity: 'normal',
	rapidBufferDetection: false,
	bufferDetectionThreshold: 3,
	bufferDetectionEventCount: 2,
	bufferDetectionPauseDuration: 5,
	bufferDetectionMinDuration: 1,
	hideEasterEggSpider: false,
	hideShorts: false,
	hidePlayables: true,
	christmasMusicFilter: 'disabled', // 'disabled', 'always', 'dates'
	christmasStartDate: '01/12',
	christmasEndDate: '01/01',
	christmasBypassOnPlaylistTitle: true,
};

/**
 * Asynchronously loads user settings from `chrome.storage.local` or `browser.storage.local`.
 * @returns {Promise<void>}
 */
window.storageApi = typeof browser !== 'undefined' ? browser.storage : chrome.storage;

window.loadUserSettings = async function () {
	const storageLocal = window.storageApi?.local;
	if (window.logger) {
		logger.log('Settings', 'Loading user settings. Storage API:', storageLocal);
	}

	if (storageLocal) {
		try {
			let items;
			// Check for promise-based vs callback-based API
			if (storageLocal.get.length === 1) {
				items = await storageLocal.get(window.userSettings);
			} else {
				items = await new Promise((resolve) =>
					storageLocal.get(window.userSettings, resolve)
				);
			}
			window.userSettings = Object.assign({}, window.userSettings, items);
			if (window.logger) {
				logger.log('Settings', 'User settings loaded from storage', window.userSettings);
			}
		} catch (err) {
			if (window.logger) {
				logger.error('Settings', 'Failed to load user settings', err);
			}
		}
		return;
	}

	if (window.logger) {
		logger.warn('Settings', 'Storage API not available, using default settings', true);
	}
};

/**
 * Saves a specific user setting to storage and updates the local userSettings object.
 * @param {string} key - The setting key to save
 * @param {any} value - The value to save
 * @returns {Promise<boolean>} - Returns true if successful, false otherwise
 */
window.saveUserSetting = async function (key, value) {
	const storageLocal = window.storageApi?.local;
	if (window.logger) {
		logger.log('Settings', `Saving user setting: ${key} = ${value}`);
	}

	if (!storageLocal) {
		if (window.logger) {
			logger.warn('Settings', 'Storage API not available, cannot save setting', true);
		}
		return false;
	}

	try {
		// Update local settings object
		window.userSettings[key] = value;

		// Save to storage
		const settingToSave = { [key]: value };

		// Check for promise-based vs callback-based API
		if (storageLocal.set.length === 1) {
			await storageLocal.set(settingToSave);
		} else {
			await new Promise((resolve, reject) => {
				storageLocal.set(settingToSave, () => {
					if (chrome.runtime.lastError) {
						reject(chrome.runtime.lastError);
					} else {
						resolve();
					}
				});
			});
		}

		if (window.logger) {
			logger.log('Settings', `Successfully saved setting: ${key}`);
		}
		return true;
	} catch (err) {
		if (window.logger) {
			logger.error('Settings', `Failed to save setting ${key}:`, err);
		}
		return false;
	}
};
