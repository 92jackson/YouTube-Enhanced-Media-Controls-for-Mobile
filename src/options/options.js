// Default settings values
const defaultSettings = {
	enableCustomPlayer: true,
	defaultPlayerLayout: 'normal',
	customPlayerTheme: 'system',
	customPlayerAccentColor: 'adaptive',
	applyThemeColorToBrowser: 'theme', // 'disable', 'theme', 'accent'
	customPlayerFontMultiplier: 1,
	showBottomControls: true,
	hideVideoPlayer: false,
	showVoiceSearchButton: true,
	showPreviousButton: true,
	showSkipButton: true,
	showRepeatButton: 'show-when-active',
	customPlaylistMode: 'below-video',
	returnToDefaultModeOnVideoSelect: false,
	playlistItemDensity: 'comfortable',
	allowMultilinePlaylistTitles: false,
	keepPlaylistFocused: false,
	playlistColorMode: 'theme',
	parsingPreference: 'mixesAndPlaylists',
	previousButtonBehavior: 'smart',
	smartPreviousThreshold: 5,
	enableGestures: true,
	gestureSingleSwipeLeftAction: 'previousVideoOnly',
	gestureSingleSwipeRightAction: 'nextVideo',
	gestureTwoFingerSwipeUpAction: 'toggleVoiceSearch',
	gestureTwoFingerSwipeDownAction: 'playPause',
	gestureTwoFingerSwipeLeftAction: 'unassigned',
	gestureTwoFingerSwipeRightAction: 'unassigned',
	gestureTwoFingerPressAction: 'unassigned',
	showGestureFeedback: true,
	gestureSensitivity: 'normal',
	autoPlayPreference: 'attemptUnmuted',
	autoClickContinueWatching: true,
	fixNativePlaylistScroll: false,
	allowBackgroundPlay: false,
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
	navbarShowVideoToggle: false,
	playlistRemoveSame: false,
	allowDifferentVersions: false,
	enableMediaSessionHandlers: true,
	autoSkipAds: false,
	autoReloadStuckPlaylist: true,
	videoBlacklist: [],
	rapidBufferDetection: false,
	bufferDetectionThreshold: 3,
	bufferDetectionPauseDuration: 5,
};

let statusTimeout = null;

// Get the standard thumbnail URL for a given video ID
function getStandardThumbnailUrl(videoId) {
	return videoId ? `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg` : '';
}

function updateControlStates() {
	const isCustomPlayerEnabled = document.getElementById('enableCustomPlayer').checked;
	document.querySelectorAll('.depends-on-custom-player').forEach((group) => {
		const isGroupDisabled = !isCustomPlayerEnabled;
		group.classList.toggle('disabled-group', isGroupDisabled);
		group.querySelectorAll('input, select, fieldset').forEach((control) => {
			const parentFieldset = control.closest('fieldset');
			if (!(parentFieldset && parentFieldset.disabled && control !== parentFieldset)) {
				control.disabled = isGroupDisabled;
			}
		});
	});

	if (!isCustomPlayerEnabled) return;

	const showBottomControls = document.getElementById('showBottomControls').checked;
	const bottomControlsFieldset = document.getElementById('bottom-controls-options-fieldset');
	if (bottomControlsFieldset) bottomControlsFieldset.disabled = !showBottomControls;

	const playlistMode = document.getElementById('customPlaylistMode').value;
	const isPlaylistFeatureEnabled = playlistMode !== 'disabled';
	document.querySelectorAll('.depends-on-playlist-enabled').forEach((setting) => {
		const isSettingDisabled = !isPlaylistFeatureEnabled;
		setting.classList.toggle('disabled-setting', isSettingDisabled);
		setting.querySelectorAll('input, select').forEach((control) => {
			control.disabled = isSettingDisabled;
		});
	});

	const returnToDefaultContainer = document.getElementById('returnToDefaultToggleItemContainer');
	const returnToDefaultInput = document.getElementById('returnToDefaultModeOnVideoSelect');
	if (returnToDefaultContainer && returnToDefaultInput) {
		const isReturnVisible =
			isCustomPlayerEnabled && isPlaylistFeatureEnabled && !playlistMode.startsWith('fixed-');
		returnToDefaultContainer.style.display = isReturnVisible ? '' : 'none';
		returnToDefaultInput.disabled = !isReturnVisible;
	}

	const areGesturesEnabled = document.getElementById('enableGestures').checked;
	const gestureFieldset = document.getElementById('gesture-controls-fieldset');
	if (gestureFieldset) gestureFieldset.disabled = !areGesturesEnabled;

	const areNavbarEnabled = document.getElementById('enableCustomNavbar').checked;
	const navbarFieldset = document.getElementById('navbar-options-fieldset');
	if (navbarFieldset) navbarFieldset.disabled = !areNavbarEnabled;

	const isPlaylistRemoveSameEnabled = document.getElementById('playlistRemoveSame').checked;
	const playlistRemoveSameFieldset = document.getElementById('playlist-remove-same-fieldset');
	if (playlistRemoveSameFieldset)
		playlistRemoveSameFieldset.disabled = !isPlaylistRemoveSameEnabled;

	// Buffer detection auto-pause control
	const isBufferDetectionEnabled = document.getElementById('rapidBufferDetection').checked;
	const bufferDetectionFieldset = document.getElementById('buffer-detection-options-fieldset');
	if (bufferDetectionFieldset) bufferDetectionFieldset.disabled = !isBufferDetectionEnabled;
}

