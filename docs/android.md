# Android (Capacitor + AdMob rewarded)

Free app, **zero IAP**. Vendetta uses a **rewarded** ad (optional — Play again never requires it).

This PR is **source-ready**. Generate the `android/` project on a machine with Node + Android SDK (Tomás laptop or CI).

## 1. Prerequisites

- Node 20+ and a package manager (`npx` available)
- Android Studio (JDK 17+) with Android SDK
- Optional: physical device / emulator

## 2. Install & add Android platform

From the repo root (this branch):

```bash
# install JS deps (Capacitor + community AdMob)
npx --yes install-peerdeps false 2>/dev/null || true
```

Preferred:

```bash
node -e "console.log('node ok')"
```

Then install dependencies with your usual package manager (the repo `package.json` lists `@capacitor/core`, `@capacitor/android`, `@capacitor/cli`, `@capacitor-community/admob`).

```bash
# after deps are installed:
node scripts/sync-www.js
npx cap add android
npx cap sync android
```

If `android/` already exists: skip `cap add`, only `node scripts/sync-www.js && npx cap sync android`.

## 3. AdMob test IDs (already in repo)

File: `js/ads-config.js`

| Key | Google TEST value |
|-----|-------------------|
| App ID | `ca-app-pub-3940256099942544~3347511713` |
| Rewarded unit | `ca-app-pub-3940256099942544/5224354917` |

### AndroidManifest App ID

After `cap add android`, ensure `android/app/src/main/AndroidManifest.xml` has inside `<application>`:

```xml
<meta-data
  android:name="com.google.android.gms.ads.APPLICATION_ID"
  android:value="ca-app-pub-3940256099942544~3347511713"/>
```

(Use the same App ID you put in `js/ads-config.js`.)

When Tomás has **real** AdMob App ID + Rewarded unit ID: paste them into `js/ads-config.js` + Manifest, set `initializeForTesting` to false in `capacitor.config.json`, then sync & rebuild.

## 4. Run debug

```bash
npx cap open android
```

Or:

```bash
cd android && ./gradlew assembleDebug
```

APK: `android/app/build/outputs/apk/debug/app-debug.apk`

## 5. Release AAB (Play Console)

1. Create a keystore (once) and configure `android/app/keystore.properties` + `signingConfigs` in Gradle (Android Studio “Generate Signed Bundle” is fine).
2. Build:

```bash
node scripts/sync-www.js && npx cap sync android
cd android && ./gradlew bundleRelease
```

AAB: `android/app/build/outputs/bundle/release/app-release.aab`

Upload that AAB to Play Console (closed testing first).

## 6. Behaviour checklist

- Web: Vendetta still uses the **mock** ad dialog (1.5s → Ad watched)
- Android: Vendetta loads/shows **rewarded** test ad via `@capacitor-community/admob`
- Play again / Change names: **no ad**
- Win streak: unchanged (`localStorage`)

## 7. Out of scope

Play Billing / IAP, iOS, online multiplayer.
