# YouTube Enhanced Media Controls (for Mobile)

![Version](https://img.shields.io/badge/version-2.2.0-pink.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Firefox](https://img.shields.io/badge/Firefox-Compatible-FF7139.svg?logo=firefoxbrowser&logoColor=white)
![Kiwi Browser](https://img.shields.io/badge/Kiwi%20Browser-Compatible-00C851.svg)
![Edge](https://img.shields.io/badge/Edge%20Canary-Compatible-0078D4.svg?logo=microsoftedge&logoColor=white)

![Screenshot](https://addons.mozilla.org/user-media/previews/full/325/325301.png?modified=1751767591)

A mobile browser extension that enhances the YouTube mobile experience (m.youtube.com) with improved media controls, custom player interface, gesture support, and accessibility features.

This extension was originally developed to provide a more user friendly interface for YouTube while driving (with music videos being the primary focus), the project has expanded from there, adding features and fixes to improve the overall user experience.

## 🚀 Features

### 🎮 Enhanced Media Player

-   **Custom Player Interface**: Modern player wrapper with improved controls
-   **Customizable Themes**: System, light, dark themes with adaptive or fixed accent colors
-   **Advanced Playlist Management**: Enhanced playlist controls with duplicate handling and mix management
-   **Voice Search Integration**: Quick access to YouTube's voice search (with optional "I'm Feeling Lucky")

### 🎯 Smart Controls

-   **Previous/Next Navigation**: Intelligent previous button behavior (smart restart vs. previous video)
-   **Play Next Queue**: Queue a video to play next and optionally repeat
-   **Custom Seekbar**: Enhanced seeking with visual feedback
-   **Play/Pause Controls**: Improved accessibility and responsiveness
-   **Bottom Controls Bar**: Optional persistent controls for easier access

### 👆 Gesture Support

-   **Single-finger Swipes**: Left/right swipes for navigation
-   **Two-finger Gestures**: Up/down and left/right swipes for various actions
-   **Two-finger Press**: Customizable press actions
-   **Toggle Favourites**: Gesture to open/close favourites dialog
-   **Visual Feedback**: Optional gesture feedback indicators
-   **Configurable Actions**: Map gestures to different player functions

### ⚙️ Extensive Customization

-   **Layout Options**: Multiple player layout configurations
-   **Appearance Settings**: Font size, density, theme customization
-   **Navbar Customization**: Favourites and Mixes buttons with favourites management
-   **Accessibility Features**: Enhanced controls for better usability

### 🎵 Additional Features & Fixes

-   **Background Play Support**: Continue playback when switching tabs or minimizing browser
-   **Continue Watching Popup Handling**: Automatic dismissal of YouTube's continue watching overlays
-   **Playlist-only Media Keys**: Prevents Android notification and Bluetooth media keys from skipping outside the current playlist
-   **Auto-skip Ads**: Automatically skip ads when detected during playback (experimental)
-   **Rapid Buffer Auto-Pause**: Pause the video for a set duration when repeated buffering is detected
-   **Playlist Stability Fixes**: Auto-reload stuck playlists
-   **Blacklist Videos**: Manage a list of videos to hide from playlists and suggestions
-   **Update Notifications**: Optional toast when the extension updates

# 📦 Installation

## Official store releases:

### FireFox

Install the extension from the [FireFox Browser ADD-ONS](https://addons.mozilla.org/en-GB/firefox/addon/yt-enhanced-media-controls/) store.

### Microsoft Edge Canary (Android)

**Note**: This method requires Edge Canary and to mess about with Developer options (thanks Microsoft...).

1. Install [Microsoft Edge Canary](https://play.google.com/store/apps/details?id=com.microsoft.emmx.canary) from Google Play Store.
2. Enable Developer Options:
    - Go to Settings → About Microsoft Edge
    - Tap the build number **5 times** to unlock Developer Options
3. Install the extension by ID:
    - In Edge Canary, go to Settings → Developer Options
    - Select `Extension install by id` then enter: `alabiblpjgpdmeobghefpoaijodckbjk`

## Via build:

-   To compile your own, see [/build/README.md](https://github.com/92jackson/YouTube-Enhanced-Media-Controls-for-Mobile/blob/main/build/README.md)
-   Or use the pre-compiled releases here: [Releases](https://github.com/92jackson/YouTube-Enhanced-Media-Controls-for-Mobile/releases)

### Kiwi Browser (Android)

1. Download the lastest release -gc-XX.zip (or compile).
2. Open Kiwi Browser and open `Extensions` from the menu.
3. Enable "Developer mode".
4. Click `+ (from .zip/.crx/.user.js)` and select the downloaded `.zip` file.

### FireFox Nightly (Android)

**Note**: This method requires FireFox Nightly for Android, standard FireFox wont work!

1. Install [FireFox Nightly](https://play.google.com/store/apps/details?id=org.mozilla.fenix) from Google Play Store.
2. Enable Developer Options:
    - Go to Settings → About Firefox Nightly
    - Tap the FireFox logo **5 times** to unlock Developer Options
3. There'll now be a new option under Settings → Advanced for `Install extension from file`, use that to navigate to the downloaded `-ff-XX.zip` file.

### Microsoft Edge Canary (Android)

1. Install [Microsoft Edge Canary](https://play.google.com/store/apps/details?id=com.microsoft.emmx.canary) from Google Play Store.
2. Enable Developer Options:
    - Go to Settings → About Microsoft Edge
    - Tap the build number **5 times** to unlock Developer Options
3. Install the extension by crx:
    - In Edge Canary, go to Settings → Developer Options
    - Select `Extension install by crx` and navigate to the downloaded `-me-XX.crx` file.

### Google Chrome (Desktop)

1. Download the lastest release -gc-XX.zip (or compile) and extract it.
2. Open Google Chrome and open `Extensions` from the menu.
3. Enable "Developer mode".
4. Click `Load unpacked` and navigate to the extracted `-gc-XX` folder.

### Browser Compatibility

-   ✅ FireFox (Android + Desktop for testing)
-   ✅ FireFox Nightly (Android)
-   ✅ Kiwi Browser (Android)
-   ✅ Microsoft Edge Canary (Android)
-   ✅ Google Chrome/MS Edge (Desktop - recommended for testing only)

## 🎯 Usage

1. **Navigate to YouTube Mobile**: Visit `m.youtube.com` in your browser
2. **Enhanced Player**: The custom player will automatically load on video pages
3. **Settings Access**: Click the extension icon to modify preferences

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

-   Background playback functionality based on [Youtube-Background](https://github.com/alkisqwe/Youtube-Background) (CC0 License)

## 📞 Support

If you've encountered an issues, or you have feedback or suggestions, join my Discord server: [Discord](https://discord.gg/e3eXGTJbjx).

---

**Note**: This extension is designed specifically for the mobile version of YouTube (`m.youtube.com`) and will not work on the desktop version. While it will work on desktop browsers, it is optimised for mobile use only.