function save_options() {
	const settingsToSave = {};
	for (const key in defaultSettings) {
		const element = document.getElementById(key);
		if (element) {
			if (element.type === 'checkbox') {
				settingsToSave[key] = element.checked;
			} else if (key === 'customPlayerFontMultiplier') {
				const increments = element.dataset.increments.split(',').map(parseFloat);
				const index = parseInt(element.value);
				settingsToSave[key] = increments[index] ?? 1;
			} else if (key === 'smartPreviousThreshold') {
				settingsToSave[key] = parseInt(element.value) || 5;
			} else {
				settingsToSave[key] = element.value;
			}
		}
	}

	const storageApi = typeof browser !== 'undefined' ? browser.storage : chrome.storage;
	const storageLocal = storageApi.local;

	if (storageLocal) {
		// Check for promise-based or callback-based API
		if (typeof storageLocal.set === 'function' && storageLocal.set.length === 1) {
			storageLocal
				.set(settingsToSave)
				.then(() => {
					showSaveSnackbar();
				})
				.catch((err) => {
					console.error('Enhanced Player: Failed to save settings', err);
				});
		} else {
			storageLocal.set(settingsToSave, () => {
				if (chrome.runtime.lastError) {
					console.error(
						'Enhanced Player: Failed to save settings',
						chrome.runtime.lastError
					);
				} else {
					showSaveSnackbar();
				}
			});
		}
	} else {
		console.warn('Enhanced Player: Storage API not available. Settings not saved.');
	}
}

function showSaveSnackbar() {
	const statusSnackbar = document.getElementById('status-snackbar');
	if (statusTimeout) clearTimeout(statusTimeout);
	statusSnackbar.textContent = 'Settings saved!';
	statusSnackbar.classList.add('show');
	statusTimeout = setTimeout(() => {
		statusSnackbar.classList.remove('show');
	}, 3000);
}

function restore_options() {
	const storageApi = typeof browser !== 'undefined' ? browser.storage : chrome.storage;
	const storageLocal = storageApi.local;

	const applySettings = (items) => {
		for (const key in items) {
			const element = document.getElementById(key);
			if (element) {
				if (element.type === 'checkbox') {
					element.checked = items[key];
				} else if (key === 'smartPreviousThreshold') {
					element.value = parseInt(items[key]) || 5;
				} else {
					element.value = items[key];
				}
			}
		}

		const fontSlider = document.getElementById('customPlayerFontMultiplier');
		if (fontSlider) {
			const increments = fontSlider.dataset.increments.split(',').map(parseFloat);
			const multiplier = items['customPlayerFontMultiplier'] ?? 1;
			const index = increments.indexOf(multiplier);
			if (index !== -1) {
				fontSlider.value = index;
			}
		}

		const inputs = document.querySelectorAll(
			'input[type="checkbox"], input[type="range"], input[type="number"], select'
		);
		inputs.forEach((input) => {
			input.addEventListener('change', save_options);
		});

		[
			'enableCustomPlayer',
			'customPlaylistMode',
			'enableGestures',
			'showBottomControls',
			'enableCustomNavbar',
			'playlistRemoveSame',
			'rapidBufferDetection',
		]
			.map((id) => document.getElementById(id))
			.filter(Boolean)
			.forEach((el) => el.addEventListener('change', updateControlStates));

		setupInteractiveLabels();
		updateControlStates();
		initCustomPlayerFontSlider();
	};

	if (storageLocal) {
		if (typeof storageLocal.get === 'function' && storageLocal.get.length === 1) {
			storageLocal
				.get(defaultSettings)
				.then(applySettings)
				.catch((err) => {
					console.error('Error loading settings:', err);
					applySettings(defaultSettings);
				});
		} else {
			storageLocal.get(defaultSettings, applySettings);
		}
	} else {
		console.warn('Enhanced Player: Storage API not available.');
		applySettings(defaultSettings);
	}
}

