let isEnabled = false;
let userAgent = navigator.userAgent; // Default user agent
let webParams = []; // Store web params

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'toggleExtension') {
        isEnabled = message.isEnabled;
        sendResponse({ status: 'Extension toggled', isEnabled });
    } else if (message.action === 'updateUserAgent') {
        userAgent = message.userAgent;
        sendResponse({ status: 'User Agent updated', userAgent });
    } else if (message.action === 'updateWebParams') {
        webParams = message.webParams;
        sendResponse({ status: 'Web Params updated', webParams });
    }
});

// Modify headers to update the User Agent
chrome.webRequest.onBeforeSendHeaders.addListener(
    details => {
        if (isEnabled) {
            const headers = details.requestHeaders.map(header => {
                if (header.name.toLowerCase() === 'user-agent') {
                    header.value = userAgent;
                }
                return header;
            });
            return { requestHeaders: headers };
        }
    },
    { urls: ['<all_urls>'] },
    ['blocking', 'requestHeaders'],
);
