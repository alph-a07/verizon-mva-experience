// Initialize the service worker
console.log('Background service worker initialized');

// Keep service worker alive
chrome.runtime.onStartup.addListener(() => {
    console.log('Extension started');
});

chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed');
    switchUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36')
        .then(() => console.log('Initial user agent set'))
        .catch(error => console.error('Failed to set initial user agent:', error));
});

function switchUserAgent(userAgent) {
    return new Promise((resolve, reject) => {
        // If default is selected, remove all rules to restore browser's default UA
        if (userAgent === 'default') {
            chrome.declarativeNetRequest.updateDynamicRules(
                {
                    removeRuleIds: [1],
                },
                () => {
                    if (chrome.runtime.lastError) {
                        console.error('Error:', chrome.runtime.lastError);
                        reject(chrome.runtime.lastError);
                    } else {
                        console.log('Rules removed successfully');
                        resolve();
                    }
                },
            );
            return;
        }

        // Existing rule update logic for custom user agents
        chrome.declarativeNetRequest.updateDynamicRules(
            {
                removeRuleIds: [1],
                addRules: [
                    {
                        id: 1,
                        priority: 1,
                        action: {
                            type: 'modifyHeaders',
                            requestHeaders: [
                                {
                                    header: 'User-Agent',
                                    operation: 'set',
                                    value: userAgent,
                                },
                            ],
                        },
                        condition: {
                            urlFilter: '*',
                            resourceTypes: [
                                'main_frame',
                                'sub_frame',
                                'stylesheet',
                                'script',
                                'image',
                                'font',
                                'object',
                                'xmlhttprequest',
                                'ping',
                                'csp_report',
                                'media',
                                'websocket',
                                'other',
                            ],
                        },
                    },
                ],
            },
            () => {
                if (chrome.runtime.lastError) {
                    console.error('Error:', chrome.runtime.lastError);
                    reject(chrome.runtime.lastError);
                } else {
                    console.log('Rule added successfully');
                    resolve();
                }
            },
        );
    });
}

// Listen for rule matches
chrome.declarativeNetRequest.onRuleMatchedDebug.addListener(info => {
    console.log('Rule matched:', info);
});

// Listen for messages from popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Message received:', request);
    if (request.action === 'switchUserAgent') {
        switchUserAgent(request.userAgent)
            .then(() => {
                console.log('User agent switched successfully');
                sendResponse({ success: true });
            })
            .catch(error => {
                console.error('Failed to switch user agent:', error);
                sendResponse({ success: false, error: error.message });
            });
        return true;
    } else {
        console.error('Unknown action:', request.action);
        sendResponse({ success: false });
    }
    return true; // Keep the message channel open for async response
});
