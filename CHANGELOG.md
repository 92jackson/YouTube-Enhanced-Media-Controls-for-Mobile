# Changelog

All notable changes to this project will be documented in this file.

## [1.0.1] - 2024-12-19 - Security & Performance Update

### Changed

-   **DOM-Based Element Creation** - Refactored all HTML string generation to use secure DOM APIs
-   **Enhanced Security** - Eliminated `innerHTML` usage to prevent XSS vulnerabilities
-   **Firefox Compatibility** - Resolved Firefox security warnings for content scripts
-   **Performance Improvements** - Direct DOM manipulation for better performance than HTML parsing

### Technical Details

-   Converted `_getHTML()` to `_createPlayerElement()` for main player structure
-   Converted all button creation methods to DOM-based approach (`_createPreviousButton()`, `_createPlayButton()`, etc.)
-   Converted `_getNavbarHTML()` to `_createNavbarElement()` for navigation bar
-   Removed deprecated `_escapeHtml()` method (no longer needed with DOM APIs)
-   Updated all SVG icon creation to use `document.createElementNS()`
-   Updated JSDoc comments to reflect DOM-based implementation

## [1.0.0] - 2024-12-19 - Inital release

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
