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
	chrome.storage.local.get(
		'spoofUserAgentWhenCrossPlatform',
		({ spoofUserAgentWhenCrossPlatform = true }) => {
			updateSpoofing(spoofUserAgentWhenCrossPlatform === true);
		}
	);
}

// Listen for changes to the setting
chrome.storage.onChanged.addListener((changes, area) => {
	if (area === 'local' && changes.spoofUserAgentWhenCrossPlatform) {
		updateSpoofing(changes.spoofUserAgentWhenCrossPlatform.newValue === true);
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
