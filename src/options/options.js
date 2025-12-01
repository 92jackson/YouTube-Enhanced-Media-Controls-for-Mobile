// Settings are loaded from user-settings.js which creates window.userSettings

// Global version variable - will be updated by loadVersionNumber()
let currentVersion = '0.0.0';

let statusTimeout = null;
let searchTimeout = null;

// Option Dependency Manager - handles parent/child option relationships
class OptionDependencyManager {
	constructor() {
		this.dependencies = new Map();
		this.behaviors = {
			disable: this.applyDisabledState.bind(this),
			hide: this.applyHiddenState.bind(this),
			'disable-inputs': this.applyDisabledInputsState.bind(this),
		};
		this.defaultBehavior = 'disable';
		this.init();
	}

	init() {
		console.log('DependencyManager: Initializing...');

		// Scan for all dependency relationships
		const dependentElements = document.querySelectorAll('[data-parent]');
		console.log('DependencyManager: Found', dependentElements.length, 'dependent elements');

		document.querySelectorAll('[data-parent]').forEach((child) => {
			console.log(
				'DependencyManager: Registering dependency for',
				child.id,
				'parent:',
				child.dataset.parent
			);
			this.registerDependency(child);
		});

		// Set up event listeners for parent elements
		document.querySelectorAll('[data-controls], [id]').forEach((element) => {
			if (this.isParentElement(element)) {
				console.log(
					'DependencyManager: Setting up listener for parent element:',
					element.id
				);
				element.addEventListener('change', () => this.updateDependencies());
			}
		});

		console.log('DependencyManager: Dependencies registered:', this.dependencies.size);
		this.updateDependencies();
	}

	isParentElement(element) {
		const id = element.id;
		if (!id) return false;

		// Check if any element depends on this element
		const selectors = [`[data-parent="${id}"]`];
		for (let i = 1; i <= 9; i++) {
			selectors.push(`[data-parent-${i}="${id}"]`);
		}
		return document.querySelectorAll(selectors.join(', ')).length > 0;
	}

	registerDependency(child) {
		const parentId = child.getAttribute('data-parent') || child.dataset.parent;
		let expectedValue = child.getAttribute('data-parent-value') || child.dataset.parentValue;
		let condition =
			child.getAttribute('data-parent-condition') ||
			child.dataset.parentCondition ||
			'equals';

		if (expectedValue && expectedValue.startsWith('!')) {
			condition = 'not-equals';
			expectedValue = expectedValue.substring(1);
		}

		if (!this.dependencies.has(parentId)) {
			this.dependencies.set(parentId, []);
		}

		this.dependencies.get(parentId).push({
			element: child,
			expectedValue,
			condition,
			complexConditions: this.parseComplexConditions(child),
		});
	}

	parseComplexConditions(element) {
		const conditions = [];
		for (let i = 1; i <= 9; i++) {
			const parentAttr = element.getAttribute(`data-parent-${i}`);
			if (parentAttr) {
				let expectedValue = element.getAttribute(`data-parent-${i}-value`);
				let condition = element.getAttribute(`data-parent-${i}-condition`) || 'equals';
				if (expectedValue && expectedValue.startsWith('!')) {
					condition = 'not-equals';
					expectedValue = expectedValue.substring(1);
				}
				conditions.push({ parentId: parentAttr, expectedValue, condition });
			}
		}
		const legacy2 = element.getAttribute('data-parent-2');
		if (legacy2 && !conditions.find((c) => c.parentId === legacy2)) {
			let expectedValue = element.getAttribute('data-parent-2-value');
			let condition = element.getAttribute('data-parent-2-condition') || 'equals';
			if (expectedValue && expectedValue.startsWith('!')) {
				condition = 'not-equals';
				expectedValue = expectedValue.substring(1);
			}
			conditions.push({ parentId: legacy2, expectedValue, condition });
		}
		const legacy3 = element.getAttribute('data-parent-3');
		if (legacy3 && !conditions.find((c) => c.parentId === legacy3)) {
			let expectedValue = element.getAttribute('data-parent-3-value');
			let condition = element.getAttribute('data-parent-3-condition') || 'equals';
			if (expectedValue && expectedValue.startsWith('!')) {
				condition = 'not-equals';
				expectedValue = expectedValue.substring(1);
			}
			conditions.push({ parentId: legacy3, expectedValue, condition });
		}
		return conditions;
	}

	updateDependencies() {
		console.log(
			'DependencyManager: Updating dependencies for',
			this.dependencies.size,
			'parents'
		);
		this.dependencies.forEach((deps, parentId) => {
			const parent = document.getElementById(parentId);
			console.log('DependencyManager: Processing parent:', parentId, 'found:', !!parent);
			if (!parent) return;

			deps.forEach((dep) => {
				console.log(
					'DependencyManager: Evaluating dependency for element:',
					dep.element.id
				);
				const shouldEnable = this.evaluateDependency(dep, parent);
				console.log('DependencyManager: Should enable', dep.element.id, ':', shouldEnable);
				this.toggleElement(dep.element, shouldEnable);
			});
		});
	}

