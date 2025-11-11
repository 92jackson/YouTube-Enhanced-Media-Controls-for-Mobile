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
	bufferDetectionEventCount: 2,
	bufferDetectionPauseDuration: 5,
	hideEasterEggSpider: false,
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
			} else if (key === 'bufferDetectionEventCount') {
				settingsToSave[key] = parseInt(element.value) || 2;
			} else {
				settingsToSave[key] = element.value;
			}
		}
	}

	const storageApi = typeof browser !== 'undefined' ? browser.storage : chrome.storage;
	const storageLocal = storageApi ? storageApi.local : null;

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
	const storageApi =
		typeof browser !== 'undefined' && browser.storage
			? browser.storage
			: typeof chrome !== 'undefined' && chrome.storage
			? chrome.storage
			: null;
	const storageLocal = storageApi ? storageApi.local : null;

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
		initMaterialSliders();
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

function initMaterialSliders() {
	const sliders = document.querySelectorAll('.material-slider');
	if (!sliders || sliders.length === 0) return;

	sliders.forEach((slider) => {
		const wrapper = slider.closest('.material-slider-wrapper');
		const labelContainer = wrapper?.querySelector('.slider-labels');
		if (!labelContainer) return;

		const hasIncrements = !!slider.dataset.increments;
		const increments = hasIncrements
			? slider.dataset.increments.split(',').map(parseFloat)
			: null;
		let labels = [];
		if (slider.dataset.labels) {
			labels = slider.dataset.labels.split(',');
		} else {
			const min = parseInt(slider.min || '0');
			const max = parseInt(slider.max || '100');
			const step = parseInt(slider.step || '1');
			for (let v = min; v <= max; v += step) {
				labels.push(String(v));
			}
		}

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

		const preview = wrapper?.querySelector('.preview-text');

		function getIndex() {
			if (hasIncrements) {
				const valNum = Number(slider.value);
				const idxByValue = increments ? increments.indexOf(valNum) : -1;
				if (idxByValue !== -1) return idxByValue;
				// Fallback: treat slider.value as index (used by font slider)
				return Math.max(0, Math.min(parseInt(slider.value), (labels.length || 1) - 1));
			}
			const min = Number(slider.min ?? '0');
			const step = Number(slider.step ?? '1');
			const val = Number(slider.value);
			return Math.round((val - min) / step);
		}

		function updateSliderUI() {
			const idx = getIndex();
			Array.from(labelContainer.children).forEach((child, i) => {
				child.classList.toggle('active', i === idx);
			});
			if (preview && increments) {
				const multiplier = increments[idx];
				preview.style.fontSize = `${16 * multiplier}px`;
			}
		}

		slider.addEventListener('input', updateSliderUI);
		updateSliderUI();
	});
}

