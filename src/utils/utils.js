// utils.js
/**
 * Logger utility that provides formatted console logging with:
 * - Source-based color coding
 * - Debug logging toggle via user settings
 * - Caller location tracking (when debug enabled)
 * - Three log levels (log, warn, error)
 * - Conditional logging (can force logging regardless of debug setting)
 * @returns {object} Logger object with log, warn, and error methods
 */
window.logger = (() => {
	const sourceColors = {};
	const logHistory = []; // Store recent logs for mobile debugging
	const MAX_LOG_HISTORY = 500; // Maximum number of logs to keep in memory

	const getRandomColor = () => `hsl(${Math.floor(Math.random() * 360)}, 70%, 60%)`;

	const getColorForSource = (source) => {
		if (!sourceColors[source]) {
			sourceColors[source] = getRandomColor();
		}
		return sourceColors[source];
	};

	const shouldLog = (alwaysPost) => alwaysPost || userSettings?.enableDebugLogging;

	const getLogLocation = () => {
		const stack = new Error().stack?.split('\n');
		if (!stack || stack.length < 6) return 'unknown';

		for (let i = 5; i < stack.length; i++) {
			const line = stack[i].trim();
			if (line.includes('logger') || line.includes('format')) continue;

			const match = line.match(/([^\/\s]+)\.js:(\d+):\d+/);
			if (match) return `${match[1]}:${match[2]}`;

			return line.replace(/^at\s+/, '');
		}
		return 'unknown';
	};

	const logCaller = () => (userSettings?.enableDebugLogging ? getLogLocation() + ' - ' : '');

	const levelStyles = {
		WARN: 'background: #f1c40f; color: black;',
		ERROR: 'background: #e74c3c; color: white;',
	};

	const format = (source, level) => {
		const sourceColor = getColorForSource(source);
		const bgStyle = levelStyles[level] ?? `color: ${sourceColor};`;
		const label = `[YTEMC] [${logCaller()}${source}]${level ? ` [${level}]` : ''}`;
		const style = `${bgStyle} font-weight: bold; padding: 2px 4px; border-radius: 2px;`;
		return [`%c${label}`, style];
	};

	// Store log entry in history for mobile debugging
	const storeLogEntry = (source, level, message, args) => {
		if (!userSettings?.enableDebugLogging) return;

		const timestamp = new Date().toISOString();
		const location = getLogLocation();
		const levelText = level ? ` [${level}]` : '';
		const logEntry = {
			timestamp,
			source,
			level: level || 'LOG',
			location,
			message,
			args: args.length > 0 ? args : null,
			formatted: `${timestamp} [YTEMC] [${location} - ${source}]${levelText} ${message}${args.length > 0 ? ' ' + JSON.stringify(args) : ''}`
		};

		logHistory.push(logEntry);

		// Keep only the most recent logs
		if (logHistory.length > MAX_LOG_HISTORY) {
			logHistory.shift();
		}
	};

	// Helper to extract alwaysPost flag from args and return remaining args
	const extractAlwaysPostFlag = (args) => {
		let alwaysPost = false;
		if (args.length > 0 && typeof args[args.length - 1] === 'boolean') {
			alwaysPost = args.pop();
		}
		return alwaysPost;
	};

	const logFn =
		(level) =>
		(source, message, ...args) => {
			const alwaysPost = extractAlwaysPostFlag(args);
			if (shouldLog(alwaysPost)) {
				const [label, style] = format(source, level);
				console.log(label, style, message, ...args);
				
				// Store in history for mobile debugging
				storeLogEntry(source, level, message, args);
			}
		};

	return {
		log: logFn(null),
		warn: logFn('WARN'),
		error: logFn('ERROR'),
		// Export log history for mobile debugging
		getLogHistory: () => [...logHistory], // Return a copy to prevent external modification
		clearLogHistory: () => logHistory.length = 0,
		downloadLogs: () => {
			if (logHistory.length === 0) {
				console.warn('No debug logs to download');
				alert('No debug logs available. Make sure debug logging is enabled and some activity has occurred.');
				return;
			}

			try {
				const logContent = logHistory.map(entry => entry.formatted).join('\n');
				const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
				const filename = `ytemc-debug-logs-${timestamp}.log`;
				
				// Use message passing to background script for downloads in extension environment
				if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
					chrome.runtime.sendMessage({
						action: 'downloadLogs',
						logData: logContent,
						filename: filename
					}, (response) => {
						if (chrome.runtime.lastError) {
							console.error('Message passing failed:', chrome.runtime.lastError);
							alert('Download failed: Unable to communicate with background script');
						} else if (response && response.success) {
							console.log(`Downloaded ${logHistory.length} debug log entries to ${filename}`);
							logger.log('Logger', `Downloaded ${logHistory.length} debug log entries to ${filename}`);
							alert(`Successfully downloaded ${logHistory.length} debug log entries`);
						} else {
							console.error('Download failed:', response?.error || 'Unknown error');
							alert(`Download failed: ${response?.error || 'Unknown error'}`);
						}
					});
				} else {
					// Non-extension environment - show logs in console instead
					console.warn('Extension environment not detected. Debug logs:');
					console.log(logContent);
					alert('Extension environment not detected. Debug logs have been output to the browser console.');
				}
				
			} catch (error) {
				console.error('Failed to download logs:', error);
				alert('Failed to download logs: ' + error.message);
			}
		}
	};
})();