	evaluateDependency(dep, parent) {
		const parentValue = this.getElementValue(parent);
		const { expectedValue, condition, complexConditions } = dep;
		const combineMode = (dep.element.dataset.parentCombine || 'all').toLowerCase();

		// Debug logging
		console.log('Evaluating dependency:', {
			parentId: parent.id,
			parentValue,
			expectedValue,
			condition,
			shouldEnable: this.evaluateSingleCondition(parentValue, expectedValue, condition),
		});

		// Handle complex conditions (multiple parents)
		if (complexConditions.length > 0) {
			const mainCondition = this.evaluateSingleCondition(
				parentValue,
				expectedValue,
				condition
			);
			const complexResults = complexConditions.map((cond) => {
				const complexParent = document.getElementById(cond.parentId);
				if (!complexParent) return false;
				const complexValue = this.getElementValue(complexParent);
				return this.evaluateSingleCondition(
					complexValue,
					cond.expectedValue,
					cond.condition
				);
			});
			const results = [mainCondition, ...complexResults];
			const finalResult =
				combineMode === 'any'
					? results.some((r) => r === true)
					: results.every((r) => r === true);
			return finalResult;
		}

		// Simple single parent condition
		return this.evaluateSingleCondition(parentValue, expectedValue, condition);
	}

	evaluateSingleCondition(parentValue, expectedValue, condition) {
		console.log('evaluateSingleCondition:', {
			parentValue,
			expectedValue,
			condition,
			types: { parent: typeof parentValue, expected: typeof expectedValue },
		});

		// Normalize values for comparison
		let normalizedParent = parentValue;
		let normalizedExpected = expectedValue;

		// Convert string "true"/"false" to boolean if parentValue is boolean
		if (typeof parentValue === 'boolean' && typeof expectedValue === 'string') {
			if (expectedValue === 'true') normalizedExpected = true;
			else if (expectedValue === 'false') normalizedExpected = false;
		}
		// Convert boolean to string if parentValue is string
		else if (typeof parentValue === 'string' && typeof expectedValue === 'boolean') {
			if (parentValue === 'true') normalizedParent = true;
			else if (parentValue === 'false') normalizedParent = false;
		}

		console.log('Normalized values:', { normalizedParent, normalizedExpected });

		switch (condition) {
			case 'equals':
				const result = normalizedParent == normalizedExpected;
				console.log('equals comparison result:', result);
				return result;
			case 'not-equals':
				return normalizedParent != normalizedExpected;
			case 'greater-than':
				return parseFloat(normalizedParent) > parseFloat(normalizedExpected);
			case 'less-than':
				return parseFloat(normalizedParent) < parseFloat(normalizedExpected);
			case 'contains':
				return String(normalizedParent).includes(String(normalizedExpected));
			case 'starts-with':
				return String(normalizedParent).startsWith(String(normalizedExpected));
			case 'not-starts-with':
				return !String(normalizedParent).startsWith(String(normalizedExpected));
			default:
				return true;
		}
	}

	getElementValue(element) {
		if (element.type === 'checkbox') {
			const value = element.checked;
			console.log('getElementValue for checkbox', element.id, ':', value);
			return value;
		}
		const value = element.value;
		console.log('getElementValue for', element.id, ':', value);
		return value;
	}

	toggleElement(element, shouldEnable) {
		const behavior = element.dataset.behavior || this.defaultBehavior;
		const behaviorHandler = this.behaviors[behavior] || this.behaviors[this.defaultBehavior];

		behaviorHandler(element, shouldEnable);
	}

	applyDisabledState(element, shouldEnable) {
		element.classList.toggle('disabled-group', !shouldEnable);
		element.querySelectorAll('input, select, textarea, button, fieldset').forEach((control) => {
			const parentFieldset = control.closest('fieldset');
			if (!(parentFieldset && parentFieldset.disabled && control !== parentFieldset)) {
				control.disabled = !shouldEnable;
			}
		});
		element.classList.remove('hidden');
	}

	applyHiddenState(element, shouldEnable) {
		if (shouldEnable) element.classList.remove('hidden');
		else element.classList.add('hidden');
		element.querySelectorAll('input, select, textarea, button').forEach((control) => {
			control.disabled = !shouldEnable;
		});
	}

	applyDisabledInputsState(element, shouldEnable) {
		// Only disable inputs, don't change visual appearance
		element.querySelectorAll('input, select').forEach((control) => {
			control.disabled = !shouldEnable;
		});
	}
}

// Initialize dependency manager
let dependencyManager = null;

