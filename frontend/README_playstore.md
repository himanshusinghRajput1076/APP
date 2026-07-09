Play Store deployment helper

Prerequisites:
- An Expo account and `eas` CLI installed (`npm install -g eas-cli`).
- A Google Play Developer account and a service account JSON with `release` permissions.

Steps to build and submit an Android AAB using EAS (recommended):

1. Login to Expo/EAS:

```bash
npx eas login
```

2. Configure EAS in the project (one-time):

```bash
cd frontend
npx eas build:configure
```

3. Provide Google Play service account JSON to EAS (either via interactive flow or CI secrets):

Interactive (recommended locally):

```bash
npx eas credentials
# Follow prompts to upload a Google service account JSON for Play Store upload
```

Or set environment variable for CI:

```bash
export EAS_BUILD_ANDROID_SERVICE_ACCOUNT_JSON='{"type":"..."...}'
```

4. Build AAB (production profile):

```bash
EXPO_PUBLIC_BACKEND_URL=https://YOUR_PUBLIC_BACKEND_URL npx eas build -p android --profile production
```

5. Submit to Google Play (after build completes):

```bash
npx eas submit -p android --latest --track internal
```

Notes and tips:
- `EXPO_PUBLIC_BACKEND_URL` should point to a publicly reachable backend for the production build.
- You can use `--local` flags for local builds (requires Android SDK & build tools).
- If you prefer manual Play Console upload, download the produced `.aab` and upload it via Play Console.
