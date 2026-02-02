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
		const logo = document.createElement('img');
		logo.src = (typeof browser !== 'undefined' ? browser : chrome).runtime.getURL(
			'/assets/splash.png'
		);
		splash.appendChild(logo);
	}

	document.documentElement.appendChild(splash);
	document.documentElement.classList.add('yt-pageload');
	logger.log('Splash', 'Added loading splash');
})();
