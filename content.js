chrome.runtime.onMessage.addListener(message => {
    if (message.action === 'injectParams' && message.params) {
        const params = message.params.filter(param => param.enabled);
        const script = document.createElement('script');
        script.textContent = `(() => {
        ${params.map(param => `window["${param.key}"] = "${param.value}";`).join('\n')}
      })();`;
        document.documentElement.appendChild(script);
        script.remove();
    }
});
