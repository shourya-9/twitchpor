# smarttv-twitch — TizenBrew Module

A TizenBrew module port of [fgl27/smarttv-twitch](https://github.com/fgl27/smarttv-twitch), a full-featured Twitch client for Samsung Tizen TVs.

> **Status**: Phase 0–4 complete (module skeleton + shims). Phase 5 (first boot on TV) is the next milestone.

---

## Installing on a Samsung TV (via TizenBrew)

1. Install [TizenBrew](https://github.com/reisxd/TizenBrew) on your Samsung TV (Tizen 3.0 / 2017 model or newer).
2. On the TizenBrew home screen, press the **GREEN** button.
3. Type the package name: `@tizenport/smarttv-twitch`
4. Press **ENTER** to install.
5. The app appears in the TizenBrew module list. Select it and press **ENTER** to launch.

---

## Logging in with Twitch

1. Navigate to **Add User** → **Add Code** on the TV.
2. The app displays a short URL (or QR code). Open it on your phone or PC.
3. Authorise the app with your Twitch account. You receive a short code.
4. Type the code into the TV using the remote's on-screen keyboard.
5. Press **DONE** — the app exchanges the code for an access token and stores it.

---

## Remote control mapping

| Button | Action |
|---|---|
| D-pad | Navigate menus |
| ENTER | Select / open stream |
| BACK / RETURN | Go back |
| RED | Controls overlay |
| GREEN | Toggle chat |
| YELLOW | Quality selector |
| BLUE | Info overlay |
| PLAY / PAUSE | Play / pause (VOD) |
| FF / RW | Seek (VOD) |
| Channel ↑↓ | Previous / next stream in list |
| INFO | Stream info |
| GUIDE | Followed channels |

---

## Project structure

```
tizenbrew-module/
  package.json                  ← TizenBrew module manifest
  README.md                     ← This file
  scripts/
    tizenbrew-bootstrap.js      ← tizen/webapis shims injected before app scripts
  service/
    service.js                  ← Background service skeleton (AVPlay bridge — future)
  dev/
    desktop-shim.js             ← Browser dev shim for Chrome iteration (not shipped)
  app/
    index.html                  ← Single-page app (patched for TizenBrew)
    assets/
      css/font-awesome.min.css  ← Bundled icon font CSS
      images/
        favicon.png             ← App icon
        temp.mp4                ← Tiny AVPlay primer video (2×2 black, 0.1 s)
    general/                    ← Key constants, emoji, resize helpers
    languages/                  ← i18n strings
    specific/                   ← Core app modules (Main, Play, AddCode, …)
    thirdparty/                 ← Vendored: irc-message, twemoji, punycode, kapchat
```

---

## Porting phases

| Phase | Status | Description |
|---|---|---|
| 0 — Inventory | ✅ Done | Confirmed on-disk structure matches dossier |
| 1 — Desktop shim | ✅ Done | dev/desktop-shim.js written |
| 2 — WGT emulator | ⬜ Optional | Not required for TizenBrew path |
| 3 — Asset rewrite | ✅ Done | All fgl27.github.io asset refs removed; temp.mp4 bundled |
| 4 — Module skeleton | ✅ Done | package.json, bootstrap, service skeleton |
| 5 — First boot | 🔲 Next | Install on TV, confirm UI reaches home grid |
| 6 — Networking | 🔲 Pending | Home grid loads with live channels |
| 7 — Playback | 🔲 Pending | Live video plays (requires real webapis.avplay) |
| 8 — Auth | 🔲 Pending | Register own Twitch app, update credentials |
| 9 — Remote keys | 🔲 Pending | All remote buttons verified |
| 10 — Ship | 🔲 Pending | Publish to npm |

---

## Phase 8 — Registering your own Twitch app (required before publishing)

The current build uses the upstream author's Twitch client credentials.  Before publishing to npm:

1. Register a new app at <https://dev.twitch.tv/console/apps>.
2. Set **OAuth Redirect URL** to a static HTTPS page you control (e.g. a GitHub Pages repo): `https://<your-gh>.github.io/<repo>/login/twitch.html`.  Serve a copy of `release/githubio/login/twitch.html` from the upstream repo there.
3. In `app/specific/AddCode.js` (bottom of file) replace:
   ```js
   var AddCode_clientId    = '<base64 of your client_id>';
   var AddCode_client_token = '<base64 of your client_secret>';
   var AddCode_client_backup = '<base64 of a second client_id (optional)>';
   ```
   Generate base64 via: `node -e "console.log(Buffer.from('YOUR_CLIENT_ID').toString('base64'))"`.
4. In `app/specific/Main.js` inside `Main_Set()` (~line 1469) replace:
   ```js
   AddCode_redirect_uri = 'https://fgl27.github.io/smarttv-twitch/release/githubio/login2/twitch.html';
   ```
   with your own page URL.
5. Test the full OAuth flow before publishing.

---

## Known limitations (first boot target)

- **AVPlay bridge not yet wired**: if TizenBrew's WebView does not automatically expose `webapis.avplay` to the inner page, video will not play.  The bootstrap shim logs a warning to the inspector.  The service.js skeleton is the intended bridge location (dossier §4.3).
- **Kraken v5 endpoints dead**: follow/unfollow and subscription check calls will receive HTTP 410.  Expected; non-blocking for basic browsing and playback.
- **Font-awesome icons**: the bundled CSS stub declares `.fa { font-family: "icons" }` to pass the boot check, but glyph images require the webfont files (woff/ttf).  Download font-awesome 4.7.0 from cdnjs and add the fonts/ directory to `app/assets/` when network allows.
- **Donation images**: `paypal.png` and `bitcoin.png` on the About screen reference `assets/images/` but those files are not bundled.  The images will show broken-image placeholders (non-blocking).

---

## License

GPL-3.0 — same as the upstream fgl27/smarttv-twitch repository.
