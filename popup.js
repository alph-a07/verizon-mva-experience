document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    chrome.storage.local.get('isEnabled', data => {
        const isEnabled = data.isEnabled !== false; // Default to true if not set
        document.getElementById('toggleExtension').textContent = isEnabled ? 'Disable' : 'Enable';
        chrome.runtime.sendMessage({ action: 'toggleExtension', isEnabled });
    });
});

document.getElementById('toggleExtension').addEventListener('click', e => {
    const isEnabled = e.target.textContent === 'Enable';
    e.target.textContent = isEnabled ? 'Disable' : 'Enable';
    chrome.storage.local.set({ isEnabled });
    chrome.runtime.sendMessage({ action: 'toggleExtension', isEnabled });
});

document.getElementById('refreshPage').addEventListener('click', () => {
    chrome.tabs.reload();
});

document.getElementById('userAgent').addEventListener('change', e => {
    const userAgent = e.target.value;
    chrome.runtime.sendMessage({ action: 'updateUserAgent', userAgent });
    saveSettings();
});

document.getElementById('addParam').addEventListener('click', () => {
    const container = document.getElementById('webParams');
    const row = document.createElement('div');
    row.className = 'web-param-row';

    row.innerHTML = `
      <input type="checkbox" class="param-enable" />
      <input type="text" class="param-key" placeholder="Key" />
      <input type="text" class="param-value" placeholder="Value" />
      <button class="delete-param">X</button>
    `;

    container.appendChild(row);

    row.querySelector('.delete-param').addEventListener('click', () => {
        row.remove();
        saveSettings();
    });

    row.querySelectorAll('input').forEach(input => {
        input.addEventListener('change', saveSettings);
    });

    saveSettings();
});

function saveSettings() {
    const userAgent = document.getElementById('userAgent').value;
    const params = Array.from(document.querySelectorAll('.web-param-row')).map(row => ({
        enabled: row.querySelector('.param-enable').checked,
        key: row.querySelector('.param-key').value,
        value: row.querySelector('.param-value').value,
    }));
    chrome.storage.local.set({ userAgent, webParams: params });
}

function loadSettings() {
    chrome.storage.local.get(['userAgent', 'webParams'], data => {
        if (data.userAgent) {
            document.getElementById('userAgent').value = data.userAgent;
            chrome.runtime.sendMessage({ action: 'updateUserAgent', userAgent: data.userAgent });
        }
        if (data.webParams) {
            const container = document.getElementById('webParams');
            data.webParams.forEach(param => {
                const row = document.createElement('div');
                row.className = 'web-param-row';

                row.innerHTML = `
                  <input type="checkbox" class="param-enable" ${param.enabled ? 'checked' : ''} />
                  <input type="text" class="param-key" placeholder="Key" value="${param.key}" />
                  <input type="text" class="param-value" placeholder="Value" value="${param.value}" />
                  <button class="delete-param">X</button>
                `;

                container.appendChild(row);

                row.querySelector('.delete-param').addEventListener('click', () => {
                    row.remove();
                    saveSettings();
                });

                row.querySelectorAll('input').forEach(input => {
                    input.addEventListener('change', saveSettings);
                });
            });
        }
    });
}
