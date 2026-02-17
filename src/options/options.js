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

function getNavbarRightActionOptions() {
	return [
		{ value: 'none', label: 'None' },
		{ value: 'play', label: 'Play/Pause' },
		{ value: 'previous', label: 'Previous' },
		{ value: 'restart-then-previous', label: 'Restart then Previous' },
		{ value: 'skip', label: 'Next' },
		{ value: 'seek-back', label: 'Seek Back' },
		{ value: 'seek-forward', label: 'Seek Forward' },
		{ value: 'repeat', label: 'Repeat' },
		{
			value: 'text-search',
			label: 'Text Search (Triggers Native Search, Incompatible with Desktop Site)',
		},
		{ value: 'custom-search', label: 'Text Search Bar' },
		{ value: 'voice-search', label: 'Voice Search' },
		{ value: 'favourites', label: 'Favourites' },
		{ value: 'video-toggle', label: 'Video Toggle' },
		{ value: 'toggle-drawer', label: 'Toggle Drawer' },
		{ value: 'debug-logs', label: 'Debug Logs (Visible when Debug Mode is enabled)' },
	];
}

function getBottomControlsGestureActionOptions() {
	return [
		{ value: 'none', label: 'None' },
		{ value: 'repeat', label: 'Repeat' },
		{ value: 'seek-back', label: 'Seek Back' },
		{ value: 'previous', label: 'Previous' },
		{ value: 'restart-then-previous', label: 'Restart then Previous' },
		{ value: 'play', label: 'Play/Pause' },
		{ value: 'skip', label: 'Next' },
		{ value: 'seek-forward', label: 'Seek Forward' },
		{ value: 'voice-search', label: 'Voice Search' },
		{ value: 'limited-height-fab', label: 'Limited Height Menu' },
		{ value: 'text-search', label: 'Text Search' },
		{ value: 'favourites', label: 'Favourites' },
		{ value: 'video-toggle', label: 'Video Toggle' },
		{ value: 'toggle-drawer', label: 'Toggle Drawer' },
		{ value: 'debug-logs', label: 'Debug Logs' },
	];
}

function populateSelectWithOptions(select, options) {
	if (!select) return;
	const currentValue = select.value;
	while (select.firstChild) {
		select.removeChild(select.firstChild);
	}
	options.forEach((opt) => {
		const option = document.createElement('option');
		option.value = opt.value;
		option.textContent = opt.label;
		select.appendChild(option);
	});
	if (currentValue) {
		select.value = currentValue;
	}
}

function initLegacyBottomControlsGestureSelects() {
	const options = getBottomControlsGestureActionOptions();
	const ids = new Set(BOTTOM_CONTROL_SLOT_SPECS.flatMap((s) => [s.doubleId, s.holdId]));
	ids.forEach((id) => {
		const select = document.getElementById(id);
		if (!select) return;
		if (select.options && select.options.length > 0) return;
		populateSelectWithOptions(select, options);
	});
}

function getNativeControlOptions() {
	return [
		{ value: 'none', label: 'None' },
		{ value: 'repeat', label: 'Repeat' },
		{ value: 'seek-back', label: 'Seek Back' },
		{ value: 'seek-forward', label: 'Seek Forward' },
		{ value: 'restart', label: 'Restart' },
	];
}

function getNativeTopControlOptions() {
	return [
		{ value: 'none', label: 'None' },
		{ value: 'favourites', label: 'Favourites' },
		{ value: 'voice-search', label: 'Voice Search' },
		{ value: 'debug-logs', label: 'Debug Logs' },
	];
}

function readNavbarRightSlotsFromUI() {
	const list = document.getElementById('navbar-right-slots-list');
	if (!list) return null;
	return Array.from(list.querySelectorAll('select[data-navbar-right-slot]')).map(
		(el) => el.value
	);
}

function renderNavbarRightSlots(slots) {
	const list = document.getElementById('navbar-right-slots-list');
	const noSlotsMessage = document.getElementById('no-navbar-right-slots');
	if (!list) return;

	while (list.firstChild) {
		list.removeChild(list.firstChild);
	}

	if (!Array.isArray(slots) || slots.length === 0) {
		showElement(noSlotsMessage);
		return;
	}

	hideElement(noSlotsMessage);

	const options = getNavbarRightActionOptions();
	slots.forEach((actionId, index) => {
		const slotItem = document.createElement('div');
		slotItem.className = 'blacklisted-video-item';

		const slotInfo = document.createElement('div');
		slotInfo.className = 'blacklisted-video-info';

		const slotLabel = document.createElement('div');
		slotLabel.className = 'blacklisted-video-id';
		slotLabel.textContent = `Slot ${index + 1}`;

		const selectWrapper = document.createElement('div');
		selectWrapper.className = 'select-wrapper';

		const select = document.createElement('select');
		select.setAttribute('data-navbar-right-slot', String(index));

		options.forEach((opt) => {
			const option = document.createElement('option');
			option.value = opt.value;
			option.textContent = opt.label;
			select.appendChild(option);
		});

		select.value = typeof actionId === 'string' ? actionId : 'none';

		selectWrapper.appendChild(select);
		slotInfo.appendChild(slotLabel);
		slotInfo.appendChild(selectWrapper);

		const removeButton = document.createElement('button');
		removeButton.className = 'blacklisted-video-remove';
		removeButton.textContent = '✕';
		removeButton.setAttribute('aria-label', `Remove slot ${index + 1}`);
		removeButton.setAttribute('title', `Remove slot ${index + 1}`);
		removeButton.addEventListener('click', () => {
			const current = readNavbarRightSlotsFromUI() || [];
			current.splice(index, 1);
			renderNavbarRightSlots(current);
			save_options();
		});

		slotItem.appendChild(slotInfo);
		slotItem.appendChild(removeButton);
		list.appendChild(slotItem);
	});
}

