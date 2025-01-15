// This file contains the content script for the Chrome extension that interacts with the web page and communicates with the background script to apply user agent changes.

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'switchUserAgent') {
        const script = document.createElement('script');
        script.textContent = `
            (function() {
                // Store original getter
                const originalGetter = Object.getOwnPropertyDescriptor(Navigator.prototype, 'userAgent').get;
                
                // Override navigator.userAgent
                Object.defineProperty(Navigator.prototype, 'userAgent', {
                    get: function() {
                        return '${request.userAgent === 'default' ? originalGetter.call(navigator) : request.userAgent}';
                    }
                });

                // Also override window.navigator
                Object.defineProperty(window, 'navigator', {
                    value: navigator,
                    writable: false,
                    configurable: false
                });
            })();
        `;
        document.documentElement.appendChild(script);
        script.remove();
        sendResponse({ success: true });
    }
    return true;
});
