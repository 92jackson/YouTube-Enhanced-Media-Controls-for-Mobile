// Default settings values
const defaultSettings = {
	enableCustomPlayer: true,
	defaultPlayerLayout: 'normal',
	customPlayerTheme: 'system',
	customPlayerAccentColor: 'red',
	customPlayerFontMultiplier: 1,
	showBottomControls: true,
	showVoiceSearchButton: true,
	showPreviousButton: true,
	showSkipButton: true,
	customPlaylistMode: 'below-video',
	returnToDefaultModeOnVideoSelect: false,
	playlistItemDensity: 'comfortable',
	allowMultilinePlaylistTitles: false,
	keepPlaylistFocused: false,
	parsingPreference: 'original',
	previousButtonBehavior: 'smart',
	enableGestures: true,
	gestureSingleSwipeLeftAction: 'restartPreviousVideo',
	gestureSingleSwipeRightAction: 'nextVideo',
	gestureTwoFingerSwipeUpAction: 'toggleVoiceSearch',
	gestureTwoFingerSwipeDownAction: 'playPause',
	gestureTwoFingerSwipeLeftAction: 'unassigned',
	gestureTwoFingerSwipeRightAction: 'unassigned',
	gestureTwoFingerPressAction: 'unassigned',
	showGestureFeedback: true,
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
	playlistRemoveSame: false,
	allowDifferentVersions: false,
	enableMediaSessionHandlers: true,
	autoSkipAds: false,
};

let statusTimeout = null;

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
			'input[type="checkbox"], input[type="range"], select'
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
	labelContainer.innerHTML = '';
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

document.addEventListener('DOMContentLoaded', restore_options);
