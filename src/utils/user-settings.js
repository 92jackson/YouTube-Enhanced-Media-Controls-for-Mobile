/**
 * @type {object}
 * @description Default user settings. These are used as a fallback if
 *              `chrome.storage.sync` is unavailable or if specific settings
 *              are not found in storage. They are overridden by stored settings
 *              upon successful loading.
 */
const defaultNavbarRightSlots = ['debug-logs', 'favourites', 'text-search'];

window.userSettings = {
	lastKnownVersion: '0.0.0',
	showUpdateNotifications: true,
	enableCustomPlayer: true,
	defaultPlayerLayout: 'normal',
	enableLimitedHeightMode: false,
	hideNavbarInLimitedHeightMode: false,
	enableHorizontalPlaylistBelowVideo: false,
	horizontalPlaylistDetailsInHeaderControls: false,
	enableFixedVideoHeight: 0,
	autoHidePlayerOnScroll: false,
	hidePlayerForPanelActive: false,
	customPlaylistMode: 'below-video',
	hideDrawerHandleWhenClosed: false,
	returnToDefaultModeOnVideoSelect: false,
	autoClickContinueWatching: true,
	parsingPreference: 'mixesAndPlaylists',
	showBottomControls: true,
	showPlayingDetails: true,
	hideVideoPlayer: false,
	voiceSearchFeelingLucky: false,
	voiceSearchFeelingLuckyPreview: false,
	autoPlayPreference: 'attemptUnmuted',
	autoReloadStuckPlaylist: true,
	allowBackgroundPlay: false,
	customPlayerTheme: 'system',
	customPlayerAccentColor: 'adaptive',
	applyThemeColorToBrowser: 'theme', // 'disable', 'theme', 'accent'
	layoutBottomLeftSlot1: 'repeat-show-when-active',
	layoutBottomLeftSlot1DoubleAction: 'none',
	layoutBottomLeftSlot1HoldAction: 'none',
	layoutBottomCenterSlot1: 'none',
	layoutBottomCenterSlot1DoubleAction: 'none',
	layoutBottomCenterSlot1HoldAction: 'none',
	layoutBottomCenterSlot2: 'restart-then-previous',
	layoutBottomCenterSlot2DoubleAction: 'seek-back',
	layoutBottomCenterSlot2HoldAction: 'seek-back',
	layoutBottomCenterSlot3: 'play',
	layoutBottomCenterSlot3DoubleAction: 'none',
	layoutBottomCenterSlot3HoldAction: 'none',
	layoutBottomCenterSlot4: 'skip',
	layoutBottomCenterSlot4DoubleAction: 'seek-forward',
	layoutBottomCenterSlot4HoldAction: 'seek-forward',
	layoutBottomCenterSlot5: 'none',
	layoutBottomCenterSlot5DoubleAction: 'none',
	layoutBottomCenterSlot5HoldAction: 'none',
	layoutBottomRightSlot1: 'voice-search',
	layoutBottomRightSlot1DoubleAction: 'none',
	layoutBottomRightSlot1HoldAction: 'none',
	layoutBottomRightSlot2: 'limited-height-fab',
	layoutBottomRightSlot2DoubleAction: 'none',
	layoutBottomRightSlot2HoldAction: 'none',
	bottomControlsDoubleClickDelay: 260,
	seekSkipSeconds: 10,
	playerTimeDisplayMode: 'always',
	hideTimerDuration: false,
	customPlayerFontMultiplier: 1,
	playlistItemDensity: 'comfortable',
	allowMultilinePlaylistTitles: false,
	horizontalPlaylistAlignment: 'center-current',
	verticalPlaylistAlignment: 'align-item-before-top',
	enableTitleMarquee: true,
	titleContrastMode: 'per-letter',
	hidePlaylistItemDurations: false,
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
	navbarShowHomeButton: true,
	navbarRightSlots: defaultNavbarRightSlots.slice(),
	favouritesDialogFilter: 'all', // 'all', 'mixes', 'playlists', 'videos'
	favouritesDialogSort: 'newestFirst', // 'newestFirst', 'oldestFirst', 'aToZ', 'zToA'
	playlistRemoveSame: false,
	allowDifferentVersions: false,
	videoBlacklist: [],
	removedFromMix: {},
	favouriteMixes: [],
	mixSnapshots: {},
	activeMixSnapshotId: null,
	tempMixSnapshot: null,
	snapshotSplashMode: 'spinner',
	enableMediaSessionHandlers: true,
	alwaysHideDesktopBanner: false,
	spoofUserAgent: false,
	autoSkipAds: false,
	layoutDrawerHeaderSlot1: 'focus-current',
	layoutDrawerHeaderSlot2: 'shuffle-toggle',
	layoutDrawerHeaderSlot3: 'loop-toggle',
	layoutDrawerHeaderSlot4: 'none',
	repeatStickyAcrossVideos: 'toggle-single-sticky',
	repeatCurrentlyOn: false,
	smartPreviousThreshold: 5,
	gestureSensitivity: 'normal',
	rapidBufferDetection: false,
	bufferDetectionThreshold: 3,
	bufferDetectionEventCount: 2,
	bufferDetectionPauseDuration: 5,
	bufferDetectionMinDuration: 1,
	enableEasterEggs: true,
	showEasterEggSpider: true,
	hideShorts: false,
	hidePlayables: true,
	christmasMusicFilter: 'disabled', // 'disabled', 'always', 'dates'
	christmasStartDate: '01/12',
	christmasEndDate: '01/01',
	christmasBypassOnPlaylistTitle: true,
	additionalNativeControls: ['repeat'],
	additionalNativeTopControls: [],
};

