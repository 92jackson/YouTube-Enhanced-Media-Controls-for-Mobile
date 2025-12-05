# Changelog

All notable changes to this project will be documented in this file.

## [2.2.2] - 2025-12-05

### Fixed

-   Bug when using both "Scroll Long Titles" and "Per Letter Contrast" when switching from a video with a long title to one with a short title- the short title was still being treat as long
-   Bug where the hidden timer (as set by "Play Time Display Mode") would unhide when transitioning between limited height mode and standard mode
-   Bug where the re-focus playlist button showed while the playlist drawer was closed
-   Fixed YouTube behaviour preventing navbar interaction if any panels were open

## [2.2.1] - 2025-12-04

### Fixed

-   Contrast Text Colors - Now takes into account the color of the seekbar track, not just the seekbar progress
-   CSS Theme colors restored - Had been accidentally removed during refactoring at ver 2.0.0

## [2.2.0] - 2025-12-04

### Added

-   **Contrast Text Colors** - Added an option to use per-letter contrast text colors for video details in the bottom controls area
-   **New Features Badge** - Added a badge to the extension icon to indicate that there are new features available (only shown after a new feature update)
-   **Change Log** - Added a link to the change log in the options page

### Changed

-   Improved logic for adding 'New' options badges (badges remain even after patch updates and are only removed after new feature updates)
-   Minor improvement to title parsing logic to remove trailing promo suffix segments after separators
-   Increased the touch target size of the compact seekbar handle for better accessibility

### Fixed

-   I'm Feeling Lucky Preview:

    -   Fixed incorrect background color variable
    -   Fixed not progressing to result after timeout

-   Re-focus button not working with touch (the drawer handle was stealing the touch event)

## [2.1.1] - 2025-12-04

### Changed

-   **Title Marquee** - Improved animation timing and added circular motion. Now only animates when the title is too long to fit in the available space.
-   **I'm Feeling Lucky Preview** - Improved layout.

### Fixed

-   Bug causing forced re-focusing of active playlist item when touching the playlist drawer handle fixed. Re-focus should now only occur:
    1.  When the drawer state is changed.
    2.  When the active item is changed.
    3.  When "Keep current item focused" is enabled.
    4.  When the re-focus button is pressed.

## [2.1.0] - 2025-12-04

### Added

-   **I'm Feeling Lucky** - Added an option to use I'm Feeling Lucky when using the voice search (it will auto-navigate to the first search result) with optional preview overlay
-   **Refocus Active Item in Playlist** - Button added to playlist header to refocus the active item in the playlist when not using the "Keep current item focused" option
-   **Play Time Display Mode** - Added the options to select how the current play time/duration is shown in the bottom controls area
-   **Hide Playlist Item Durations** - Option to hide durations in playlist items
-   **Enable Title Marquee** - Option to enable marquee effect for long video titles in the bottom controls area

### Changes

-   Shows video duration in playlist item's context menu

### Fixed

-   Easter egg removal option fixed

### Removed

-   Native playlist scroll fix - Removed the option to fix the native playlist auto-scroll behavior (it was buggy, caused performance issues and was probably never actually used)

## [2.0.1] - 2025-12-01

### Changes

-   Fixed refocusing playing item in playlist on drawer state change
-   Minor updates to the options page

## [2.0.0] - 2025-11-22

### Added

#### **Enhanced Playlist**

-   **Horizontal Playlist** - New horizontal layout option with scrollable thumbnails (disables swipe gestures in playlist area when active)
-   **Limited Height Mode** - Auto-switches to compact layout when viewport height is below threshold (landscape/splitscreen mode)
    -- Combines Horizontal Playlist with Compact bottom controls

#### **Content Filtering & Customization**

-   **Homepage Content Filtering** - Hide unwanted sections:
    -- "Shorts" section removal
    -- "YouTube Playable" section removal
-   **Christmas Music Filter** - Smart filtering options:
    -- Date-based filtering
    -- Always-on filtering mode

#### **Enhanced Options Page**

-   **Search Functionality** - Quick-find settings with instant results
-   **Navigation Improvements**:
    -- Jump-to-section menu for faster navigation
    -- Collapse-all-sections button for cleaner view
    -- New options badge to highlight recent additions

#### **Development Tools**

-   **Build Script** - Automated PowerShell build system:
    -- Creates Chrome and Firefox .zip packages
    -- Generates .crx files for Edge testing

#### **Other**

-   **Fxed Video Height** - Option to fix video height to 30% of viewport height (prevents video element changing height per video, disabled by default)
-   **Hide Player for Active Panels** - Option to hide the player controls when active engagement panels (comments, video details) are open
-   **Update Notification** - New notification to inform users of extension updates (excludes patch updates)