// Search functionality
function setupSearch() {
	const searchToggle = document.getElementById('search-toggle');
	const searchOverlay = document.getElementById('search-overlay');
	const searchInput = document.getElementById('search-input-expanded');
	const clearButton = document.getElementById('clear-search-expanded');

	console.log('Search elements found:', {
		searchToggle,
		searchOverlay,
		searchInput,
		clearButton,
	});

	if (!searchToggle || !searchOverlay || !searchInput || !clearButton) return;

	console.log('Search setup completed');

	let isSearchExpanded = false;

	// Toggle search expansion
	function toggleSearch() {
		isSearchExpanded = !isSearchExpanded;
		if (isSearchExpanded) {
			searchOverlay.classList.add('active');
			searchInput.focus();
		} else {
			searchOverlay.classList.remove('active');
			searchInput.value = '';
			clearSearch();
		}
	}

	// Search function
	function performSearch() {
		const searchTerm = searchInput.value.toLowerCase().trim();

		if (!searchTerm) {
			// Clear search - show all elements
			clearSearch();
			return;
		}

		// Hide all elements first
		hideAllElements();

		// Find matching elements
		const matchingElements = findMatchingElements(searchTerm);

		// Show matching elements and their required containers
		showMatchingElements(matchingElements);

		// Hide empty sections/cards
		hideEmptySections();

		// Show/hide no results message
		const noResultsMessage = document.getElementById('no-results-message');
		const mainContent = document.querySelector('main');

		if (matchingElements.length === 0) {
			if (noResultsMessage) showElement(noResultsMessage);
			if (mainContent) hideElement(mainContent);
		} else {
			if (noResultsMessage) hideElement(noResultsMessage);
			if (mainContent) showElement(mainContent);
		}
	}

	// Event listeners
	searchToggle.addEventListener('click', toggleSearch);

	// Debounced search
	searchInput.addEventListener('input', () => {
		clearTimeout(searchTimeout);
		searchTimeout = setTimeout(performSearch, 300);
	});

	// Clear search and collapse
	clearButton.addEventListener('click', (e) => {
		e.preventDefault();
		e.stopPropagation();
		searchInput.value = '';

		clearSearch();
		// Collapse the search after clearing
		toggleSearch();
	});

	// Escape key to close search
	searchInput.addEventListener('keydown', (e) => {
		if (e.key === 'Escape') {
			toggleSearch();
		}
	});

	// Close search when clicking outside (only if search is empty)
	document.addEventListener('click', (e) => {
		if (
			isSearchExpanded &&
			!searchOverlay.contains(e.target) &&
			!searchToggle.contains(e.target) &&
			!searchInput.value.trim()
		) {
			toggleSearch();
		}
	});
}

function hideAllElements() {
	// Hide all setting items, fieldsets, and cards
	document.querySelectorAll('.setting-item, fieldset, .card').forEach((element) => {
		hideElement(element);
	});
}

function findMatchingElements(searchTerm) {
	const matchingElements = [];
	const lowerSearchTerm = searchTerm.toLowerCase();

	// Clear previous highlights first
	clearHighlights();

	// Search through all setting items
	document.querySelectorAll('.setting-item').forEach((item) => {
		// Get all text content from this item and its children
		const fullText = item.textContent.toLowerCase();

		if (fullText.includes(lowerSearchTerm)) {
			matchingElements.push(item);
			// Add highlights to all text elements within this item
			const textElements = item.querySelectorAll(
				'.toggle-label-main, label, .toggle-label-description, .description, li'
			);
			textElements.forEach((element) => {
				highlightText(element, searchTerm);
			});
		}
	});

	console.log('Total matches found:', matchingElements.length);

	return matchingElements;
}

function showMatchingElements(matchingElements) {
	// First, show all matching elements and their containers
	matchingElements.forEach((element) => {
		showElement(element);

		// Show its parent fieldset if it has one
		const fieldset = element.closest('fieldset');
		if (fieldset) showElement(fieldset);

		// Show the parent card
		const card = element.closest('.card');
		if (card) showElement(card);
	});

	// Then, hide non-matching settings within cards that contain matches
	const cardsWithMatches = new Set();
	matchingElements.forEach((element) => {
		const card = element.closest('.card');
		if (card) {
			cardsWithMatches.add(card);
		}
	});

	cardsWithMatches.forEach((card) => {
		// Hide setting items that don't contain the search term
		const allSettings = card.querySelectorAll('.setting-item');
		allSettings.forEach((setting) => {
			if (!matchingElements.includes(setting)) hideElement(setting);
		});
	});
}

function hideEmptySections() {
	// Hide cards that have no visible setting items
	document.querySelectorAll('.card').forEach((card) => {
		const visibleItems = card.querySelectorAll('.setting-item:not(.hidden)');
		const visibleFieldsets = card.querySelectorAll('fieldset:not(.hidden)');

		if (visibleItems.length === 0 && visibleFieldsets.length === 0) hideElement(card);
	});
}

function clearSearch() {
	// Show all elements
	document.querySelectorAll('.setting-item, fieldset, .card').forEach((element) => {
		showElement(element);
	});
	// Clear all highlights
	clearHighlights();

	// Hide no results message and show main content
	const noResultsMessage = document.getElementById('no-results-message');
	const mainContent = document.querySelector('main');

	if (noResultsMessage) hideElement(noResultsMessage);
	if (mainContent) showElement(mainContent);
}

function highlightText(element, searchTerm) {
	if (!element || !searchTerm) return;

	const lowerSearchTerm = searchTerm.toLowerCase();

	// Always use text node highlighting to avoid innerHTML
	highlightTextNodes(element, searchTerm);
}

