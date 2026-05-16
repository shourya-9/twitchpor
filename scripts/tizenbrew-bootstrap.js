/**
 * tizenbrew-bootstrap.js
 *
 * Injected as the first script that runs when smarttv-twitch loads inside
 * TizenBrew (via evaluateScriptOnDocumentStart in package.json AND as a
 * non-deferred <script> at the top of app/index.html).
 *
 * When an app is hosted inside TizenBrew it loses access to window.tizen
 * and window.webapis.  This script restores minimal stubs so the app's
 * Main_IsNotBrowser guard evaluates correctly and Tizen-specific code paths
 * do not throw uncaught exceptions before the shims can be replaced by real
 * proxies in a future iteration.
 *
 * IMPORTANT: Do NOT add any async code here. Everything must be synchronous
 * so the stubs are in place before the deferred app scripts execute.
 *
 * Phase 8 TODO: Replace AddCode_clientId / AddCode_client_token /
 *   AddCode_redirect_uri with your own registered Twitch app credentials.
 *   See dossier §7 / §13 for the exact constants to change in AddCode.js and
 *   in the Main_Set() function inside Main.js.
 */

(function () {
    'use strict';

    /* -----------------------------------------------------------------------
     * 1.  window.tizen shim
     *
     * The app accesses tizen in these ways:
     *   - tizen.systeminfo.getCapability(...)    → Play_TizenVersion
     *   - tizen.tvinputdevice.registerKey(...)   → TVKeyValue_regKey (no-op;
     *       TizenBrew registers keys via module package.json `keys` array)
     *   - tizen.application.getCurrentApplication().exit()
     *   - tizen.application.getCurrentApplication().getRequestedAppControl()
     *
     * If TizenBrew already injected window.tizen (newer builds may do this),
     * we leave it untouched.
     * ----------------------------------------------------------------------- */
    if (typeof window.tizen === 'undefined') {
        window.tizen = {
            systeminfo: {
                // Return Tizen 6.0 so low-latency gating (>= 2.4) stays on.
                getCapability: function (key) {
                    if (key === 'http://tizen.org/feature/platform.version') {
                        return '6.0';
                    }
                    return null;
                }
            },
            tvinputdevice: {
                // Keys are registered by TizenBrew via the `keys` array in
                // package.json — the app's own registerKey calls become no-ops.
                registerKey: function () {},
                unregisterKey: function () {},
                getKey: function () { return null; },
                getSupportedKeys: function () { return []; }
            },
            application: {
                getCurrentApplication: function () {
                    return {
                        // Return to TizenBrew launcher instead of exiting the WGT.
                        exit: function () {
                            try { history.back(); } catch (e) {}
                        },
                        // No SmartHub deep-link inside TizenBrew.
                        getRequestedAppControl: function () { return null; }
                    };
                }
            }
        };
        console.log('[TizenBrew] window.tizen shim installed (platform.version → 6.0)');
    } else {
        console.log('[TizenBrew] window.tizen already present — shim skipped');
    }

    /* -----------------------------------------------------------------------
     * 2.  window.webapis shim
     *
     * The app accesses webapis in these ways:
     *   - webapis.avplay          → Play_avplay (the hardware video decoder)
     *   - webapis.preview         → SmartHub preview tiles (no-op in TizenBrew)
     *   - webapis.productinfo     → device firmware/model logging
     *   - webapis.network         → network state listener
     *   - webapis.appcommon       → screen-saver control
     *
     * AVPlay STRATEGY:
     *   If TizenBrew's WebView exposes the real webapis object to the inner
     *   page (some builds do), we preserve it and only patch missing sub-APIs.
     *   If not (the documented common case), we install a stub for everything
     *   non-critical and log a prominent warning for avplay so it is obvious
     *   in the inspector.
     *
     *   The stub avplay lets the app boot without throwing, but video will NOT
     *   play until the real webapis.avplay is injected — either by TizenBrew's
     *   host WebView automatically, or by wiring a postMessage bridge in
     *   service.js (Phase 7 work).
     * ----------------------------------------------------------------------- */
    if (typeof window.webapis === 'undefined') {
        window.webapis = {};
        console.warn('[TizenBrew] window.webapis was undefined — full stub installed.' +
            '  AVPlay will NOT work until real webapis is provided by the host.');
    }

    // --- 2a. webapis.avplay stub -------------------------------------------
    // Only install the stub if the real avplay is absent.  If the host WebView
    // injects it, we must not overwrite it.
    if (!window.webapis.avplay) {
        window.webapis.avplay = {
            _stubWarned: false,
            _warn: function (method) {
                if (!this._stubWarned) {
                    console.error('[TizenBrew] webapis.avplay.' + method + ' called but AVPlay ' +
                        'is not available in this TizenBrew build. ' +
                        'Video playback will not work. See dossier §4.3 / §8.13.');
                    this._stubWarned = true;
                }
            },
            open:            function (url) { this._warn('open'); },
            close:           function ()    { this._warn('close'); },
            stop:            function ()    { this._warn('stop'); },
            prepare:         function ()    { this._warn('prepare'); },
            // prepareAsync: call successCb after a short delay so the app does NOT
            // cascade into "Stream ended".  Without a real AVPlay, video will show
            // nothing, but the UI stays alive.  Play_onPlayer() also calls
            // setBufferingParam() BEFORE prepareAsync, so that must exist too.
            prepareAsync:    function (successCb, errorCb) {
                this._warn('prepareAsync');
                if (typeof successCb === 'function') {
                    window.setTimeout(successCb, 100);
                }
            },
            play:            function ()    { this._warn('play'); },
            pause:           function ()    {},
            seekTo:          function ()    {},
            setListener:     function ()    {},
            setDisplayRect:  function ()    {},
            setDisplayMethod:function ()    {},
            // setBufferingParam is called in Play_onPlayer() before prepareAsync.
            // Without this stub it throws TypeError and aborts Play_onPlayer(),
            // which cascades: errorCb → retry → drop quality → "Stream ended".
            setBufferingParam: function ()  {},
            // setSilentSubtitle is called via try/catch in Play_onPlayer(); less
            // critical but include for completeness.
            setSilentSubtitle: function ()  {},
            setStreamingProperty: function () {},
            getCurrentStreamInfo: function () { return []; },
            getDuration:     function ()    { return 0; },
            getCurrentTime:  function ()    { return 0; },
            // Return 'IDLE' so Play_isIdleOrPlaying() returns true and the
            // watchdog considers the player running (avoids a false stall timeout).
            getState:        function ()    { return 'IDLE'; }
        };
        console.warn('[TizenBrew] webapis.avplay stub installed — replace with real AVPlay bridge.');
    } else {
        console.log('[TizenBrew] webapis.avplay already present — using real AVPlay.');
    }

    // --- 2b. webapis.preview (SmartHub) — no-op ----------------------------
    // TizenBrew apps are not launched from SmartHub; preview is irrelevant.
    if (!window.webapis.preview) {
        window.webapis.preview = {
            setPreviewData:               function () {},
            setActionDataEventListener:   function () {},
            unsetActionDataEventListener: function () {}
        };
    }

    // --- 2c. webapis.productinfo — minimal stub ----------------------------
    // Used for logging device firmware / model. Non-critical.
    if (!window.webapis.productinfo) {
        window.webapis.productinfo = {
            getFirmware:  function () { return 'TIZENBREW'; },
            getModel:     function () { return 'TIZENBREW'; },
            getDuid:      function () { return 'TIZENBREW-DUID'; },
            isUdPanelSupported: function () { return false; },
            getRealModel: function () { return 'TIZENBREW'; }
        };
    }

    // --- 2d. webapis.network — fall through to navigator.onLine -----------
    // The app already has a navigator.onLine fallback path; stub the Samsung
    // network API so the initial call does not throw.
    if (!window.webapis.network) {
        window.webapis.network = {
            // Listener ID counter (app stores the returned value to clear later)
            _nextId: 1,
            addNetworkStateChangeListener: function (cb) {
                // Wire up W3C online/offline events as a substitute.
                var id = this._nextId++;
                window.addEventListener('online',  function () { cb(0); }); // 0 = GATEWAY_CONNECTED
                window.addEventListener('offline', function () { cb(3); }); // 3 = GATEWAY_DISCONNECTED
                return id;
            },
            removeNetworkStateChangeListener: function () {},
            getActiveConnectionType: function () {
                return navigator.onLine ? 1 : 0;
            },
            isConnectedToGateway: function () { return navigator.onLine; }
        };
    }

    // --- 2e. webapis.appcommon (screen saver control) — no-op --------------
    // Called in Play.js to disable/enable the screen saver during playback.
    // Safe to stub — the TV manages its own saver.
    if (!window.webapis.appcommon) {
        window.webapis.appcommon = {
            AppCommonScreenSaverState: {
                SCREEN_SAVER_OFF: 0,
                SCREEN_SAVER_ON:  1
            },
            setScreenSaver: function () {}
        };
    }

    /* -----------------------------------------------------------------------
     * 3.  Version banner in console
     * ----------------------------------------------------------------------- */
    console.log('[TizenBrew] smarttv-twitch TizenBrew bootstrap v0.1.0 loaded');

    /* -----------------------------------------------------------------------
     * 4.  Safety: guard window.checkiko so Main_Set() credential decode runs
     *
     * Main_Set() is guarded by `if (!checkiko)`. checkiko is not declared
     * anywhere in the source — it relies on an implicit ReferenceError being
     * caught.  We must NOT define checkiko (leave it undefined) so the
     * credential atob() decode always runs.
     * ----------------------------------------------------------------------- */

}());
