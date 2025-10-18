# Changelog

All notable changes to this project will be documented in this file.

## [1.2.1] - 2025-10-18

### Added

-   **Video Favourites** - The favourites feature has been expanded to support stand-alone videos as well as mixes/playlists.
-   **Mix/Favourites Renaming** - Rename saved favorite mixes in favorites dialog. Renamed mix names are reflected in the playlist drawer header when playing.
-   **Toggle Video Player gesture** - Added gesture support for toggling video player visibility (hide/show video).

### Fixed

-   **Playback with Video Hidden**
    -   Fixed bug where a few seconds of the last video would play at the start of a new video when Hide Video Player option was used.
    -   Fixed bug which would trigger the Buffer Detection at the start of the video playback when Hide Video Player option was used.
-   **Show Favourite Mixes gesture** - The Favourite Mixes popup can now be shown via a settable gesture.

### Changed

-   **Drawer Close Button** - Removed playlist drawer close button for cleaner interface (can still be accessed by dragging drawer).
-   **Show "Playing next" when drawer closed** - Now shows the title of the next video as the playlist drawer header when the drawer is closed.
-   Minor visual/styling changes.

## [1.2.0] - 2025-10-17

### Added

-   **Favourite Mixes** - New feature to save and manage favourite YouTube mixes/playlists
    -   Added favourites button to navbar for quick access
    -   Modal dialog to view, add, and remove favourite mixes
    -   Gesture support for toggling favourites dialog
-   **Hide Video Player** - New option to completely hide the video player area to maximize space for metadata, comments, and suggested videos
    -   Ideal for audio-only content consumption
    -   Optional navbar toggle button for quick video visibility switching (disabled by default)
-   **Buffer Detection Feedback** - Added visual countdown indicator for buffer auto-pause feature
    -   Displays countdown timer next to play button when auto-pause is triggered
-   **Debug Logging for Mobile** - Enhanced debugging capabilities for mobile browsers
    -   New debug button in navbar (visible only when debugging enabled) to download logs, most recent 500 entries

### Fixed

-   **Buffer Detection** - Improved auto-pause logic to ignore expected buffering during user seeks, preventing false pauses when scrubbing through videos
-   **Preemptive Button Handling** - Fixed issue where unmute and large play buttons wouldn't be clicked when video area is hidden, now properly checks for button availability rather than visibility

## [1.1.1] - 2025-10-09

### Fixed

-   **Options Page** - Fixed issue where the options page would not open in Edge (Android) - use manifest `manifest.me.json` (workaround)

### Changed

-   **Minor changes to manifests for v3**

## [1.1.0] - 2025-10-04

### Added

-   **Rapid Buffer Auto-Pause** - Option to pause the video for a set duration when repeated buffering is detected. Useful on slow connections.

## [1.0.9] - 2025-10-03

### Fixed

-   **Adaptive Accent Colors** - Fixed CORS issues when fetching adaptive colors from thumbnails in FireFox

### Changed

-   **Default Accent Color Setting** - Changed to 'adaptive' from 'red'
-   **Improved Logging on changing settings**

### Added

-   References for new "Ready to shop?" dialog for auto closing

## [1.0.8] - 2025-09-24

### Fixed

-   **Spacing around `.watch-below-the-player` element**

## [1.0.7] - 2025-09-24

### Added

-   **Prevent Page Container Inert** - Prevents the page container from being inert when the custom playlist is active, fixing issues with scroll in the area below the video

### Changed

-   **Minor changes to CSS** - Corrected spacing around `.watch-below-the-player`

## [1.0.6] - 2025-09-06

### Fixed

-   **Native playlist element references** - Playlists titles, channel names and durations should parse correctly again

## [1.0.5] - 2025-07-20

### Added

-   **Theme Colors** - Added an array of theme colors to choose from, alongside the pre-exsisting 'System', 'Light' and 'Dark' options
-   **Playlist Color Modes** - Added new options to choose how playlist colors are displayed regardless of the current theme
-   **Set Browser UI Color** - Option added to set the browser UI color to the current theme or accent color (compatible browsers only - usually mobile browsers)

### Changed

-   **Enhanced Music Video Parse and Clean** - Added new parsing preference options: "Mixes Only" and "Mixes and Playlists" for more granular control over when artist/title extraction occurs
-   **Options Page** - Now opens as a new tab. Old popup now links to the options page, gibhub and discord links