let navbarRightSlotsEditorInitialized = false;
function initNavbarRightSlotsEditor(slots) {
	const addButton = document.getElementById('add-navbar-right-slot');
	const clearButton = document.getElementById('clear-navbar-right-slots');
	const list = document.getElementById('navbar-right-slots-list');
	if (!list) return;

	if (!navbarRightSlotsEditorInitialized) {
		list.addEventListener('change', (e) => {
			if (e.target && e.target.matches('select[data-navbar-right-slot]')) {
				save_options();
			}
		});
		if (addButton) {
			addButton.addEventListener('click', () => {
				const current = readNavbarRightSlotsFromUI() || [];
				current.push('none');
				renderNavbarRightSlots(current);
				save_options();
			});
		}
		if (clearButton) {
			clearButton.addEventListener('click', () => {
				const confirmed = confirm(
					'Are you sure you want to clear all navbar right controls?'
				);
				if (!confirmed) return;
				renderNavbarRightSlots([]);
				save_options();
			});
		}
		navbarRightSlotsEditorInitialized = true;
	}

	renderNavbarRightSlots(Array.isArray(slots) ? slots : []);
}

function readNativeControlsFromUI() {
	const list = document.getElementById('native-controls-list');
	if (!list) return null;
	return Array.from(list.querySelectorAll('select[data-native-control]')).map((el) => el.value);
}

function renderNativeControls(slots) {
	const list = document.getElementById('native-controls-list');
	const noSlotsMessage = document.getElementById('no-native-controls');
	if (!list) return;

	while (list.firstChild) {
		list.removeChild(list.firstChild);
	}

	if (!Array.isArray(slots) || slots.length === 0) {
		showElement(noSlotsMessage);
		return;
	}

	hideElement(noSlotsMessage);

	const options = getNativeControlOptions();
	slots.forEach((actionId, index) => {
		const slotItem = document.createElement('div');
		slotItem.className = 'blacklisted-video-item';

		const slotInfo = document.createElement('div');
		slotInfo.className = 'blacklisted-video-info';

		const slotLabel = document.createElement('div');
		slotLabel.className = 'blacklisted-video-id';
		slotLabel.textContent = `Control ${index + 1}`;

		const selectWrapper = document.createElement('div');
		selectWrapper.className = 'select-wrapper';

		const select = document.createElement('select');
		select.setAttribute('data-native-control', String(index));

		options.forEach((opt) => {
			const option = document.createElement('option');
			option.value = opt.value;
			option.textContent = opt.label;
			select.appendChild(option);
		});

		select.value = typeof actionId === 'string' ? actionId : 'none';

		selectWrapper.appendChild(select);
		slotInfo.appendChild(slotLabel);
		slotInfo.appendChild(selectWrapper);

		const removeButton = document.createElement('button');
		removeButton.className = 'blacklisted-video-remove';
		removeButton.textContent = '✕';
		removeButton.setAttribute('aria-label', `Remove control ${index + 1}`);
		removeButton.setAttribute('title', `Remove control ${index + 1}`);
		removeButton.addEventListener('click', () => {
			const current = readNativeControlsFromUI() || [];
			current.splice(index, 1);
			renderNativeControls(current);
			save_options();
		});

		slotItem.appendChild(slotInfo);
		slotItem.appendChild(removeButton);
		list.appendChild(slotItem);
	});
}

let nativeControlsEditorInitialized = false;
function initNativeControlsEditor(slots) {
	const addButton = document.getElementById('add-native-control');
	const clearButton = document.getElementById('clear-native-controls');
	const list = document.getElementById('native-controls-list');
	if (!list) return;

	if (!nativeControlsEditorInitialized) {
		list.addEventListener('change', (e) => {
			if (e.target && e.target.matches('select[data-native-control]')) {
				save_options();
			}
		});
		if (addButton) {
			addButton.addEventListener('click', () => {
				const current = readNativeControlsFromUI() || [];
				current.push('none');
				renderNativeControls(current);
				save_options();
			});
		}
		if (clearButton) {
			clearButton.addEventListener('click', () => {
				const confirmed = confirm(
					'Are you sure you want to clear all additional native controls?'
				);
				if (!confirmed) return;
				renderNativeControls([]);
				save_options();
			});
		}
		nativeControlsEditorInitialized = true;
	}

	renderNativeControls(Array.isArray(slots) ? slots : []);
}

function readNativeTopControlsFromUI() {
	const list = document.getElementById('native-top-controls-list');
	if (!list) return null;
	return Array.from(list.querySelectorAll('select[data-native-top-control]')).map(
		(el) => el.value
	);
}

