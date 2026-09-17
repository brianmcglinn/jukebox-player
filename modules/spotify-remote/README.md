# spotify-remote

Local Expo module wrapping Spotify's official Android App Remote SDK directly — no third-party wrapper library involved.

## One manual step before building: download the SDK

Spotify distributes the App Remote SDK as a raw `.aar` file, not as a normal Gradle/Maven dependency. You need to place it here yourself:

1. Follow Spotify's official Android SDK Quick Start guide: https://developer.spotify.com/documentation/android
2. Download the current `spotify-app-remote-release-X.X.X.aar` file.
3. Place it directly in this folder:
   ```
   modules/spotify-remote/android/libs/spotify-app-remote-release-X.X.X.aar
   ```
   (any filename ending in `.aar` in this folder is picked up automatically — see `android/build.gradle`)

This file is intentionally **not** committed to source control (binary, and tied to a specific SDK release) — every machine that builds this project needs its own copy in this exact location.

## What this module does NOT need

- No config plugin entry in `app.json` — Expo's autolinking finds local modules under `modules/` automatically (same as the existing `kiosk` module).
- No browser, no OAuth redirect handling, no Expo Router route. Authorization happens natively, inside the Spotify app itself, the first time `connect()` is called.

## Known incomplete piece

`getPlayerState()` / `onPlayerStateChanged` return `imageUri` as Spotify's raw internal image identifier, not a directly-loadable URL. Resolving real album artwork requires an additional call through the SDK's `ImagesApi` — not yet wired up. Fine to leave until basic connect/play/pause is confirmed working end to end.