### Fixed

-   **Smart Previous Gesture** - Corrected gesture functionality, was previouslly mapped to the restart gesture

## [1.0.4] - 2025-07-13

### Added

-   **Play Next Feature** - Context menu option to pick which video in the playlist to play next
-   **Repeat Play Feature** - Context menu option to play the video on repeat, optional button for the main controls also added
-   **Blacklist** - Added a context menu option to blacklist videos from showing and playing in playlists
-   **Remove from Playlist** - Added a context menu option to remove the current video from the current playlist
-   **Gesture Sensitivity** - Added a setting to adjust the sensitivity of the gestures
-   **Smart Previous Threshold** - Added a setting to adjust the threshold for the smart previous feature

### Changed

-   **Improved Next/Previous Video Handling**
-   **Improved Ad Handling**
-   **Refinded Handling of Unresponsive Native Playlist**

## [1.0.3] - 2025-07-07 - Ad Skipping & Gesture Fix

### Added

-   **GitHub Link** - Added a link to the project's GitHub repository on the options.html
-   **Auto reload for Stuck Playlist** - Added a option to automatically fix the native playlist if it becomes stuck

### Changed

-   **Improved Ad Skipping** - Refined ad skipping logic for better reliability
-   **Fixed 'Restart Current' Gesture** - Corrected an issue where the 'Restart Current' gesture was not working as expected
-   **Refinded Handling of Unresponsive Native Playlist**

## [1.0.2] - 2025-07-06 - Desktop Banner & User Agent Spoofing

### Added

-   **Desktop Banner** - Added informational banner on desktop YouTube to promote mobile version
-   **User Agent Spoofing** - Optional mobile user agent spoofing for desktop users
-   **Auto-skip Ads** - Added setting in Player Behavior section, allowing automatic skipping of ads when enabled
-   **Ad Detection** - Added logic to detect ads and update player state accordingly
-   **Video Element Listener Fix** - Fixed issue where the video element would change as ads play, causing listeners to refer to a non-existent element

### Changed

-   **Video Title Markup Refactor** - Refactored markup for cleaner DOM structure and easier UI updates
-   **Improved Playlist Management** - Enhanced playlist handling, including better detection and synchronization

## [1.0.1] - 2025-06-29 - Security & Performance Update

### Changed

-   **DOM-Based Element Creation** - Refactored all HTML string generation to use secure DOM APIs
-   **Enhanced Security** - Eliminated `innerHTML` usage to prevent XSS vulnerabilities
-   **Firefox Compatibility** - Resolved Firefox security warnings for content scripts
-   **Performance Improvements** - Direct DOM manipulation for better performance than HTML parsing

## [1.0.0] - 2025-06-29 - Inital release

### Added

-   **YouTube Media Controls Extension** - Complete browser extension for enhanced YouTube media control
-   **Custom Media Player Interface** - Modern UI overlay for YouTube videos
-   **Advanced Playlist Management** - Enhanced playlist navigation and control
-   **Adaptive Color Theming** - Dynamic color extraction from video thumbnails
-   **Background Playback Support** - Continued playback when tab is not active
-   **Popup Handling** - Automatic dismissal of YouTube shopping and continue watching overlays
-   **Media Key Playlist Navigation Fix** - Prevents Android notification and Bluetooth media keys from skipping outside the current playlist to suggested videos

### Files Structure

```
├── manifest.json              # Extension manifest
├── src/
│   ├── content/               # Content scripts
│   │   ├── content.js         # Main content script
│   │   ├── yt-media-player.js # Custom player implementation
│   │   ├── yt-navbar.js       # Navigation bar enhancements
│   │   ├── background-player.js # Background playback
│   │   └── yt-splash.js       # Loading splash screen
│   ├── options/               # Extension options
│   │   ├── options.html       # Options page
│   │   └── options.js         # Options functionality
│   └── utils/                 # Utility modules
│       ├── utils.js           # Core utilities
│       └── user-settings.js   # User preferences
├── styles/                    # CSS stylesheets
│   ├── yt-media-player.css    # Player styling
│   └── yt-splash.css          # Splash screen styling
├── icons/                     # Extension icons
└── assets/                    # Static assets
```