/**
 * DOM manipulation utilities
 */
class DOMUtils {
	/**
	 * A utility to query for the first matching DOM element using one or more fallback selectors.
	 * @param {string|string[]} selectors - A CSS selector string or an array of fallback selectors to try.
	 * @param {Document|Element} [parent=document] - The parent element to search within.
	 * @param {boolean} [getAll=false] - Whether to return all matching elements.
	 * @returns {Element|NodeList|Element[]|null} The first found element, a NodeList of elements, or an array of elements, or null if none are found.
	 */
	static getElement(selectors, parent = document, getAll = false) {
		if (typeof selectors !== 'array') {
			selectors = [selectors];
		}
		for (const selector of selectors) {
			if (getAll) {
				const els = parent.querySelectorAll(selector);
				if (els.length) return els;
			} else {
				const el = parent.querySelector(selector);
				if (el) return el;
			}
		}
		return null;
	}

	/**
	 * Safely retrieves the text content from one or more DOM elements.
	 * @param {string|Element|(string|Element)[]} selectorOrElements - A selector, element, or array of either.
	 * @param {string} [defaultValue=""] - Fallback value if none match.
	 * @returns {string} The trimmed text content or the default value.
	 */
	static getText(selectorOrElements, defaultValue = '') {
		const elements = Array.isArray(selectorOrElements)
			? selectorOrElements
			: [selectorOrElements];

		for (const item of elements) {
			const el = typeof item === 'string' ? DOMUtils.getElement(item) : item;
			if (el?.textContent?.trim()) {
				return el.textContent.trim();
			}
		}
		return defaultValue;
	}

	/**
	 * Safely retrieves an attribute value from one or more DOM elements.
	 * @param {string|Element|(string|Element)[]} selectorOrElements - A selector, element, or array of either.
	 * @param {string} attributeName - The name of the attribute to retrieve.
	 * @param {string|null} [defaultValue=null] - Fallback value if none match.
	 * @returns {string|null} The attribute value or the default value.
	 */
	static getAttribute(selectorOrElements, attributeName, defaultValue = null) {
		const elements = Array.isArray(selectorOrElements)
			? selectorOrElements
			: [selectorOrElements];

		for (const item of elements) {
			const el = typeof item === 'string' ? DOMUtils.getElement(item) : item;
			const value = el?.getAttribute?.(attributeName);
			if (value != null) {
				return value;
			}
		}

		return value;
	}

