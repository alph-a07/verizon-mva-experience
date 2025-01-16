// Initialize the service worker
console.log('Background service worker initialized');

// Keep service worker alive
chrome.runtime.onStartup.addListener(() => {
    console.log('Extension started');
});

chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed');
    // Initialize with default settings
    chrome.storage.local.set({
        userAgent: 'default',
        enabled: true,
    });
});

// Add tab reload listener
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'loading') {
        chrome.storage.local.get('userAgent', data => {
            if (data.userAgent && data.userAgent !== 'default') {
                // Small delay to ensure content script is ready
                setTimeout(() => {
                    chrome.tabs
                        .sendMessage(tabId, {
                            action: 'switchUserAgent',
                            userAgent: data.userAgent,
                        })
                        .catch(err => console.warn(`Failed to update reloaded tab ${tabId}:`, err));
                }, 100);
            }
        });
    }
});

// Track attached debugger targets
const attachedTabs = new Set();

// Attach debugger when new tabs are created
chrome.tabs.onCreated.addListener(tab => {
    attachDebugger(tab.id);
});

// Reattach debugger on tab updates if needed
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === 'loading' && !attachedTabs.has(tabId)) {
        attachDebugger(tabId);
    }
});

function attachDebugger(tabId) {
    chrome.debugger.attach({ tabId }, '1.3', () => {
        if (chrome.runtime.lastError) {
            console.warn('Failed to attach debugger:', chrome.runtime.lastError);
            return;
        }
        attachedTabs.add(tabId);

        // Get current user agent setting
        chrome.storage.local.get(['userAgent', 'enabled'], data => {
            if (data.enabled !== false && data.userAgent && data.userAgent !== 'default') {
                // Force user agent through DevTools protocol
                chrome.debugger.sendCommand({ tabId }, 'Network.setUserAgentOverride', { userAgent: data.userAgent });
            }
        });
    });
}

// Clean up when tabs are closed
chrome.tabs.onRemoved.addListener(tabId => {
    attachedTabs.delete(tabId);
    chrome.debugger.detach({ tabId });
});

function switchUserAgent(userAgent) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['enabled'], data => {
            if (data.enabled === false && userAgent !== 'default') {
                reject(new Error('Extension is disabled'));
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

function updateDevToolsUA(userAgent) {
    return new Promise(resolve => {
        chrome.tabs.query({}, tabs => {
            const promises = tabs.map(tab => {
                if (attachedTabs.has(tab.id)) {
                    return chrome.debugger
                        .sendCommand({ tabId: tab.id }, 'Network.setUserAgentOverride', userAgent === 'default' ? {} : { userAgent })
                        .catch(err => console.warn(`Failed to update DevTools UA for tab ${tab.id}:`, err));
                }
                return Promise.resolve();
            });
            Promise.all(promises).then(resolve);
        });
    });
}

function updateNetworkUA(userAgent) {
    return userAgent === 'default'
        ? chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: [1] })
        : chrome.declarativeNetRequest.updateDynamicRules({
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
          });
}

function updatePageUA(userAgent) {
    return new Promise(resolve => {
        chrome.tabs.query({}, tabs => {
            const updatePromises = tabs.map(tab =>
                chrome.tabs
                    .sendMessage(tab.id, {
                        action: 'switchUserAgent',
                        userAgent: userAgent,
                    })
                    .catch(err => console.warn(`Failed to update tab ${tab.id}:`, err)),
            );

            Promise.all(updatePromises)
                .then(() => resolve())
                .catch(resolve);
        });
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
    } else if (request.action === 'toggleExtension') {
        if (!request.enabled) {
            // Disable: Reset to default UA and remove rules
            switchUserAgent('default')
                .then(() => sendResponse({ success: true }))
                .catch(error => sendResponse({ success: false, error: error.message }));
        } else {
            // Enable: Restore previous UA if any
            chrome.storage.local.get('userAgent', data => {
                if (data.userAgent && data.userAgent !== 'default') {
                    switchUserAgent(data.userAgent)
                        .then(() => sendResponse({ success: true }))
                        .catch(error => sendResponse({ success: false, error: error.message }));
                }
            });
        }
        return true;
    } else {
        console.error('Unknown action:', request.action);
        sendResponse({ success: false });
    }
    return true; // Keep the message channel open for async response
});
