#!/bin/bash
# Build BarangayCare Android APK

cd "$(dirname "$0")"

echo "Building BarangayCare Android app..."
echo "=================================="

# Check if Android SDK is available
if ! command -v gradle &> /dev/null && [ ! -f "android/gradlew.bat" ]; then
    echo "Error: Android SDK not found. Please install Android SDK and set ANDROID_SDK_ROOT."
    exit 1
fi

# Navigate to Android app directory
cd android

echo ""
echo "Step 1: Running Gradle clean..."
if command -v gradle &> /dev/null; then
    gradle clean
else
    ./gradlew.bat clean
fi

if [ $? -ne 0 ]; then
    echo "Error: Gradle clean failed"
    exit 1
fi

echo ""
echo "Step 2: Building debug APK..."
if command -v gradle &> /dev/null; then
    gradle assembleDebug
else
    ./gradlew.bat assembleDebug
fi

if [ $? -ne 0 ]; then
    echo "Error: Gradle build failed"
    exit 1
fi

echo ""
echo "Step 3: APK build complete!"
echo "Debug APK location: android/app/build/outputs/apk/debug/"
echo ""
echo "To build release APK (requires signing key):"
echo "  ./gradlew.bat assembleRelease -Pandroid.injected.signing.store.file=<keystore>"
echo ""
echo "✓ Android app build successful!"
