/**
 * Christmas Music Filter
 * Handles detection and filtering of Christmas music in YouTube playlists and mixes
 */

// Comprehensive database of popular Christmas music tracks
const CHRISTMAS_TRACKS = [
	// Classic Christmas songs
	'Fairytale of New York',
	'All I Want for Christmas Is You',
	'Last Christmas',
	'Jingle Bell Rock',
	"Rockin' Around the Christmas Tree",
	"It's the Most Wonderful Time of the Year",
	'Santa Tell Me',
	'Santa Claus Is Coming to Town',
	'Let It Snow! Let It Snow! Let It Snow!',
	"Baby, It's Cold Outside",
	"It's Beginning to Look a Lot Like Christmas",
	'White Christmas',
	'Have Yourself a Merry Little Christmas',
	'The Christmas Song (Merry Christmas to You)',
	'Rudolph the Red-Nosed Reindeer',
	'Frosty the Snowman',
	'Silver Bells',
	'Winter Wonderland',
	'Sleigh Ride',
	'Deck the Halls',
	'Hark! The Herald Angels Sing',
	'O Holy Night',
	'Silent Night',
	'Joy to the World',
	'O Come, All Ye Faithful',
	'The First Noel',
	'God Rest Ye Merry, Gentlemen',
	'We Wish You a Merry Christmas',
	'We Three Kings',
	'Away in a Manger',
	'What Child Is This?',
	'Angels We Have Heard on High',
	'It Came Upon the Midnight Clear',
	'O Little Town of Bethlehem',
	'Good King Wenceslas',
	'The Holly and the Ivy',
	'I Saw Three Ships',
	'Ding Dong Merrily on High',

	// Modern Christmas songs
	'Underneath the Tree',
	'Mistletoe',
	'Santa Claus Lane',
	'My Only Wish (This Year)',
	'Christmas (Baby Please Come Home)',
	'Happy Xmas (War Is Over)',
	'Wonderful Christmastime',
	'Step into Christmas',
	'Feliz Navidad',
	'Blue Christmas',
	'Please Come Home for Christmas',
	'Christmas Time Is Here',
	'Someday at Christmas',
	'This Christmas',
	'Give Love on Christmas Day',
	'Christmas Eve',
	'Merry Christmas Darling',
	'Grown-Up Christmas List',
	'Where Are You Christmas?',
	'Believe',
	"You're a Mean One, Mr. Grinch",
	'Welcome Christmas',
	'Heat Miser',
	'Snow Miser',
	'I Want a Hippopotamus for Christmas',
	'Dominick the Donkey',
	'I Saw Mommy Kissing Santa Claus',
	'Grandma Got Run Over by a Reindeer',
	'All I Want for Christmas Is My Two Front Teeth',
	"Nuttin' for Christmas",
	'I Yust Go Nuts at Christmas',
	"The Chipmunk Song (Christmas Don't Be Late)",
	"Christmas Don't Be Late",
	'Little Saint Nick',
	'Christmas Must Be Tonight',
	'River',
	'Merry Christmas, Happy Holidays',
	"I Don't Wanna Spend One More Christmas Without You",
	'Christmas Canon',
	'Carol of the Bells',
	'Christmas Eve/Sarajevo 12/24',
	'Dance of the Sugar Plum Fairy',
	'Wizards in Winter',
	"Mad Russian's Christmas",

	// Christmas albums and variations
	'A Holly Jolly Christmas',
	"It's Beginning to Look Like Christmas",
	'Let It Snow, Let It Snow, Let It Snow',
	'Have Yourself a Merry Little Christmas',
	'The Christmas Song',
	'White Christmas',
	"I'll Be Home for Christmas",
	'Blue Christmas',
	'Christmas Time Is Here',
	"Christmas Don't Be Late",
	'Little Saint Nick',
	'Merry Christmas, Baby',
	'Santa Baby',
	'This Christmas',
	'What Christmas Means to Me',
	'Christmas (Baby Please Come Home)',
	'Back Door Santa',
	'Santa Claus Go Straight to the Ghetto',
	'Christmas in Hollis',
	"Christmas Rappin'",
	'Merry Christmas Everyone',
	'I Wish It Could Be Christmas Everyday',
	'Stop the Cavalry',
	'2000 Miles',
	"Thank God It's Christmas",
	'Merry Xmas Everybody',
	'I Believe in Father Christmas',
	'Another Rock and Roll Christmas',
	"Merry Christmas (I Don't Want to Fight Tonight)",
	"Don't Shoot Me Santa",
	'Christmas with the Devil',
	'The Power of Love',
	'Stay Another Day',
	'December, 1963 (Oh, What a Night)',
	'Driving Home for Christmas',
	'A Spaceman Came Travelling',
	'Happy New Year',
	"Thank God It's Christmas",
];

