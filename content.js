// This file contains the content script for the Chrome extension that interacts with the web page and communicates with the background script to apply user agent changes.

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'switchUserAgent') {
        // Inject the script file
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('inject.js');
        script.onload = () => {
            // After script is loaded, send the user agent via postMessage
            window.postMessage(
                {
                    type: 'SET_USER_AGENT',
                    userAgent: request.userAgent,
                },
                '*',
            );
            script.remove();
            sendResponse({ success: true });
        };
        (document.head || document.documentElement).appendChild(script);
        return true;
    }
});
