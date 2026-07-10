# IDEACON Android Play Store Deployment Guide

## Current Status
✅ **Local environment setup complete:**
- Android SDK configured at `~/Android/sdk`
- All required components installed (API 36, build-tools 36.0.0, NDK 27.1.12297006)
- Hermes JS engine enabled
- New Architecture enabled for React Native
- EAS CLI installed globally

❌ **Local Gradle build failed due to:**
- AAPT2 resource compilation daemon failures
- Native module CMake compatibility issues

## Recommended Path: Use EAS Build (Expo's Managed Build Service)

### Step 1: Authenticate with EAS
```bash
cd /app/frontend
eas login
# Use your Expo/EAS credentials, or create account at https://expo.dev
```

### Step 2: Create Android Credentials
```bash
eas credentials
# Follow prompts to create signing key for Android release builds
```

### Step 3: Build Android App Bundle (AAB)
```bash
cd /app/frontend
eas build --platform android --profile production
# This builds remotely and generates app-release.aab
# Build will be available for download from EAS dashboard
```

### Step 4: Download AAB and Prepare for Play Store
- Download the generated AAB from EAS Build dashboard or:
  ```bash
  # List recent builds
  eas build:list
  # Download: eas build:download [BUILD_ID] --path ./app-release.aab
  ```

### Step 5: Upload to Google Play Console
1. Go to https://play.google.com/console
2. Select "IDEACON" app (package: `com.emergent.futurelaunchpad.wb2mxs`)
3. Create new release in **Internal Testing** track first:
   - Internal Testing → Create release → Upload AAB
   - Add release notes: "Initial test build for internal validation"
   - Review and confirm
4. After internal validation (24-48 hours):
   - Move to **Staging** track (if applicable)
   - Then **Production** track

### Step 6: Set Up Store Listing
- App icon, screenshots (5-8 images)
- Short description (50 chars)
- Full description (4000 chars max)
- Promotional graphic (optional)
- Feature graphic (1024x500 px)
- Content rating questionnaire
- Privacy policy URL

### Alternative: Local Build (Troubleshooting)
If you need local APK/AAB:
```bash
cd /app/frontend/android
export ANDROID_SDK_ROOT=~/Android/sdk
# APK (testing only):
./gradlew assembleRelease
# AAB (Play Store):
./gradlew bundleRelease
```

## Key Configuration Files
- **eas.json**: Production profile configured for `app-bundle` (AAB format)
- **app.json**: Package name `com.emergent.futurelaunchpad.wb2mxs`, new architecture enabled
- **android/local.properties**: SDK path at `~/Android/sdk`

## Next Steps
1. Authenticate with Expo/EAS
2. Create signing credentials via EAS
3. Trigger remote build
4. Download AAB from EAS dashboard
5. Upload to Play Console internal testing track
6. Complete store listing setup
7. Submit to production after internal validation

## Troubleshooting
- **Build fails on EAS**: Check the build logs from EAS dashboard
- **AAB upload rejected**: Ensure version code is higher than previous release
- **App crashes on install**: Enable Crashlytics/Firebase Analytics in app for diagnostics

## Status Tracking
- [x] Local SDK environment
- [x] EAS CLI installed
- [ ] EAS authentication
- [ ] Signing credentials created
- [ ] Remote build completed
- [ ] AAB downloaded
- [ ] Play Console upload (internal)
- [ ] Store listing completed
- [ ] Production submission

---
Generated: 2025-07-09