// Christmas-related keywords for fallback detection
const CHRISTMAS_KEYWORDS = [
	'christmas',
	'xmas',
	'x-mas',
	'holiday',
	'holidays',
	'noel',
	'yuletide',
	'yule',
	'santa',
	'santa claus',
	'st. nick',
	'st nick',
	'claus',
	'reindeer',
	'carol',
	'carols',
	'navidad',
	'feliz navidad',
	'jingle',
	'jingle bells',
	'white christmas',
	'silent night',
	'jingle bell rock',
	'last christmas',
	'all i want for christmas',
	'rockin around the christmas tree',
	'have yourself a merry little christmas',
	'let it snow',
	'winter wonderland',
	'blue christmas',
	'christmas time',
	'christmas song',
	'christmas songs',
	'christmas music',
	'christmas eve',
	'christmas day',
	'christmas morning',
	'merry christmas',
	'happy christmas',
];

/**
 * Check if a date falls within the Christmas date range
 * @param {Date} currentDate - The date to check
 * @param {string} startDateStr - Start date in DD/MM format
 * @param {string} endDateStr - End date in DD/MM format
 * @returns {boolean} True if date is within range
 */
function isDateInChristmasRange(currentDate, startDateStr, endDateStr) {
	if (!startDateStr || !endDateStr) return false;

	try {
		const currentYear = currentDate.getFullYear();

		// Parse start date
		const startParts = startDateStr.split('/');
		const startDay = parseInt(startParts[0]);
		const startMonth = parseInt(startParts[1]) - 1; // JavaScript months are 0-indexed
		
		// Create date and let JavaScript handle invalid dates by rolling over
		const startDate = new Date(currentYear, startMonth, startDay);

		// Parse end date
		const endParts = endDateStr.split('/');
		const endDay = parseInt(endParts[0]);
		const endMonth = parseInt(endParts[1]) - 1;
		
		// Create date and let JavaScript handle invalid dates by rolling over
		const endDate = new Date(currentYear, endMonth, endDay);

		// If end date is before start date, it means the range crosses year boundary
		if (endDate < startDate) {
			// Check if current date is after start date (in current year) or before end date (in current year)
			return currentDate >= startDate || currentDate <= endDate;
		} else {
			// Normal date range
			return currentDate >= startDate && currentDate <= endDate;
		}
	} catch (error) {
		console.error('Error parsing Christmas date range:', error);
		return false;
	}
}

/**
 * Check if a title contains Christmas-related keywords
 * @param {string} title - The title to check
 * @returns {boolean} True if title contains Christmas keywords
 */
function containsChristmasKeywords(title) {
	if (!title) return false;

	const lowerTitle = title.toLowerCase();
	return CHRISTMAS_KEYWORDS.some((keyword) => lowerTitle.includes(keyword));
}

/**
 * Check if a title matches known Christmas tracks
 * @param {string} title - The title to check
 * @returns {boolean} True if title matches a Christmas track
 */
function isKnownChristmasTrack(title) {
	if (!title) return false;

	// Strip special characters and normalize spaces
	const cleanTitle = title
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, ' ') // Remove special characters, keep letters, numbers, spaces
		.replace(/\s+/g, ' ') // Normalize multiple spaces to single space
		.trim();

	return CHRISTMAS_TRACKS.some((track) => {
		// Clean the track name the same way
		const cleanTrack = track
			.toLowerCase()
			.replace(/[^a-z0-9\s]/g, ' ')
			.replace(/\s+/g, ' ')
			.trim();
		
		// Check if the clean track is contained within the clean title
		return cleanTitle.includes(cleanTrack);
	});
}