function setupInteractiveLabels() {
	document.querySelectorAll('.toggle-label-group[data-target-id]').forEach((labelGroup) => {
		labelGroup.addEventListener('click', function () {
			const targetId = this.dataset.targetId;
			const targetInput = document.getElementById(targetId);
			if (targetInput) targetInput.click();
		});
	});
}

function initCustomPlayerFontSlider() {
	const slider = document.getElementById('customPlayerFontMultiplier');
	if (!slider) return;

	const wrapper = slider.closest('.material-slider-wrapper');
	const increments = slider.dataset.increments.split(',').map(parseFloat);
	const labels = slider.dataset.labels.split(',');
	const labelContainer = slider.nextElementSibling;
	const preview = wrapper?.querySelector('.preview-text');

	// Build label elements
	while (labelContainer.firstChild) {
		labelContainer.removeChild(labelContainer.firstChild);
	}
	labels.forEach((label, index) => {
		const span = document.createElement('span');
		span.textContent = label;
		span.style.left = `${(index / (labels.length - 1)) * 100}%`;
		labelContainer.appendChild(span);
	});

	// Highlight active label
	function updateSliderUI() {
		const value = parseInt(slider.value);
		const multiplier = increments[value];

		if (preview) {
			preview.style.fontSize = `${16 * multiplier}px`;
		}

		Array.from(labelContainer.children).forEach((child, i) => {
			child.classList.toggle('active', i === value);
		});
	}

	slider.addEventListener('input', updateSliderUI);
	updateSliderUI();
}

function loadBlacklistedVideos() {
	const storageApi = typeof browser !== 'undefined' ? browser.storage : chrome.storage;
	const storageLocal = storageApi.local;

	const displayBlacklistedVideos = (items) => {
		const videoBlacklist = items.videoBlacklist || [];
		const listContainer = document.getElementById('blacklisted-videos-list');
		const noVideosMessage = document.getElementById('no-blacklisted-videos');

		if (!listContainer) return;

		while (listContainer.firstChild) {
			listContainer.removeChild(listContainer.firstChild);
		}

		if (videoBlacklist.length === 0) {
			noVideosMessage.style.display = 'block';
			return;
		}

		noVideosMessage.style.display = 'none';

		videoBlacklist.forEach((video) => {
			// Handle both old format (string) and new format (object)
			let videoId, videoTitle;
			if (typeof video === 'string') {
				videoId = video;
				videoTitle = 'Blacklisted Video';
			} else if (typeof video === 'object' && video.id) {
				videoId = video.id;
				videoTitle = video.title || 'Blacklisted Video';
			} else {
				return; // Skip invalid entries
			}

			const videoItem = document.createElement('div');
			videoItem.className = 'blacklisted-video-item';

			const thumbnail = document.createElement('img');
			thumbnail.className = 'blacklisted-video-thumbnail';
			thumbnail.src = getStandardThumbnailUrl(videoId);
			thumbnail.alt = 'Video thumbnail';
			thumbnail.loading = 'lazy';

			const videoInfo = document.createElement('div');
			videoInfo.className = 'blacklisted-video-info';

			const videoIdElement = document.createElement('div');
			videoIdElement.className = 'blacklisted-video-id';
			videoIdElement.textContent = videoId;

			const videoTitleElement = document.createElement('div');
			videoTitleElement.className = 'blacklisted-video-title';
			videoTitleElement.textContent = videoTitle;

			const removeButton = document.createElement('button');
			removeButton.className = 'blacklisted-video-remove';
			removeButton.textContent = 'Remove';
			removeButton.addEventListener('click', () => removeFromBlacklist(videoId));

			videoInfo.appendChild(videoIdElement);
			videoInfo.appendChild(videoTitleElement);
			videoItem.appendChild(thumbnail);
			videoItem.appendChild(videoInfo);
			videoItem.appendChild(removeButton);
			listContainer.appendChild(videoItem);
		});
	};

	if (storageLocal) {
		if (typeof storageLocal.get === 'function' && storageLocal.get.length === 1) {
			storageLocal
				.get(['videoBlacklist'])
				.then(displayBlacklistedVideos)
				.catch((err) => {
					console.error('Error loading blacklisted videos:', err);
					displayBlacklistedVideos({ videoBlacklist: [] });
				});
		} else {
			storageLocal.get(['videoBlacklist'], displayBlacklistedVideos);
		}
	} else {
		console.warn('Enhanced Player: Storage API not available.');
		displayBlacklistedVideos({ videoBlacklist: [] });
	}
}

