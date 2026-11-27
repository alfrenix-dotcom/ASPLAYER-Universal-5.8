# ASPLAYER Universal Smart TV 1.0.0 — preview
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
Manual Xtream URL/user/password; default English / Spanish; per-device PIN creation and unlock using Web Crypto; categories and All; 50 visible entries with load more; title search; sorting; favorites for Live TV; movie and series details/episodes; watch history; default label-based adult filtering; eight-hour in-memory catalog cache; remote directional focus; Samsung AVPlay / HTML5 video with discovered tracks, pause, +/-30s, fit/fill. Optional owner HTTPS service can return /api/synopsis and /api/announcements from the legacy Android contract, without sending provider credentials. Current Worker endpoint and contract must be verified before enabling.

## Limitations and tests
* No persistent provider password is stored, as Android Keystore is not portable. Provider login is repeated after restart. Device-local PIN is not the existing global app PIN; it is a local convenience gate, not tamper-proof DRM, and requires secure-context Web Crypto support.
* Xtream calls require provider CORS support and platform network permissions; HTTPS-hosted VIDAA cannot normally use arbitrary HTTP APIs because of mixed content. No proxy or CORS bypass is included. HTTP exposes credentials and content. Use authorized subscriptions and HTTPS where available.
* Native codec support depends on model, year, firmware and provider formats. HTML5 is not equivalent to LibVLC. Track availability, playback plane, back/exit, screensaver, remote keyboard, real hardware performance, exact resume, persistent sessions, provider-approved adaptive buffering and platform certification remain to be tested or implemented. History currently records viewing time; exact resume is not implemented. Adult filter relies on category/title labels and is not comprehensive.
* The package identifiers are preliminary. No signed WGT/IPK or VIDAA certification yet. Do not replace Android builds with these artifacts.
* Test: first-launch PIN, incorrect PIN, account validation, categories/All, search, paging, movies/episodes/live, error messages, back/focus, language, favorite/history, audio/subtitles, HTTP/CORS, Worker requests and privacy, and physical TV behavior.