function renderNativeTopControls(slots) {
	const list = document.getElementById('native-top-controls-list');
	const noSlotsMessage = document.getElementById('no-native-top-controls');
	if (!list) return;

	while (list.firstChild) {
		list.removeChild(list.firstChild);
	}

	if (!Array.isArray(slots) || slots.length === 0) {
		showElement(noSlotsMessage);
		return;
	}

	hideElement(noSlotsMessage);

	const options = getNativeTopControlOptions();
	slots.forEach((actionId, index) => {
		const slotItem = document.createElement('div');
		slotItem.className = 'blacklisted-video-item';

		const slotInfo = document.createElement('div');
		slotInfo.className = 'blacklisted-video-info';

		const slotLabel = document.createElement('div');
		slotLabel.className = 'blacklisted-video-id';
		slotLabel.textContent = `Control ${index + 1}`;

		const selectWrapper = document.createElement('div');
		selectWrapper.className = 'select-wrapper';

		const select = document.createElement('select');
		select.setAttribute('data-native-top-control', String(index));

		options.forEach((opt) => {
			const option = document.createElement('option');
			option.value = opt.value;
			option.textContent = opt.label;
			select.appendChild(option);
		});

		select.value = typeof actionId === 'string' ? actionId : 'none';

		selectWrapper.appendChild(select);
		slotInfo.appendChild(slotLabel);
		slotInfo.appendChild(selectWrapper);

		const removeButton = document.createElement('button');
		removeButton.className = 'blacklisted-video-remove';
		removeButton.textContent = '✕';
		removeButton.setAttribute('aria-label', `Remove control ${index + 1}`);
		removeButton.setAttribute('title', `Remove control ${index + 1}`);
		removeButton.addEventListener('click', () => {
			const current = readNativeTopControlsFromUI() || [];
			current.splice(index, 1);
			renderNativeTopControls(current);
			save_options();
		});

		slotItem.appendChild(slotInfo);
		slotItem.appendChild(removeButton);
		list.appendChild(slotItem);
	});
}

let nativeTopControlsEditorInitialized = false;
function initNativeTopControlsEditor(slots) {
	const addButton = document.getElementById('add-native-top-control');
	const clearButton = document.getElementById('clear-native-top-controls');
	const list = document.getElementById('native-top-controls-list');
	if (!list) return;

	if (!nativeTopControlsEditorInitialized) {
		list.addEventListener('change', (e) => {
			if (e.target && e.target.matches('select[data-native-top-control]')) {
				save_options();
			}
		});
		if (addButton) {
			addButton.addEventListener('click', () => {
				const current = readNativeTopControlsFromUI() || [];
				current.push('none');
				renderNativeTopControls(current);
				save_options();
			});
		}
		if (clearButton) {
			clearButton.addEventListener('click', () => {
				const confirmed = confirm(
					'Are you sure you want to clear all additional native top controls?'
				);
				if (!confirmed) return;
				renderNativeTopControls([]);
				save_options();
			});
		}
		nativeTopControlsEditorInitialized = true;
	}

	renderNativeTopControls(Array.isArray(slots) ? slots : []);
}

const BOTTOM_CONTROL_SLOT_SPECS = [
	{
		label: 'Left Slot 1',
		tapId: 'layoutBottomLeftSlot1',
		doubleId: 'layoutBottomLeftSlot1DoubleAction',
		holdId: 'layoutBottomLeftSlot1HoldAction',
	},
	{
		label: 'Center Slot 1',
		tapId: 'layoutBottomCenterSlot1',
		doubleId: 'layoutBottomCenterSlot1DoubleAction',
		holdId: 'layoutBottomCenterSlot1HoldAction',
	},
	{
		label: 'Center Slot 2',
		tapId: 'layoutBottomCenterSlot2',
		doubleId: 'layoutBottomCenterSlot2DoubleAction',
		holdId: 'layoutBottomCenterSlot2HoldAction',
	},
	{
		label: 'Center Slot 3',
		tapId: 'layoutBottomCenterSlot3',
		doubleId: 'layoutBottomCenterSlot3DoubleAction',
		holdId: 'layoutBottomCenterSlot3HoldAction',
	},
	{
		label: 'Center Slot 4',
		tapId: 'layoutBottomCenterSlot4',
		doubleId: 'layoutBottomCenterSlot4DoubleAction',
		holdId: 'layoutBottomCenterSlot4HoldAction',
	},
	{
		label: 'Center Slot 5',
		tapId: 'layoutBottomCenterSlot5',
		doubleId: 'layoutBottomCenterSlot5DoubleAction',
		holdId: 'layoutBottomCenterSlot5HoldAction',
	},
	{
		label: 'Right Slot 1',
		tapId: 'layoutBottomRightSlot1',
		doubleId: 'layoutBottomRightSlot1DoubleAction',
		holdId: 'layoutBottomRightSlot1HoldAction',
	},
	{
		label: 'Right Slot 2',
		tapId: 'layoutBottomRightSlot2',
		doubleId: 'layoutBottomRightSlot2DoubleAction',
		holdId: 'layoutBottomRightSlot2HoldAction',
	},
];

function getSelectValueLabel(selectEl) {
	if (!selectEl) return 'None';
	const value = selectEl.value;
	const option = Array.from(selectEl.options || []).find((opt) => opt.value === value);
	return option?.textContent || value || 'None';
}

const BOTTOM_CONTROL_ACTION_ICON_SVGS = {
	play: {
		viewBox: '0 0 24 24',
		paths: ['M8 5v14l11-7z'],
	},
	previous: {
		viewBox: '0 0 24 24',
		paths: ['M6 6h2v12H6zm3.5 6l8.5 6V6z'],
	},
	'restart-then-previous': {
		viewBox: '0 0 24 24',
		paths: [
			'M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6s-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8S16.42 4 12 4z',
		],
	},
	skip: {
		viewBox: '0 0 24 24',
		paths: ['M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z'],
	},
	'seek-back': {
		viewBox: '0 0 24 24',
		paths: ['M11 18l-6.5-6L11 6v12zM19 18l-6.5-6L19 6v12z'],
	},
	'seek-forward': {
		viewBox: '0 0 24 24',
		paths: ['M13 6l6.5 6L13 18V6zM5 6l6.5 6L5 18V6z'],
	},
	repeat: {
		viewBox: '0 0 24 24',
		paths: ['M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z'],
	},
	'voice-search': {
		viewBox: '0 0 24 24',
		paths: [
			'M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z',
			'M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z',
		],
	},
	'limited-height-fab': {
		viewBox: '0 0 24 24',
		paths: ['M3 18h18v-2H3v2z', 'M3 13h18v-2H3v2z', 'M3 8h18V6H3z'],
	},
	'toggle-drawer': {
		viewBox: '0 0 24 24',
		paths: [
			'M19 4H5c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H5V6h14v12z',
		],
	},
};

