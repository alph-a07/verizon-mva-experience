let ruleId = 1; // ID for the declarativeNetRequest rule

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'updateUserAgent') {
        const userAgent = message.userAgent;

        // Remove any existing rule
        chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: [ruleId] }, () => {
            if (userAgent !== 'default') {
                // Add a new rule to set the User-Agent
                chrome.declarativeNetRequest.updateDynamicRules(
                    {
                        addRules: [
                            {
                                id: ruleId,
                                priority: 1,
                                action: {
                                    type: 'modifyHeaders',
                                    requestHeaders: [{ header: 'User-Agent', operation: 'set', value: userAgent }],
                                },
                                condition: { urlFilter: '*' },
                            },
                        ],
                    },
                    () => {
                        sendResponse({ status: 'User Agent updated', userAgent });
                    },
                );
            } else {
                sendResponse({ status: 'User Agent reset to default' });
            }
        });

        // Required for async response
        return true;
    }
});
