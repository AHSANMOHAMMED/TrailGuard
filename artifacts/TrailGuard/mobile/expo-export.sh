#!/bin/bash
set -e
export ANDROID_HOME=/Users/ahsan/Library/Android/sdk
export ANDROID_SDK_ROOT=$ANDROID_HOME
export JAVA_HOME=$(/usr/libexec/java_home 2>/dev/null)
export PATH=$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$ANDROID_HOME/build-tools/35.0.0:$PATH

PROJ_DIR=/Users/ahsan/Documents/TrailGuard-main/artifacts/TrailGuard/mobile
cd "$PROJ_DIR"

# Patch react-native-screens 4.28: RN 0.74 codegen chokes on `| undefined` union.
# Make onAttached a concrete optional function (safe — optional already, only the union is wrong).
FILE="node_modules/react-native-screens/src/fabric/ScreenStackHeaderConfigNativeComponent.ts"
echo "=== Patching $FILE ==="
sed -i '' 's/onAttached\?: CT\.DirectEventHandler<OnAttachedEvent> | undefined;/onAttached?: CT.DirectEventHandler<OnAttachedEvent>;/' "$FILE"
grep -n "onAttached" "$FILE" | head

BUNDLE_OUT="$PROJ_DIR/build/android-standalone/index.android.bundle"
ASSET_DIR="$PROJ_DIR/build/android-standalone/assets"
rm -rf "$ASSET_DIR"
mkdir -p "$ASSET_DIR"

echo "=== Bundling JS with Metro ==="
npx react-native bundle \
  --platform android \
  --dev false \
  --entry-file node_modules/expo/AppEntry.js \
  --bundle-output "$BUNDLE_OUT" \
  --assets-dest "$ASSET_DIR" \
  --max-workers 2 \
  --reset-cache \
  2>&1 | tee /tmp/react-native-bundle5.log

EC=${PIPESTATUS[0]}
echo "=== bundle exit code: $EC ==="
echo "=== bundle file ==="
ls -la "$BUNDLE_OUT" 2>&1
echo "=== assets ==="
ls -la "$ASSET_DIR" 2>&1 | head
exit $EC