### Changes

-   Minor improvements to the music title parser
-   Replaced play-next indicator icon with one more relevant
-   Other fixes and improvements

### Deleted

-   **.me Manifest merged with Chrome Manifest** - The Chrome manifest is now used for both Chrome and Edge.

## [1.2.5] - 2025-11-12

### Changes

-   Improvements to "Bidey" (:

## [1.2.4.2] - 2025-11-11

### Added

-   Tiny easter egg subtly placed on the Options page in honor of my son's birthday today (:

### Changes

-   **Improved rapid buffer detection** - Reduced false positives by adding checks for current video ID and added option to fine-tune the number of concurrent buffer events to trigger on (def 2).
-   **Improved positioning and feedback of Add to favourites button**.
-   **Styling improvements to the engagement panels** - (Stock YouTube comments and video details panels) Aligned better with the styling of the extension.
-   Other minor tweaks to styling.

### Fixed

-   **Navbar Text Search Button** - Fixed the text search button not working on the results page.
-   **Playlist load bug** - Fixed issue where the script would sometimes attempt to re-open the playlist recursively on the inital page load.
-   **Issue causing related chips to jump** - Hopefully fixed an issue where the chips above the related videos area would sometimes jump in and out of view if you have the video area set to hidden.

## [1.2.3] - 2025-10-28

### Added

-   **Favourites Dialog Search** - Added search functionality to the favourites dialog.

### Changed

-   **Favourites Dialog Modal** - Improved modal styling.

### Fixed

-   **Download Debug Logs** - Fixed issue where download debug logs would fail in FireFox.

## [1.2.2] - 2025-10-27

### Added

-   **Favourites Dialog Sorting** - New options for sorting favourites in the dialog:
    -- Newest First
    -- Oldest First
    -- A-Z
    -- Z-A
    -- Type (Playlists first, then Videos)
-   **Favourites Dialog Filter** - New option for filtering favourites in the dialog:
    -- All (Show all favourites)
    -- Mixes (Show only saved mixes)
    -- Playlists (Show only saved playlists)
    -- Videos (Show only saved videos)

### Fixed

-   **YouTube Comment Section**
    -- Fixed issue were trying to open the comments section would trigger the playlist area to generate.
    -- Improved positioning based on the size of the custom player controls.
-   **Playlist Repopulation** - Fixed issue where the playlist would not be repopulated when changing settings.

### Changes

-   Improved calculation for `--yt-below-player-height`.
-   Improvements to the Rapid Buffer Detection to prevent mis-triggering.

## [1.2.1] - 2025-10-18

### Added

-   **Video Favourites** - The favourites feature has been expanded to support stand-alone videos as well as mixes/playlists.
-   **Mix/Favourites Renaming** - Rename saved favorite mixes in favorites dialog. Renamed mix names are reflected in the playlist drawer header when playing.
-   **Toggle Video Player gesture** - Added gesture support for toggling video player visibility (hide/show video).

### Fixed

-   **Playback with Video Hidden**
    -- Fixed bug where a few seconds of the last video would play at the start of a new video when Hide Video Player option was used.
    -- Fixed bug which would trigger the Buffer Detection at the start of the video playback when Hide Video Player option was used.
-   **Show Favourite Mixes gesture** - The Favourite Mixes popup can now be shown via a settable gesture.

### Changed

-   **Drawer Close Button** - Removed playlist drawer close button for cleaner interface (can still be accessed by dragging drawer).
-   **Show "Playing next" when drawer closed** - Now shows the title of the next video as the playlist drawer header when the drawer is closed.
-   Minor visual/styling changes.

## [1.2.0] - 2025-10-17

### Added

-   **Favourite Mixes** - New feature to save and manage favourite YouTube mixes/playlists
    -- Added favourites button to navbar for quick access
    -- Modal dialog to view, add, and remove favourite mixes
    -- Gesture support for toggling favourites dialog
-   **Hide Video Player** - New option to completely hide the video player area to maximize space for metadata, comments, and suggested videos
    -- Ideal for audio-only content consumption
    -- Optional navbar toggle button for quick video visibility switching (disabled by default)
-   **Buffer Detection Feedback** - Added visual countdown indicator for buffer auto-pause feature
    -- Displays countdown timer next to play button when auto-pause is triggered
-   **Debug Logging for Mobile** - Enhanced debugging capabilities for mobile browsers
    -- New debug button in navbar (visible only when debugging enabled) to download logs, most recent 500 entries

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
