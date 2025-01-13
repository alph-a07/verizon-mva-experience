# My Chrome Extension

This is a Chrome extension that allows users to switch the user agent of subsequent requests.

## Files

-   **manifest.json**: Configuration file for the Chrome extension.
-   **background.js**: Background script that manages the extension's lifecycle and user agent switching.
-   **content.js**: Content script that interacts with web pages and applies user agent changes.
-   **popup.html**: HTML structure for the extension's popup interface.
-   **popup.js**: JavaScript logic for handling user interactions in the popup.

## Installation

1. Clone the repository or download the files.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable "Developer mode" in the top right corner.
4. Click on "Load unpacked" and select the directory containing the extension files.

## Usage

1. Click on the extension icon in the Chrome toolbar.
2. Use the popup interface to select a user agent from the available options.
3. The extension will switch the user agent for subsequent requests made in the browser.

## Contributing

Feel free to submit issues or pull requests for improvements or bug fixes.
