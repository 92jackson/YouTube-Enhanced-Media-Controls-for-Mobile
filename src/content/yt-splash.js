// yt-splash.js
(function () {
	// Create splash screen container
	const splash = document.createElement('div');
	splash.id = 'splash-screen';

	// Insert logo image
	const logo = document.createElement('img');
	logo.src = (typeof browser !== 'undefined' ? browser : chrome).runtime.getURL(
		'/assets/splash.png'
	);
	splash.appendChild(logo);

	// Add to the page ASAP
	document.documentElement.appendChild(splash);
	document.documentElement.classList.add('yt-pageload');
	logger.log('Splash', 'Added loading splash');
})();