	/**
	 * Safely clicks a DOM element.
	 * Supports a priming flow: click a priming element, wait for a specific
	 * element to appear, optionally undo, then retry the target.
	 *
	 * @param {string|Element} selectorOrElement - The main element to click.
	 * @param {Object} [options]
	 * @param {string|Element} [options.primeSelectorOrElement] - Element to click to prime UI.
	 * @param {string|Element} [options.primeReadySelectorOrElement] - Element to wait for after priming.
	 * @param {string|Element} [options.primeUndoSelectorOrElement] - Element to click to undo priming.
	 * @param {number} [options.delay=300] - Optional delay after undo (ms).
	 * @param {number} [options.timeout=3000] - Max wait time for ready element (ms).
	 * @returns {Promise<boolean>}
	 */
	static async clickElement(
		selectorOrElement,
		{
			primeSelectorOrElement = null,
			primeReadySelectorOrElement = null,
			primeUndoSelectorOrElement = null,
			delay = 300,
			timeout = 3000,
		} = {}
	) {
		function getTarget(target) {
			return typeof target === 'string' ? DOMUtils.getElement(target) : target;
		}

		let element = getTarget(selectorOrElement);
		if (element && typeof element.click === 'function') {
			element.click();
			logger.log('DOM', 'clickElement: Initial click:', selectorOrElement);
			return true;
		} else
			logger.warn('DOM', 'clickElement: Failed to find or click element:', selectorOrElement);

		// Prime the UI
		if (primeSelectorOrElement) {
			const primeEl = getTarget(primeSelectorOrElement);
			if (primeEl && typeof primeEl.click === 'function') {
				primeEl.click();
				logger.log('DOM', 'clickElement: Prime click:', primeSelectorOrElement);

				// Wait for "ready" indicator element if provided
				if (primeReadySelectorOrElement) {
					const readyEl = await DOMUtils.waitForElement(
						primeReadySelectorOrElement,
						document,
						timeout
					);
					if (!readyEl) {
						logger.warn(
							'DOM',
							'clickElement: Timed out waiting for primeReady element:',
							primeReadySelectorOrElement
						);
						return false;
					}
				}

				// Optional undo
				if (primeUndoSelectorOrElement) {
					const undoEl = getTarget(primeUndoSelectorOrElement);
					if (undoEl && typeof undoEl.click === 'function') {
						undoEl.click();
						logger.log(
							'DOM',
							'clickElement: Undo priming click:',
							primeUndoSelectorOrElement
						);
						await new Promise((resolve) => setTimeout(resolve, delay));
					}
				}

				// Retry original element
				element = getTarget(selectorOrElement);
				if (element && typeof element.click === 'function') {
					element.click();
					logger.log('DOM', 'clickElement: Retry click:', selectorOrElement);
					return true;
				}
			}
		}

		logger.warn('DOM', 'clickElement: Failed to find or click element:', selectorOrElement);
		return false;
	}

	/**
	 * Waits asynchronously for a DOM element matching the given selector to appear within a root element.
	 * Uses a MutationObserver to detect changes in the DOM and resolves as soon as the element is found.
	 *
	 * @param {string} selector - The CSS selector of the element to wait for.
	 * @param {Document|Element} [root=document] - The root element within which to observe DOM changes.
	 * @param {number} [timeout=10000] - The maximum time to wait (in milliseconds) before rejecting the promise.
	 * @returns {Promise<Element>} A promise that resolves with the found element, or rejects if the timeout is reached.
	 *
	 * @throws {Error} Throws an error if the element is not found within the timeout period.
	 */
	static async waitForElement(selector, root = document, timeout = 10000) {
		return new Promise((resolve, reject) => {
			const element = root.querySelector(selector);
			if (element) {
				resolve(element);
				return;
			}

			const observer = new MutationObserver((mutations) => {
				const element = root.querySelector(selector);
				if (element) {
					resolve(element);
					observer.disconnect();
				}
			});

			observer.observe(root, {
				childList: true,
				subtree: true,
			});

			setTimeout(() => {
				observer.disconnect();
				reject(new Error(`Timeout waiting for element: ${selector}`));
			}, timeout);
		});
	}

	/**
	 * Checks if an element is visible (exists and not hidden)
	 * @param {string|Element} selectorOrElement
	 * @returns {boolean}
	 */
	static isElementVisible(selectorOrElement) {
		const element =
			typeof selectorOrElement === 'string'
				? DOMUtils.getElement(selectorOrElement)
				: selectorOrElement;

		if (!element) return false;

		const style = window.getComputedStyle(element);
		return (
			element.offsetParent !== null &&
			style.display !== 'none' &&
			style.visibility !== 'hidden'
		);
	}
}

/**
 * Array manipulation utilities
 */
class ArrayUtils {
	/**
	 * Shuffles an array in place using the Fisher-Yates algorithm.
	 * @param {Array<any>} array - The array to shuffle.
	 */
	static shuffleArray(array) {
		for (let i = array.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[array[i], array[j]] = [array[j], array[i]]; // ES6 destructuring swap
		}
	}
}

/**
 * Media and music utilities
 */
