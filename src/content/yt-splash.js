// yt-splash.js
(function () {
	let isSnapshotNavigation = false;
	try {
		isSnapshotNavigation = !!window.sessionStorage?.getItem('mc_activeMixSnapshotId');
	} catch (error) {
		void error;
	}

	let snapshotSplashMode = 'spinner';
	try {
		const fromSession = window.sessionStorage?.getItem('mc_snapshotSplashMode');
		if (fromSession) snapshotSplashMode = fromSession;
	} catch (error) {
		void error;
	}
	if (
		snapshotSplashMode !== 'standard' &&
		snapshotSplashMode !== 'spinner' &&
		snapshotSplashMode !== 'none'
	) {
		snapshotSplashMode = 'spinner';
	}

	if (isSnapshotNavigation && snapshotSplashMode === 'none') {
		return;
	}

	let splashScreenMode = 'default';
	try {
		const fromSession = window.sessionStorage?.getItem('mc_splashMode');
		const fromLocal = fromSession ? null : window.localStorage?.getItem('mc_splashMode');
		const raw = (fromSession || fromLocal || '').trim();
		if (raw) splashScreenMode = raw;
	} catch (error) {
		void error;
	}
	if (
		splashScreenMode !== 'default' &&
		splashScreenMode !== 'theme' &&
		splashScreenMode !== 'disabled'
	) {
		splashScreenMode = 'default';
	}

	if (!isSnapshotNavigation && splashScreenMode === 'disabled') {
		return;
	}

	let theme = null;
	try {
		const fromSession = window.sessionStorage?.getItem('mc_splash_theme');
		const fromLocal = fromSession ? null : window.localStorage?.getItem('mc_splash_theme');
		const raw = fromSession || fromLocal || null;
		theme = raw ? JSON.parse(raw) : null;
	} catch (error) {
		void error;
		theme = null;
	}

	const runtimeApi = typeof browser !== 'undefined' ? browser : chrome;
	const splashAssetUrl = runtimeApi.runtime.getURL('/assets/splash.png');

	const splash = document.createElement('div');
	splash.id = 'splash-screen';

	if (isSnapshotNavigation && snapshotSplashMode === 'spinner') {
		splash.classList.add('splash--spinner');
		if (theme && theme.bgPrimary) {
			splash.style.backgroundColor = theme.bgPrimary;
		}
		const spinner = document.createElement('div');
		spinner.className = 'splash-spinner';
		if (theme && theme.isLight) {
			spinner.style.borderColor = 'rgba(0, 0, 0, 0.15)';
		} else {
			spinner.style.borderColor = 'rgba(255, 255, 255, 0.25)';
		}
		if (theme && theme.accentPrimary) {
			spinner.style.borderTopColor = theme.accentPrimary;
		}
		splash.appendChild(spinner);
	} else {
		const shouldUseThemeMode = !isSnapshotNavigation && splashScreenMode === 'theme';
		if (shouldUseThemeMode) {
			splash.classList.add('splash--theme');
			if (theme && theme.bgPrimary) {
				splash.style.backgroundColor = theme.bgPrimary;
			}

			const icon = document.createElement('div');
			icon.className = 'splash-icon';
			icon.style.webkitMaskImage = `url("${splashAssetUrl}")`;
			icon.style.maskImage = `url("${splashAssetUrl}")`;
			if (theme && theme.textPrimary) {
				icon.style.backgroundColor = theme.textPrimary;
			} else if (theme && theme.isLight) {
				icon.style.backgroundColor = '#111111';
			} else if (theme && theme.isLight === false) {
				icon.style.backgroundColor = '#ffffff';
			}
			splash.appendChild(icon);
		} else {
			const logo = document.createElement('img');
			logo.src = splashAssetUrl;
			splash.appendChild(logo);
		}
	}

	document.documentElement.appendChild(splash);
	document.documentElement.classList.add('yt-pageload');
	logger.log('Splash', 'Added loading splash');
})();
