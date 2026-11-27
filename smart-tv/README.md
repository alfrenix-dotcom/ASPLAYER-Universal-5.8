# ASPLAYER Universal Smart TV 1.0.1 — preview
Independent Smart TV implementation, not an Android update. The Android repository at the time of the fork documented 5.9.17, so this is a new portable UI inspired by the available Android project rather than a complete port of Android 6.0.x.

## Build
From the repository root:
```sh
python3 -m pip install Pillow
python3 smart-tv/build.py
node --check smart-tv/src/app.js
node --check smart-tv/src/platform.js
```
The build reuses the original Android brand-logo.jpg, generates launcher icons and separates the output directories. No credentials or signing keys are included in the new Smart TV source. Do not publish the entire Android repository as a web site.

* Samsung: import dist/tizen into Tizen Studio with TV extension, validate config.xml and allocate the official app/package identifiers in Seller Office. Select a TV certificate profile authorized for the test device and build/sign the WGT. No WGT is included yet.
* LG: run `ares-package smart-tv/dist/webos` and install the generated IPK through the LG Developer Mode app and CLI (`ares-install --device <device> <file.ipk>`). Confirm package identifier and icon requirements with Seller Lounge.
* VIDAA: deploy only dist/vidaa to an HTTPS web host, confirm allowed origins/media APIs and register the URL through VIDAA partner onboarding. The generic HTML5 adapter is experimental until a VIDAA dev kit is available.

## Preview functionality
Manual Xtream URL/user/password; default English / Spanish; per-device PIN creation and unlock using Web Crypto; categories and All; 50 visible entries with load more; title search; sorting; favorites for Live TV; movie and series details/episodes; watch history; default label-based adult filtering; eight-hour in-memory catalog cache; remote directional focus; Samsung AVPlay / HTML5 video with discovered tracks, pause, +/-30s, fit/fill. The official ASPLAYER HTTPS Worker is preconfigured. POST /api/synopsis and POST /api/assistant use the same fields as the Apple implementation; GET /api/announcements checks active/expiry. AI and notices have separate switches. No provider credentials, URLs, or full catalogs are sent to Worker. AI keyword matching is local to the current loaded catalog. CORS and live end-to-end operation remain unverified.

## Limitations and tests
* No persistent provider password is stored, as Android Keystore is not portable. Provider login is repeated after restart. Device-local PIN is not the existing global app PIN; it is a local convenience gate, not tamper-proof DRM, and requires secure-context Web Crypto support.
* Xtream calls require provider CORS support and platform network permissions; HTTPS-hosted VIDAA cannot normally use arbitrary HTTP APIs because of mixed content. No proxy or CORS bypass is included. HTTP exposes credentials and content. Use authorized subscriptions and HTTPS where available.
* Native codec support depends on model, year, firmware and provider formats. HTML5 is not equivalent to LibVLC. Track availability, playback plane, back/exit, screensaver, remote keyboard, real hardware performance, reliable seek/resume on actual media, persistent sessions, hardware-specific buffering and platform certification remain to be tested or implemented. Resume attempts use saved per-movie/per-episode positions for seekable streams. Samsung AVPlay requests 4/8 seconds (initial/rebuffer) in the default adaptive preset, with Fast 4/4, Normal 6/8, Ultra 10/12; these are preset targets, not bandwidth-driven adaptive logic or guaranteed timing. HTML5 uses its native buffer. Adult filter relies on category/title labels and is not comprehensive.
* The package identifiers are preliminary. No signed WGT or VIDAA certification yet. CI attempts IPK packaging with the official webOS CLI; verify the resulting run before installation. Do not replace Android builds with these artifacts.
* Test: first-launch PIN, incorrect PIN, account validation, categories/All, search, paging, movies/episodes/live, error messages, back/focus, language, favorite/history, audio/subtitles, HTTP/CORS, Worker requests and privacy, and physical TV behavior.

## Automated packaging and tests
Run `node smart-tv/tests/smoke.cjs` to exercise the Samsung adapter with mock AVPlay and check UI IDs and Worker contract markers. The GitHub Actions job builds source projects and attempts to produce an LG IPK. Samsung WGT still requires the authorized certificate profile in Tizen Studio. These tests do not establish actual TV playback compatibility.
