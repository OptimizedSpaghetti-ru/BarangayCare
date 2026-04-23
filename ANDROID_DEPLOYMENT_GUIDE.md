# BarangayCare Android App - Deployment & Installation Guide

## Build Summary

✅ **Status**: Android APK successfully built

- **APK Location**: `android/app/build/outputs/apk/debug/app-debug.apk`
- **APK Size**: 4.5 MB
- **App ID**: `com.barangaycare.app`
- **App Name**: BarangayCare

## Features Included

### 1. ✅ In-App Notifications

- **Status**: Fully configured and active
- **Type**: Native Android notifications
- **Channel**: "BarangayCARE Alerts" with importance level 4 (high)
- **Features**:
  - Admin notifications for new complaints
  - Resident notifications for complaint status updates
  - Admin response notifications
  - Staggered delivery (300ms intervals for up to 3 notifications)
- **Permission Handling**: Automatic permission request on app startup
- **Code Location**: `src/App.tsx` - `pushNativeNotifications()` function

### 2. ✅ App Icons

- **Source Icon**: `icon/no-bg-icon.png` (BarangayCare heart-house logo)
- **Generated Densities**:
  - mdpi (48x48)
  - hdpi (72x72)
  - xhdpi (96x96)
  - xxhdpi (144x144)
  - xxxhdpi (192x192)
- **Icon Locations**:
  - Launcher icons: `android/app/src/main/res/mipmap-[density]/`
  - Notification icons: `android/app/src/main/res/drawable-[density]/`

### 3. ✅ Capacitor Configuration

- **Sync Status**: All web assets synced to Android project
- **Build Output**: Latest React app bundled into APK
- **Plugins Included**:
  - @capacitor/local-notifications@8.0.2 (for native notifications)
  - @capacitor/filesystem@8.1.2
  - @capacitor/share@8.0.1

## Installation Instructions

### Option 1: Using ADB (Android Debug Bridge)

1. **Connect Device**

   ```bash
   # Enable USB debugging on your Android device
   # Settings → Developer Options → USB Debugging

   # Connect via USB cable
   adb devices  # Should list your device
   ```

2. **Install APK**

   ```bash
   adb install -r android/app/build/outputs/apk/debug/app-debug.apk
   ```

3. **Launch App**
   ```bash
   adb shell am start -n com.barangaycare.app/.MainActivity
   ```

### Option 2: Using Android Studio

1. Open Android Studio
2. File → Open... → Select the `android/` folder
3. Select your connected device from the device dropdown
4. Click "Run" (green play button)
5. Android Studio will build and deploy to your device

### Option 3: Manual Installation

1. Transfer the APK file to your Android device
2. On your device: Settings → Apps → Allow unknown sources
3. Open file manager and tap the APK file
4. Follow the installation prompts

## Testing Notifications

### For Admin Users

1. Log in as an admin account
2. Have another user (resident) submit a new complaint
3. You should receive a native notification: "New complaint submitted"

### For Resident Users

1. Log in as a resident account
2. Submit a complaint through the app
3. Receive notification: "Complaint received"
4. When admin updates status, receive: "Complaint status updated"
5. When admin adds notes, receive: "Admin response received"

## Build Details & Troubleshooting

### Build Configuration

**Java Version**: Configured for Java 23 (auto-downloaded via Foojay resolver)

- `android/app/build.gradle`: `compileOptions { sourceCompatibility JavaVersion.VERSION_23 }`
- `android/capacitor-cordova-android-plugins/build.gradle`: Same configuration
- `android/gradle.properties`: Foojay resolver enabled for automatic Java toolchain

**Gradle Version**: 8.14.3
**Android Gradle Plugin**: 8.13.0
**Compile SDK**: Android 36
**Min SDK**: Android 24
**Target SDK**: Android 36

### Warnings (Safe to Ignore)

```
WARNING: Using flatDir should be avoided because it doesn't support any meta-data formats.
```

This is a standard Capacitor warning and doesn't affect functionality.

### Build Output

- **Total Tasks**: 191 (185 executed, 6 cached)
- **Build Time**: ~2 minutes
- **Output Path**: `android/app/build/outputs/apk/debug/app-debug.apk`

## Release Build (Optional)

For production deployment:

```bash
cd android

# Build release APK (requires signing key)
./gradlew.bat assembleRelease

# Or with signing:
./gradlew.bat assembleRelease \
  -Pandroid.injected.signing.store.file=path/to/keystore.jks \
  -Pandroid.injected.signing.store.password=YOUR_PASSWORD \
  -Pandroid.injected.signing.key.alias=YOUR_ALIAS \
  -Pandroid.injected.signing.key.password=YOUR_KEY_PASSWORD
```

Output: `android/app/build/outputs/apk/release/app-release.apk`

## File Structure

```
android/
├── app/
│   ├── build/
│   │   └── outputs/apk/
│   │       └── debug/app-debug.apk    ← INSTALLATION FILE
│   └── src/main/res/
│       ├── mipmap-hdpi/
│       │   ├── ic_launcher.png
│       │   └── ic_launcher_round.png
│       ├── mipmap-xhdpi/
│       ├── mipmap-xxhdpi/
│       ├── mipmap-xxxhdpi/
│       ├── mipmap-mdpi/
│       ├── drawable-mdpi/ic_notification.png
│       └── drawable-[density]/ic_notification.png
└── gradlew.bat                         ← Build script

src/
├── App.tsx                             ← Notification setup
├── components/
│   ├── complaint-manager.tsx
│   └── heatmap-panel.tsx
└── ...
```

## Next Steps

1. **Test on Device**: Install APK and test notifications with test accounts
2. **User Management**: Set up admin and resident test accounts in Supabase
3. **Notification Testing**: Verify both admin and resident notifications work
4. **Release Build**: Once tested, create a signed release APK for Play Store deployment
5. **Distribute**: Share APK or publish to Google Play Store

## Support & Debugging

### Check Logs

```bash
adb logcat | grep -i "barangaycare\|notification"
```

### Uninstall Previous Version

```bash
adb uninstall com.barangaycare.app
```

### Clear App Data

```bash
adb shell pm clear com.barangaycare.app
```

### Rebuild and Reinstall

```bash
cd android
./gradlew.bat clean assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

---

**Generated**: April 23, 2026
**Version**: 1.0 Debug Build
**Status**: ✅ Ready for Testing
