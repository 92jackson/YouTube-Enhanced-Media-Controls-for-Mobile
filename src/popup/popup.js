// Load version number from manifest
function loadVersionNumber() {
	fetch(chrome.runtime.getURL('manifest.json'))
		.then(response => response.json())
		.then(manifest => {
			const versionElement = document.querySelector('.version-text');
			if (versionElement && manifest.version) {
				versionElement.textContent = `v${manifest.version}`;
			}
		})
		.catch(error => {
			console.error('Failed to load version from manifest:', error);
			const versionElement = document.querySelector('.version-text');
			if (versionElement) {
				versionElement.textContent = 'Version unavailable';
			}
		});
}

// Open settings page
function openSettings() {
	chrome.runtime.openOptionsPage();
	// Close the popup after opening settings
	window.close();
}

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
	loadVersionNumber();
	
	// Add event listener to settings button
	const settingsButton = document.getElementById('open-settings');
	if (settingsButton) {
		settingsButton.addEventListener('click', openSettings);
	}
});