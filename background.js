const attachedTabs = new Set();
console.log('Background script initialized');

// Initialize storage and register events immediately
chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed');
    chrome.storage.local.set({
        userAgent: 'default',
        enabled: true,
    });
});

// Tab management events
chrome.tabs.onCreated.addListener(tab => attachDebugger(tab.id));

chrome.tabs.onRemoved.addListener(tabId => {
    attachedTabs.delete(tabId);
    chrome.debugger.detach({ tabId }).catch(() => {});
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === 'loading') {
        handleTabUpdate(tabId);
    }
});

// Navigation monitoring
chrome.webNavigation.onCommitted.addListener(details => {
    if (details.frameId === 0 && details.url.includes('verizon.com')) {
        handleNavigation(details.tabId);
    }
});

// Message handling
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Message received:', request);
    switch (request.action) {
        case 'switchUserAgent':
            handleUserAgentSwitch(request.userAgent, sendResponse);
            return true;
        case 'toggleExtension':
            handleExtensionToggle(request.enabled, sendResponse);
            return true;
        default:
            sendResponse({ success: false, error: 'Unknown action' });
            return false;
    }
});

// Conditionally add rule match debug listener
if (chrome.declarativeNetRequest && chrome.declarativeNetRequest.onRuleMatchedDebug) {
    chrome.declarativeNetRequest.onRuleMatchedDebug.addListener(info => {
        console.log('Rule matched:', info);
    });
}

// Keep existing helper functions
async function handleTabUpdate(tabId) {
    try {
        const data = await chrome.storage.local.get(['userAgent', 'enabled']);
        if (data.enabled !== false && data.userAgent && data.userAgent !== 'default') {
            await chrome.tabs
                .sendMessage(tabId, {
                    action: 'switchUserAgent',
                    userAgent: data.userAgent,
                })
                .catch(() => {});
        }
    } catch (err) {
        console.warn(`Tab update handler error: ${err}`);
    }
}

async function handleNavigation(tabId) {
    try {
        const data = await chrome.storage.local.get(['userAgent', 'enabled']);
        if (data.enabled !== false && data.userAgent && data.userAgent !== 'default') {
            await Promise.all([updateNetworkUA(data.userAgent), updateDevToolsUA(data.userAgent), updatePageUA(data.userAgent)]);
        }
    } catch (err) {
        console.warn(`Navigation handler error: ${err}`);
    }
}

function attachDebugger(tabId) {
    chrome.storage.local.get(['enabled'], data => {
        if (data.enabled === false) return;

        chrome.debugger.attach({ tabId }, '1.3', () => {
            if (chrome.runtime.lastError) {
                console.warn('Failed to attach debugger:', chrome.runtime.lastError);
                return;
            }
            attachedTabs.add(tabId);

            // Get current user agent setting and force reapplication
            chrome.storage.local.get(['userAgent', 'enabled'], data => {
                if (data.enabled !== false && data.userAgent && data.userAgent !== 'default') {
                    Promise.all([
                        chrome.debugger.sendCommand({ tabId }, 'Network.setUserAgentOverride', { userAgent: data.userAgent }),
                        updateNetworkUA(data.userAgent),
                        updatePageUA(data.userAgent),
                    ]).catch(err => console.warn('Failed to reapply UA settings:', err));
                }
            });
        });
    });
}

function updateNetworkUA(userAgent) {
    return new Promise(resolve => {
        if (userAgent === 'default') {
            chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: [1] }).then(resolve);
            return;
        }

        chrome.declarativeNetRequest
            .updateDynamicRules({
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
                            urlFilter: '*://*.verizon.com/*',
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
            })
            .then(resolve);
    });
}

function updateDevToolsUA(userAgent) {
    return new Promise(resolve => {
        chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
            const tab = tabs[0];
            if (tab && tab.url && tab.url.includes('verizon.com') && attachedTabs.has(tab.id)) {
                chrome.debugger
                    .sendCommand({ tabId: tab.id }, 'Network.setUserAgentOverride', userAgent === 'default' ? {} : { userAgent })
                    .catch(err => console.warn(`Failed to update DevTools UA for tab ${tab.id}:`, err))
                    .finally(resolve);
            } else {
                resolve();
            }
        });
    });
}

function updatePageUA(userAgent) {
    return new Promise(resolve => {
        chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
            const tab = tabs[0];
            if (tab && tab.url && tab.url.includes('verizon.com')) {
                chrome.tabs
                    .sendMessage(tab.id, {
                        action: 'switchUserAgent',
                        userAgent: userAgent,
                    })
                    .catch(err => console.warn(`Failed to update tab ${tab.id}:`, err))
                    .finally(resolve);
            } else {
                resolve();
            }
        });
    });
}

function switchUserAgent(userAgent) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['enabled'], data => {
            if (data.enabled === false) {
                // If disabled, only allow resetting to default
                if (userAgent === 'default') {
                    Promise.all([updateNetworkUA(userAgent), updateDevToolsUA(userAgent), updatePageUA(userAgent)])
                        .then(resolve)
                        .catch(reject);
                } else {
                    reject(new Error('Extension is disabled'));
                }
                return;
            }

            Promise.all([
                // Update network rules
                updateNetworkUA(userAgent),
                // Update DevTools for all tabs
                updateDevToolsUA(userAgent),
                // Update page-level UA
                updatePageUA(userAgent),
            ])
                .then(resolve)
                .catch(reject);
        });
    });
}

async function handleUserAgentSwitch(userAgent, sendResponse) {
    try {
        await switchUserAgent(userAgent);
        sendResponse({ success: true });
    } catch (error) {
        sendResponse({ success: false, error: error.message });
    }
}

async function handleExtensionToggle(enabled, sendResponse) {
    try {
        await chrome.storage.local.set({ enabled });
        if (!enabled) {
            await Promise.all([
                switchUserAgent('default'),
                ...Array.from(attachedTabs).map(tabId => chrome.debugger.detach({ tabId }).catch(() => {})),
                chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: [1] }),
            ]);
            attachedTabs.clear();
        } else {
            const data = await chrome.storage.local.get('userAgent');
            if (data.userAgent && data.userAgent !== 'default') {
                await switchUserAgent(data.userAgent);
            }
        }
        sendResponse({ success: true });
    } catch (error) {
        sendResponse({ success: false, error: error.message });
    }
}
