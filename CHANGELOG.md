# Changelog

All notable changes to this project will be documented in this file.

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
