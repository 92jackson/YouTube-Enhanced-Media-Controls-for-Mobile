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
			// Convert log data to base64 for data URI
			const base64Data = btoa(unescape(encodeURIComponent(message.logData)));
			
			// Create data URI
			const dataUri = `data:text/plain;base64,${base64Data}`;
			
			// Download the file using data URI
			chrome.downloads.download({
				url: dataUri,
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
