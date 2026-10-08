#!/usr/bin/env bash
set -euo pipefail

# TrailGuard Android debug APK builder
# Requires: Android SDK (build-tools 36.0.0, platforms/android-34)
#           JDK 26
# Produces: artifacts/TrailGuard/mobile/build/apk/trailguard-debug.apk (aligned)
#           artifacts/TrailGuard/mobile/build/apk/trailguard-debug-unaligned.apk

set -x

MOBILE_DIR="/Users/ahsan/Documents/TrailGuard-main/artifacts/TrailGuard/mobile"
BUILD_DIR="$MOBILE_DIR/build/apk"
OUT_UNALIGNED="$BUILD_DIR/trailguard-debug-unaligned.apk"
OUT_ALIGNED="$BUILD_DIR/trailguard-debug.apk"

BUNDLE="$BUILD_DIR/trailguard-bundle/index.android.bundle"
ASSETS_DIR="$BUILD_DIR/trailguard-bundle/assets"

JAVA_HOME="${JAVA_HOME:-/Library/Java/JavaVirtualMachines/jdk-26.jdk/Contents/Home}"
ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-/Users/ahsan/Library/Android/sdk}"
ANDROID_HOME="$ANDROID_SDK_ROOT"
BUILD_TOOLS_VERSION="36.0.0"
ANDROID_JAR="/Users/ahsan/Library/Android/sdk/platforms/android-34/android.jar"

export JAVA_HOME
export ANDROID_SDK_ROOT
export ANDROID_HOME
export PATH="/Users/ahsan/Library/Android/sdk/cmdline-tools/latest/bin:/Users/ahsan/Library/Android/sdk/build-tools/$BUILD_TOOLS_VERSION:/Users/ahsan/Library/Android/sdk/platform-tools:/Users/ahsan/Library/Android/sdk/emulator:$JAVA_HOME/bin:$PATH"

AAPT2="/Users/ahsan/Library/Android/sdk/build-tools/$BUILD_TOOLS_VERSION/aapt2"
D8="/Users/ahsan/Library/Android/sdk/build-tools/$BUILD_TOOLS_VERSION/d8"
ZIPALIGN="/Users/ahsan/Library/Android/sdk/build-tools/$BUILD_TOOLS_VERSION/zipalign"

if [ ! -f "$BUNDLE" ]; then
  echo "ERROR: JS bundle not found at $BUNDLE"
  echo "Run expo export:embed for Android first."
  exit 1
fi

if [ ! -f "$ANDROID_JAR" ]; then
  echo "ERROR: android.jar not found at $ANDROID_JAR"
  echo "Install platforms;android-34 via Android SDK manager."
  exit 1
fi

TMPDIR=$(mktemp -d /tmp/trailguard_apk_build_XXXX)
mkdir -p "$TMPDIR/res/values" "$TMPDIR/res/mipmap-hdpi" "$TMPDIR/res/mipmap-mdpi" "$TMPDIR/res/mipmap-xhdpi" "$TMPDIR/res/mipmap-xxhdpi" "$TMPDIR/res/mipmap-xxxhdpi" "$TMPDIR/assets"

cat > "$TMPDIR/res/values/strings.xml" <<'RES'
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">TrailGuard</string>
</resources>
RES

for d in "$TMPDIR/res/mipmap-"*; do
  cat > "$d/ic_launcher.xml" <<'RES'
<?xml version="1.0" encoding="utf-8"?>
<mipmap xmlns:android="http://schemas.android.com/apk/res/android">
</mipmap>
RES
done

cat > "$TMPDIR/AndroidManifest.xml" <<'MANIFEST'
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.trailguard.field"
    android:versionCode="1"
    android:versionName="1.0.0">
  <uses-permission android:name="android.permission.INTERNET" />
  <application
      android:label="/android/app_name"
      android:allowBackup="true"
      android:debuggable="true">
    <activity
        android:name=".MainActivity"
        android:exported="true">
      <intent-filter>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />
      </intent-filter>
    </activity>
  </application>
</manifest>
MANIFEST

mkdir -p "$TMPDIR/assets"
if [ -d "$ASSETS_DIR" ]; then
  cp -r "$ASSETS_DIR"/* "$TMPDIR/assets/" 2>/dev/null || true
fi
cp "$BUNDLE" "$TMPDIR/assets/index.android.bundle"

echo "Linking APK with aapt2..."
cd "$TMPDIR"
"$AAPT2" link -v \
  -o "$TMPDIR/trailguard.apk" \
  --manifest "$TMPDIR/AndroidManifest.xml" \
  -I "$ANDROID_JAR" \
  -A "$TMPDIR/assets" \
  > "$TMPDIR/link.out" 2> "$TMPDIR/link.err"

if [ $? -ne 0 ]; then
  echo "ERROR: aapt2 link failed"
  cat "$TMPDIR/link.err"
  exit 1
fi

echo "Aligning APK with zipalign..."
"$ZIPALIGN" -v -p 4 "$TMPDIR/trailguard.apk" "$TMPDIR/trailguard-aligned.apk" > "$TMPDIR/za.out" 2> "$TMPDIR/za.err"

if [ $? -ne 0 ]; then
  echo "ERROR: zipalign failed"
  cat "$TMPDIR/za.err"
  exit 1
fi

echo "Installing APK artifacts into $BUILD_DIR"
mkdir -p "$BUILD_DIR"
cp "$TMPDIR/trailguard.apk" "$OUT_UNALIGNED"
cp "$TMPDIR/trailguard-aligned.apk" "$OUT_ALIGNED"

echo "DONE"
echo ""
echo "Unaligned APK: $OUT_UNALIGNED ($(stat -f%z "$OUT_UNALIGNED") bytes)"
echo "Aligned APK:   $OUT_ALIGNED ($(stat -f%z "$OUT_ALIGNED") bytes)"
