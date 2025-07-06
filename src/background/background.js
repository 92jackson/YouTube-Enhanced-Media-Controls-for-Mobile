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

// Run once on startup
applyStoredSetting();
