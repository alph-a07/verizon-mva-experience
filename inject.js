(function () {
    try {
        // Check if script was already injected
        if (window.__userAgentSwitcher) {
            return;
        }

        // Mark as injected
        window.__userAgentSwitcher = true;

        // Store in closure instead of global scope
        let userAgentToInject = null;
        const originalGetter = Object.getOwnPropertyDescriptor(Navigator.prototype, 'userAgent').get;

        // Handle page refresh/reload
        document.addEventListener('visibilitychange', function () {
            if (!document.hidden && userAgentToInject) {
                overrideUserAgent();
            }
        });

        window.addEventListener('message', function (event) {
            if (event.data && event.data.type === 'SET_USER_AGENT') {
                try {
                    userAgentToInject = event.data.userAgent;
                    if (userAgentToInject === 'default') {
                        // Restore original behavior
                        Object.defineProperty(Navigator.prototype, 'userAgent', {
                            get: originalGetter,
                        });
                    } else {
                        overrideUserAgent();
                    }
                } catch (err) {
                    console.warn('Failed to set user agent:', err);
                    // Fallback to default if override fails
                    Object.defineProperty(Navigator.prototype, 'userAgent', {
                        get: originalGetter,
                    });
                }
            }
        });

        function overrideUserAgent() {
            try {
                Object.defineProperty(Navigator.prototype, 'userAgent', {
                    get: function () {
                        return userAgentToInject || originalGetter.call(navigator);
                    },
                });
            } catch (err) {
                console.warn('Failed to override user agent:', err);
                // Restore original if override fails
                Object.defineProperty(Navigator.prototype, 'userAgent', {
                    get: originalGetter,
                });
            }
        }
    } catch (err) {
        console.warn('User agent switcher initialization failed:', err);
    }
})();