/**
 * Check if a video should be filtered based on Christmas music settings
 * @param {Object} videoData - Video data object
 * @param {string} videoData.title - Video title
 * @param {string} videoData.artist - Video artist/channel
 * @param {string} videoData.playlistTitle - Playlist/mix title (optional)
 * @param {Object} settings - Christmas filtering settings
 * @param {string} settings.christmasMusicFilter - Filter mode ('disabled', 'always', 'dates')
 * @param {string} settings.christmasStartDate - Start date in DD/MM format
 * @param {string} settings.christmasEndDate - End date in DD/MM format
 * @param {boolean} settings.christmasBypassOnPlaylistTitle - Bypass filtering if playlist title contains Christmas keywords
 * @returns {boolean} True if video should be filtered (removed)
 */
function shouldFilterChristmasMusic(videoData, settings) {
	// If filtering is disabled, don't filter anything
	if (!settings || settings.christmasMusicFilter === 'disabled') {
		return false;
	}

	const title = videoData.title || '';
	const artist = videoData.artist || '';
	const playlistTitle = videoData.playlistTitle || '';

	// Check if playlist title contains Christmas keywords and bypass is enabled
	if (settings.christmasBypassOnPlaylistTitle && playlistTitle && containsChristmasKeywords(playlistTitle)) {
		return false; // Don't filter - user has knowingly loaded a Christmas playlist
	}

	// Check if this is Christmas music
	const isChristmasMusic =
		isKnownChristmasTrack(title) ||
		isKnownChristmasTrack(artist) ||
		containsChristmasKeywords(title) ||
		containsChristmasKeywords(artist);

	if (!isChristmasMusic) {
		return false;
	}

	// Apply filtering based on mode
	switch (settings.christmasMusicFilter) {
		case 'always':
			return true; // Always filter Christmas music

		case 'dates':
			// Only filter if current date is outside the specified range
			const currentDate = new Date();
			const isInRange = isDateInChristmasRange(
				currentDate,
				settings.christmasStartDate,
				settings.christmasEndDate
			);
			return !isInRange; // Filter if NOT in range (i.e., outside the allowed dates)

		default:
			return false;
	}
}

/**
 * Load Christmas filtering settings from storage
 * @returns {Promise<Object>} Christmas filtering settings
 */
async function loadChristmasSettings() {
	const DEFAULT_SETTINGS = {
		christmasMusicFilter: 'disabled',
		christmasStartDate: '01/12',
		christmasEndDate: '01/01',
	};

	const storageApi = typeof browser !== 'undefined' ? browser.storage : chrome.storage;
	const storageLocal = storageApi?.local;

	if (!storageLocal) {
		return DEFAULT_SETTINGS;
	}

	try {
		if (typeof storageLocal.get === 'function' && storageLocal.get.length === 1) {
			// Promise-based API
			const items = await storageLocal.get([
				'christmasMusicFilter',
				'christmasStartDate',
				'christmasEndDate',
			]);
			return {
				christmasMusicFilter:
					items.christmasMusicFilter || DEFAULT_SETTINGS.christmasMusicFilter,
				christmasStartDate: items.christmasStartDate || DEFAULT_SETTINGS.christmasStartDate,
				christmasEndDate: items.christmasEndDate || DEFAULT_SETTINGS.christmasEndDate,
			};
		} else {
			// Callback-based API
			return new Promise((resolve) => {
				storageLocal.get(
					['christmasMusicFilter', 'christmasStartDate', 'christmasEndDate'],
					(items) => {
						resolve({
							christmasMusicFilter:
								items.christmasMusicFilter || DEFAULT_SETTINGS.christmasMusicFilter,
							christmasStartDate:
								items.christmasStartDate || DEFAULT_SETTINGS.christmasStartDate,
							christmasEndDate:
								items.christmasEndDate || DEFAULT_SETTINGS.christmasEndDate,
						});
					}
				);
			});
		}
	} catch (error) {
		console.error('Error loading Christmas settings:', error);
		return DEFAULT_SETTINGS;
	}
}

// Export functions for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
	module.exports = {
		CHRISTMAS_TRACKS,
		CHRISTMAS_KEYWORDS,
		shouldFilterChristmasMusic,
		loadChristmasSettings,
		isDateInChristmasRange,
		containsChristmasKeywords,
		isKnownChristmasTrack,
	};
}
