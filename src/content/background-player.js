// background-player.js
/**
 * @description Attempts to force background playback on YouTube (mobile) by spoofing browser visibility and user activity.
 *   background-player.js is based on the work of: https://github.com/alkisqwe/Youtube-Background
 * @license Creative Commons Zero v1.0 Universal
 */
class BackgroundPlayer {
	constructor(logger) {
		this._enabled = false;
		this._activityLoop = null;
	}

	enable() {
		if (this._enabled) return;
		this._enabled = true;
		this._overrideVisibility();
		this._blockVisibilityChange();
		this._scheduleActivity();
		window.logger.log('BackgroundPlayer', 'Enabled background playback spoofing.', true);
	}

	disable() {
		this._enabled = false;
		if (this._activityLoop) {
			clearTimeout(this._activityLoop);
			this._activityLoop = null;
		}
		window.logger.log('BackgroundPlayer', 'Disabled background playback spoofing.', true);
	}

	_overrideVisibility() {
		Object.defineProperties(document, {
			hidden: { value: false, configurable: true },
			visibilityState: { value: 'visible', configurable: true },
		});
		window.logger.log('BackgroundPlayer', 'Page Visibility API overridden.');
	}

	_blockVisibilityChange() {
		window.addEventListener('visibilitychange', (evt) => evt.stopImmediatePropagation(), true);
		window.logger.log('BackgroundPlayer', 'Visibility change event listener blocked.');
	}

	_sendKeyEvent(eventType, keyCode) {
		window.dispatchEvent(
			new KeyboardEvent(eventType, {
				bubbles: true,
				cancelable: true,
				keyCode: keyCode,
				which: keyCode,
			})
		);
	}

	_getRandomInt(min, max) {
		min = Math.ceil(min);
		max = Math.floor(max);
		return Math.floor(Math.random() * (max - min)) + min;
	}

	_loopActivity(callback, baseDelay, jitterRange) {
		const jitter = this._getRandomInt(-jitterRange / 2, jitterRange / 2);
		const delay = Math.max(baseDelay + jitter, 0);
		this._activityLoop = setTimeout(() => {
			callback();
			if (this._enabled) this._loopActivity(callback, baseDelay, jitterRange);
		}, delay);
	}

	_scheduleActivity() {
		const pressAltKey = () => {
			this._sendKeyEvent('keydown', 18);
			this._sendKeyEvent('keyup', 18);
			window.logger.log('BackgroundPlayer', 'Simulated Alt key press for activity.');
		};
		const initialActivityDelay = this._getRandomInt(5000, 15000);
		this._activityLoop = setTimeout(() => {
			pressAltKey();
			this._loopActivity(pressAltKey, 60 * 1000, 20 * 1000);
		}, initialActivityDelay);
		window.logger.log('BackgroundPlayer', 'User activity simulation scheduled.');
	}
}
// Export for use in content.js
window.BackgroundPlayer = BackgroundPlayer;