function createActionIconSVG(actionId) {
	if (!actionId || actionId === 'none') return null;
	const normalized = actionId === 'repeat-show-when-active' ? 'repeat' : actionId;
	const def = BOTTOM_CONTROL_ACTION_ICON_SVGS[normalized];
	if (!def) return null;

	const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
	svg.setAttribute('viewBox', def.viewBox);
	svg.setAttribute('aria-hidden', 'true');
	def.paths.forEach((d) => {
		const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		path.setAttribute('d', d);
		svg.appendChild(path);
	});
	return svg;
}

function syncSelectOptions(fromSelect, toSelect) {
	if (!fromSelect || !toSelect) return;
	while (toSelect.firstChild) {
		toSelect.removeChild(toSelect.firstChild);
	}
	Array.from(fromSelect.options || []).forEach((opt) => {
		const next = document.createElement('option');
		next.value = opt.value;
		next.textContent = opt.textContent;
		toSelect.appendChild(next);
	});
}

function dispatchChange(el) {
	if (!el) return;
	el.dispatchEvent(new Event('change', { bubbles: true }));
}

function appendBottomControlsActionLine(container, kindLabel, selectEl) {
	if (!container || !selectEl) return;
	const actionId = selectEl.value;
	if (!actionId || actionId === 'none') return;
	const line = document.createElement('div');
	line.className = 'bottom-controls-slot-action';

	const kind = document.createElement('div');
	kind.className = 'bottom-controls-slot-action-kind';
	kind.textContent = `${kindLabel}:`;

	const iconWrap = document.createElement('div');
	iconWrap.className = 'bottom-controls-slot-action-icon';
	const svg = createActionIconSVG(actionId);
	if (svg) iconWrap.appendChild(svg);

	const label = document.createElement('div');
	label.className = 'bottom-controls-slot-action-label';
	label.textContent = getSelectValueLabel(selectEl);

	line.appendChild(kind);
	line.appendChild(iconWrap);
	line.appendChild(label);
	container.appendChild(line);
}

function renderBottomControlsActionsList() {
	const list = document.getElementById('bottom-controls-actions-list');
	if (!list) return;

	while (list.firstChild) {
		list.removeChild(list.firstChild);
	}

	BOTTOM_CONTROL_SLOT_SPECS.forEach((spec, index) => {
		const tapEl = document.getElementById(spec.tapId);
		const doubleEl = document.getElementById(spec.doubleId);
		const holdEl = document.getElementById(spec.holdId);

		const row = document.createElement('div');
		row.className = 'blacklisted-video-item bottom-controls-slot-item';

		const info = document.createElement('div');
		info.className = 'blacklisted-video-info';

		const label = document.createElement('div');
		label.className = 'blacklisted-video-id';
		label.textContent = spec.label;

		const summary = document.createElement('div');
		summary.className = 'bottom-controls-slot-actions';
		appendBottomControlsActionLine(summary, 'Tap', tapEl);
		appendBottomControlsActionLine(summary, 'Double', doubleEl);
		appendBottomControlsActionLine(summary, 'Hold', holdEl);
		if (!summary.firstChild) {
			const empty = document.createElement('div');
			empty.className = 'bottom-controls-slot-empty';
			empty.textContent = 'No actions configured';
			summary.appendChild(empty);
		}

		info.appendChild(label);
		info.appendChild(summary);

		const editButton = document.createElement('button');
		editButton.className = 'clear-all-button';
		editButton.type = 'button';
		editButton.textContent = 'Edit';
		editButton.setAttribute('data-bottom-controls-slot-index', String(index));

		row.appendChild(info);
		row.appendChild(editButton);
		list.appendChild(row);
	});
}