function loadBlacklistedVideos() {
	const storageApi =
		typeof browser !== 'undefined' && browser.storage
			? browser.storage
			: typeof chrome !== 'undefined' && chrome.storage
			? chrome.storage
			: null;
	const storageLocal = storageApi ? storageApi.local : null;

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
	const storageApi =
		typeof browser !== 'undefined' && browser.storage
			? browser.storage
			: typeof chrome !== 'undefined' && chrome.storage
			? chrome.storage
			: null;
	const storageLocal = storageApi ? storageApi.local : null;

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

	const storageApi =
		typeof browser !== 'undefined' && browser.storage
			? browser.storage
			: typeof chrome !== 'undefined' && chrome.storage
			? chrome.storage
			: null;
	const storageLocal = storageApi ? storageApi.local : null;

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
	if (
		typeof chrome !== 'undefined' &&
		chrome.runtime &&
		typeof chrome.runtime.getURL === 'function'
	) {
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
}

document.addEventListener('DOMContentLoaded', () => {
	restore_options();
	loadBlacklistedVideos();
	initBlacklistedVideosCollapse();
	initClearAllButton();
	loadVersionNumber();
});

// Tiny Spider Easter Egg — cumulative growth and message cycling
document.addEventListener('DOMContentLoaded', () => {
	const spider = document.getElementById('easter-spider');
	const msgEl = document.getElementById('easter-spider-message');
	const svgEl = spider ? spider.querySelector('svg') : null;
	if (!spider) return;

	// Hide/remove easter egg when user enabled the option, and react to changes
	let spiderHidden = false;
	const hideSpiderInput = document.getElementById('hideEasterEggSpider');
	if (hideSpiderInput) {
		spiderHidden = !!hideSpiderInput.checked;
		if (spiderHidden) {
			spider.style.display = 'none';
		}
		hideSpiderInput.addEventListener('change', (ev) => {
			const hide = !!ev.target.checked;
			spiderHidden = hide;
			if (hide) {
				spider.style.display = 'none';
				// cancel running animations/timers and clear trail
				if (scuttleRAF) {
					cancelAnimationFrame(scuttleRAF);
					scuttleRAF = null;
				}
				if (peekTimeout) {
					clearTimeout(peekTimeout);
					peekTimeout = null;
				}
				if (messageTimer) {
					clearTimeout(messageTimer);
					messageTimer = null;
				}
				if (decayTimeout) {
					clearTimeout(decayTimeout);
					decayTimeout = null;
				}
				if (decayInterval) {
					clearInterval(decayInterval);
					decayInterval = null;
				}
				hideTrail();
			} else {
				spider.style.display = '';
				// restart scuttle loop and peek scheduling
				prevTime = 0;
				pickParams();
				scuttleRAF = requestAnimationFrame(stepScuttle);
				schedulePeek();
			}
		});
	}

	let scale = 1;
	let clickCount = 0;
	let messageTimer = null;
	let decayTimeout = null;
	let decayInterval = null;
	const DECAY_DELAY_MS = 5000; // start shrinking shortly after message fades
	const DECAY_INTERVAL_MS = 500;
	const DECAY_STEP = 0.05; // shrink per tick
	const messages = [
		'Say hello to "Bidey". Added for v1.2.4.2 — 11/11/2025, in honor of my son\'s 2nd Birthday today— he loves spiders!',
		"Tap again — I'll grow a little bigger.",
		'Or take me for a walk (hold + drag).',
		"Eight tiny legs, don't tap too hard.",
		'Creep. Crawl. Scuttle.',
		'Happy 2nd Birthday! 🎉🕷️',
		"Whoa, I'm getting huge!",
		'BIDEY!!! 💨',
		'Drag me; I promise not to bite.',
		'Corners are cozy; I like to peek.',
		'Scuttle patrol in progress.',
		'Bug hunter by day, web spinner by night.',
		"Tap to say hi; I'll grow each time.",
		'Hold and move to take me adventuring.',
		'Eight legs, infinite enthusiasm.',
	];

	// Tuning constants for spider sensitivities and behaviors
	const SPIDER_TUNE = {
		move: {
			spring_k: 0.035, // base acceleration toward target
			damping: 0.86, // velocity damping
			max_px_per_second: 2200, // clamp per-frame step by dt
		},
		follow: {
			spring_k: 0.03,
			damping: 0.86,
			orbit_expand_ms: 120,
			orbit_shrink_ms: 400,
			orbit_ease: 0.15,
			swirl_factor: 0.15, // how much organic swirl to mix in
			swirl_when_still_factor: 0.35, // stronger swirl when finger stops
			wander_when_still_factor: 1.0, // add local scuttle while still
			pointer_vel_min_px: 0.75, // minimum per-event delta to use pointer direction
			direction_change_hold_ms: 140, // hesitation on sharp direction change
			direction_change_angle_deg: 75, // degrees threshold to trigger hold
			direction_change_min_speed_px: 1.0, // min speed to consider a change
		},
		peek: {
			duration_ms: 2500,
			arrival_radius_px: 18,
			scurry_k: 0.032,
			scurry_damping: 0.86,
			edge_margin_px: 24,
		},
		summon: {
			linger_ms: 900,
			arrival_radius_px: 18,
			scurry_k: 0.035,
			scurry_damping: 0.86,
		},
		settle: {
			arrival_radius_px: 18,
			scurry_k: 0.034,
			scurry_damping: 0.86,
		},
		rush: {
			nibble_ms: 900,
			arrival_radius_px: 18,
			k: 0.04,
			damping: 0.84,
		},
		trail: {
			fade_alpha: 0.005,
			width_factor: 0.04,
		},
		fingers: {
			touch_px: 100,
		},
	};

	// Block page scroll during touch hold/drag
	let touchMoveBlockerActive = false;
	const preventTouchDefault = (e) => e.preventDefault();
	function blockPageScroll() {
		if (touchMoveBlockerActive) return;
		touchMoveBlockerActive = true;
		try {
			document.addEventListener('touchmove', preventTouchDefault, { passive: false });
			document.addEventListener('touchstart', preventTouchDefault, { passive: false });
		} catch {}
		if (document.body) document.body.style.touchAction = 'none';
	}
	function unblockPageScroll() {
		if (!touchMoveBlockerActive) return;
		touchMoveBlockerActive = false;
		try {
			document.removeEventListener('touchmove', preventTouchDefault, false);
			document.removeEventListener('touchstart', preventTouchDefault, false);
		} catch {}
		if (document.body) document.body.style.touchAction = '';
	}

	// Scuttle engine
	let scuttleRAF = null;
	let t = 0;
	let posX = 0;
	let posY = 0;
	let rot = 0;
	let prevTime = 0;
	let params = {
		ax: 6,
		ay: 4,
		fx: 1,
		fy: 1,
		speed: 0.14, // loops per second (slow)
		jitter: 0.12,
		damping: 0.12, // position smoothing
		rotDamping: 0.18, // rotation smoothing
		walkAmp: 3, // degrees of side-to-side tilt
		walkRate: 2.0, // oscillations per scuttle phase
	};

	// Follow finger state
	let followActive = false;
	let dragging = false;
	let pointerId = null;
	let pointerX = 0;
	let pointerY = 0;
	let anchorRightPx = null;
	let anchorBottomPx = null;
	let prevCenterX = null;
	let prevCenterY = null;
	let decayPaused = false;
	let fingerRadiusPx = 28;
	let pointerPrevX = 0,
		pointerPrevY = 0,
		pointerVelX = 0,
		pointerVelY = 0;
	let followHoldUntil = 0,
		prevVelDirX = 0,
		prevVelDirY = 0;

	// Playful behaviors state
	let lastPointerMoveTS = 0;
	let orbitTargetR = null; // desired orbit radius
	let orbitRAnim = null; // smoothed orbit radius
	let rushActive = false; // rushing to treat
	let crumbEl = null;
	let crumbX = 0,
		crumbY = 0;
	let nibbleUntil = 0;
	let lastTapTS = 0,
		lastTapX = 0,
		lastTapY = 0;
	let trailCanvas = null,
		trailCtx = null,
		trailActive = false;
	let peekTimeout = null,
		peekActive = false,
		peekTargetX = 0,
		peekTargetY = 0;
	let summonActive = false,
		summonX = 0,
		summonY = 0,
		summonUntil = 0;
	let settleActive = false,
		settleTargetX = 0,
		settleTargetY = 0;

	// Anchor physics (scurry motion)
	let velRight = 0,
		velBottom = 0;

	// Phases for peek/summon to-and-from behavior
	let peekPhase = 'idle',
		peekOriginX = 0,
		peekOriginY = 0,
		peekLingerUntil = 0;
	let summonPhase = 'idle',
		summonOriginX = 0,
		summonOriginY = 0,
		summonLingerUntil = 0;

	function ensureTrailCanvas() {
		if (trailCanvas) return;
		trailCanvas = document.createElement('canvas');
		trailCanvas.style.position = 'fixed';
		trailCanvas.style.left = '0';
		trailCanvas.style.top = '0';
		trailCanvas.style.width = '100vw';
		trailCanvas.style.height = '100vh';
		trailCanvas.style.pointerEvents = 'none';
		trailCanvas.style.zIndex = '10';
		trailCanvas.style.opacity = '0';
		document.body.appendChild(trailCanvas);
		trailCtx = trailCanvas.getContext('2d');
		resizeTrailCanvas();
	}

	function resizeTrailCanvas() {
		if (!trailCanvas) return;
		const dpr = window.devicePixelRatio || 1;
		trailCanvas.width = Math.floor(window.innerWidth * dpr);
		trailCanvas.height = Math.floor(window.innerHeight * dpr);
		trailCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
		trailCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
	}

	function showTrail() {
		ensureTrailCanvas();
		trailActive = true;
		trailCanvas.style.opacity = '1';
	}

	function hideTrail(clear = true) {
		trailActive = false;
		if (trailCanvas) {
			trailCanvas.style.opacity = '0';
			if (clear) {
				trailCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
			}
		}
	}

	function drawTrail(x1, y1, x2, y2, widthPx) {
		if (!trailActive || !trailCtx) return;
		// gentle fade each frame
		trailCtx.fillStyle = 'rgba(255,255,255,' + SPIDER_TUNE.trail.fade_alpha + ')';
		trailCtx.fillRect(0, 0, window.innerWidth, window.innerHeight);
		trailCtx.beginPath();
		trailCtx.moveTo(x1, y1);
		trailCtx.lineTo(x2, y2);
		trailCtx.strokeStyle = 'rgba(0,0,0,0.25)';
		trailCtx.lineWidth = Math.max(1, widthPx);
		trailCtx.lineCap = 'round';
		trailCtx.stroke();
	}

	function createCrumbAt(x, y) {
		if (crumbEl) crumbEl.remove();
		const el = document.createElement('div');
		el.style.position = 'fixed';
		el.style.left = Math.round(x - 4) + 'px';
		el.style.top = Math.round(y - 4) + 'px';
		el.style.width = '8px';
		el.style.height = '8px';
		el.style.borderRadius = '50%';
		el.style.background = '#8bb56b';
		el.style.boxShadow = '0 1px 2px rgba(0,0,0,0.3)';
		el.style.opacity = '1';
		el.style.transition = 'opacity 300ms ease';
		el.style.pointerEvents = 'none';
		document.body.appendChild(el);
		crumbEl = el;
	}

	function schedulePeek() {
		if (peekTimeout) clearTimeout(peekTimeout);
		const delay = 8000 + Math.random() * 10000; // 8–18s
		peekTimeout = setTimeout(triggerPeek, delay);
	}

	function triggerPeek() {
		// Only peek when idle
		if (dragging || followActive || rushActive || summonActive || scale > 1.25) {
			schedulePeek();
			return;
		}
		const vw = window.innerWidth || document.documentElement.clientWidth;
		const vh = window.innerHeight || document.documentElement.clientHeight;
		const edge = Math.floor(Math.random() * 4); // 0=left,1=right,2=top,3=bottom
		const rect = spider.getBoundingClientRect();
		const halfW = rect.width * 0.5;
		const halfH = rect.height * 0.5;
		const margin = SPIDER_TUNE.peek.edge_margin_px;
		const alongX = margin + Math.random() * (vw - margin * 2);
		const alongY = margin + Math.random() * (vh - margin * 2);
		switch (edge) {
			case 0:
				peekTargetX = margin + halfW;
				peekTargetY = alongY;
				break;
			case 1:
				peekTargetX = vw - margin - halfW;
				peekTargetY = alongY;
				break;
			case 2:
				peekTargetX = alongX;
				peekTargetY = margin + halfH;
				break;
			case 3:
				peekTargetX = alongX;
				peekTargetY = vh - margin - halfH;
				break;
		}
		// start peek: scurry to target, linger, then return
		peekOriginX = rect.left + halfW;
		peekOriginY = rect.top + halfH;
		peekActive = true;
		peekPhase = 'to';
		peekLingerUntil = 0;
	}

	function pickParams() {
		const s = Math.min(scale, 3);
		const ampX = Math.min(18, 6 * s) * (0.95 + Math.random() * 0.1);
		const ampY = Math.min(14, 4 * s) * (0.95 + Math.random() * 0.1);
		params.ax = ampX;
		params.ay = ampY;
		params.fx = 0.9 + Math.random() * 0.2; // slight variance keeps it organic
		params.fy = 0.9 + Math.random() * 0.2;
		params.speed = 0.12 + Math.random() * 0.06; // 6–8s per loop
		params.jitter = 0.06 + Math.random() * 0.08; // subtle
	}

	function noise(n) {
		return Math.sin(n * 1.3) * 0.4 + Math.cos(n * 1.9) * 0.3;
	}

	function stepScuttle(now) {
		if (!prevTime) prevTime = now;
		const dt = Math.min(0.05, (now - prevTime) / 1000); // cap dt to avoid jumps
		prevTime = now;
		// advance phase: convert loops/sec to radians
		t += params.speed * dt * (Math.PI * 2);
		const baseX = Math.cos(t * params.fx) * params.ax;
		const baseY = Math.sin(t * params.fy) * params.ay;
		const jx = noise(t) * params.jitter * params.ax;
		const jy = noise(t + 2.17) * params.jitter * params.ay;
		const targetX = (baseX + jx) * (followActive ? 0.35 : 1);
		const targetY = (baseY + jy) * (followActive ? 0.35 : 1);
		// smooth towards target
		posX += (targetX - posX) * params.damping;
		posY += (targetY - posY) * params.damping;

		// Scurry anchor motion based on interactive states
		if (rushActive || summonActive || followActive || peekActive || settleActive) {
			const rect = spider.getBoundingClientRect();
			const halfW = rect.width * 0.5;
			const halfH = rect.height * 0.5;
			const vw =
				window.innerWidth || document.documentElement.clientWidth || rect.right + halfW;
			const vh =
				window.innerHeight || document.documentElement.clientHeight || rect.bottom + halfH;
			let centerTargetX = null;
			let centerTargetY = null;
			let k = SPIDER_TUNE.move.spring_k;
			let damping = SPIDER_TUNE.move.damping;
			const nowMs = performance.now();
			const cX = rect.left + halfW;
			const cY = rect.top + halfH;
			if (rushActive) {
				centerTargetX = crumbX;
				centerTargetY = crumbY;
				k = SPIDER_TUNE.rush.k;
				damping = SPIDER_TUNE.rush.damping;
				const d = Math.hypot(centerTargetX - cX, centerTargetY - cY);
				if (nibbleUntil === 0 && d < Math.max(halfW, SPIDER_TUNE.rush.arrival_radius_px)) {
					nibbleUntil = performance.now() + SPIDER_TUNE.rush.nibble_ms;
				}
				if (nibbleUntil && performance.now() > nibbleUntil) {
					nibbleUntil = 0;
					rushActive = false;
					if (crumbEl) {
						crumbEl.style.opacity = '0';
						setTimeout(() => crumbEl && crumbEl.remove(), 350);
						crumbEl = null;
					}
				}
			} else if (summonActive) {
				k = SPIDER_TUNE.summon.scurry_k;
				damping = SPIDER_TUNE.summon.scurry_damping;
				if (summonPhase === 'to') {
					centerTargetX = summonX;
					centerTargetY = summonY;
					const d = Math.hypot(centerTargetX - cX, centerTargetY - cY);
					if (d < Math.max(halfW, SPIDER_TUNE.summon.arrival_radius_px)) {
						summonPhase = 'peek';
						summonLingerUntil = performance.now() + SPIDER_TUNE.summon.linger_ms;
					}
				} else if (summonPhase === 'peek') {
					centerTargetX = summonX;
					centerTargetY = summonY;
					if (performance.now() > summonLingerUntil) {
						summonPhase = 'return';
					}
				} else if (summonPhase === 'return') {
					centerTargetX = summonOriginX;
					centerTargetY = summonOriginY;
					const d = Math.hypot(centerTargetX - cX, centerTargetY - cY);
					if (d < Math.max(halfW, SPIDER_TUNE.summon.arrival_radius_px)) {
						summonActive = false;
						summonPhase = 'idle';
					}
				}
			} else if (followActive) {
				k = SPIDER_TUNE.follow.spring_k;
				damping = SPIDER_TUNE.follow.damping;
				const orbitBase = rect.width * 0.85;
				const clearance = Math.max(20, fingerRadiusPx + halfW, orbitBase);
				const sinceMove = lastPointerMoveTS ? nowMs - lastPointerMoveTS : 9999;
				let targetR = clearance;
				if (sinceMove < SPIDER_TUNE.follow.orbit_expand_ms) {
					targetR = Math.max(targetR, orbitBase * 1.35);
				} else if (sinceMove > SPIDER_TUNE.follow.orbit_shrink_ms) {
					targetR = Math.max(clearance, orbitBase * 0.95);
				}
				if (orbitRAnim == null) orbitRAnim = targetR;
				orbitRAnim += (targetR - orbitRAnim) * SPIDER_TUNE.follow.orbit_ease;
				// hesitation on sharp direction changes
				const vMag = Math.hypot(pointerVelX, pointerVelY);
				if (vMag >= SPIDER_TUNE.follow.direction_change_min_speed_px) {
					const curDirX = pointerVelX / vMag;
					const curDirY = pointerVelY / vMag;
					if (prevVelDirX !== 0 || prevVelDirY !== 0) {
						const dot = curDirX * prevVelDirX + curDirY * prevVelDirY;
						const clamped = Math.max(-1, Math.min(1, dot));
						const angleDeg = Math.acos(clamped) * (180 / Math.PI);
						if (angleDeg >= SPIDER_TUNE.follow.direction_change_angle_deg) {
							followHoldUntil = nowMs + SPIDER_TUNE.follow.direction_change_hold_ms;
						}
					}
					prevVelDirX = curDirX;
					prevVelDirY = curDirY;
				}
				const holding = nowMs < followHoldUntil;
				// direction of travel: use pointer velocity when moving, else point away from finger
				let dirX = pointerVelX;
				let dirY = pointerVelY;
				if (Math.hypot(dirX, dirY) < SPIDER_TUNE.follow.pointer_vel_min_px) {
					dirX = cX - pointerX;
					dirY = cY - pointerY;
				}
				const len = Math.hypot(dirX, dirY) || 1;
				dirX /= len;
				dirY /= len;
				const still = sinceMove > SPIDER_TUNE.follow.orbit_shrink_ms;
				const swirlFactor = still
					? SPIDER_TUNE.follow.swirl_when_still_factor
					: SPIDER_TUNE.follow.swirl_factor;
				const swirlX = Math.cos(t * 1.6) * orbitRAnim * swirlFactor;
				const swirlY = Math.sin(t * 1.6) * orbitRAnim * swirlFactor;
				const wanderX = still ? posX * SPIDER_TUNE.follow.wander_when_still_factor : 0;
				const wanderY = still ? posY * SPIDER_TUNE.follow.wander_when_still_factor : 0;
				if (holding) {
					centerTargetX = cX; // brief hesitation
					centerTargetY = cY;
				} else {
					centerTargetX = pointerX - dirX * clearance + swirlX + wanderX;
					centerTargetY = pointerY - dirY * clearance + swirlY + wanderY;
				}
			} else if (peekActive) {
				k = SPIDER_TUNE.peek.scurry_k;
				damping = SPIDER_TUNE.peek.scurry_damping;
				if (peekPhase === 'to') {
					centerTargetX = peekTargetX;
					centerTargetY = peekTargetY;
					const d = Math.hypot(centerTargetX - cX, centerTargetY - cY);
					if (d < Math.max(halfW, SPIDER_TUNE.peek.arrival_radius_px)) {
						peekPhase = 'peek';
						peekLingerUntil = performance.now() + SPIDER_TUNE.peek.duration_ms;
					}
				} else if (peekPhase === 'peek') {
					centerTargetX = peekTargetX;
					centerTargetY = peekTargetY;
					if (performance.now() > peekLingerUntil) {
						peekPhase = 'return';
					}
				} else if (peekPhase === 'return') {
					centerTargetX = peekOriginX;
					centerTargetY = peekOriginY;
					const d = Math.hypot(centerTargetX - cX, centerTargetY - cY);
					if (d < Math.max(halfW, SPIDER_TUNE.peek.arrival_radius_px)) {
						peekActive = false;
						peekPhase = 'idle';
						schedulePeek();
					}
				}
			} else if (settleActive) {
				k = SPIDER_TUNE.settle.scurry_k;
				damping = SPIDER_TUNE.settle.scurry_damping;
				centerTargetX = settleTargetX;
				centerTargetY = settleTargetY;
				const d = Math.hypot(centerTargetX - cX, centerTargetY - cY);
				if (d < Math.max(halfW, SPIDER_TUNE.settle.arrival_radius_px)) {
					settleActive = false;
				}
			}

			if (centerTargetX != null && centerTargetY != null) {
				const targetRight = Math.max(4, vw - centerTargetX - halfW);
				const targetBottom = Math.max(4, vh - centerTargetY - halfH);
				if (anchorRightPx == null || anchorBottomPx == null) {
					anchorRightPx = targetRight;
					anchorBottomPx = targetBottom;
					velRight = 0;
					velBottom = 0;
				} else {
					const accR = (targetRight - anchorRightPx) * k;
					const accB = (targetBottom - anchorBottomPx) * k;
					velRight = velRight * damping + accR;
					velBottom = velBottom * damping + accB;
					const maxStep = SPIDER_TUNE.move.max_px_per_second * dt;
					if (velRight > maxStep) velRight = maxStep;
					else if (velRight < -maxStep) velRight = -maxStep;
					if (velBottom > maxStep) velBottom = maxStep;
					else if (velBottom < -maxStep) velBottom = -maxStep;
					anchorRightPx += velRight;
					anchorBottomPx += velBottom;
				}
				spider.style.right = Math.round(anchorRightPx) + 'px';
				spider.style.bottom = Math.round(anchorBottomPx) + 'px';
			}
		} else if (anchorRightPx != null || anchorBottomPx != null) {
			// Reset to CSS-defined anchor when not following
			anchorRightPx = null;
			anchorBottomPx = null;
			spider.style.right = '';
			spider.style.bottom = '';
		}
		// orientation from motion vector
		// compute world movement based on center delta to face actual travel direction
		const rectNow = spider.getBoundingClientRect();
		const centerX = rectNow.left + rectNow.width * 0.5;
		const centerY = rectNow.top + rectNow.height * 0.5;
		// draw subtle trail while dragging
		if (trailActive && dragging && prevCenterX != null && prevCenterY != null) {
			drawTrail(
				prevCenterX,
				prevCenterY,
				centerX,
				centerY,
				Math.max(1, rectNow.width * SPIDER_TUNE.trail.width_factor)
			);
		}
		let mvX = targetX - posX;
		let mvY = targetY - posY;
		if (
			prevCenterX != null &&
			prevCenterY != null &&
			(followActive || rushActive || summonActive || peekActive)
		) {
			mvX = centerX - prevCenterX;
			mvY = centerY - prevCenterY;
		}
		const angleTarget = Math.atan2(mvY, mvX) * (180 / Math.PI);
		// subtle side-to-side walking tilt, scaled by movement magnitude
		const moveMag = Math.hypot(mvX, mvY);
		const ampScale = Math.min(1, moveMag / 4);
		const walkOsc = Math.sin(t * params.walkRate) * params.walkAmp * ampScale; // degrees
		// default SVG faces downward at 0deg; subtract 90deg so head leads direction
		const headingOffset = -90;
		const angleWithWalk = angleTarget + headingOffset + walkOsc;
		rot += (angleWithWalk - rot) * params.rotDamping;
		const anchorDriven = followActive || rushActive || summonActive || peekActive;
		const transformX = anchorDriven ? 0 : Math.round(posX);
		const transformY = anchorDriven ? 0 : Math.round(posY);
		spider.style.transform = `translate(${transformX}px, ${transformY}px)`;
		if (svgEl) svgEl.style.setProperty('--spider-rotate', `${Math.round(rot)}deg`);
		prevCenterX = centerX;
		prevCenterY = centerY;
		scuttleRAF = requestAnimationFrame(stepScuttle);
	}

	const apply = () => {
		spider.style.setProperty('--spider-scale', String(scale));
		const extra = 16 * (scale - 1);
		const inset = Math.max(0, Math.round(extra * 0.5));
		spider.style.setProperty('--spider-inset', inset + 'px');
		const msgOffset = Math.round(6 + Math.min(12, extra * 0.25));
		spider.style.setProperty('--spider-msg-offset', msgOffset + 'px');
		if (msgEl) msgEl.textContent = messages[clickCount % messages.length];
		pickParams();
	};

	const stopDecay = () => {
		if (decayTimeout) {
			clearTimeout(decayTimeout);
			decayTimeout = null;
		}
		if (decayInterval) {
			clearInterval(decayInterval);
			decayInterval = null;
		}
	};

	const startDecay = () => {
		stopDecay();
		decayInterval = setInterval(() => {
			if (scale <= 1) {
				scale = 1;
				apply();
				stopDecay();
				return;
			}
			scale = Math.max(1, +(scale - DECAY_STEP).toFixed(3));
			apply();
		}, DECAY_INTERVAL_MS);
	};

	const grow = () => {
		if (!spider.classList.contains('active')) {
			spider.classList.add('active');
			// First activation: start larger
			scale = 2.0;
			clickCount = 0;
		} else {
			// Subsequent taps: grow steadily
			scale += 0.25;
			clickCount += 1;
		}
		apply();

		// Show message on tap/click; will be hidden on actual drag movement
		spider.classList.add('message-visible');
		if (messageTimer) clearTimeout(messageTimer);
		messageTimer = setTimeout(() => {
			spider.classList.remove('message-visible');
		}, DECAY_DELAY_MS);

		// Reset and schedule decay after message phase
		stopDecay();
		if (!decayPaused) {
			decayTimeout = setTimeout(startDecay, DECAY_DELAY_MS);
		}
	};

	spider.addEventListener('pointerdown', (ev) => {
		ev.preventDefault();
		ev.stopPropagation();
		// Double-tap treats: detect quick consecutive taps near same location
		const nowTs = performance.now();
		const isQuickTap =
			nowTs - lastTapTS < 280 &&
			Math.hypot(ev.clientX - lastTapX, ev.clientY - lastTapY) < 25;
		lastTapTS = nowTs;
		lastTapX = ev.clientX;
		lastTapY = ev.clientY;
		if (isQuickTap) {
			fingerRadiusPx = SPIDER_TUNE.fingers.touch_px;
			crumbX = ev.clientX;
			crumbY = ev.clientY;
			createCrumbAt(crumbX, crumbY);
			rushActive = true;
			followActive = false;
			dragging = false;
			grow();
			return; // do not start dragging on double-tap
		}
		dragging = true;
		blockPageScroll();
		spider.classList.add('dragging');
		pointerId = ev.pointerId;
		pointerX = ev.clientX;
		pointerY = ev.clientY;
		fingerRadiusPx = SPIDER_TUNE.fingers.touch_px;
		pointerPrevX = pointerX;
		pointerPrevY = pointerY;
		pointerVelX = 0;
		pointerVelY = 0;
		followHoldUntil = 0;
		prevVelDirX = 0;
		prevVelDirY = 0;
		velRight = 0;
		velBottom = 0;
		followActive = false; // enable on move
		decayPaused = true;
		stopDecay();
		try {
			spider.setPointerCapture(pointerId);
		} catch {}
		grow();
		showTrail();
	});

	spider.addEventListener('pointermove', (ev) => {
		if (!dragging) return;
		const nowMove = performance.now();
		const dx = ev.clientX - pointerX;
		const dy = ev.clientY - pointerY;
		pointerPrevX = pointerX;
		pointerPrevY = pointerY;
		pointerX = ev.clientX;
		pointerY = ev.clientY;
		pointerVelX = dx;
		pointerVelY = dy;
		followActive = true;
		lastPointerMoveTS = nowMove;

		// Hide the message while dragging
		if (spider.classList.contains('message-visible')) {
			if (messageTimer) clearTimeout(messageTimer);
			messageTimer = null;
			spider.classList.remove('message-visible');
		}
	});

	spider.addEventListener('pointerup', (ev) => {
		if (ev.pointerId !== pointerId) return;
		dragging = false;
		unblockPageScroll();
		spider.classList.remove('dragging');
		followActive = false;
		decayPaused = false;
		try {
			spider.releasePointerCapture(pointerId);
		} catch {}
		// resume decay scheduling after drag ends
		if (scale > 1) {
			stopDecay();
			decayTimeout = setTimeout(startDecay, DECAY_DELAY_MS);
		}
		// schedule message fade after release
		if (spider.classList.contains('message-visible')) {
			if (messageTimer) clearTimeout(messageTimer);
			messageTimer = setTimeout(() => {
				spider.classList.remove('message-visible');
			}, DECAY_DELAY_MS);
		}
		pointerVelX = 0;
		pointerVelY = 0;
		// scurry to home (CSS anchor) after release
		const rect = spider.getBoundingClientRect();
		const halfW = rect.width * 0.5;
		const halfH = rect.height * 0.5;
		const vw = window.innerWidth || document.documentElement.clientWidth || rect.right + halfW;
		const vh =
			window.innerHeight || document.documentElement.clientHeight || rect.bottom + halfH;
		const insetStr = getComputedStyle(spider).getPropertyValue('--spider-inset') || '0px';
		const insetPx = parseFloat(insetStr) || 0;
		settleTargetX = vw - insetPx - halfW;
		settleTargetY = vh - insetPx - halfH;
		settleActive = true;
		velRight = 0;
		velBottom = 0;
		followHoldUntil = 0;
		prevVelDirX = 0;
		prevVelDirY = 0;
		hideTrail();
	});

	spider.addEventListener('pointercancel', () => {
		dragging = false;
		unblockPageScroll();
		spider.classList.remove('dragging');
		followActive = false;
		decayPaused = false;
		if (scale > 1) {
			stopDecay();
			decayTimeout = setTimeout(startDecay, DECAY_DELAY_MS);
		}
		if (spider.classList.contains('message-visible')) {
			if (messageTimer) clearTimeout(messageTimer);
			messageTimer = setTimeout(() => {
				spider.classList.remove('message-visible');
			}, DECAY_DELAY_MS);
		}
		pointerVelX = 0;
		pointerVelY = 0;
		// scurry to home if interaction cancels
		const rect = spider.getBoundingClientRect();
		const halfW = rect.width * 0.5;
		const halfH = rect.height * 0.5;
		const vw = window.innerWidth || document.documentElement.clientWidth || rect.right + halfW;
		const vh =
			window.innerHeight || document.documentElement.clientHeight || rect.bottom + halfH;
		const insetStr = getComputedStyle(spider).getPropertyValue('--spider-inset') || '0px';
		const insetPx = parseFloat(insetStr) || 0;
		settleTargetX = vw - insetPx - halfW;
		settleTargetY = vh - insetPx - halfH;
		settleActive = true;
		velRight = 0;
		velBottom = 0;
		followHoldUntil = 0;
		prevVelDirX = 0;
		prevVelDirY = 0;
		hideTrail();
	});

	spider.addEventListener('keydown', (ev) => {
		if (ev.key === 'Enter' || ev.key === ' ') {
			ev.preventDefault();
			grow();
		}
	});

	// Tap-to-summon disabled: do not move spider on document taps
	document.addEventListener('pointerdown', () => {});

	// Release global scroll block when touch interaction ends outside the spider
	document.addEventListener('pointerup', () => {
		if (touchMoveBlockerActive && !dragging) unblockPageScroll();
	});
	document.addEventListener('pointercancel', () => {
		if (touchMoveBlockerActive) unblockPageScroll();
	});

	window.addEventListener('resize', resizeTrailCanvas);

	// Start scuttle (deferred until stored visibility resolves)
	function startSpiderLoops() {
		prevTime = 0;
		pickParams();
		if (!spiderHidden) {
			scuttleRAF = requestAnimationFrame(stepScuttle);
			schedulePeek();
		}
	}
	const storageApi =
		typeof browser !== 'undefined' && browser.storage
			? browser.storage
			: typeof chrome !== 'undefined' && chrome.storage
			? chrome.storage
			: null;
	const storageLocal = storageApi ? storageApi.local : null;
	if (storageLocal && typeof storageLocal.get === 'function' && storageLocal.get.length === 1) {
		storageLocal
			.get({ hideEasterEggSpider: defaultSettings.hideEasterEggSpider })
			.then((items) => {
				if (items && typeof items.hideEasterEggSpider !== 'undefined') {
					spiderHidden = !!items.hideEasterEggSpider;
					if (spiderHidden) spider.style.display = 'none';
				}
				startSpiderLoops();
			})
			.catch(() => startSpiderLoops());
	} else if (storageLocal && typeof storageLocal.get === 'function') {
		storageLocal.get({ hideEasterEggSpider: defaultSettings.hideEasterEggSpider }, (items) => {
			if (items && typeof items.hideEasterEggSpider !== 'undefined') {
				spiderHidden = !!items.hideEasterEggSpider;
				if (spiderHidden) spider.style.display = 'none';
			}
			startSpiderLoops();
		});
	} else {
		startSpiderLoops();
	}
});
