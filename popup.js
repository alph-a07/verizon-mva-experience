document.addEventListener('DOMContentLoaded', () => {
    const userAgentSelect = document.getElementById('user-agent-select');
    const switchButton = document.getElementById('switch-button');

    // Load the saved user agent from storage
    chrome.storage.local.get('userAgent', data => {
        if (data.userAgent) {
            userAgentSelect.value = data.userAgent;
        }
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
                alert('User agent switched to: ' + newUserAgent);
                // Save the selected user agent to storage
                chrome.storage.local.set({ userAgent: newUserAgent });
            } else {
                alert('Failed to switch user agent: ' + (response.error || 'Unknown error'));
            }
        });
    });
});
