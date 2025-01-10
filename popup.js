document.getElementById('toggleExtension').addEventListener('click', e => {
    const isEnabled = e.target.textContent === 'Enable';
    e.target.textContent = isEnabled ? 'Disable' : 'Enable';
    chrome.runtime.sendMessage({ action: 'toggleExtension', isEnabled });
});

document.getElementById('refreshPage').addEventListener('click', () => {
    chrome.tabs.reload();
});

document.getElementById('userAgent').addEventListener('change', e => {
    chrome.runtime.sendMessage({ action: 'updateUserAgent', userAgent: e.target.value });
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
    });

    saveParams();
});

function saveParams() {
    const params = Array.from(document.querySelectorAll('.web-param-row')).map(row => ({
        enabled: row.querySelector('.param-enable').checked,
        key: row.querySelector('.param-key').value,
        value: row.querySelector('.param-value').value,
    }));
    chrome.runtime.sendMessage({ action: 'updateWebParams', webParams: params });
}