function highlightTextNodes(element, searchTerm) {
	const lowerSearchTerm = searchTerm.toLowerCase();
	// Escape special regex characters and create a pattern that matches the exact phrase
	const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const regex = new RegExp(`(${escapedTerm})`, 'gi');

	const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);

	const textNodes = [];
	let node;

	// Collect all text nodes that contain the search term
	while ((node = walker.nextNode())) {
		if (node.textContent.toLowerCase().includes(lowerSearchTerm)) {
			textNodes.push(node);
		}
	}

	// Process each text node
	textNodes.forEach((textNode) => {
		const text = textNode.textContent;

		// Create a document fragment to hold the new content
		const fragment = document.createDocumentFragment();
		let lastIndex = 0;
		let match;

		// Reset regex for each node
		regex.lastIndex = 0;

		while ((match = regex.exec(text)) !== null) {
			// Add text before match (preserve spaces)
			if (match.index > lastIndex) {
				const beforeText = text.slice(lastIndex, match.index);
				// Replace trailing space with non-breaking space if needed
				if (beforeText.endsWith(' ')) {
					fragment.appendChild(document.createTextNode(beforeText.slice(0, -1)));
					fragment.appendChild(document.createTextNode('\u00A0'));
				} else {
					fragment.appendChild(document.createTextNode(beforeText));
				}
			}

			// Add highlighted match
			const highlightSpan = document.createElement('span');
			highlightSpan.className = 'search-highlight';
			highlightSpan.textContent = match[0];
			fragment.appendChild(highlightSpan);

			lastIndex = regex.lastIndex;
		}

		// Add remaining text (preserve trailing spaces)
		if (lastIndex < text.length) {
			const afterText = text.slice(lastIndex);
			// Replace leading space with non-breaking space if needed
			if (afterText.startsWith(' ')) {
				fragment.appendChild(document.createTextNode('\u00A0'));
				fragment.appendChild(document.createTextNode(afterText.slice(1)));
			} else {
				fragment.appendChild(document.createTextNode(afterText));
			}
		}

		// Replace the original text node
		textNode.parentNode.replaceChild(fragment, textNode);
	});
}

function clearHighlights() {
	// Remove all highlight spans and restore original text
	const highlights = document.querySelectorAll('.search-highlight');

	// Process highlights in reverse order to avoid DOM issues
	for (let i = highlights.length - 1; i >= 0; i--) {
		const highlight = highlights[i];
		const parent = highlight.parentNode;
		if (parent) {
			// Replace highlight with plain text
			parent.replaceChild(document.createTextNode(highlight.textContent), highlight);

			// Normalize adjacent text nodes to prevent space loss
			// This will also merge any non-breaking spaces back to regular spaces
			parent.normalize();
		}
	}
}

// Get the standard thumbnail URL for a given video ID
function getStandardThumbnailUrl(videoId) {
	return videoId ? `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg` : '';
}

function updateControlStates() {
	// This function is now mostly handled by the OptionDependencyManager
	// but we keep it for backward compatibility and any edge cases not yet migrated

	// The new dependency manager handles all the complex conditions automatically
	// via data attributes, so we just need to trigger an update
	if (dependencyManager) {
		dependencyManager.updateDependencies();
	}
}

