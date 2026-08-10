# Building the Android APK

The game itself needs no toolchain — it is plain HTML/CSS/JS and runs from any
static server today. This document covers only the final packaging step, which
turns `www/` into an installable Android app using Capacitor.

**None of this software is currently installed on this machine.** Verified:
`node`, `npm`, `java`, and Android Studio / the Android SDK are all absent.
Everything below is a one-time setup.

---

## 1. Install the toolchain

| Software | Version | Where |
|---|---|---|
| Node.js | LTS (22.x or newer) | <https://nodejs.org/en/download> |
| JDK | 21 (Temurin) | <https://adoptium.net/temurin/releases/?version=21> |
| Android Studio | latest, incl. SDK Platform 34+ and Build-Tools | <https://developer.android.com/studio> |

After installing Android Studio, open it once and let it finish downloading the
SDK. Then confirm the environment:

```bash
node --version && npm --version && java -version
```

If `JAVA_HOME` is not set, point it at the JDK (PowerShell, permanent):

```bash
setx JAVA_HOME "C:\Program Files\Eclipse Adoptium\jdk-21"
```

Set `ANDROID_HOME` too — usually `C:\Users\<you>\AppData\Local\Android\Sdk`.

---

## 2. Initialise the Capacitor project

Run these from the project root (`Game2/`), which already contains
`capacitor.config.json` pointing at `webDir: "www"`.

```bash
npm init -y
```

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
```

```bash
npx cap add android
```

`cap add` reads `capacitor.config.json` and creates an `android/` folder. Because
the game has no build step, there is nothing to compile first — `www/` is already
the finished web app.

---

## 3. Lock the app to portrait

The game is designed portrait-only. After `cap add android`, open
`android/app/src/main/AndroidManifest.xml` and add the orientation attribute to
the `<activity>` tag:

```xml
<activity
    android:name=".MainActivity"
    android:screenOrientation="portrait"
    android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode">
```

---

## 4. Sync and build

Any time `www/` changes, copy it into the Android project:

```bash
npx cap sync android
```

Then either open the project in Android Studio:

```bash
npx cap open android
```

…or build straight from the command line:

```bash
cd android && ./gradlew assembleDebug
```

The debug APK lands at:

```
android/app/build/outputs/apk/debug/app-debug.apk
```

Install it on a connected device:

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 5. Release build (optional)

A debug APK is enough for testing. For a shareable/store build you need a signing
key:

```bash
keytool -genkey -v -keystore chefrush.keystore -alias chefrush -keyalg RSA -keysize 2048 -validity 10000
```

Reference it from `android/app/build.gradle` under `signingConfigs`, then:

```bash
cd android && ./gradlew assembleRelease
```

Keep the keystore file and its passwords safe — Play Store updates must be signed
with the same key.

---

## Notes and gotchas

- **`webDir` must stay `www`.** Every game file lives there deliberately so
  `cap sync` is a straight copy with no bundler in between.
- **Re-run `cap sync` after every change to `www/`.** Editing `www/` alone does
  not update the Android project.
- **WebGL** is supported by the Android System WebView on Android 7+. The scene is
  deliberately small (~24 draw calls) to hold frame rate on mid-range hardware.
- **Audio** is synthesised at runtime and starts on the first tap, which satisfies
  the WebView's user-gesture requirement — no autoplay problems.
- **Testing on a device** requires USB debugging enabled in Developer Options.
