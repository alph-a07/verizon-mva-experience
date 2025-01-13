document.addEventListener('DOMContentLoaded', () => {
    const userAgentInput = document.getElementById('user-agent-input');
    const switchButton = document.getElementById('switch-button');

    switchButton.addEventListener('click', () => {
        const newUserAgent = userAgentInput.value;
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
            } else {
                alert('Failed to switch user agent: ' + (response.error || 'Unknown error'));
            }
        });
    });
});