const defaultUserSettings = Object.assign({}, window.userSettings);
defaultUserSettings.navbarRightSlots = (window.userSettings.navbarRightSlots || []).slice();
defaultUserSettings.additionalNativeControls = (
	window.userSettings.additionalNativeControls || []
).slice();
defaultUserSettings.additionalNativeTopControls = (
	window.userSettings.additionalNativeTopControls || []
).slice();

const lockedSettingValues = {
	layoutBottomCenterSlot3: 'play',
	layoutBottomRightSlot2: 'limited-height-fab',
};

const legacyNavbarVisibilitySettingKeys = [
	'navbarShowTextSearch',
	'navbarShowVoiceSearch',
	'navbarShowFavourites',
	'navbarShowVideoToggle',
];

const legacyNavbarVisibilityActionMap = {
	navbarShowTextSearch: 'text-search',
	navbarShowVoiceSearch: 'voice-search',
	navbarShowFavourites: 'favourites',
	navbarShowVideoToggle: 'video-toggle',
};

const layoutAllowedValues = {
	layoutDrawerHeaderSlot1: new Set([
		'none',
		'focus-current',
		'shuffle-toggle',
		'shuffle-toggle-show-when-active',
		'loop-toggle',
		'loop-toggle-show-when-active',
		'close',
	]),
	layoutDrawerHeaderSlot2: new Set([
		'none',
		'focus-current',
		'shuffle-toggle',
		'shuffle-toggle-show-when-active',
		'loop-toggle',
		'loop-toggle-show-when-active',
		'close',
	]),
	layoutDrawerHeaderSlot3: new Set([
		'none',
		'focus-current',
		'shuffle-toggle',
		'shuffle-toggle-show-when-active',
		'loop-toggle',
		'loop-toggle-show-when-active',
		'close',
	]),
	layoutDrawerHeaderSlot4: new Set([
		'none',
		'focus-current',
		'shuffle-toggle',
		'shuffle-toggle-show-when-active',
		'loop-toggle',
		'loop-toggle-show-when-active',
		'close',
	]),
};
const allowedBottomActions = [
	'none',
	'repeat',
	'repeat-show-when-active',
	'seek-back',
	'previous',
	'restart-then-previous',
	'play',
	'skip',
	'seek-forward',
	'voice-search',
	'limited-height-fab',
];
for (const key of [
	'layoutBottomLeftSlot1',
	'layoutBottomLeftSlot1DoubleAction',
	'layoutBottomLeftSlot1HoldAction',
	'layoutBottomCenterSlot1',
	'layoutBottomCenterSlot1DoubleAction',
	'layoutBottomCenterSlot1HoldAction',
	'layoutBottomCenterSlot2',
	'layoutBottomCenterSlot2DoubleAction',
	'layoutBottomCenterSlot2HoldAction',
	'layoutBottomCenterSlot3',
	'layoutBottomCenterSlot3DoubleAction',
	'layoutBottomCenterSlot3HoldAction',
	'layoutBottomCenterSlot4',
	'layoutBottomCenterSlot4DoubleAction',
	'layoutBottomCenterSlot4HoldAction',
	'layoutBottomCenterSlot5',
	'layoutBottomCenterSlot5DoubleAction',
	'layoutBottomCenterSlot5HoldAction',
	'layoutBottomRightSlot1',
	'layoutBottomRightSlot1DoubleAction',
	'layoutBottomRightSlot1HoldAction',
	'layoutBottomRightSlot2',
	'layoutBottomRightSlot2DoubleAction',
	'layoutBottomRightSlot2HoldAction',
]) {
	layoutAllowedValues[key] = new Set(allowedBottomActions);
}

