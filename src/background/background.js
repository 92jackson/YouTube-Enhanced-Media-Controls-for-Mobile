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
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (message.action === 'downloadLogs') {
		try {
			// Detect browser type and use appropriate method
			const isFirefox = typeof browser !== 'undefined' || navigator.userAgent.includes('Firefox');
			
			if (isFirefox) {
				// Firefox: Use browser.downloads API with blob URL created in background context
				// This works because we're in the background script context, not content script
				if (typeof URL !== 'undefined' && URL.createObjectURL) {
					const blob = new Blob([message.logContent], { type: 'text/plain;charset=utf-8' });
					const blobUrl = URL.createObjectURL(blob);
					
					const downloadApi = typeof browser !== 'undefined' ? browser.downloads : chrome.downloads;
					downloadApi.download({
						url: blobUrl,
						filename: message.filename || 'debug-logs.txt',
						saveAs: true
					}).then((downloadId) => {
						URL.revokeObjectURL(blobUrl);
						console.log('[YT-EMC] Download started with ID:', downloadId);
						sendResponse({ success: true, downloadId: downloadId });
					}).catch((error) => {
						URL.revokeObjectURL(blobUrl);
						console.error('[YT-EMC] Download failed:', error);
						sendResponse({ success: false, error: error.message || error.toString() });
					});
				} else {
					// Fallback: Use data URL for Firefox if blob URL not available
					const base64Content = btoa(unescape(encodeURIComponent(message.logContent)));
					const dataUrl = `data:text/plain;charset=utf-8;base64,${base64Content}`;
					
					const downloadApi = typeof browser !== 'undefined' ? browser.downloads : chrome.downloads;
					downloadApi.download({
						url: dataUrl,
						filename: message.filename || 'debug-logs.txt',
						saveAs: true
					}).then((downloadId) => {
						console.log('[YT-EMC] Download started with ID:', downloadId);
						sendResponse({ success: true, downloadId: downloadId });
					}).catch((error) => {
						console.error('[YT-EMC] Download failed:', error);
						sendResponse({ success: false, error: error.message || error.toString() });
					});
				}
			} else {
				// Chrome: Use data URL approach (service worker compatible)
				const base64Content = btoa(unescape(encodeURIComponent(message.logContent)));
				const dataUrl = `data:text/plain;charset=utf-8;base64,${base64Content}`;
				
				chrome.downloads.download({
					url: dataUrl,
					filename: message.filename || 'debug-logs.txt',
					saveAs: true
				}, (downloadId) => {
					if (chrome.runtime.lastError) {
						console.error('[YT-EMC] Download failed:', chrome.runtime.lastError);
						sendResponse({ success: false, error: chrome.runtime.lastError.message });
					} else {
						console.log('[YT-EMC] Download started with ID:', downloadId);
						sendResponse({ success: true, downloadId: downloadId });
					}
				});
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
