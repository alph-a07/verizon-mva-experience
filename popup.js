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
                    // Auto-refresh only verizon.com tabs
                    chrome.tabs.query({ url: '*://*.verizon.com/*' }, tabs => {
                        tabs.forEach(tab => {
                            chrome.tabs.reload(tab.id);
                        });
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
                chrome.runtime.sendMessage({
                    action: 'toggleExtension',
                    enabled: newState,
                });
            });
        });
    });

    function updateToggleButton(isEnabled) {
        toggleButton.textContent = isEnabled ? 'Disable Extension' : 'Enable Extension';
        document.getElementById('user-agent-select').disabled = !isEnabled;
        document.getElementById('switch-button').disabled = !isEnabled;
    }
});