const navbarRightAllowedActions = new Set([
	'none',
	'play',
	'previous',
	'restart-then-previous',
	'skip',
	'seek-back',
	'seek-forward',
	'repeat',
	'text-search',
	'voice-search',
	'favourites',
	'video-toggle',
	'toggle-drawer',
	'debug-logs',
]);

const additionalNativeControlsAllowedActions = new Set([
	'none',
	'repeat',
	'seek-back',
	'seek-forward',
	'restart',
]);

const additionalNativeTopControlsAllowedActions = new Set([
	'none',
	'favourites',
	'voice-search',
	'debug-logs',
]);

const extraBottomLayoutActions = [
	'text-search',
	'favourites',
	'video-toggle',
	'toggle-drawer',
	'debug-logs',
];
for (const key in layoutAllowedValues) {
	if (!key.startsWith('layoutBottom')) continue;
	for (const actionId of extraBottomLayoutActions) {
		layoutAllowedValues[key].add(actionId);
	}
}

const snapshotSplashModeAllowedValues = new Set(['standard', 'spinner', 'none']);

function sanitizeUserSettingValue(key, value) {
	if (lockedSettingValues[key]) {
		return lockedSettingValues[key];
	}
	if (key === 'snapshotSplashMode') {
		const strValue = typeof value === 'string' ? value : defaultUserSettings[key];
		return snapshotSplashModeAllowedValues.has(strValue) ? strValue : defaultUserSettings[key];
	}
	if (key === 'navbarRightSlots') {
		if (!Array.isArray(value)) return defaultUserSettings[key].slice();
		return value.map((actionId) =>
			navbarRightAllowedActions.has(actionId) ? actionId : 'none'
		);
	}
	if (key === 'additionalNativeControls') {
		if (!Array.isArray(value)) return defaultUserSettings[key].slice();
		return value.map((actionId) =>
			additionalNativeControlsAllowedActions.has(actionId) ? actionId : 'none'
		);
	}
	if (key === 'additionalNativeTopControls') {
		if (!Array.isArray(value)) return defaultUserSettings[key].slice();
		return value.map((actionId) =>
			additionalNativeTopControlsAllowedActions.has(actionId) ? actionId : 'none'
		);
	}
	const allowed = layoutAllowedValues[key];
	if (!allowed) return value;
	const strValue = typeof value === 'string' ? value : defaultUserSettings[key];
	return allowed.has(strValue) ? strValue : defaultUserSettings[key];
}

function isLegacyExplicitlyFalse(value) {
	if (value === false) return true;
	if (value === 0) return true;
	if (typeof value === 'string') {
		const normalized = value.trim().toLowerCase();
		return normalized === 'false' || normalized === '0' || normalized === 'off';
	}
	return false;
}

function isLegacyExplicitlyTrue(value) {
	if (value === true) return true;
	if (value === 1) return true;
	if (typeof value === 'string') {
		const normalized = value.trim().toLowerCase();
		return normalized === 'true' || normalized === '1' || normalized === 'on';
	}
	return false;
}

function normalizeLegacyRepeatMode(value) {
	if (isLegacyExplicitlyFalse(value)) return 'disabled';
	if (isLegacyExplicitlyTrue(value)) return 'show-when-active';
	if (typeof value !== 'string') return null;
	const normalized = value.trim().toLowerCase();
	if (normalized === 'disabled' || normalized === 'hide' || normalized === 'hidden') {
		return 'disabled';
	}
	if (
		normalized === 'show-when-active' ||
		normalized === 'show_when_active' ||
		normalized === 'when-active' ||
		normalized === 'active'
	) {
		return 'show-when-active';
	}
	if (normalized === 'always-show' || normalized === 'always') {
		return 'always-show';
	}
	return null;
}

