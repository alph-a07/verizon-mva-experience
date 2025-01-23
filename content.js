// This file contains the content script for the Chrome extension that interacts with the web page and communicates with the background script to apply user agent changes.

// Add mobile frame to page
function addMobileFrame() {
    const frame = document.createElement('div');
    frame.className = 'mobile-frame';
    frame.style.display = 'none';
    document.body.appendChild(frame);
    return frame;
}

let mobileFrame = addMobileFrame();

// Enhanced URL change detection
let lastUrl = location.href;
const urlObserver = new MutationObserver(() => {
    if (location.href !== lastUrl) {
        console.log('URL changed from', lastUrl, 'to', location.href);
        lastUrl = location.href;
        requestLatestUserAgent();
    }
});

// Watch for both DOM changes and History API changes
urlObserver.observe(document, { subtree: true, childList: true });
window.addEventListener('popstate', requestLatestUserAgent);
window.addEventListener('pushstate', requestLatestUserAgent);
window.addEventListener('replacestate', requestLatestUserAgent);

function requestLatestUserAgent() {
    chrome.runtime.sendMessage({ action: 'getLatestUserAgent' }, response => {
        if (response && response.userAgent) {
            if (response.userAgent !== 'default') {
                mobileFrame.style.display = 'block';
                window.postMessage(
                    {
                        type: 'SET_USER_AGENT',
                        userAgent: response.userAgent,
                    },
                    '*',
                );
            } else {
                mobileFrame.style.display = 'none';
            }
        }
    });
}

// Enhanced message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Content script received message:', request);
    if (request.action === 'switchUserAgent') {
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('inject.js');
        script.onload = () => {
            window.postMessage(
                {
                    type: 'SET_USER_AGENT',
                    userAgent: request.userAgent,
                },
                '*',
            );
            script.remove();

            // Toggle mobile frame
            mobileFrame.style.display = request.userAgent !== 'default' ? 'block' : 'none';

            sendResponse({ success: true });
        };
        (document.head || document.documentElement).appendChild(script);
        return true;
    }
});