class MediaUtils {
	/**
	 * Parses a YouTube video title and channel name into normalized music metadata.
	 * Attempts to extract Artist, Track, Featuring info, and includes parse metadata.
	 *
	 * @param {string} originalTitle - Raw YouTube video title
	 * @param {string} originalChannel - Channel name of the uploader
	 * @returns {{
	 *   artist: string,
	 *   featuring: string | null,
	 *   track: string,
	 *   originalTitle: string,
	 *   originalChannel: string,
	 *   parsed: boolean,
	 *   parseMethod: string,
	 *   parseConfidence: 'high' | 'medium' | 'low'
	 * }}
	 */
	static parseTitleToMusicMetadata(originalTitle, originalChannel) {
		let title = originalTitle;
		let channel = originalChannel;

		// Step 0: Remove emojis
		const emojiRegex = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu;
		title = title.replace(emojiRegex, '').trim();
		channel = channel.replace(emojiRegex, '').trim();

		// Step 1: Normalize whitespace
		title = title.replace(/\s+/g, ' ').trim();

		// Step 2: Normalize brackets to parentheses
		title = title.replace(/[\[\{]/g, '(').replace(/[\]\}]/g, ')');

		// Step 3: Remove hashtags
		title = title.replace(/#[^\s#]+/g, '').trim();

		// Step 4: Remove leading track numbers
		title = title.replace(/^\d{1,2}\s*[-.]\s*/, '');

		// Step 4.5: Remove 'out now' with optional separators
		title = title.replace(/\s*[\-–—:|,]?\s*out\s+now\s*$/i, '').trim();

		// Step 5: Remove promotional bracketed tags
		const promoKeywords = [
			'official',
			'music video',
			'audio',
			'visualizer',
			'hd',
			'hq',
			'4k',
			'8k',
			'uhd',
			'upgrade',
			'mv',
			'lyrics?',
			'lyric video',
		];
		title = title
			.replace(/\(([^()]+)\)/gi, (match, inner) => {
				const hasPromo = promoKeywords.some((word) =>
					new RegExp(`\\b${word}\\b`, 'i').test(inner)
				);
				return hasPromo ? '' : match;
			})
			.trim();

		// Setup result fields
		let artist = null;
		let track = null;
		let featuring = null;
		let parsed = false;
		let parseMethod = 'unknown';
		let parseConfidence = 'low';

		// Step 6: Handle quoted formats
		const quotedFormats = [
			/^["'“‘](.+?)["'”’]\s*[-–:]\s*(.+)$/, // "Track" - Artist
			/^(.+?)\s*[-–:]\s*["'“‘](.+?)["'”’]$/, // Artist - "Track"
		];

		for (const regex of quotedFormats) {
			const match = title.match(regex);
			if (match) {
				const part1 = match[1].trim();
				const part2 = match[2].trim();

				if (regex === quotedFormats[0]) {
					track = part1;
					artist = part2;
				} else {
					artist = part1;
					track = part2;
				}

				track = track.replace(/^["'“‘]|["'”’]$/g, '').trim();
				parsed = true;
				parseMethod = 'quoted';
				parseConfidence = 'high';
				break;
			}
		}

		// Helper functions for heuristic
		const promoTags = [
			'remix',
			'bootleg',
			'edit',
			'mix',
			'version',
			'audio',
			'official',
			'lyrics',
			'feat',
		];

		function looksLikeTrack(text) {
			const lower = text.toLowerCase();
			return promoTags.some((tag) => lower.includes(tag)) || /\(.+\)/.test(text);
		}

		function isSimilarToChannel(text, channel) {
			const cleanText = text.toLowerCase().replace(/[^a-z0-9]/g, '');
			const cleanChannel = channel.toLowerCase().replace(/[^a-z0-9]/g, '');
			return cleanText && cleanChannel && cleanText.includes(cleanChannel);
		}

		// Helper function to split text while respecting brackets and prioritizing spaced delimiters
		function splitRespectingBrackets(text, pattern) {
			const matches = [];
			let bracketDepth = 0;
			
			// Convert pattern to global regex if it isn't already
			const globalPattern = new RegExp(pattern.source, 'g');
			let match;
			let validMatches = [];
			
			// First pass: find all valid matches (outside brackets)
			let lastIndex = 0;
			bracketDepth = 0;
			
			while ((match = globalPattern.exec(text)) !== null) {
				// Count brackets before this match
				const beforeMatch = text.substring(lastIndex, match.index);
				for (const char of beforeMatch) {
					if (char === '(' || char === '[' || char === '{') bracketDepth++;
					if (char === ')' || char === ']' || char === '}') bracketDepth--;
				}
				
				// Only consider matches outside brackets
				if (bracketDepth === 0) {
					const hasSpaceBefore = match.index > 0 && /\s/.test(text[match.index - 1]);
					const hasSpaceAfter = match.index + match[0].length < text.length && /\s/.test(text[match.index + match[0].length]);
					
					// For dash patterns, check if this looks like a hyphenated name
					let isHyphenatedName = false;
					if (pattern.source.includes('-')) {
						const beforeText = text.substring(0, match.index);
						const afterText = text.substring(match.index + match[0].length);
						
						// Get the word before and after the dash
						const wordBefore = beforeText.match(/\S+$/)?.[0] || '';
						const wordAfter = afterText.match(/^\S+/)?.[0] || '';
						
						// Consider it a hyphenated name if:
						// 1. Both parts are relatively short (likely names)
						// 2. No spaces around the dash
						// 3. The first part looks like a name (starts with capital)
						isHyphenatedName = wordBefore.length <= 15 && 
										  wordAfter.length <= 15 && 
										  !hasSpaceBefore && 
										  !hasSpaceAfter &&
										  /^[A-Z]/.test(wordBefore) &&
										  /^[A-Z]/.test(wordAfter);
					}
					
					if (!isHyphenatedName) {
						validMatches.push({
							match: match,
							index: match.index,
							length: match[0].length,
							hasSpaceBefore: hasSpaceBefore,
							hasSpaceAfter: hasSpaceAfter
						});
					}
				}
				
				lastIndex = match.index + match[0].length;
			}
			
			if (validMatches.length === 0) {
				return [text]; // No valid matches found
			}
			
			// Prioritize matches with spaces on both sides, then at least one space
			let bestMatch = validMatches[0];
			for (const validMatch of validMatches) {
				// Prefer matches with spaces on both sides
				if (validMatch.hasSpaceBefore && validMatch.hasSpaceAfter) {
					if (!bestMatch.hasSpaceBefore || !bestMatch.hasSpaceAfter) {
						bestMatch = validMatch;
						break; // Found ideal match
					}
				}
				// If no perfect match yet, prefer matches with at least one space
				else if ((validMatch.hasSpaceBefore || validMatch.hasSpaceAfter) && 
						 (!bestMatch.hasSpaceBefore && !bestMatch.hasSpaceAfter)) {
					bestMatch = validMatch;
				}
			}
			
			const part1 = text.substring(0, bestMatch.index);
			const part2 = text.substring(bestMatch.index + bestMatch.length);
			return [part1, part2];
		}

		// Step 7: Pattern-based splitting if no quoted match
		if (!parsed) {
			const splitPatterns = [
				{ pattern: /-/, name: 'dash' },
				{ pattern: /\s*:\s*/, name: 'colon' },
				{ pattern: /\s+by\s+/i, name: 'by' },
				{ pattern: /\s+–\s+/, name: 'en-dash' },
				{ pattern: /\s+\|\s+/, name: 'pipe' },
				{ pattern: /\s+—\s+/, name: 'em-dash' },
			];

			for (const { pattern, name } of splitPatterns) {
				const parts = splitRespectingBrackets(title, pattern);
				if (parts.length === 2) {
					let part1 = parts[0].trim();
					let part2 = parts[1].trim();

					if (name === 'by') {
						// "Track by Artist" format
						track = part1;
						artist = part2;
					} else {
						// Heuristic to guess which is artist and which is track
						const part1IsTrack = looksLikeTrack(part1);
						const part2IsTrack = looksLikeTrack(part2);

						if (part1IsTrack && !part2IsTrack) {
							track = part1;
							artist = part2;
						} else if (!part1IsTrack && part2IsTrack) {
							artist = part1;
							track = part2;
						} else {
							// fallback to channel similarity check
							if (
								isSimilarToChannel(part1, channel) &&
								!isSimilarToChannel(part2, channel)
							) {
								artist = part1;
								track = part2;
							} else if (
								!isSimilarToChannel(part1, channel) &&
								isSimilarToChannel(part2, channel)
							) {
								artist = part2;
								track = part1;
							} else {
								// default assignment if no clear indicator
								artist = part1;
								track = part2;
							}
						}
					}
					parsed = true;
					parseMethod = `pattern:${name}`;
					parseConfidence = 'medium';
					break;
				}
			}
		}

		// Step 8: Channel name fallback if no artist
		if (!artist) {
			artist = channel
				.replace(/VEVO$/i, '')
				.replace(/Official$/i, '')
				.replace(/Music$/i, '')
				.replace(/Channel$/i, '')
				.replace(/Videos$/i, '')
				.replace(/TV$/i, '')
				.replace(/^[Tt]he /, '')
				.trim()
				.replace(/([a-z])([A-Z])/g, '$1 $2');
			track = title;
			parsed = true;
			parseMethod = 'fallback:channel';
			parseConfidence = 'low';
		}

		// Step 9: Channel name heuristic override (if confidence is low)
		if (parseConfidence === 'low' && artist && track) {
			const cleanChannel = channel
				.toLowerCase()
				.replace(emojiRegex, '')
				.replace(/[^a-z0-9]/gi, ' ')
				.replace(/\b(official|music|channel|tv|videos)\b/g, '')
				.replace(/\s+/g, ' ')
				.trim();

			const lowerArtist = artist.toLowerCase();
			const lowerTrack = track.toLowerCase();
			const titleIncludesChannel = title.toLowerCase().includes(cleanChannel);

			if (
				titleIncludesChannel &&
				cleanChannel.length > 0 &&
				!lowerArtist.includes(cleanChannel)
			) {
				artist = originalChannel.replace(emojiRegex, '').trim();
				parseMethod = 'adjusted:channel-match';
				parseConfidence = 'medium';
			}
		}

		// Step 10: Extract featuring info
		const featRegex = /\(?\s*(?:feat\.?|ft\.?|featuring)\s+([^)]+)\)?/i;

		const artistFeatMatch = artist.match(featRegex);
		if (artistFeatMatch) {
			featuring = artistFeatMatch[1].trim();
			artist = artist.replace(artistFeatMatch[0], '').trim();
		}

		const trackFeatMatch = track.match(featRegex);
		if (!featuring && trackFeatMatch) {
			featuring = trackFeatMatch[1].trim();
			track = track.replace(trackFeatMatch[0], '').trim();
		}

		// Step 11: Final whitespace cleanup
		track = track.replace(/\s{2,}/g, ' ').trim();
		artist = artist.replace(/\s{2,}/g, ' ').trim();
		if (featuring) featuring = featuring.replace(/\s{2,}/g, ' ').trim();

		// Step 12: Heuristic filter for clearly non-music titles
		const nonMusicIndicators = [
			'podcast',
			'interview',
			'trailer',
			'reaction',
			'review',
			'documentary',
			'episode',
			'vlog',
			'stand-up',
			'gameplay',
			"let's play",
			'shorts',
		];
		const positiveIndicators = [
			'music video',
			'official video',
			'official audio',
			'lyric video',
			'official track',
		];

		const titleNoBrackets = title.replace(/\([^()]*\)/g, '').trim();
		const wordCount = titleNoBrackets.split(/\s+/).length;
		const isLong = title.length > 100 || wordCount > 10;
		const hasNonMusicTag = nonMusicIndicators.some((tag) =>
			originalTitle.toLowerCase().includes(tag)
		);
		const hasMusicSignal = positiveIndicators.some((tag) =>
			originalTitle.toLowerCase().includes(tag)
		);

		if (parsed && isLong && hasNonMusicTag && !hasMusicSignal) {
			parsed = false;
			parseConfidence = 'low';
			parseMethod = 'filtered:non-music';
		}

		return {
			artist,
			featuring,
			track,
			originalTitle,
			originalChannel: channel,
			parsed,
			parseMethod,
			parseConfidence,
		};
	}

	/**
	 * Parses a duration string (e.g., "HH:MM:SS", "MM:SS", "SS") into total seconds.
	 * @param {string} durationString - The duration string to parse.
	 * @returns {number} The total duration in seconds, or 0 if parsing fails or input is invalid.
	 */
	static parseDurationStringToSeconds(durationString) {
		if (!durationString || typeof durationString !== 'string') {
			return 0;
		}
		const parts = durationString.split(':').map(Number);
		let seconds = 0;
		if (parts.length === 3) {
			// HH:MM:SS
			if (!isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
				seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
			}
		} else if (parts.length === 2) {
			// MM:SS
			if (!isNaN(parts[0]) && !isNaN(parts[1])) {
				seconds = parts[0] * 60 + parts[1];
			}
		} else if (parts.length === 1) {
			// SS
			if (!isNaN(parts[0])) {
				seconds = parts[0];
			}
		}
		return seconds > 0 ? seconds : 0; // Ensure non-negative result
	}

	/**
	 * Generates standard YouTube thumbnail URL
	 * @param {string} videoId
	 * @returns {string}
	 */
	static getStandardThumbnailUrl(videoId) {
		return videoId ? `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg` : '';
	}
}

/**
 * Color manipulation utilities
 */
class ColorUtils {
	/**
	 * Converts hex color to rgba with specified alpha
	 * @param {string} hex - Hex color string
	 * @param {number} alpha - Alpha value (0-1)
	 * @returns {string} RGBA color string
	 */
	static hexToRgba(hex, alpha) {
		const r = Number.parseInt(hex.slice(1, 3), 16);
		const g = Number.parseInt(hex.slice(3, 5), 16);
		const b = Number.parseInt(hex.slice(5, 7), 16);
		return `rgba(${r}, ${g}, ${b}, ${alpha})`;
	}

	/**
	 * Converts a hex color string to an RGB array.
	 * @param {string} hex - Hex color string (e.g., "#RRGGBB" or "RRGGBB").
	 * @returns {number[]} An array containing the R, G, and B values.
	 */
	static hexToRgb(hex) {
		hex = hex.replace(/^#/, '');
		const bigint = parseInt(hex, 16);
		return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
	}

	/**
	 * Converts an RGB color to HSL.
	 * @param {number} r - Red value (0-255).
	 * @param {number} g - Green value (0-255).
	 * @param {number} b - Blue value (0-255).
	 * @returns {number[]} An array containing the H, S, and L values (0-1).
	 */
	static rgbToHsl(r, g, b) {
		r /= 255;
		g /= 255;
		b /= 255;
		const max = Math.max(r, g, b),
			min = Math.min(r, g, b);
		let h = 0,
			s = 0,
			l = (max + min) / 2;

		if (max !== min) {
			const d = max - min;
			s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
			switch (max) {
				case r:
					h = (g - b) / d + (g < b ? 6 : 0);
					break;
				case g:
					h = (b - r) / d + 2;
					break;
				case b:
					h = (r - g) / d + 4;
					break;
			}
			h /= 6;
		}
		return [h, s, l];
	}

	/**
	 * Converts an RGB color array to a hex string, with a safety check to avoid protected colors.
	 * If the color is too close to a protected color, it will be nudged away.
	 * @param {number[]} rgb - An array containing the R, G, and B values.
	 * @returns {string} The hex color string.
	 */
	static rgbToHexSafe([r, g, b]) {
		let adjusted = [r, g, b];

		const protectedColors = [
			[255, 255, 255], // white
			[56, 56, 56], // dark gray (#383838)
			[0, 0, 0], // black
		];
		const PROTECTED_DISTANCE = 40; // Threshold (0–441 max in RGB space)

		// If too close to a protected color, adjust
		for (const pColor of protectedColors) {
			const dist = ColorUtils.colorDistance(adjusted, pColor);
			if (dist < PROTECTED_DISTANCE) {
				adjusted = ColorUtils.nudgeColorAway(
					adjusted,
					pColor,
					PROTECTED_DISTANCE - dist + 10
				);
			}
		}

		return ColorUtils.rgbToHex(adjusted);
	}

	/**
	 * Converts an RGB color array to a hex string.
	 * @param {number[]} rgb - An array containing the R, G, and B values.
	 * @returns {string} The hex color string.
	 */
	static rgbToHex([r, g, b]) {
		return (
			'#' +
			[r, g, b]
				.map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0'))
				.join('')
		);
	}

	/**
	 * Calculates the Euclidean distance between two RGB colors.
	 * @param {number[]} rgb1 - The first RGB color array.
	 * @param {number[]} rgb2 - The second RGB color array.
	 * @returns {number} The distance between the two colors.
	 */
	static colorDistance([r1, g1, b1], [r2, g2, b2]) {
		const dr = r1 - r2,
			dg = g1 - g2,
			db = b1 - b2;
		return Math.sqrt(dr * dr + dg * dg + db * db);
	}

	/**
	 * Nudges a color away from a protected color in RGB space.
	 * @param {number[]} rgb - The original RGB color array.
	 * @param {number[]} pColor - The protected RGB color array.
	 * @param {number} [strength=20] - The strength of the nudge.
	 * @returns {number[]} The nudged RGB color array.
	 */
	static nudgeColorAway([r, g, b], [pr, pg, pb], strength = 20) {
		const angle = Math.atan2(g - pg, r - pr); // move away in 2D plane
		const dx = Math.cos(angle) * strength;
		const dy = Math.sin(angle) * strength;

		// Nudge R and G (preserves perceptual shift without going neon)
		let nr = Math.min(255, Math.max(0, Math.round(r + dx)));
		let ng = Math.min(255, Math.max(0, Math.round(g + dy)));
		let nb = b; // Leave B unchanged unless you'd like full RGB push

		return [nr, ng, nb];
	}

	/**
	 * Lightens an RGB color by a given factor.
	 * @param {number[]} rgb - The RGB color array.
	 * @param {number} [factor=0.25] - The lightening factor (0-1).
	 * @returns {number[]} The lighter RGB color array.
	 */
	static getLighterColor([r, g, b], factor = 0.25) {
		const lighten = (c) => Math.min(255, Math.round(c + (255 - c) * factor));
		return [lighten(r), lighten(g), lighten(b)];
	}

	/**
	 * Extracts the dominant color and a lighter variant from an image
	 * @param {string} imgSrc - The source URL of the image
	 * @returns {Promise<{primary: string, secondary: string}>}
	 */
	static getAdaptiveColorFromThumbnail(imgSrc) {
		return new Promise(async (resolve, reject) => {
			try {
				// Use fetch API to bypass CORS issues in Firefox
				// Extension host permissions allow cross-origin requests
				const response = await fetch(imgSrc);
				if (!response.ok) {
					throw new Error(`Failed to fetch image: ${response.status}`);
				}

				const blob = await response.blob();
				const imageBitmap = await createImageBitmap(blob);

				const sampleSize = 40;
				const canvas = document.createElement('canvas');
				canvas.width = sampleSize;
				canvas.height = sampleSize;

				const ctx = canvas.getContext('2d');
				ctx.filter = 'blur(1px)';
				ctx.drawImage(imageBitmap, 0, 0, sampleSize, sampleSize);

				const { data } = ctx.getImageData(0, 0, sampleSize, sampleSize);

				let bestScore = -1;
				let vibrantColor = [0, 0, 0];

				for (let i = 0; i < data.length; i += 4) {
					const r = data[i];
					const g = data[i + 1];
					const b = data[i + 2];
					const a = data[i + 3];

					if (a < 128) continue;

					const [h, s, l] = ColorUtils.rgbToHsl(r, g, b);
					if (s < 0.3 || l < 0.2 || l > 0.8) continue;

					const score = s * (1 - Math.abs(l - 0.5));
					if (score > bestScore) {
						bestScore = score;
						vibrantColor = [r, g, b];
					}
				}

				const lighterColor = ColorUtils.getLighterColor(vibrantColor);
				let resultColor = {
					primary: ColorUtils.rgbToHexSafe(vibrantColor),
					secondary: ColorUtils.rgbToHexSafe(lighterColor),
				};

				resolve(resultColor);
			} catch (error) {
				reject(error);
			}
		});
	}
}

/**
 * Enhanced page detection utilities
 */
const PageUtils = {
	isVideoWatchPage: () => window.location.pathname === '/watch',
	isPlaylistPage: () => {
		if (!PageUtils.isVideoWatchPage()) return false;
		const urlParams = new URLSearchParams(window.location.search);
		return urlParams.has('list');
	},
	getCurrentVideoIdFromUrl: () => {
		if (!PageUtils.isVideoWatchPage()) return null;
		const urlParams = new URLSearchParams(window.location.search);
		return urlParams.get('v');
	},
	getCurrentPlaylistIdFromUrl: () => {
		if (!PageUtils.isPlaylistPage()) return null;
		const urlParams = new URLSearchParams(window.location.search);
		return urlParams.get('list');
	},
	getCurrentUrl: () => {
		return window.location.href
			.replace(/([?&])(?!v=|list=)[^&=]+=[^&]*&?/g, '$1') // Remove all query params except v= and list=
			.replace(/[?&]$/, '') // Remove trailing & or ?
			.replace(/#.*$/, ''); // Remove fragment/hash
	},
};

/**
 * Device detection utilities
 */
const DeviceUtils = {
	/**
	 * Detects if the current browser is running on a mobile device
	 * @returns {boolean} True if mobile device, false otherwise
	 */
	isMobile: () => {
		const userAgent = navigator.userAgent.toLowerCase();
		const mobileKeywords = ['android', 'mobile', 'opera mini'];

		// Check user agent for mobile keywords
		const hasMobileKeyword = mobileKeywords.some((keyword) => userAgent.includes(keyword));

		// Check for touch capability and screen size
		const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
		const hasSmallScreen = window.screen.width <= 768 || window.innerWidth <= 768;

		return hasMobileKeyword || (isTouchDevice && hasSmallScreen);
	},
};

/**
 * String utilities for text processing
 */
const StringUtils = {
	/**
	 * Strips "mix - " prefix from mix titles for display purposes
	 * Only applies to original titles, not edited/custom titles
	 * @param {string} title - The title to process
	 * @param {boolean} isOriginalTitle - Whether this is the original title (not edited)
	 * @returns {string} The processed title with mix prefix removed if applicable
	 */
	stripMixPrefix: (title, isOriginalTitle = true) => {
		// Only strip prefix from original titles, not edited ones
		if (!isOriginalTitle || !title) return title;
		
		// Don't strip from "my mix" patterns
		if (/^my\s+mix/i.test(title)) return title;
		
		// Strip "mix - " prefix (handles various dash types and spacing)
		return title.replace(/^mix\s*[-–—]\s*/i, '');
	},
};
