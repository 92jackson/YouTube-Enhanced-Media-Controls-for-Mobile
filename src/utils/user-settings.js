/**
 * @type {object}
 * @description Default user settings. These are used as a fallback if
 *              `chrome.storage.sync` is unavailable or if specific settings
 *              are not found in storage. They are overridden by stored settings
 *              upon successful loading.
 */
window.userSettings = {
	enableCustomPlayer: true,
	defaultPlayerLayout: 'normal',
	customPlaylistMode: 'below-video',
	returnToDefaultModeOnVideoSelect: false,
	autoClickContinueWatching: true,
	parsingPreference: 'mixesAndPlaylists',
	showBottomControls: true,
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
	playlistColorMode: 'theme',
	enableGestures: true,
	gestureSingleSwipeLeftAction: 'previousVideoOnly',
	gestureSingleSwipeRightAction: 'nextVideo',
	gestureTwoFingerSwipeUpAction: 'toggleVoiceSearch',
	gestureTwoFingerSwipeDownAction: 'playPause',
	gestureTwoFingerSwipeLeftAction: 'unassigned',
	gestureTwoFingerSwipeRightAction: 'unassigned',
	gestureTwoFingerPressAction: 'unassigned',
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
	playlistRemoveSame: false,
	allowDifferentVersions: false,
	videoBlacklist: [],
	removedFromMix: {},
	enableMediaSessionHandlers: true,
	alwaysHideDesktopBanner: false,
	spoofUserAgent: false,
	autoSkipAds: false,
	showRepeatButton: 'show-when-active',
	smartPreviousThreshold: 5,
	gestureSensitivity: 'normal',
	rapidBufferDetection: false,
	bufferDetectionThreshold: 3,
	bufferDetectionPauseDuration: 5,
};

/**
 * Asynchronously loads user settings from `chrome.storage.local` or `browser.storage.local`.
 * @returns {Promise<void>}
 */
window.storageApi = typeof browser !== 'undefined' ? browser.storage : chrome.storage;

window.loadUserSettings = async function () {
	const storageLocal = window.storageApi?.local;
	logger.log('Settings', 'Loading user settings. Storage API:', storageLocal);

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
			logger.log('Settings', 'User settings loaded from storage', window.userSettings);
		} catch (err) {
			logger.error('Settings', 'Failed to load user settings', err);
		}
		return;
	}

	logger.warn('Settings', 'Storage API not available, using default settings', true);
};

/**
 * Saves a specific user setting to storage and updates the local userSettings object.
 * @param {string} key - The setting key to save
 * @param {any} value - The value to save
 * @returns {Promise<boolean>} - Returns true if successful, false otherwise
 */
window.saveUserSetting = async function (key, value) {
	const storageLocal = window.storageApi?.local;
	logger.log('Settings', `Saving user setting: ${key} = ${value}`);

	if (!storageLocal) {
		logger.warn('Settings', 'Storage API not available, cannot save setting', true);
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

		logger.log('Settings', `Successfully saved setting: ${key}`);
		return true;
	} catch (err) {
		logger.error('Settings', `Failed to save setting ${key}:`, err);
		return false;
	}
};
