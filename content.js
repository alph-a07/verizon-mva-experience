// This file contains the content script for the Chrome extension that interacts with the web page and communicates with the background script to apply user agent changes. 

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "setUserAgent") {
        // Set the user agent for the current page
        navigator.__defineGetter__('userAgent', function(){
            return request.userAgent;
        });
        sendResponse({status: "User agent changed"});
    }
});