function save_options() {
	const settingsToSave = {};
	for (const key in window.userSettings) {
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
			} else if (key === 'playlistScrollDebounceDelay') {
				settingsToSave[key] = parseFloat(element.value) || 2.5;
			} else if (key === 'bufferDetectionEventCount') {
				settingsToSave[key] = parseInt(element.value) || 2;
			} else if (key === 'horizontalPlaylistDetailsInHeaderControls') {
				settingsToSave[key] = element.value === 'true';
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

async function restore_options() {
	// Load settings using the helper function
	await window.loadUserSettings();

	// Apply the loaded settings to the UI
	const items = window.userSettings;
	console.log('Applying settings:', items);

	for (const key in items) {
		const element = document.getElementById(key);
		if (element) {
			if (element.type === 'checkbox') {
				element.checked = items[key];
				console.log(
					'Set checkbox',
					key,
					'to',
					items[key],
					'element.checked is now:',
					element.checked
				);
			} else if (key === 'horizontalPlaylistDetailsInHeaderControls') {
				element.value = String(items[key]);
			} else if (key === 'smartPreviousThreshold') {
				element.value = parseInt(items[key]) || 5;
			} else if (key === 'playlistScrollDebounceDelay') {
				element.value = parseFloat(items[key]) || 2.5;
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
		'enableLimitedHeightMode',
		'keepPlaylistFocused',
	]
		.map((id) => document.getElementById(id))
		.filter(Boolean)
		.forEach((el) => el.addEventListener('change', updateControlStates));

	setupInteractiveLabels();
	updateControlStates();
	initMaterialSliders();

	// Notify that settings have been restored
	onSettingsRestored();
}

function setupInteractiveLabels() {
	const items = document.querySelectorAll('.setting-item');
	items.forEach((item) => {
		let input = null;
		const group = item.querySelector('.toggle-label-group[data-target-id]');
		if (group && group.dataset.targetId) {
			input = document.getElementById(group.dataset.targetId);
		}
		if (!input) {
			const labelText = item.querySelector('.toggle-label-main .toggle-label-text[id]');
			if (labelText) {
				input = item.querySelector(`[aria-labelledby="${labelText.id}"]`);
				if (!input) {
					const derivedId = labelText.id.replace(/-label$/, '');
					input = item.querySelector(`#${derivedId}`);
				}
			}
		}
		if (!input) return;
		const mainLabel = item.querySelector('.toggle-label-main');
		if (mainLabel) {
			mainLabel.addEventListener('click', (e) => {
				if (input.type === 'checkbox') {
					input.click();
				} else {
					input.focus();
				}
			});
		}
		if (
			item.classList.contains('toggle-item') &&
			item.classList.contains('toggle-item--full')
		) {
			item.querySelectorAll(
				'.toggle-subrow .toggle-label-description, .toggle-label-group .toggle-label-description'
			).forEach((desc) => {
				desc.addEventListener('click', () => {
					if (input && input.type === 'checkbox') input.click();
				});
			});
		}
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
			showElement(noVideosMessage);
			return;
		}

		hideElement(noVideosMessage);

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
		const isExpanded = !container.classList.contains('hidden');

		if (isExpanded) {
			container.classList.add('hidden');
			header.classList.remove('expanded');
		} else {
			container.classList.remove('hidden');
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
				// Update global version variable
				if (manifest.version) {
					currentVersion = manifest.version;

					// Update UI element
					const versionElement = document.getElementById('version-number');
					if (versionElement) {
						versionElement.textContent = `v${currentVersion}`;
					}
				}
			})
			.catch((error) => {
				console.error('Failed to load version from manifest:', error);
			});
	}
}

document.addEventListener('DOMContentLoaded', async () => {
	loadVersionNumber();

	// Initialize the new dependency manager FIRST
	dependencyManager = new OptionDependencyManager();

	// Now restore options - this will call updateControlStates which uses the dependency manager
	await restore_options();
	loadBlacklistedVideos();
	initClearAllButton();
	initCollapsibleSections();
	initGlobalCollapseButton();
	initSectionLinks();
	initSectionMenu();
	initDonorsSection();
	initNewOptionIndicators();
	initGeneratedBadges();
	setupSearch();
	initChristmasMusicFiltering();
});

function showElement(el) {
	if (el) el.classList.remove('hidden');
}
function hideElement(el) {
	if (el) el.classList.add('hidden');
}
function isHidden(el) {
	return !!el && el.classList.contains('hidden');
}
function toggleHidden(el, shouldHide) {
	if (!el) return;
	if (shouldHide) el.classList.add('hidden');
	else el.classList.remove('hidden');
}

// Function to be called after settings are restored
function onSettingsRestored() {
	if (dependencyManager) {
		console.log('Settings restored, updating dependencies...');
		// Debug: Check current state of enableCustomPlayer
		const enableCustomPlayer = document.getElementById('enableCustomPlayer');
		if (enableCustomPlayer) {
			console.log(
				'enableCustomPlayer checkbox state after restore:',
				enableCustomPlayer.checked
			);
		}
		dependencyManager.updateDependencies();
	}
}

function initDonorsSection() {
	const donorsHeader = document.getElementById('donors-header');
	const donorsList = document.getElementById('donors-list');
	const donorsFooter = document.querySelector('#donors-section .donors-footer');
	const collapseIcon = donorsHeader.querySelector('.collapse-icon');

	if (!donorsHeader || !donorsList || !donorsFooter || !collapseIcon) return;

	donorsHeader.addEventListener('click', async () => {
		const isExpanded = donorsHeader.classList.toggle('expanded');
		if (isExpanded) {
			showElement(donorsList);
			showElement(donorsFooter);
		} else {
			hideElement(donorsList);
			hideElement(donorsFooter);
		}
		collapseIcon.textContent = isExpanded ? '▲' : '▼';

		if (isExpanded) {
			try {
				const response = await fetch(
					'https://gist.githubusercontent.com/92jackson/c1086b472ccd4b521cbb33d0a701befb/raw/Donors.txt'
				);
				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}
				const data = await response.text();
				const preElement = document.createElement('pre');
				preElement.textContent = data;
				donorsList.innerHTML = ''; // Clear existing content
				donorsList.appendChild(preElement);
			} catch (error) {
				console.error('Error fetching donors:', error);
				const pElement = document.createElement('p');
				pElement.textContent = 'Failed to load donors. Please try again later.';
				donorsList.innerHTML = ''; // Clear existing content
				donorsList.appendChild(pElement);
			}
		}
	});
}

function initCollapsibleSections() {
	const cards = Array.from(document.querySelectorAll('.card'));
	cards.forEach((card) => {
		const header = card.querySelector('.card-header');
		const content = card.querySelector('.card-content');
		if (!header || !content) return;

		header.classList.add('collapsible');
		if (!header.querySelector('.collapse-indicator')) {
			const indicator = document.createElement('span');
			indicator.className = 'collapse-indicator';
			header.appendChild(indicator);
		}

		const isVisible = !content.classList.contains('hidden');
		header.classList.toggle('expanded', isVisible);

		header.addEventListener('click', () => {
			const currentlyVisible = !content.classList.contains('hidden');
			if (currentlyVisible) {
				content.classList.add('hidden');
				header.classList.remove('expanded');
			} else {
				content.classList.remove('hidden');
				header.classList.add('expanded');
			}
			updateGlobalCollapseButtonLabel();
		});
	});
}

function updateGlobalCollapseButtonLabel() {
	const btn = document.getElementById('toggle-all-sections');
	if (!btn) return;
	const collapsibleContents = Array.from(document.querySelectorAll('.card'))
		.map((card) => ({
			header: card.querySelector('.card-header.collapsible'),
			content: card.querySelector('.card-content'),
		}))
		.filter((pair) => pair.header && pair.content)
		.map((pair) => pair.content);
	const hasVisible = collapsibleContents.some((c) => !c.classList.contains('hidden'));
	btn.textContent = hasVisible ? 'Collapse All' : 'Expand All';
}

function initGlobalCollapseButton() {
	const btn = document.getElementById('toggle-all-sections');
	if (!btn) return;
	btn.addEventListener('click', () => {
		const collapsiblePairs = Array.from(document.querySelectorAll('.card'))
			.map((card) => ({
				header: card.querySelector('.card-header.collapsible'),
				content: card.querySelector('.card-content'),
			}))
			.filter((pair) => pair.header && pair.content);
		const hasVisible = collapsiblePairs.some(
			(pair) => !pair.content.classList.contains('hidden')
		);
		collapsiblePairs.forEach((pair) => {
			if (hasVisible) {
				pair.content.classList.add('hidden');
				pair.header.classList.remove('expanded');
			} else {
				pair.content.classList.remove('hidden');
				pair.header.classList.add('expanded');
			}
		});
		updateGlobalCollapseButtonLabel();
	});
	updateGlobalCollapseButtonLabel();
}

function initChristmasMusicFiltering() {
	const storageApi = typeof browser !== 'undefined' ? browser.storage : chrome.storage;
	const storageLocal = storageApi ? storageApi.local : null;

	const christmasFilterSelect = document.getElementById('christmasMusicFilter');
	const christmasDateRangeFieldset = document.getElementById('christmas-date-range-fieldset');

	// Get dropdown elements for start date
	const christmasStartDay = document.getElementById('christmasStartDay');
	const christmasStartMonth = document.getElementById('christmasStartMonth');

	// Get dropdown elements for end date
	const christmasEndDay = document.getElementById('christmasEndDay');
	const christmasEndMonth = document.getElementById('christmasEndMonth');

	if (
		!christmasFilterSelect ||
		!christmasDateRangeFieldset ||
		!christmasStartDay ||
		!christmasStartMonth ||
		!christmasEndDay ||
		!christmasEndMonth
	) {
		console.warn('Christmas music filtering elements not found');
		return;
	}

	// Handle filter mode change
	function handleFilterModeChange() {
		const selectedMode = christmasFilterSelect.value;
		const christmasBypassFieldset = document.getElementById(
			'christmas-bypass-options-fieldset'
		);

		toggleHidden(christmasDateRangeFieldset, selectedMode !== 'dates');

		// Show/hide bypass fieldset based on filter mode
		if (christmasBypassFieldset) {
			const shouldHideBypass = selectedMode === 'disabled';
			toggleHidden(christmasBypassFieldset, shouldHideBypass);
		}

		// Save settings
		saveChristmasSettings();
	}

	// Handle date dropdown changes
	function handleDateChange() {
		saveChristmasSettings();
	}

	// Save Christmas settings
	function saveChristmasSettings() {
		// Combine day and month into DD/MM format
		const startDate = `${christmasStartDay.value}/${christmasStartMonth.value}`;
		const endDate = `${christmasEndDay.value}/${christmasEndMonth.value}`;

		const bypassCheckbox = document.getElementById('christmasBypassOnPlaylistTitle');
		const settings = {
			christmasMusicFilter: christmasFilterSelect.value,
			christmasStartDate: startDate,
			christmasEndDate: endDate,
			christmasBypassOnPlaylistTitle: bypassCheckbox ? bypassCheckbox.checked : false,
		};

		if (storageLocal) {
			if (typeof storageLocal.set === 'function' && storageLocal.set.length === 1) {
				storageLocal.set(settings).catch((err) => {
					console.error('Error saving Christmas settings:', err);
				});
			} else {
				storageLocal.set(settings);
			}
		}
	}

	// Load and apply saved settings
	function loadChristmasSettings() {
		const settingsToLoad = [
			'christmasMusicFilter',
			'christmasStartDate',
			'christmasEndDate',
			'christmasBypassOnPlaylistTitle',
		];

		if (storageLocal) {
			if (typeof storageLocal.get === 'function' && storageLocal.get.length === 1) {
				storageLocal
					.get(settingsToLoad)
					.then((items) => {
						if (items.christmasMusicFilter) {
							christmasFilterSelect.value = items.christmasMusicFilter;
						}
						if (items.christmasStartDate) {
							// Parse DD/MM format
							const [day, month] = items.christmasStartDate.split('/');
							if (day && month) {
								christmasStartDay.value = parseInt(day);
								christmasStartMonth.value = parseInt(month);
							}
						}
						if (items.christmasEndDate) {
							// Parse DD/MM format
							const [day, month] = items.christmasEndDate.split('/');
							if (day && month) {
								christmasEndDay.value = parseInt(day);
								christmasEndMonth.value = parseInt(month);
							}
						}
						if (items.christmasBypassOnPlaylistTitle !== undefined) {
							const bypassCheckbox = document.getElementById(
								'christmasBypassOnPlaylistTitle'
							);
							if (bypassCheckbox) {
								bypassCheckbox.checked = items.christmasBypassOnPlaylistTitle;
							}
						}
						handleFilterModeChange();
					})
					.catch((err) => {
						console.error('Error loading Christmas settings:', err);
					});
			} else {
				storageLocal.get(settingsToLoad, (items) => {
					if (items.christmasMusicFilter) {
						christmasFilterSelect.value = items.christmasMusicFilter;
					}
					if (items.christmasStartDate) {
						// Parse DD/MM format
						const [day, month] = items.christmasStartDate.split('/');
						if (day && month) {
							christmasStartDay.value = parseInt(day);
							christmasStartMonth.value = parseInt(month);
						}
					}
					if (items.christmasEndDate) {
						// Parse DD/MM format
						const [day, month] = items.christmasEndDate.split('/');
						if (day && month) {
							christmasEndDay.value = parseInt(day);
							christmasEndMonth.value = parseInt(month);
						}
					}
					if (items.christmasBypassOnPlaylistTitle !== undefined) {
						const bypassCheckbox = document.getElementById(
							'christmasBypassOnPlaylistTitle'
						);
						if (bypassCheckbox) {
							bypassCheckbox.checked = items.christmasBypassOnPlaylistTitle;
						}
					}
					handleFilterModeChange();
				});
			}
		}
	}

	// Add event listeners
	christmasFilterSelect.addEventListener('change', handleFilterModeChange);
	christmasStartDay.addEventListener('change', handleDateChange);
	christmasStartMonth.addEventListener('change', handleDateChange);
	christmasEndDay.addEventListener('change', handleDateChange);
	christmasEndMonth.addEventListener('change', handleDateChange);

	// Add event listener for bypass checkbox
	const christmasBypassCheckbox = document.getElementById('christmasBypassOnPlaylistTitle');
	if (christmasBypassCheckbox) {
		christmasBypassCheckbox.addEventListener('change', saveChristmasSettings);
	}

	// Initialize
	loadChristmasSettings();
}

function initSectionLinks() {
	document
		.querySelectorAll('.section-menu a[href^="#"], .section-links a[href^="#"]')
		.forEach((a) => {
			a.addEventListener('click', (e) => {
				e.preventDefault();
				const id = a.getAttribute('href').slice(1);
				const card = document.getElementById(id);
				if (!card) return;
				const header = card.querySelector('.card-header');
				const content =
					card.querySelector('.card-content') ||
					(card.classList.contains('card-content') ? card : null);
				if (content && header && content.classList.contains('hidden')) {
					content.classList.remove('hidden');
					header.classList.add('expanded');
				}
				closeSectionMenu();
				card.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
			});
		});
}

function initSectionMenu() {
	const btn = document.getElementById('section-menu-button');
	const menu = document.getElementById('section-menu');
	if (!btn || !menu) return;
	const openMenu = () => {
		menu.classList.add('expanded');
		btn.setAttribute('aria-expanded', 'true');
		menu.removeAttribute('hidden');
	};
	const closeMenu = () => {
		menu.classList.remove('expanded');
		btn.removeAttribute('aria-expanded');
		// Only hide after transition
		menu.addEventListener('transitionend', function handler() {
			if (!menu.classList.contains('expanded')) {
				menu.setAttribute('hidden', '');
				menu.removeEventListener('transitionend', handler);
			}
		});
	};
	btn.addEventListener('click', (e) => {
		e.stopPropagation();
		if (menu.classList.contains('expanded')) {
			closeMenu();
		} else {
			openMenu();
		}
	});
	document.addEventListener('pointerdown', (e) => {
		if (menu.classList.contains('expanded')) {
			const within = menu.contains(e.target) || btn.contains(e.target);
			if (!within) closeMenu();
		}
	});
}

function closeSectionMenu() {
	const btn = document.getElementById('section-menu-button');
	const menu = document.getElementById('section-menu');
	if (!btn || !menu) return;
	menu.classList.remove('expanded');
	btn.removeAttribute('aria-expanded');
	// Only hide after transition
	menu.addEventListener('transitionend', function handler() {
		if (!menu.classList.contains('expanded')) {
			menu.setAttribute('hidden', '');
			menu.removeEventListener('transitionend', handler);
		}
	});
}

async function initNewOptionIndicators() {
	const storageApi =
		typeof browser !== 'undefined' && browser.storage
			? browser.storage
			: typeof chrome !== 'undefined' && chrome.storage
			? chrome.storage
			: null;
	const storageLocal = storageApi ? storageApi.local : null;

	const processNewOptions = (items) => {
		const lastVersion = items.lastOptionsVersion || '0.0.0';

		// Find all elements with data-added-version attribute
		const newOptions = document.querySelectorAll('[data-added-version]');
		const newOptionsList = [];

		newOptions.forEach((optionElement) => {
			const addedVersion = optionElement.getAttribute('data-added-version');

			// Compare versions
			if (compareVersions(addedVersion, lastVersion) > 0 || addedVersion === currentVersion) {
				// This option is new, add the badge
				addNewOptionBadge(optionElement);
				newOptionsList.push(optionElement);
			}
		});

		// Show/hide cycle button based on new options
		const cycleButton = document.getElementById('cycle-new-options');
		if (cycleButton) {
			if (newOptionsList.length > 0) {
				cycleButton.classList.remove('hidden');
				setupCycleButton(newOptionsList);
			} else {
				cycleButton.classList.add('hidden');
			}
		}

		// Add scroll listener to update version when user scrolls
		let versionUpdated = false;
		const updateVersion = () => {
			if (versionUpdated) return;
			versionUpdated = true;

			if (storageLocal) {
				const settingsToSave = { lastOptionsVersion: currentVersion };

				if (typeof storageLocal.set === 'function' && storageLocal.set.length === 1) {
					storageLocal.set(settingsToSave).catch((err) => {
						console.error('Enhanced Player: Failed to update version', err);
					});
				} else {
					storageLocal.set(settingsToSave, () => {
						if (chrome.runtime.lastError) {
							console.error(
								'Enhanced Player: Failed to update version',
								chrome.runtime.lastError
							);
						}
					});
				}
			}

			// Only hide cycle button if no new options exist (version is up to date)
			if (cycleButton && newOptionsList.length === 0) {
				cycleButton.classList.add('hidden');
			}

			// Remove scroll listener after updating
			document.removeEventListener('scroll', updateVersion);
		};

		// Update version when user scrolls (indicates they're interacting with the page)
		document.addEventListener('scroll', updateVersion, { once: true });

		return newOptionsList;
	};

	function setupCycleButton(newOptions) {
		const cycleButton = document.getElementById('cycle-new-options');
		let currentIndex = 0;
		let highlightedElement = null;

		cycleButton.addEventListener('click', () => {
			if (newOptions.length === 0) return;

			// Clear previous highlight
			if (highlightedElement) {
				highlightedElement.classList.remove('new-option-highlight');
			}

			// Scroll to the current new option
			newOptions[currentIndex].scrollIntoView({
				behavior: 'smooth',
				block: 'center',
			});

			// Apply highlight effect using CSS transition
			const targetElement = newOptions[currentIndex];

			// Remove previous highlight
			if (highlightedElement && highlightedElement !== targetElement) {
				highlightedElement.classList.remove('new-option-highlight');
			}

			targetElement.classList.add('new-option-highlight');
			highlightedElement = targetElement;

			// Clear the highlight after animation completes
			setTimeout(() => {
				if (highlightedElement === targetElement) {
					highlightedElement.classList.remove('new-option-highlight');
					highlightedElement = null;
				}
			}, 1500);

			// Move to next option, cycle back to first if at end
			currentIndex = (currentIndex + 1) % newOptions.length;
		});
	}

	// Get the stored version
	if (storageLocal) {
		if (typeof storageLocal.get === 'function' && storageLocal.get.length === 1) {
			storageLocal
				.get(['lastOptionsVersion'])
				.then(processNewOptions)
				.catch((err) => {
					console.error('Error loading version info:', err);
					processNewOptions({ lastOptionsVersion: '0.0.0' });
				});
		} else {
			storageLocal.get(['lastOptionsVersion'], processNewOptions);
		}
	} else {
		processNewOptions({ lastOptionsVersion: '0.0.0' });
	}
}

function addNewOptionBadge(optionElement) {
	// Check if badge already exists
	if (optionElement.querySelector('.new-option-badge')) return;

	const badge = document.createElement('span');
	badge.className = 'badge badge--new new-option-badge';
	badge.textContent = 'NEW';

	const labelMain = optionElement.querySelector('.toggle-label-main');
	if (!labelMain) return;
	let badgesContainer = ensureBadgesContainer(labelMain);
	badgesContainer.appendChild(badge);
	labelMain.classList.add('badges-multi');
}

function initGeneratedBadges() {
	const badgeClassByType = {
		fix: 'badge--fix',
		experimental: 'badge--experimental',
		new: 'badge--new',
	};

	const elements = document.querySelectorAll('[data-badges]');
	elements.forEach((host) => {
		const typesRaw = host.getAttribute('data-badges') || '';
		const types = typesRaw.replace(/,/g, ' ').split(/\s+/).filter(Boolean);
		if (types.length === 0) return;
		const labelMain = host.querySelector('.toggle-label-main');
		if (!labelMain) return;
		let badgesContainer = ensureBadgesContainer(labelMain);
		if (types.length > 1) labelMain.classList.add('badges-multi');
		types.forEach((type) => {
			const span = document.createElement('span');
			const cls = badgeClassByType[type.toLowerCase()] || '';
			span.className = `badge ${cls}`.trim();
			span.textContent = type.toUpperCase();
			badgesContainer.appendChild(span);
		});
	});
}

function ensureBadgesContainer(labelMain) {
	let container = labelMain.querySelector('.toggle-label-badges');
	if (!container) {
		container = document.createElement('div');
		container.className = 'toggle-label-badges';
		labelMain.appendChild(container);
	}
	return container;
}

function compareVersions(version1, version2) {
	const v1Parts = version1.split('.').map(Number);
	const v2Parts = version2.split('.').map(Number);

	for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
		const v1Part = v1Parts[i] || 0;
		const v2Part = v2Parts[i] || 0;

		if (v1Part > v2Part) return 1;
		if (v1Part < v2Part) return -1;
	}

	return 0;
}

let lastY = window.scrollY;
window.addEventListener('scroll', () => {
	const currentY = window.scrollY;
	const el = document.querySelector('.options-page');

	if (currentY > lastY) {
		el.classList.add('compact'); // scrolling down
	} else {
		el.classList.remove('compact'); // scrolling up
	}

	lastY = currentY;
});
