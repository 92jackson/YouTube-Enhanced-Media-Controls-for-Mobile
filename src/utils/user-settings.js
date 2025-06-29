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
	parsingPreference: 'original',
	showBottomControls: true,
	showVoiceSearchButton: true,
	autoPlayPreference: 'attemptUnmuted',
	previousButtonBehavior: 'smart',
	fixNativePlaylistScroll: false,
	allowBackgroundPlay: false,
	customPlayerTheme: 'system',
	customPlayerAccentColor: 'red',
	showPreviousButton: true,
	showSkipButton: true,
	customPlayerFontMultiplier: 1,
	playlistItemDensity: 'comfortable',
	allowMultilinePlaylistTitles: false,
	keepPlaylistFocused: false,
	enableGestures: true,
	gestureSingleSwipeLeftAction: 'restartPreviousVideo',
	gestureSingleSwipeRightAction: 'nextVideo',
	gestureTwoFingerSwipeUpAction: 'toggleVoiceSearch',
	gestureTwoFingerSwipeDownAction: 'playPause',
	gestureTwoFingerSwipeLeftAction: 'unassigned',
	gestureTwoFingerSwipeRightAction: 'unassigned',
	gestureTwoFingerPressAction: 'unassigned',
	showGestureFeedback: true,
	enableDebugLogging: false,
	enableCustomNavbar: true,
	navbarShowMixes: true,
	navbarShowPlaylists: true,
	navbarShowLive: false,
	navbarShowMusic: false,
	navbarShowTextSearch: true,
	navbarShowVoiceSearch: false,
	navbarShowHomeButton: true,
	playlistRemoveSame: false,
	allowDifferentVersions: false,
	enableMediaSessionHandlers: true,
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
