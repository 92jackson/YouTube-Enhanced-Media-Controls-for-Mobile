// Desktop YouTube Banner - Informs users about mobile-only functionality

(async function () {
	// Prevent multiple banner injections
	if (document.getElementById('ytemc-desktop-banner')) {
		return;
	}

	// Load user settings and check if banner should be hidden
	await window.loadUserSettings();
	if (window.userSettings.alwaysHideDesktopBanner) {
		return;
	}

	// Create banner elements using createElement
	function createBanner() {
		// Main banner container
		const banner = document.createElement('div');
		banner.id = 'ytemc-desktop-banner';

		// Content container
		const contentDiv = document.createElement('div');
		contentDiv.className = 'ytemc-banner-content';

		// Logo
		const logo = document.createElement('img');
		logo.className = 'ytemc-banner-logo';
		logo.src = (typeof browser !== 'undefined' ? browser : chrome).runtime.getURL(
			'/assets/logo.png'
		);
		logo.alt = 'YouTube Enhanced Media Controls';

		// Text container
		const textDiv = document.createElement('div');
		textDiv.className = 'ytemc-banner-text';

		// Main text
		const strongText = document.createElement('strong');
		strongText.textContent = 'YouTube Enhanced Media Controls';
		const mainText = document.createTextNode(' is designed exclusively for m.youtube.com');
		const lineBreak = document.createElement('br');
		const subText = document.createTextNode(
			'and is optimised for Android devices held vertically.'
		);

		textDiv.appendChild(strongText);
		textDiv.appendChild(mainText);
		textDiv.appendChild(lineBreak);
		textDiv.appendChild(subText);

		// Check if device is mobile
		const isMobile = window.DeviceUtils ? window.DeviceUtils.isMobile() : false;

		// Mobile YouTube actions container
		const mobileActionsDiv = document.createElement('div');
		mobileActionsDiv.className = 'ytemc-banner-mobile-actions';

		// User agent spoofing checkbox (only for non-mobile devices)
		let spoofCheckbox = null;
		if (!isMobile) {
			const checkboxContainer = document.createElement('div');
			checkboxContainer.className = 'ytemc-banner-checkbox-container';

			spoofCheckbox = document.createElement('input');
			spoofCheckbox.type = 'checkbox';
			spoofCheckbox.id = 'ytemc-spoof-checkbox';
			spoofCheckbox.checked = true; // Pre-selected

			const checkboxLabel = document.createElement('label');
			checkboxLabel.htmlFor = 'ytemc-spoof-checkbox';
			checkboxLabel.appendChild(
				document.createTextNode('Prevent YouTube from sending you back here')
			);
			checkboxLabel.title =
				'Keeps you on the mobile site by making your device appear as a mobile.';

			checkboxContainer.appendChild(spoofCheckbox);
			checkboxContainer.appendChild(checkboxLabel);
			mobileActionsDiv.appendChild(checkboxContainer);
		}

		// Mobile YouTube link
		const mobileLink = document.createElement('a');
		mobileLink.href = 'https://m.youtube.com';
		mobileLink.className = 'ytemc-banner-link';
		mobileLink.textContent = 'Go to Mobile YouTube';

		// Add click handler for mobile link
		mobileLink.addEventListener('click', async (e) => {
			e.preventDefault();

			// Determine spoof setting: use checkbox value if it exists, otherwise false
			const shouldSpoof = spoofCheckbox ? spoofCheckbox.checked : false;

			// Save spoof setting
			await window.saveUserSetting('spoofUserAgent', shouldSpoof);
			// Redirect to mobile YouTube
			window.location.href = 'https://m.youtube.com';
		});

		mobileActionsDiv.appendChild(mobileLink);

		// Banner controls container (close/hide)
		const controlsDiv = document.createElement('div');
		controlsDiv.className = 'ytemc-banner-controls';

		// Don't show again checkbox
		const hideCheckboxContainer = document.createElement('div');
		hideCheckboxContainer.className = 'ytemc-banner-checkbox-container';

		const hideCheckbox = document.createElement('input');
		hideCheckbox.type = 'checkbox';
		hideCheckbox.id = 'ytemc-hide-checkbox';

		const hideCheckboxLabel = document.createElement('label');
		hideCheckboxLabel.htmlFor = 'ytemc-hide-checkbox';
		hideCheckboxLabel.textContent = "Don't show again";
		hideCheckboxLabel.title = 'Hide banner permanently.';

		hideCheckboxContainer.appendChild(hideCheckbox);
		hideCheckboxContainer.appendChild(hideCheckboxLabel);

		// Close button
		const closeButton = document.createElement('button');
		closeButton.id = 'ytemc-close-banner';
		closeButton.className = 'ytemc-banner-close';
		closeButton.textContent = '×';
		closeButton.title = 'Close banner';

		controlsDiv.appendChild(hideCheckboxContainer);
		controlsDiv.appendChild(closeButton);

		// Assemble the banner
		contentDiv.appendChild(logo);
		contentDiv.appendChild(textDiv);
		banner.appendChild(contentDiv);
		banner.appendChild(mobileActionsDiv);
		banner.appendChild(controlsDiv);

		return { banner, closeButton, hideCheckbox };
	}

	// Add close functionality
	async function closeBanner(hideCheckbox) {
		const bannerElement = document.getElementById('ytemc-desktop-banner');
		if (bannerElement) {
			// Remove visible class to trigger slide-up animation
			bannerElement.classList.remove('ytemc-banner-visible');

			// Remove body class to animate padding
			document.body.classList.remove('ytemc-banner-active');

			setTimeout(() => {
				bannerElement.remove();
				// Reset body padding
				document.body.style.paddingTop = '';
			}, 400); // Match CSS transition duration

			// Only save permanent setting if checkbox is checked
			if (hideCheckbox && hideCheckbox.checked) {
				await window.saveUserSetting('alwaysHideDesktopBanner', true);
			}
		}
	}

	// Inject banner and set up animations
	function injectBanner() {
		const { banner, closeButton, hideCheckbox } = createBanner();

		// Add banner to page (initially hidden)
		document.body.appendChild(banner);

		// Get banner height for body padding
		const bannerHeight = banner.offsetHeight;

		// Add body class and set padding for smooth animation
		document.body.classList.add('ytemc-banner-active');
		document.body.style.paddingTop = bannerHeight + 'px';

		// Trigger slide-down animation
		requestAnimationFrame(() => {
			banner.classList.add('ytemc-banner-visible');
		});

		// Add close event listener with hideCheckbox parameter
		closeButton.addEventListener('click', () => closeBanner(hideCheckbox));
	}

	// Wait for page to be ready
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', injectBanner);
	} else {
		injectBanner();
	}
})();
