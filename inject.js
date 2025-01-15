let userAgentToInject = null;

window.addEventListener('message', function (event) {
    if (event.data && event.data.type === 'SET_USER_AGENT') {
        userAgentToInject = event.data.userAgent;
        overrideUserAgent();
    }
});

function overrideUserAgent() {
    const originalGetter = Object.getOwnPropertyDescriptor(Navigator.prototype, 'userAgent').get;

    Object.defineProperty(Navigator.prototype, 'userAgent', {
        get: function () {
            return userAgentToInject === 'default' ? originalGetter.call(navigator) : userAgentToInject;
        },
    });

    Object.defineProperty(window, 'navigator', {
        value: navigator,
        writable: false,
        configurable: false,
    });
}
