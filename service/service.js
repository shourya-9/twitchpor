/**
 * service.js — TizenBrew service file skeleton
 *
 * This Tizen Service Application runs in a privileged background process
 * alongside the TizenBrew host.  It is the intended future home for an
 * AVPlay bridge when webapis.avplay is not directly accessible from the
 * WebView (see dossier §4.3, patch option 2).
 *
 * Current state: empty skeleton.  TizenBrew requires the file to exist if
 * `serviceFile` is declared in package.json.
 *
 * Future work (Phase 7 — playback validation):
 *   If webapis.avplay is not exposed to the inner page by TizenBrew's
 *   WebView, implement a Message Port bridge here:
 *     1. Listen for postMessage from the inner page (AVPlay commands).
 *     2. Call the real webapis.avplay methods (available in the service context).
 *     3. Forward AVPlay listener events back to the inner page.
 *   This mirrors the approach used by @glenlowland/jellyfin-tizen.
 */

module.exports.onStart = function () {
    console.log('[smarttv-twitch service] started');
};

module.exports.onRequest = function (request) {
    // Future: handle AVPlay bridge messages
    console.log('[smarttv-twitch service] request received', request);
};

module.exports.onStop = function () {
    console.log('[smarttv-twitch service] stopped');
};
