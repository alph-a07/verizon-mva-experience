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

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Content script received message:', request);
    if (request.action === 'switchUserAgent') {
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