function normalizeLegacyDrawerToggleMode(value) {
	if (isLegacyExplicitlyFalse(value)) return 'hidden';
	if (isLegacyExplicitlyTrue(value)) return 'all';
	if (typeof value !== 'string') return null;
	const normalized = value.trim().toLowerCase();
	if (normalized === 'hidden' || normalized === 'hide' || normalized === 'disabled') {
		return 'hidden';
	}
	if (normalized === 'snapshots' || normalized === 'snapshot') {
		return 'snapshots';
	}
	if (normalized === 'all') {
		return 'all';
	}
	return null;
}

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
			const storageGet = async (keys) => {
				if (storageLocal.get.length === 1) {
					return await storageLocal.get(keys);
				}
				return await new Promise((resolve) => storageLocal.get(keys, resolve));
			};
			const storageSet = async (items) => {
				if (storageLocal.set.length === 1) {
					await storageLocal.set(items);
					return;
				}
				await new Promise((resolve, reject) => {
					storageLocal.set(items, () => {
						if (chrome.runtime.lastError) {
							reject(chrome.runtime.lastError);
						} else {
							resolve();
						}
					});
				});
			};
			const storageRemove = async (keys) => {
				if (typeof storageLocal.remove !== 'function') return;
				if (storageLocal.remove.length === 1) {
					await storageLocal.remove(keys);
					return;
				}
				await new Promise((resolve, reject) => {
					storageLocal.remove(keys, () => {
						if (chrome.runtime.lastError) {
							reject(chrome.runtime.lastError);
						} else {
							resolve();
						}
					});
				});
			};

			const allItems = await storageGet(null);
			for (const key in window.userSettings) {
				if (Object.prototype.hasOwnProperty.call(allItems, key)) {
					window.userSettings[key] = allItems[key];
				}
			}
			for (const key in layoutAllowedValues) {
				window.userSettings[key] = sanitizeUserSettingValue(key, window.userSettings[key]);
			}
			window.userSettings.snapshotSplashMode = sanitizeUserSettingValue(
				'snapshotSplashMode',
				window.userSettings.snapshotSplashMode
			);
			window.userSettings.navbarRightSlots = sanitizeUserSettingValue(
				'navbarRightSlots',
				window.userSettings.navbarRightSlots
			);
			window.userSettings.additionalNativeControls = sanitizeUserSettingValue(
				'additionalNativeControls',
				window.userSettings.additionalNativeControls
			);
			window.userSettings.additionalNativeTopControls = sanitizeUserSettingValue(
				'additionalNativeTopControls',
				window.userSettings.additionalNativeTopControls
			);

			const hasLegacyNavbarVisibility = legacyNavbarVisibilitySettingKeys.some((key) =>
				Object.prototype.hasOwnProperty.call(allItems, key)
			);
			if (hasLegacyNavbarVisibility) {
				const layoutUpdates = {};
				for (const legacyKey of legacyNavbarVisibilitySettingKeys) {
					if (!Object.prototype.hasOwnProperty.call(allItems, legacyKey)) continue;
					if (!isLegacyExplicitlyFalse(allItems[legacyKey])) continue;
					const actionId = legacyNavbarVisibilityActionMap[legacyKey];
					if (!actionId) continue;
					const filtered = (window.userSettings.navbarRightSlots || []).filter(
						(slotActionId) => slotActionId !== actionId
					);
					window.userSettings.navbarRightSlots = filtered;
					layoutUpdates.navbarRightSlots = filtered;
				}

				for (const key in layoutUpdates) {
					layoutUpdates[key] = sanitizeUserSettingValue(key, layoutUpdates[key]);
					window.userSettings[key] = layoutUpdates[key];
				}

				if (Object.keys(layoutUpdates).length > 0) {
					await storageSet(layoutUpdates);
				}

				const legacyKeysToRemove = legacyNavbarVisibilitySettingKeys.filter((key) =>
					Object.prototype.hasOwnProperty.call(allItems, key)
				);
				if (legacyKeysToRemove.length > 0) {
					await storageRemove(legacyKeysToRemove);
				}
			}

			const legacySettingKeysToRemove = [];
			const layoutUpdates = {};
			const sanitizeAndQueueLayoutUpdate = (key, value) => {
				const sanitized = sanitizeUserSettingValue(key, value);
				window.userSettings[key] = sanitized;
				layoutUpdates[key] = sanitized;
			};

			const layoutKeyPrefixAllowlist = ['layoutBottom', 'layoutDrawerHeader'];
			const allLayoutKeys = Object.keys(window.userSettings).filter((key) =>
				layoutKeyPrefixAllowlist.some((prefix) => key.startsWith(prefix))
			);

			if (
				Object.prototype.hasOwnProperty.call(allItems, 'hidePlayingDetails') &&
				!Object.prototype.hasOwnProperty.call(allItems, 'showPlayingDetails')
			) {
				const hideValue = allItems.hidePlayingDetails;
				const showValue = isLegacyExplicitlyFalse(hideValue) ? true : !hideValue;
				window.userSettings.showPlayingDetails = showValue;
				layoutUpdates.showPlayingDetails = showValue;
				legacySettingKeysToRemove.push('hidePlayingDetails');
			}

			if (Object.prototype.hasOwnProperty.call(allItems, 'previousButtonBehavior')) {
				const legacyPreviousBehavior = String(allItems.previousButtonBehavior || '').trim();
				const shouldMigrateToSmartPrevious =
					legacyPreviousBehavior !== 'alwaysPrevious' &&
					legacyPreviousBehavior !== 'always-previous';

				if (shouldMigrateToSmartPrevious) {
					for (const key of allLayoutKeys) {
						if (window.userSettings[key] === 'previous') {
							sanitizeAndQueueLayoutUpdate(key, 'restart-then-previous');
						}
					}

					const migratedNavbarSlots = (window.userSettings.navbarRightSlots || []).map(
						(actionId) => (actionId === 'previous' ? 'restart-then-previous' : actionId)
					);
					window.userSettings.navbarRightSlots = migratedNavbarSlots;
					layoutUpdates.navbarRightSlots = sanitizeUserSettingValue(
						'navbarRightSlots',
						migratedNavbarSlots
					);
				}

				legacySettingKeysToRemove.push('previousButtonBehavior');
			}

			if (Object.prototype.hasOwnProperty.call(allItems, 'showVoiceSearchButton')) {
				const legacyVoiceEnabled = !isLegacyExplicitlyFalse(allItems.showVoiceSearchButton);
				if (!legacyVoiceEnabled) {
					for (const key of allLayoutKeys) {
						if (window.userSettings[key] === 'voice-search') {
							sanitizeAndQueueLayoutUpdate(key, 'none');
						}
					}
					const filtered = (window.userSettings.navbarRightSlots || []).filter(
						(actionId) => actionId !== 'voice-search'
					);
					window.userSettings.navbarRightSlots = filtered;
					layoutUpdates.navbarRightSlots = sanitizeUserSettingValue(
						'navbarRightSlots',
						filtered
					);
				}
				legacySettingKeysToRemove.push('showVoiceSearchButton');
			}

			if (Object.prototype.hasOwnProperty.call(allItems, 'showRepeatButton')) {
				const legacyRepeatMode = normalizeLegacyRepeatMode(allItems.showRepeatButton);
				if (legacyRepeatMode) {
					const bottomPrimaryKeys = [
						'layoutBottomLeftSlot1',
						'layoutBottomCenterSlot1',
						'layoutBottomCenterSlot2',
						'layoutBottomCenterSlot3',
						'layoutBottomCenterSlot4',
						'layoutBottomCenterSlot5',
						'layoutBottomRightSlot1',
					];
					for (const key of bottomPrimaryKeys) {
						const current = window.userSettings[key];
						if (current !== 'repeat' && current !== 'repeat-show-when-active') continue;
						if (legacyRepeatMode === 'disabled') {
							sanitizeAndQueueLayoutUpdate(key, 'none');
						} else if (legacyRepeatMode === 'show-when-active') {
							sanitizeAndQueueLayoutUpdate(key, 'repeat-show-when-active');
						} else if (legacyRepeatMode === 'always-show') {
							sanitizeAndQueueLayoutUpdate(key, 'repeat');
						}
					}
				}
				legacySettingKeysToRemove.push('showRepeatButton');
			}

			const migrateLegacyBottomControlVisibilityToLayout = (legacyKey, actionId) => {
				if (!Object.prototype.hasOwnProperty.call(allItems, legacyKey)) return;
				if (isLegacyExplicitlyFalse(allItems[legacyKey])) {
					for (const key of allLayoutKeys) {
						if (!key.startsWith('layoutBottom')) continue;
						if (window.userSettings[key] === actionId) {
							sanitizeAndQueueLayoutUpdate(key, 'none');
						}
					}
				}
				legacySettingKeysToRemove.push(legacyKey);
			};
			migrateLegacyBottomControlVisibilityToLayout('showPreviousButton', 'previous');
			migrateLegacyBottomControlVisibilityToLayout('showSkipButton', 'skip');
			migrateLegacyBottomControlVisibilityToLayout('showSeekBackButton', 'seek-back');
			migrateLegacyBottomControlVisibilityToLayout('showSeekForwardButton', 'seek-forward');

			const migrateDrawerToggleModeToLayout = (legacyKey, baseActionId) => {
				if (!Object.prototype.hasOwnProperty.call(allItems, legacyKey)) return;
				const legacyMode = normalizeLegacyDrawerToggleMode(allItems[legacyKey]);
				if (!legacyMode) {
					legacySettingKeysToRemove.push(legacyKey);
					return;
				}
				const headerKeys = [
					'layoutDrawerHeaderSlot1',
					'layoutDrawerHeaderSlot2',
					'layoutDrawerHeaderSlot3',
					'layoutDrawerHeaderSlot4',
				];
				for (const key of headerKeys) {
					const current = window.userSettings[key];
					if (
						current !== baseActionId &&
						current !== `${baseActionId}-show-when-active`
					) {
						continue;
					}
					if (legacyMode === 'hidden') {
						sanitizeAndQueueLayoutUpdate(key, 'none');
					} else if (legacyMode === 'snapshots') {
						sanitizeAndQueueLayoutUpdate(key, `${baseActionId}-show-when-active`);
					} else if (legacyMode === 'all') {
						sanitizeAndQueueLayoutUpdate(key, baseActionId);
					}
				}
				legacySettingKeysToRemove.push(legacyKey);
			};
			migrateDrawerToggleModeToLayout('showLoopButton', 'loop-toggle');
			migrateDrawerToggleModeToLayout('showShuffleButton', 'shuffle-toggle');

			if (Object.keys(layoutUpdates).length > 0) {
				await storageSet(layoutUpdates);
			}
			if (legacySettingKeysToRemove.length > 0) {
				await storageRemove(legacySettingKeysToRemove);
			}

			try {
				if (window.userSettings.activeMixSnapshotId) {
					window.sessionStorage?.setItem(
						'mc_activeMixSnapshotId',
						String(window.userSettings.activeMixSnapshotId)
					);
				} else {
					window.sessionStorage?.removeItem('mc_activeMixSnapshotId');
				}
				window.sessionStorage?.setItem(
					'mc_snapshotSplashMode',
					String(
						window.userSettings.snapshotSplashMode ||
							defaultUserSettings.snapshotSplashMode
					)
				);
			} catch (error) {
				void error;
			}

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
		value = sanitizeUserSettingValue(key, value);

		if (key === 'activeMixSnapshotId' && window.userSettings[key] !== value) {
			try {
				window.sessionStorage?.removeItem('yt-emc-snapshot-drawer-state');
				window.sessionStorage?.removeItem('yt-emc-nav-skip-save');
			} catch (error) {
				void error;
			}
		}

		// Update local settings object
		window.userSettings[key] = value;

		if (key === 'activeMixSnapshotId') {
			try {
				if (value) {
					window.sessionStorage?.setItem('mc_activeMixSnapshotId', String(value));
				} else {
					window.sessionStorage?.removeItem('mc_activeMixSnapshotId');
				}
			} catch (error) {
				void error;
			}
		}
		if (key === 'snapshotSplashMode') {
			try {
				window.sessionStorage?.setItem('mc_snapshotSplashMode', String(value));
			} catch (error) {
				void error;
			}
		}

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
