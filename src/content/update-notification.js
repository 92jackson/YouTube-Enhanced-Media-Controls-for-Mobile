/**
 * Update Notification System
 * Shows a mobile-friendly toast notification when the extension is updated
 */

class UpdateNotification {
	constructor() {
		this.notificationElement = null;
		this.isVisible = false;
		this.autoHideTimeout = null;
		this.currentVersion = null;
	}

	/**
	 * Initialize the update notification system
	 */
	async init() {
		try {
			// Get current version
			this.currentVersion = await VersionUtils.getCurrentVersion();

			// Check if we should show notification
			if (this.shouldShowNotification()) {
				// Wait a bit for page to load, then show notification
				setTimeout(() => {
					this.showNotification();
				}, 3000); // 3 second delay
			}
		} catch (error) {
			logger.error('UpdateNotification', 'Failed to initialize:', error);
		}
	}

	/**
	 * Check if notification should be shown
	 */
	shouldShowNotification() {
		// Check if user has disabled notifications
		if (!userSettings?.showUpdateNotifications) {
			return false;
		}

		// Check if this is a significant update (not just a patch)
		const lastVersion = userSettings?.lastKnownVersion || '0.0.0';
		return VersionUtils.isSignificantUpdate(lastVersion, this.currentVersion);
	}

	/**
	 * Create and show the notification
	 */
	showNotification() {
		if (this.isVisible) return;

		// Create notification element
		this.createNotificationElement();

		// Add to page
		document.body.appendChild(this.notificationElement);

		// Show with animation
		requestAnimationFrame(() => {
			this.notificationElement.classList.add('show');
			this.isVisible = true;

			// Reset and start progress animation
			const progressFill = this.notificationElement.querySelector(
				'.yt-update-notification-progress-fill'
			);
			if (progressFill) {
				// Reset animation
				progressFill.style.animation = 'none';
				progressFill.offsetHeight; // Trigger reflow
				progressFill.style.animation = 'progressFill 30s linear forwards';
			}

			// Auto-hide after 30 seconds
			this.autoHideTimeout = setTimeout(() => {
				this.hideNotification();
			}, 30000);
		});

		logger.log(
			'UpdateNotification',
			'Showing update notification for version:',
			this.currentVersion
		);
	}

