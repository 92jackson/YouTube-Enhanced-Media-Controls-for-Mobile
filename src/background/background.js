// background.js – Minimal version

const RULESET_ID = 'ua-override';

// Toggle the spoofing rule on or off
function updateSpoofing(enabled) {
	chrome.declarativeNetRequest.updateEnabledRulesets(
		{
			enableRulesetIds: enabled ? [RULESET_ID] : [],
			disableRulesetIds: enabled ? [] : [RULESET_ID],
		},
		() => {
			if (chrome.runtime.lastError) {
				console.error('[YT-EMC] UA spoof update failed:', chrome.runtime.lastError);
			} else {
				console.log(`[YT-EMC] UA spoofing ${enabled ? 'enabled' : 'disabled'}`);
			}
		}
	);
}

// Load stored setting and apply it
function applyStoredSetting() {
	chrome.storage.local.get('spoofUserAgent', ({ spoofUserAgent = false }) => {
		updateSpoofing(spoofUserAgent);
	});
}

// Listen for changes to the setting
chrome.storage.onChanged.addListener((changes, area) => {
	if (area === 'local' && changes.spoofUserAgent) {
		updateSpoofing(changes.spoofUserAgent.newValue === true);
	}
	if (area === 'local' && changes.lastKnownVersion) {
		evaluateIconState();
	}
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (message.action === 'openOptionsPage') {
		// Open the extension options page
		chrome.runtime.openOptionsPage((result) => {
			if (chrome.runtime.lastError) {
				console.error('[YT-EMC] Failed to open options page:', chrome.runtime.lastError);
				sendResponse({ success: false, error: chrome.runtime.lastError.message });
			} else {
				console.log('[YT-EMC] Options page opened successfully');
				sendResponse({ success: true });
			}
		});
		return true; // Indicate we will send a response asynchronously
	}

	if (message.action === 'downloadLogs') {
		try {
			// Detect browser type and use appropriate method
			const isFirefox =
				typeof browser !== 'undefined' || navigator.userAgent.includes('Firefox');

			if (isFirefox) {
				// Firefox: Use browser.downloads API with blob URL created in background context
				// This works because we're in the background script context, not content script
				if (typeof URL !== 'undefined' && URL.createObjectURL) {
					const blob = new Blob([message.logContent], {
						type: 'text/plain;charset=utf-8',
					});
					const blobUrl = URL.createObjectURL(blob);

					const downloadApi =
						typeof browser !== 'undefined' ? browser.downloads : chrome.downloads;
					downloadApi
						.download({
							url: blobUrl,
							filename: message.filename || 'debug-logs.txt',
							saveAs: true,
						})
						.then((downloadId) => {
							URL.revokeObjectURL(blobUrl);
							console.log('[YT-EMC] Download started with ID:', downloadId);
							sendResponse({ success: true, downloadId: downloadId });
						})
						.catch((error) => {
							URL.revokeObjectURL(blobUrl);
							console.error('[YT-EMC] Download failed:', error);
							sendResponse({
								success: false,
								error: error.message || error.toString(),
							});
						});
				} else {
					// Fallback: Use data URL for Firefox if blob URL not available
					const base64Content = btoa(unescape(encodeURIComponent(message.logContent)));
					const dataUrl = `data:text/plain;charset=utf-8;base64,${base64Content}`;

					const downloadApi =
						typeof browser !== 'undefined' ? browser.downloads : chrome.downloads;
					downloadApi
						.download({
							url: dataUrl,
							filename: message.filename || 'debug-logs.txt',
							saveAs: true,
						})
						.then((downloadId) => {
							console.log('[YT-EMC] Download started with ID:', downloadId);
							sendResponse({ success: true, downloadId: downloadId });
						})
						.catch((error) => {
							console.error('[YT-EMC] Download failed:', error);
							sendResponse({
								success: false,
								error: error.message || error.toString(),
							});
						});
				}
			} else {
				// Chrome: Use data URL approach (service worker compatible)
				const base64Content = btoa(unescape(encodeURIComponent(message.logContent)));
				const dataUrl = `data:text/plain;charset=utf-8;base64,${base64Content}`;

				chrome.downloads.download(
					{
						url: dataUrl,
						filename: message.filename || 'debug-logs.txt',
						saveAs: true,
					},
					(downloadId) => {
						if (chrome.runtime.lastError) {
							console.error('[YT-EMC] Download failed:', chrome.runtime.lastError);
							sendResponse({
								success: false,
								error: chrome.runtime.lastError.message,
							});
						} else {
							console.log('[YT-EMC] Download started with ID:', downloadId);
							sendResponse({ success: true, downloadId: downloadId });
						}
					}
				);
			}

			// Return true to indicate we will send a response asynchronously
			return true;
		} catch (error) {
			console.error('[YT-EMC] Download error:', error);
			sendResponse({ success: false, error: error.message });
		}
	}
});

// Run once on startup
applyStoredSetting();

function parseVersion(v) {
	return String(v)
		.split('.')
		.map((n) => parseInt(n, 10) || 0);
}

function isSignificantUpdate(oldVersion, newVersion) {
	const o = parseVersion(oldVersion);
	const n = parseVersion(newVersion);
	return o[0] !== n[0] || o[1] !== n[1];
}

function setNewFeaturesBadge(active) {
	if (chrome.action && chrome.action.setBadgeText) {
		chrome.action.setBadgeText({ text: active ? 'NEW' : '' });
		if (chrome.action.setBadgeBackgroundColor) {
			chrome.action.setBadgeBackgroundColor({ color: active ? '#D93025' : [0, 0, 0, 0] });
		}
	}
}

async function evaluateIconState() {
	try {
		const current = chrome.runtime.getManifest().version;
		const { lastKnownVersion = '0.0.0' } = await chrome.storage.local.get('lastKnownVersion');
		const active = isSignificantUpdate(lastKnownVersion, current);
		setNewFeaturesBadge(active);
	} catch (e) {}
}

chrome.runtime.onInstalled.addListener(() => {
	evaluateIconState();
});

chrome.runtime.onStartup.addListener(() => {
	evaluateIconState();
});
