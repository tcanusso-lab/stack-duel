# Android (Capacitor + AdMob rewarded)

Free app, zero IAP. Vendetta uses an optional rewarded ad (Play again never requires it).

The `android/` project is in the repo (Capacitor 7 + `@capacitor-community/admob`). Google **test** AdMob IDs are wired in `js/ads-config.js` and `AndroidManifest.xml`.

## Prerequisites

- Node 20+
- Android Studio / SDK (JDK 17+)
- Platforms: install `android-35` if missing

## Install and sync

From repo root, install the dependencies listed in `package.json`, then:

```bash
node scripts/sync-www.js
npx cap sync android
```

## Test AdMob IDs

| Key | Value |
|-----|-------|
| App ID | `ca-app-pub-3940256099942544~3347511713` |
| Rewarded | `ca-app-pub-3940256099942544/5224354917` |

Swap real IDs in `js/ads-config.js` + Manifest `APPLICATION_ID`, then sync and rebuild.

## Debug build

```bash
export JAVA_HOME=...   # JDK 17/21
export ANDROID_HOME=...
cd android && ./gradlew assembleDebug
```

APK: `android/app/build/outputs/apk/debug/app-debug.apk`

Debug AAB: `./gradlew bundleDebug`

## Release AAB (Play Console)

1. Create keystore; configure signing in Android Studio or Gradle.
2. `node scripts/sync-www.js && npx cap sync android`
3. `cd android && ./gradlew bundleRelease`
4. Upload `app-release.aab` (closed testing first).

## Behaviour

- Web: mock ad dialog for Vendetta
- Android: native rewarded test ad
- Play again / Change names: no ad
- Win streak: localStorage (unchanged)

## Out of scope

Play Billing / IAP, iOS, online multiplayer.