	/**
	 * Create the notification element using safe DOM methods
	 */
	createNotificationElement() {
		// Create main notification container
		this.notificationElement = document.createElement('div');
		this.notificationElement.className = 'yt-update-notification';

		// Create progress bar for auto-dismiss animation
		const progressBar = document.createElement('div');
		progressBar.className = 'yt-update-notification-progress';

		const progressFill = document.createElement('div');
		progressFill.className = 'yt-update-notification-progress-fill';
		progressBar.appendChild(progressFill);

		this.notificationElement.appendChild(progressBar);

		// Create notification content
		const notificationContent = document.createElement('div');
		notificationContent.className = 'yt-update-notification-content';

		// Create logo container
		const logoContainer = document.createElement('div');
		logoContainer.className = 'yt-update-notification-logo';

		const logoImg = document.createElement('img');
		logoImg.src = chrome.runtime.getURL('assets/logo.png');
		logoImg.alt = 'Extension Logo';
		logoImg.className = 'yt-update-notification-logo-img';

		logoContainer.appendChild(logoImg);

		// Create text content
		const textContent = document.createElement('div');
		textContent.className = 'yt-update-notification-text';

		// Create title
		const title = document.createElement('div');
		title.className = 'yt-update-notification-title';
		title.textContent = `Updated to version ${this.currentVersion}`;

		// Create notice
		const notice = document.createElement('div');
		notice.className = 'yt-update-notification-notice';
		notice.textContent = 'Check the settings to see new options';

		textContent.appendChild(title);
		textContent.appendChild(notice);

		// Create buttons container
		const buttonsContainer = document.createElement('div');
		buttonsContainer.className = 'yt-update-notification-buttons';

		// Create close button
		const closeButton = document.createElement('button');
		closeButton.className = 'yt-update-notification-close';
		closeButton.innerHTML = '✕';
		closeButton.setAttribute('aria-label', 'Close notification');
		closeButton.addEventListener('click', () => this.hideNotification());

		// Create GitHub changelog button
		const githubButton = document.createElement('button');
		githubButton.className = 'yt-update-notification-github';
		githubButton.innerHTML = `
			<span>Changelog</span>
			<svg class="yt-update-notification-external-icon" width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
				<path d="M3.5 3C3.22386 3 3 3.22386 3 3.5C3 3.77614 3.22386 4 3.5 4H4.5C4.77614 4 5 4.22386 5 4.5C5 4.77614 4.77614 5 4.5 5H3.5C2.67157 5 2 4.32843 2 3.5C2 2.67157 2.67157 2 3.5 2H8.5C9.32843 2 10 2.67157 10 3.5V8.5C10 9.32843 9.32843 10 8.5 10H3.5C2.67157 10 2 9.32843 2 8.5V7.5C2 7.22386 2.22386 7 2.5 7C2.77614 7 3 7.22386 3 7.5V8.5C3 8.77614 3.22386 9 3.5 9H8.5C8.77614 9 9 8.77614 9 8.5V3.5C9 3.22386 8.77614 3 8.5 3H3.5Z" fill="currentColor"/>
				<path d="M6 2.5C6 2.22386 6.22386 2 6.5 2H9.5C9.77614 2 10 2.22386 10 2.5V5.5C10 5.77614 9.77614 6 9.5 6C9.22386 6 9 5.77614 9 5.5V3.70711L6.35355 6.35355C6.15829 6.54882 5.84171 6.54882 5.64645 6.35355C5.45118 6.15829 5.45118 5.84171 5.64645 5.64645L8.29289 3H6.5C6.22386 3 6 2.77614 6 2.5Z" fill="currentColor"/>
			</svg>
		`;
		githubButton.addEventListener('click', () => {
			window.open(
				'https://github.com/92jackson/YouTube-Enhanced-Media-Controls-for-Mobile/releases',
				'_blank'
			);
			this.hideNotification();
		});

		buttonsContainer.appendChild(githubButton);
		buttonsContainer.appendChild(closeButton);

		// Assemble the notification
		notificationContent.appendChild(logoContainer);
		notificationContent.appendChild(textContent);
		notificationContent.appendChild(buttonsContainer);

		this.notificationElement.appendChild(notificationContent);

		// Add click outside to close
		this.notificationElement.addEventListener('click', (e) => {
			if (e.target === this.notificationElement) {
				this.hideNotification();
			}
		});
	}

	/**
	 * Hide the notification
	 */
	hideNotification() {
		if (!this.isVisible) return;

		clearTimeout(this.autoHideTimeout);

		this.notificationElement.classList.remove('show');

		setTimeout(() => {
			if (this.notificationElement && this.notificationElement.parentNode) {
				this.notificationElement.parentNode.removeChild(this.notificationElement);
			}
			this.isVisible = false;

			// Update last known version in settings
			this.updateLastKnownVersion();
		}, 300);
	}

	/**
	 * Update the last known version in user settings
	 */
	async updateLastKnownVersion() {
		try {
			const storageApi =
				typeof browser !== 'undefined' && browser.storage
					? browser.storage
					: typeof chrome !== 'undefined' && chrome.storage
					? chrome.storage
					: null;

			if (storageApi && storageApi.local) {
				await storageApi.local.set({
					lastKnownVersion: this.currentVersion,
				});

				// Update local userSettings object
				if (window.userSettings) {
					window.userSettings.lastKnownVersion = this.currentVersion;
				}
			}
		} catch (error) {
			logger.error('UpdateNotification', 'Failed to update last known version:', error);
		}
	}

	/**
	 * Open the extension settings page
	 * CURRENTLY UNUSED- INCOMPATIBLE WITH EDGE(?)
	 */
	openSettingsPage() {
		// Send message to background script to open options page
		chrome.runtime.sendMessage({ action: 'openOptionsPage' }, (response) => {
			if (chrome.runtime.lastError) {
				logger.error(
					'UpdateNotification',
					'Failed to open settings page:',
					chrome.runtime.lastError
				);
			} else if (response && !response.success) {
				logger.error('UpdateNotification', 'Failed to open settings page:', response.error);
			} else {
				logger.log('UpdateNotification', 'Settings page opened successfully');
			}
		});
	}
}

// Initialize the update notification system
window.updateNotification = new UpdateNotification();
