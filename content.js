// This file contains the content script for the Chrome extension that interacts with the web page and communicates with the background script to apply user agent changes.

// Track URL changes within the page
let lastUrl = location.href;
console.log('Content script initialized at:', lastUrl);

// Watch for URL changes
new MutationObserver(() => {
    if (location.href !== lastUrl) {
        console.log('URL changed from', lastUrl, 'to', location.href);
        lastUrl = location.href;
        // Request latest user agent
        chrome.runtime.sendMessage({ action: 'getLatestUserAgent' }, response => {
            if (response && response.userAgent && response.userAgent !== 'default') {
                window.postMessage(
                    {
                        type: 'SET_USER_AGENT',
                        userAgent: response.userAgent,
                    },
                    '*',
                );
            }
        });
    }
}).observe(document, { subtree: true, childList: true });

// Add mobile device frame styles
const mobileFrameStyles = `
    .mobile-device-frame {
        margin: 20px auto !important;
        box-shadow: 0 0 0 2px #e0e0e0 !important;
        border-radius: 32px !important;
        overflow: auto !important;
        max-width: 414px !important;
        height: 896px !important;
        position: relative !important;
    }
`;

// Function to toggle mobile frame
function toggleMobileFrame(enable) {
    const styleId = 'mobile-frame-styles';
    let styleEl = document.getElementById(styleId);

    if (enable && !styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = styleId;
        styleEl.textContent = mobileFrameStyles;
        document.head.appendChild(styleEl);
        document.body.classList.add('mobile-device-frame');
    } else if (!enable && styleEl) {
        styleEl.remove();
        document.body.classList.remove('mobile-device-frame');
    }
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Content script received message:', request);
    if (request.action === 'switchUserAgent') {
        // Toggle mobile frame based on user agent
        toggleMobileFrame(request.userAgent !== 'default');

        // Inject the script file
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('inject.js');
        script.onload = () => {
            console.log('Inject script loaded, setting user agent:', request.userAgent);
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

// Handle extension toggle
chrome.storage.local.get(['enabled'], data => {
    if (data.enabled === false) {
        toggleMobileFrame(false);
    }
});