let bottomControlsEditorInitialized = false;
function initBottomControlsActionsEditor() {
	const list = document.getElementById('bottom-controls-actions-list');
	const overlay = document.getElementById('bottom-controls-editor-overlay');
	const title = document.getElementById('bottom-controls-editor-title');
	const closeBtn = document.getElementById('bottom-controls-editor-close');
	const cancelBtn = document.getElementById('bottom-controls-editor-cancel');
	const saveBtn = document.getElementById('bottom-controls-editor-save');
	const tapSelect = document.getElementById('bottom-controls-editor-tap');
	const doubleSelect = document.getElementById('bottom-controls-editor-double');
	const holdSelect = document.getElementById('bottom-controls-editor-hold');

	if (!list || !overlay || !title || !closeBtn || !cancelBtn || !saveBtn) return;
	if (!tapSelect || !doubleSelect || !holdSelect) return;

	const modal = overlay.querySelector('.bottom-controls-editor-modal');
	let activeSpec = null;

	const close = () => {
		activeSpec = null;
		overlay.classList.remove('active');
		overlay.setAttribute('aria-hidden', 'true');
	};

	const openForSpec = (spec) => {
		activeSpec = spec;
		title.textContent = `Edit ${spec.label}`;

		const tapEl = document.getElementById(spec.tapId);
		const doubleEl = document.getElementById(spec.doubleId);
		const holdEl = document.getElementById(spec.holdId);

		syncSelectOptions(tapEl, tapSelect);
		syncSelectOptions(doubleEl, doubleSelect);
		syncSelectOptions(holdEl, holdSelect);

		tapSelect.value = tapEl?.value ?? 'none';
		doubleSelect.value = doubleEl?.value ?? 'none';
		holdSelect.value = holdEl?.value ?? 'none';

		tapSelect.disabled = !!tapEl?.disabled;
		doubleSelect.disabled = !!doubleEl?.disabled;
		holdSelect.disabled = !!holdEl?.disabled;

		overlay.classList.add('active');
		overlay.setAttribute('aria-hidden', 'false');
		tapSelect.focus();
	};

	const apply = () => {
		if (!activeSpec) return;

		const tapEl = document.getElementById(activeSpec.tapId);
		const doubleEl = document.getElementById(activeSpec.doubleId);
		const holdEl = document.getElementById(activeSpec.holdId);

		if (tapEl && !tapEl.disabled && tapEl.value !== tapSelect.value) {
			tapEl.value = tapSelect.value;
			dispatchChange(tapEl);
		}
		if (doubleEl && !doubleEl.disabled && doubleEl.value !== doubleSelect.value) {
			doubleEl.value = doubleSelect.value;
			dispatchChange(doubleEl);
		}
		if (holdEl && !holdEl.disabled && holdEl.value !== holdSelect.value) {
			holdEl.value = holdSelect.value;
			dispatchChange(holdEl);
		}

		renderBottomControlsActionsList();
		close();
	};

	if (!bottomControlsEditorInitialized) {
		list.addEventListener('click', (e) => {
			const btn = e.target && e.target.closest('button[data-bottom-controls-slot-index]');
			if (!btn) return;
			const idx = parseInt(btn.getAttribute('data-bottom-controls-slot-index'), 10);
			const spec = BOTTOM_CONTROL_SLOT_SPECS[idx];
			if (!spec) return;
			openForSpec(spec);
		});

		closeBtn.addEventListener('click', close);
		cancelBtn.addEventListener('click', close);
		saveBtn.addEventListener('click', apply);

		overlay.addEventListener('pointerdown', (e) => {
			if (e.target === overlay) close();
		});

		document.addEventListener('keydown', (e) => {
			if (e.key !== 'Escape') return;
			if (overlay.classList.contains('active')) close();
		});

		if (modal) {
			modal.addEventListener('pointerdown', (e) => e.stopPropagation());
		}

		const ids = new Set(
			BOTTOM_CONTROL_SLOT_SPECS.flatMap((s) => [s.tapId, s.doubleId, s.holdId])
		);
		document.addEventListener('change', (e) => {
			const target = e.target;
			if (!target || !target.id) return;
			if (!ids.has(target.id)) return;
			renderBottomControlsActionsList();
		});

		bottomControlsEditorInitialized = true;
	}

	renderBottomControlsActionsList();
}

