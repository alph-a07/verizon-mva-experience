document.addEventListener('DOMContentLoaded', () => {
    const userAgentSelect = document.getElementById('user-agent-select');
    const switchButton = document.getElementById('switch-button');
    const toggleButton = document.getElementById('toggleExtension');
    const controls = document.querySelector('select, button:not(#toggleExtension)');

    // Load the saved user agent from storage
    chrome.storage.local.get('userAgent', data => {
        if (data.userAgent) {
            userAgentSelect.value = data.userAgent;
        }
    });

    // Load extension state
    chrome.storage.local.get(['enabled'], data => {
        const isEnabled = data.enabled !== false; // Default to true
        updateToggleButton(isEnabled);
    });

    switchButton.addEventListener('click', () => {
        const newUserAgent = userAgentSelect.value;
        console.log('Popup sending message to switch user agent:', newUserAgent);

        chrome.runtime.sendMessage({ action: 'switchUserAgent', userAgent: newUserAgent }, response => {
            console.log('Received response:', response);
            if (chrome.runtime.lastError) {
                console.error('Runtime error:', chrome.runtime.lastError);
                alert('Error: ' + chrome.runtime.lastError.message);
                return;
            }
            if (response.success) {
                const message = newUserAgent === 'default' ? 'Reset to browser default user agent' : 'User agent switched to: ' + newUserAgent;
                alert(message);
                chrome.storage.local.set({ userAgent: newUserAgent }, () => {
                    // Only refresh current tab if it's a verizon.com tab
                    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
                        const tab = tabs[0];
                        if (tab && tab.url && tab.url.includes('verizon.com')) {
                            chrome.tabs.reload(tab.id);
                            // Open DevTools only if user agent is not default
                            if (newUserAgent !== 'default') {
                                setTimeout(() => {
                                    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
                                        if (tabs[0]) {
                                            // Attach debugger and emulate mobile metrics
                                            chrome.debugger.attach({ tabId: tabs[0].id }, '1.3', () => {
                                                chrome.debugger
                                                    .sendCommand({ tabId: tabs[0].id }, 'Network.enable')
                                                    .then(() =>
                                                        chrome.debugger.sendCommand({ tabId: tabs[0].id }, 'Emulation.setDeviceMetricsOverride', {
                                                            width: 414,
                                                            height: 896,
                                                            deviceScaleFactor: 3,
                                                            mobile: true,
                                                        }),
                                                    )
                                                    .catch(err => console.warn('DevTools error:', err));
                                            });
                                        }
                                    });
                                }, 500);
                            }
                        }
                    });
                });
            } else {
                alert('Failed to switch user agent: ' + (response.error || 'Unknown error'));
            }
        });
    });

    toggleButton.addEventListener('click', () => {
        chrome.storage.local.get(['enabled'], data => {
            const newState = data.enabled !== false ? false : true;
            chrome.storage.local.set({ enabled: newState }, () => {
                updateToggleButton(newState);
                chrome.runtime.sendMessage(
                    {
                        action: 'toggleExtension',
                        enabled: newState,
                    },
                    response => {
                        if (response.success && !newState) {
                            // Refresh all Verizon tabs when disabled
                            chrome.tabs.query({ url: '*://*.verizon.com/*' }, tabs => {
                                tabs.forEach(tab => chrome.tabs.reload(tab.id));
                            });
                            // Extension just got disabled - maximize window
                            chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
                                if (tabs[0]) {
                                    chrome.windows.update(tabs[0].windowId, { state: 'maximized' });
                                }
                            });
                        }
                    },
                );
            });
        });
    });

    function updateToggleButton(isEnabled) {
        toggleButton.textContent = isEnabled ? 'Disable Extension' : 'Enable Extension';
        userAgentSelect.disabled = !isEnabled;
        switchButton.disabled = !isEnabled;

        if (!isEnabled) {
            // Reset select to default when disabled
            userAgentSelect.value = 'default';
        }

        // Add/remove disabled class for styling
        [userAgentSelect, switchButton].forEach(element => {
            element.classList.toggle('disabled', !isEnabled);
        });
    }
});