function removeFromBlacklist(videoId) {
	const storageApi = typeof browser !== 'undefined' ? browser.storage : chrome.storage;
	const storageLocal = storageApi.local;

	const updateBlacklist = (items) => {
		const videoBlacklist = items.videoBlacklist || [];
		// Handle both old format (strings) and new format (objects)
		const updatedBlacklist = videoBlacklist.filter((video) => {
			if (typeof video === 'string') {
				return video !== videoId;
			} else if (typeof video === 'object' && video.id) {
				return video.id !== videoId;
			}
			return true; // Keep invalid entries for now
		});

		const settingsToSave = { videoBlacklist: updatedBlacklist };

		if (storageLocal) {
			if (typeof storageLocal.set === 'function' && storageLocal.set.length === 1) {
				storageLocal
					.set(settingsToSave)
					.then(() => {
						showSaveSnackbar();
						loadBlacklistedVideos(); // Reload the list
					})
					.catch((err) => {
						console.error(
							'Enhanced Player: Failed to remove video from blacklist',
							err
						);
					});
			} else {
				storageLocal.set(settingsToSave, () => {
					if (chrome.runtime.lastError) {
						console.error(
							'Enhanced Player: Failed to remove video from blacklist',
							chrome.runtime.lastError
						);
					} else {
						showSaveSnackbar();
						loadBlacklistedVideos(); // Reload the list
					}
				});
			}
		}
	};

	if (storageLocal) {
		if (typeof storageLocal.get === 'function' && storageLocal.get.length === 1) {
			storageLocal
				.get(['videoBlacklist'])
				.then(updateBlacklist)
				.catch((err) => {
					console.error('Error loading blacklisted videos for removal:', err);
				});
		} else {
			storageLocal.get(['videoBlacklist'], updateBlacklist);
		}
	}
}

function initBlacklistedVideosCollapse() {
	const header = document.querySelector('.blacklisted-videos-header');
	const container = document.querySelector('.blacklisted-videos-container');

	if (!header || !container) return;

	header.addEventListener('click', () => {
		const isExpanded = container.style.display !== 'none';

		if (isExpanded) {
			container.style.display = 'none';
			header.classList.remove('expanded');
		} else {
			container.style.display = 'block';
			header.classList.add('expanded');
		}
	});
}

function clearAllBlacklistedVideos() {
	const confirmed = confirm(
		'Are you sure you want to clear all blacklisted videos? This action cannot be undone.'
	);

	if (!confirmed) return;

	const storageApi = typeof browser !== 'undefined' ? browser.storage : chrome.storage;
	const storageLocal = storageApi.local;

	const settingsToSave = { videoBlacklist: [] };

	if (storageLocal) {
		if (typeof storageLocal.set === 'function' && storageLocal.set.length === 1) {
			storageLocal
				.set(settingsToSave)
				.then(() => {
					showSaveSnackbar();
					loadBlacklistedVideos(); // Reload the list
				})
				.catch((err) => {
					console.error('Enhanced Player: Failed to clear blacklisted videos', err);
				});
		} else {
			storageLocal.set(settingsToSave, () => {
				if (chrome.runtime.lastError) {
					console.error(
						'Enhanced Player: Failed to clear blacklisted videos',
						chrome.runtime.lastError
					);
				} else {
					showSaveSnackbar();
					loadBlacklistedVideos(); // Reload the list
				}
			});
		}
	}
}

function initClearAllButton() {
	const clearAllButton = document.getElementById('clear-all-blacklisted');
	if (clearAllButton) {
		clearAllButton.addEventListener('click', clearAllBlacklistedVideos);
	}
}

function loadVersionNumber() {
	fetch(chrome.runtime.getURL('manifest.json'))
		.then((response) => response.json())
		.then((manifest) => {
			const versionElement = document.getElementById('version-number');
			if (versionElement && manifest.version) {
				versionElement.textContent = `v${manifest.version}`;
			}
		})
		.catch((error) => {
			console.error('Failed to load version from manifest:', error);
			const versionElement = document.getElementById('version-number');
			if (versionElement) {
				versionElement.textContent = 'Version unavailable';
			}
		});
}

document.addEventListener('DOMContentLoaded', () => {
	restore_options();
	loadBlacklistedVideos();
	initBlacklistedVideosCollapse();
	initClearAllButton();
	loadVersionNumber();
});