function save_options() {
	const settingsToSave = {};
	for (const key in window.userSettings) {
		const element = document.getElementById(key);
		if (element) {
			if (element.type === 'checkbox') {
				if (key === 'autoPlayPreference') {
					settingsToSave[key] = element.checked ? 'attemptUnmuted' : 'default';
				} else {
					settingsToSave[key] = element.checked;
				}
			} else if (key === 'repeatStickyAcrossVideos') {
				settingsToSave[key] = element.value;
			} else if (key === 'enableFixedVideoHeight') {
				const increments = element.dataset.increments.split(',').map((v) => parseInt(v));
				const index = parseInt(element.value);
				settingsToSave[key] = increments[index] ?? 30;
			} else if (key === 'customPlayerFontMultiplier') {
				const increments = element.dataset.increments.split(',').map(parseFloat);
				const index = parseInt(element.value);
				settingsToSave[key] = increments[index] ?? 1;
			} else if (key === 'smartPreviousThreshold') {
				settingsToSave[key] = parseInt(element.value) || 5;
			} else if (key === 'bottomControlsDoubleClickDelay') {
				settingsToSave[key] = parseInt(element.value) || 260;
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

	const navbarRightSlots = readNavbarRightSlotsFromUI();
	if (navbarRightSlots) {
		settingsToSave.navbarRightSlots = navbarRightSlots;
	}

	const additionalNativeControls = readNativeControlsFromUI();
	if (additionalNativeControls) {
		settingsToSave.additionalNativeControls = additionalNativeControls;
	}

	const additionalNativeTopControls = readNativeTopControlsFromUI();
	if (additionalNativeTopControls) {
		settingsToSave.additionalNativeTopControls = additionalNativeTopControls;
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

	initLegacyBottomControlsGestureSelects();

	for (const key in items) {
		const element = document.getElementById(key);
		if (element) {
			if (key === 'repeatStickyAcrossVideos') {
				const raw = items[key];
				let val;
				if (typeof raw === 'boolean') {
					val = raw ? 'always-sticky' : 'always-single';
				} else if (typeof raw === 'string') {
					val = raw || 'always-single';
				} else {
					val = 'always-single';
				}
				element.value = val;
			} else if (key === 'enableFixedVideoHeight') {
				const increments = element.dataset.increments.split(',').map((v) => parseInt(v));
				const raw = items[key];
				const value = typeof raw === 'number' ? raw : raw === true ? 30 : 0;
				const index = increments.indexOf(value);
				element.value = index !== -1 ? String(index) : '3';
			} else if (element.type === 'checkbox') {
				if (key === 'autoPlayPreference') {
					element.checked = items[key] === 'attemptUnmuted';
				} else {
					element.checked = items[key];
				}
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
			} else if (key === 'bottomControlsDoubleClickDelay') {
				element.value = parseInt(items[key]) || 260;
			} else if (key === 'playlistScrollDebounceDelay') {
				element.value = parseFloat(items[key]) || 2.5;
			} else {
				element.value = items[key];
			}
		}
	}

	initNavbarRightSlotsEditor(items.navbarRightSlots);
	initNativeControlsEditor(items.additionalNativeControls);
	initNativeTopControlsEditor(items.additionalNativeTopControls);
	initBottomControlsActionsEditor();

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
		'input[type="checkbox"], input[type="range"], input[type="number"], select:not([data-navbar-right-slot]):not([data-ignore-save])'
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

function loadMixSnapshots() {
	const storageApi =
		typeof browser !== 'undefined' && browser.storage
			? browser.storage
			: typeof chrome !== 'undefined' && chrome.storage
				? chrome.storage
				: null;
	const storageLocal = storageApi ? storageApi.local : null;

	const displaySnapshots = (items) => {
		const snapshotsObj = items.mixSnapshots || {};
		const listContainer = document.getElementById('snapshots-list');
		const emptyMessage = document.getElementById('no-snapshots');

		if (!listContainer) return;

		while (listContainer.firstChild) {
			listContainer.removeChild(listContainer.firstChild);
		}

		const snapshots = Object.values(snapshotsObj).filter((snap) => snap && snap.id);
		snapshots.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

		if (!snapshots.length) {
			showElement(emptyMessage);
			return;
		}

		hideElement(emptyMessage);

		snapshots.forEach((snap) => {
			const snapshotItem = document.createElement('div');
			snapshotItem.className = 'blacklisted-video-item';

			const firstVideoId =
				Array.isArray(snap.items) && snap.items[0] && snap.items[0].id
					? snap.items[0].id
					: '';
			if (firstVideoId) {
				const thumbnail = document.createElement('img');
				thumbnail.className = 'blacklisted-video-thumbnail';
				thumbnail.src = getStandardThumbnailUrl(firstVideoId);
				thumbnail.alt = 'Snapshot thumbnail';
				thumbnail.loading = 'lazy';
				snapshotItem.appendChild(thumbnail);
			}

			const info = document.createElement('div');
			info.className = 'blacklisted-video-info';

			const idEl = document.createElement('div');
			idEl.className = 'blacklisted-video-id';
			idEl.textContent = snap.id;

			const titleEl = document.createElement('div');
			titleEl.className = 'blacklisted-video-title';
			titleEl.textContent = snap.title || 'Mix Snapshot';

			const metaEl = document.createElement('div');
			metaEl.className = 'blacklisted-video-id';
			const count = Array.isArray(snap.items) ? snap.items.length : 0;
			const createdAt = snap.createdAt ? new Date(snap.createdAt).toLocaleDateString() : '';
			metaEl.textContent = createdAt ? `${count} items • ${createdAt}` : `${count} items`;

			const removeButton = document.createElement('button');
			removeButton.className = 'blacklisted-video-remove';
			removeButton.textContent = 'Remove';
			removeButton.addEventListener('click', () => removeMixSnapshot(snap.id));

			info.appendChild(idEl);
			info.appendChild(titleEl);
			info.appendChild(metaEl);

			snapshotItem.appendChild(info);
			snapshotItem.appendChild(removeButton);
			listContainer.appendChild(snapshotItem);
		});
	};

	if (storageLocal) {
		if (typeof storageLocal.get === 'function' && storageLocal.get.length === 1) {
			storageLocal
				.get(['mixSnapshots'])
				.then(displaySnapshots)
				.catch((err) => {
					console.error('Error loading snapshots:', err);
					displaySnapshots({ mixSnapshots: {} });
				});
		} else {
			storageLocal.get(['mixSnapshots'], displaySnapshots);
		}
	} else {
		console.warn('Enhanced Player: Storage API not available.');
		displaySnapshots({ mixSnapshots: {} });
	}
}

function removeMixSnapshot(snapshotId) {
	const storageApi =
		typeof browser !== 'undefined' && browser.storage
			? browser.storage
			: typeof chrome !== 'undefined' && chrome.storage
				? chrome.storage
				: null;
	const storageLocal = storageApi ? storageApi.local : null;

	const updateSnapshots = (items) => {
		const current = items.mixSnapshots || {};
		const updated = Object.assign({}, current);
		delete updated[snapshotId];

		const settingsToSave = { mixSnapshots: updated };
		if (items.activeMixSnapshotId === snapshotId) {
			settingsToSave.activeMixSnapshotId = null;
		}

		if (storageLocal) {
			if (typeof storageLocal.set === 'function' && storageLocal.set.length === 1) {
				storageLocal
					.set(settingsToSave)
					.then(() => {
						showSaveSnackbar();
						loadMixSnapshots();
					})
					.catch((err) => {
						console.error('Enhanced Player: Failed to remove snapshot', err);
					});
			} else {
				storageLocal.set(settingsToSave, () => {
					if (chrome.runtime.lastError) {
						console.error(
							'Enhanced Player: Failed to remove snapshot',
							chrome.runtime.lastError
						);
					} else {
						showSaveSnackbar();
						loadMixSnapshots();
					}
				});
			}
		}
	};

	if (storageLocal) {
		const keys = ['mixSnapshots', 'activeMixSnapshotId'];
		if (typeof storageLocal.get === 'function' && storageLocal.get.length === 1) {
			storageLocal
				.get(keys)
				.then(updateSnapshots)
				.catch((err) => {
					console.error('Error loading snapshots for removal:', err);
				});
		} else {
			storageLocal.get(keys, updateSnapshots);
		}
	}
}

function clearAllMixSnapshots() {
	const confirmed = confirm(
		'Are you sure you want to clear all snapshots? This action cannot be undone.'
	);
	if (!confirmed) return;

	const storageApi =
		typeof browser !== 'undefined' && browser.storage
			? browser.storage
			: typeof chrome !== 'undefined' && chrome.storage
				? chrome.storage
				: null;
	const storageLocal = storageApi ? storageApi.local : null;

	const settingsToSave = { mixSnapshots: {}, activeMixSnapshotId: null };

	if (storageLocal) {
		if (typeof storageLocal.set === 'function' && storageLocal.set.length === 1) {
			storageLocal
				.set(settingsToSave)
				.then(() => {
					showSaveSnackbar();
					loadMixSnapshots();
				})
				.catch((err) => {
					console.error('Enhanced Player: Failed to clear snapshots', err);
				});
		} else {
			storageLocal.set(settingsToSave, () => {
				if (chrome.runtime.lastError) {
					console.error(
						'Enhanced Player: Failed to clear snapshots',
						chrome.runtime.lastError
					);
				} else {
					showSaveSnackbar();
					loadMixSnapshots();
				}
			});
		}
	}
}

function initClearAllSnapshotsButton() {
	const clearAllButton = document.getElementById('clear-all-snapshots');
	if (clearAllButton) {
		clearAllButton.addEventListener('click', clearAllMixSnapshots);
	}
}

function getRuntimeApi() {
	if (
		typeof browser !== 'undefined' &&
		browser.runtime &&
		typeof browser.runtime.sendMessage === 'function'
	) {
		return browser.runtime;
	}
	if (
		typeof chrome !== 'undefined' &&
		chrome.runtime &&
		typeof chrome.runtime.sendMessage === 'function'
	) {
		return chrome.runtime;
	}
	return null;
}

async function sendRuntimeMessage(message) {
	const runtime = getRuntimeApi();
	if (!runtime) return null;
	const isBrowserRuntime =
		typeof browser !== 'undefined' && browser.runtime && runtime === browser.runtime;
	if (isBrowserRuntime) return await runtime.sendMessage(message);
	return await new Promise((resolve) => runtime.sendMessage(message, resolve));
}

async function exportUserSettings() {
	if (typeof window.loadUserSettings === 'function') {
		await window.loadUserSettings();
	}
	const payload = {
		format: 'yt-emc-user-settings',
		exportedAt: new Date().toISOString(),
		version: currentVersion,
		settings: window.userSettings || {},
	};
	const json = JSON.stringify(payload, null, '\t');
	const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
	const filename = `yt-emc-settings-${currentVersion || 'unknown'}-${timestamp}.json`;
	const response = await sendRuntimeMessage({
		action: 'downloadLogs',
		logContent: json,
		filename,
		mimeType: 'application/json;charset=utf-8',
	});
	if (response && response.success === false) {
		console.error('Enhanced Player: Failed to export settings', response.error || response);
	}
}

async function importUserSettingsObject(imported) {
	if (!imported || typeof imported !== 'object' || Array.isArray(imported)) {
		throw new Error('Invalid settings file');
	}
	const settings =
		imported.settings &&
		typeof imported.settings === 'object' &&
		!Array.isArray(imported.settings)
			? imported.settings
			: imported;
	if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
		throw new Error('Invalid settings payload');
	}
	const knownKeys = window.userSettings ? Object.keys(window.userSettings) : [];
	const knownKeySet = new Set(knownKeys);
	for (const key of Object.keys(settings)) {
		if (!knownKeySet.has(key)) continue;
		if (typeof window.saveUserSetting !== 'function') continue;
		await window.saveUserSetting(key, settings[key]);
	}
}

function initSettingsTransfer() {
	const exportButton = document.getElementById('export-user-settings');
	const importButton = document.getElementById('import-user-settings');
	const importFile = document.getElementById('import-user-settings-file');

	if (exportButton) {
		exportButton.addEventListener('click', async () => {
			exportButton.disabled = true;
			try {
				await exportUserSettings();
			} finally {
				exportButton.disabled = false;
			}
		});
	}

	if (importButton && importFile) {
		importButton.addEventListener('click', () => {
			const confirmed = confirm(
				'Importing will overwrite your current settings. You can export first as a backup. Continue?'
			);
			if (!confirmed) return;
			importFile.value = '';
			importFile.click();
		});

		importFile.addEventListener('change', async () => {
			const file = importFile.files && importFile.files[0] ? importFile.files[0] : null;
			if (!file) return;

			importButton.disabled = true;
			if (exportButton) exportButton.disabled = true;
			try {
				const text = await file.text();
				const parsed = JSON.parse(text);
				await importUserSettingsObject(parsed);
				location.reload();
			} catch (e) {
				console.error('Enhanced Player: Failed to import settings', e);
			} finally {
				importButton.disabled = false;
				if (exportButton) exportButton.disabled = false;
			}
		});
	}
}

function loadVersionNumber() {
	if (
		typeof chrome !== 'undefined' &&
		chrome.runtime &&
		typeof chrome.runtime.getURL === 'function'
	) {
		return fetch(chrome.runtime.getURL('manifest.json'))
			.then((response) => response.json())
			.then((manifest) => {
				if (manifest.version) {
					currentVersion = manifest.version;
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
	return Promise.resolve();
}

document.addEventListener('DOMContentLoaded', async () => {
	await loadVersionNumber();

	// Initialize the new dependency manager FIRST
	dependencyManager = new OptionDependencyManager();

	// Now restore options - this will call updateControlStates which uses the dependency manager
	await restore_options();
	initSettingsTransfer();
	loadBlacklistedVideos();
	initClearAllButton();
	loadMixSnapshots();
	initClearAllSnapshotsButton();
	initCollapsibleSections();
	initGlobalCollapseButton();
	initSectionLinks();
	initSectionMenu();
	initKnownIssuesSection();
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

async function initKnownIssuesSection() {
	const container = document.getElementById('known-issues-content');
	if (!container) return;

	const appendInlineText = (target, text) => {
		const parts = text.split('`');
		parts.forEach((part, index) => {
			if (!part) return;
			if (index % 2 === 1) {
				const code = document.createElement('code');
				code.textContent = part;
				target.appendChild(code);
				return;
			}
			target.appendChild(document.createTextNode(part));
		});
	};
	const parseMarkdown = (markdown) => {
		const items = [];
		let current = '';
		markdown.split(/\r?\n/).forEach((line) => {
			const trimmed = line.trim();
			if (!trimmed) {
				if (current) {
					items.push(current);
					current = '';
				}
				return;
			}
			if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
				if (current) items.push(current);
				current = trimmed.slice(2).trim();
				return;
			}
			current = current ? `${current} ${trimmed}` : trimmed;
		});
		if (current) items.push(current);
		return items;
	};

	try {
		const url =
			typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL
				? chrome.runtime.getURL('src/options/known-issues.md')
				: 'known-issues.md';
		const response = await fetch(url, { cache: 'no-store' });
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		const markdown = await response.text();
		const items = parseMarkdown(markdown);
		container.replaceChildren();
		if (!items.length) {
			const empty = document.createElement('div');
			empty.className = 'known-issues-empty';
			empty.textContent = 'No notices available.';
			container.appendChild(empty);
			return;
		}
		const list = document.createElement('ul');
		list.className = 'known-issues-list';
		items.forEach((item) => {
			const li = document.createElement('li');
			appendInlineText(li, item);
			list.appendChild(li);
		});
		container.appendChild(list);
	} catch (error) {
		console.error('Error fetching known issues:', error);
		container.replaceChildren();
		const empty = document.createElement('div');
		empty.className = 'known-issues-empty';
		empty.textContent = 'Failed to load notices. Please try again later.';
		container.appendChild(empty);
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
					'https://gist.githubusercontent.com/92jackson/c1086b472ccd4b521cbb33d0a701befb/raw/Donors.txt',
					{
						cache: 'no-store',
					}
				);
				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}
				const data = await response.text();
				const parseCSV = (text) => {
					const rows = [];
					let row = [];
					let current = '';
					let inQuotes = false;

					for (let i = 0; i < text.length; i++) {
						const char = text[i];
						if (inQuotes) {
							if (char === '"') {
								const next = text[i + 1];
								if (next === '"') {
									current += '"';
									i++;
								} else {
									inQuotes = false;
								}
							} else {
								current += char;
							}
							continue;
						}

						if (char === '"') {
							inQuotes = true;
							continue;
						}
						if (char === ',') {
							row.push(current);
							current = '';
							continue;
						}
						if (char === '\n') {
							row.push(current);
							current = '';
							const hasContent = row.some((cell) => cell.trim() !== '');
							if (hasContent) rows.push(row);
							row = [];
							continue;
						}
						if (char === '\r') continue;
						current += char;
					}

					if (current.length || row.length) {
						row.push(current);
						const hasContent = row.some((cell) => cell.trim() !== '');
						if (hasContent) rows.push(row);
					}

					return rows;
				};

				const rows = parseCSV(data);
				const dataRows = rows.slice(1);
				const headers = ['Supporter', 'Message', 'Reply', 'Date'];
				const table = document.createElement('table');
				table.className = 'donors-table';
				const thead = document.createElement('thead');
				const headRow = document.createElement('tr');
				headers.forEach((header) => {
					const th = document.createElement('th');
					th.textContent = header;
					headRow.appendChild(th);
				});
				thead.appendChild(headRow);
				table.appendChild(thead);

				const tbody = document.createElement('tbody');
				dataRows.forEach((cells) => {
					const rowElement = document.createElement('tr');
					headers.forEach((_, index) => {
						const td = document.createElement('td');
						td.textContent = (cells[index] || '').trim();
						rowElement.appendChild(td);
					});
					tbody.appendChild(rowElement);
				});
				table.appendChild(tbody);

				if (!dataRows.length) {
					const pElement = document.createElement('p');
					pElement.textContent = 'No supporters found yet.';
					donorsList.replaceChildren(pElement);
					return;
				}
				donorsList.replaceChildren(table);
			} catch (error) {
				console.error('Error fetching donors:', error);
				const pElement = document.createElement('p');
				pElement.textContent = 'Failed to load donors. Please try again later.';
				donorsList.replaceChildren(pElement);
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
			let addedVersionWithoutPatch = addedVersion.split('.').slice(0, 2).join('.');
			let currentVersionWithoutPatch = currentVersion.split('.').slice(0, 2).join('.');

			// Compare versions
			if (
				compareVersions(addedVersion, lastVersion) > 0 ||
				addedVersionWithoutPatch == currentVersionWithoutPatch
			) {
				// This option is new, add the badge
				addNewOptionBadge(optionElement);
				newOptionsList.push(optionElement);
			}
		});

		const newCards = new Set();
		newOptionsList.forEach((optionElement) => {
			const card = optionElement.closest ? optionElement.closest('.card') : null;
			if (card) newCards.add(card);
		});
		newCards.forEach((card) => addNewCardBadge(card));

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

function addNewCardBadge(cardElement) {
	if (!cardElement) return;
	const header = cardElement.querySelector('.card-header');
	if (!header) return;
	if (header.querySelector('.new-option-badge')) return;

	const title = header.querySelector('h2');
	if (!title) return;

	const badge = document.createElement('span');
	badge.className = 'badge badge--new new-option-badge';
	badge.textContent = 'NEW';

	title.appendChild(document.createTextNode(' '));
	title.appendChild(badge);
}

function addNewOptionBadge(optionElement) {
	if (optionElement && optionElement.classList && optionElement.classList.contains('card')) {
		addNewCardBadge(optionElement);
		return;
	}

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
