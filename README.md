# YouTube Enhanced Media Controls (for Mobile)

![Version](https://img.shields.io/badge/version-1.0.2-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Firefox](https://img.shields.io/badge/Firefox-Compatible-FF7139.svg?logo=firefoxbrowser&logoColor=white)
![Kiwi Browser](https://img.shields.io/badge/Kiwi%20Browser-Compatible-00C851.svg)
![Edge](https://img.shields.io/badge/Edge%20Canary-Experimental-FFA500.svg?logo=microsoftedge&logoColor=white)

![Screenshot](https://addons.mozilla.org/user-media/previews/full/325/325301.png?modified=1751767591)

A mobile browser extension that enhances the YouTube mobile experience (m.youtube.com) with improved media controls, custom player interface, gesture support, and accessibility features.

This extension was originally developed to provide a more user friendly interface for YouTube while driving (with music videos being the primary focus), the project has expanded from there, adding features and fixes to improve the overall user experience.

## 🚀 Features

### 🎮 Enhanced Media Player

-   **Custom Player Interface**: Modern player wrapper with improved controls
-   **Customizable Themes**: System, light, dark themes with multiple accent colors
-   **Advanced Playlist Management**: Enhanced playlist controls with duplicate handling
-   **Voice Search Integration**: Quick access to YouTube's voice search functionality

### 🎯 Smart Controls

-   **Previous/Next Navigation**: Intelligent previous button behavior (smart restart vs. previous video)
-   **Custom Seekbar**: Enhanced seeking with visual feedback
-   **Play/Pause Controls**: Improved accessibility and responsiveness
-   **Bottom Controls Bar**: Optional persistent controls for easier access

### 👆 Gesture Support

-   **Single-finger Swipes**: Left/right swipes for navigation
-   **Two-finger Gestures**: Up/down and left/right swipes for various actions
-   **Two-finger Press**: Customizable press actions
-   **Visual Feedback**: Optional gesture feedback indicators
-   **Configurable Actions**: Map gestures to different player functions

### ⚙️ Extensive Customization

-   **Layout Options**: Multiple player layout configurations
-   **Appearance Settings**: Font size, density, theme customization
-   **Accessibility Features**: Enhanced controls for better usability

### 🎵 Additional Features & Fixes

-   **Background Play Support**: Continue playback when switching tabs or minimizing browser
-   **Continue Watching Popup Handling**: Automatic dismissal of YouTube's continue watching overlays
-   **Media Key Playlist Navigation Fix**: Prevents Android notification and Bluetooth media keys from skipping outside the current playlist to suggested videos
-   **Auto Ad Skip**: Skip YouTube ads automatically as they play

## 📦 Installation

### Firefox

Install the extension from the [Firefox Browser ADD-ONS](https://addons.mozilla.org/en-GB/firefox/addon/yt-enhanced-media-controls/) store.

### Kiwi Browser

1. Download the project's .zip file.
2. Open Kiwi Browser and navigate to `kiwi://extensions`.
3. Enable "Developer mode".
4. Click "+ (from .zip/.crx/.user.js)" and select the downloaded `.zip` file.

### Microsoft Edge Canary (Android)

**Note**: This method requires Edge Canary and is experimental.

1. Install [Microsoft Edge Canary](https://play.google.com/store/apps/details?id=com.microsoft.emmx.canary) from Google Play Store.
2. Enable Developer Options:
    - Go to Settings → About Microsoft Edge
    - Tap the build number **5 times** to unlock Developer Options
3. Install the extension by ID:
    - In Edge Canary, go to Settings → Developer Options
    - Find "Extension install by id" field
    - Enter: `alabiblpjgpdmeobghefpoaijodckbjk`

### Browser Compatibility

-   ✅ Firefox
-   ✅ Kiwi Browser (Android)
-   🧪 Microsoft Edge Canary (Android) - Experimental

## 🛠️ Configuration

Click the extension icon in your browser's menu to access the settings panel. The extension offers extensive customization options:

### Player Settings

-   **Default Layout**: Choose initial player layout mode
-   **Playlist Mode**: Configure how playlists are displayed
-   **Theme**: Select appearance theme and accent colors
-   **Controls**: Toggle various player controls on/off

### Gesture Settings

-   **Enable/Disable**: Turn gesture support on or off
-   **Action Mapping**: Assign different actions to each gesture type
-   **Feedback**: Toggle visual gesture feedback

### Advanced Settings

-   **Debug Logging**: Enable detailed console logging
-   **Background Play**: Allow playback when tab is not active
-   **Navbar Customization**: Configure custom navigation elements

## 🎯 Usage

1. **Navigate to YouTube Mobile**: Visit `m.youtube.com` in your browser
2. **Enhanced Player**: The custom player will automatically load on video pages
3. **Gesture Controls**: Use configured gestures for quick navigation
4. **Settings Access**: Click the extension icon to modify preferences
5. **Voice Search**: Use the voice button for hands-free search

### Gesture Actions (Defaults)

-   **Single Swipe Left**: Restart current video or go to previous
-   **Single Swipe Right**: Skip to next video
-   **Two-finger Swipe Up**: Toggle voice search
-   **Two-finger Swipe Down**: Play/pause toggle
-   **Custom Gestures**: Configure additional actions in settings

## 🏗️ Project Structure

```
media-controls/
├── .prettierrc               # Code formatting configuration
├── CHANGELOG.md              # Version history and feature documentation
├── LICENSE                   # MIT License
├── README.md                 # Project documentation
├── manifest.json             # Extension manifest (Manifest V3)
├── src/                      # Source code directory
│   ├── content/              # Content scripts
│   │   ├── background-player.js # Background playback functionality
│   │   ├── content.js        # Main content script
│   │   ├── yt-media-player.js # Custom player implementation
│   │   ├── yt-navbar.js      # Custom navigation bar
│   │   └── yt-splash.js      # Splash screen handling
│   ├── options/              # Extension options
│   │   ├── options.html      # Settings page
│   │   └── options.js        # Settings page logic
│   └── utils/                # Utility modules
│       ├── user-settings.js  # User preferences management
│       └── utils.js          # Core utilities (refactored into classes)
├── styles/                   # CSS stylesheets
│   ├── yt-media-player.css   # Player styling
│   └── yt-splash.css         # Splash screen styling
├── icons/                    # Extension icons
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── assets/                   # Static assets
    ├── default_thumb.png
    └── splash.png
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

-   Background playback functionality based on [Youtube-Background](https://github.com/alkisqwe/Youtube-Background) (CC0 License)

## 📞 Support

If you encounter issues or have questions:

1. Check the browser console for error messages (enable "Debug logging" in settings first)
2. Verify you're using a supported browser
3. Try disabling and re-enabling the extension
4. Create an issue with detailed information about the problem

---

**Note**: This extension is designed specifically for the mobile version of YouTube (`m.youtube.com`) and will not work on the desktop version.
