# Standalone Mobile Builds

This Expo app is configured for installable Android and iOS builds.

## Required API URL

For a phone build, `EXPO_PUBLIC_API_URL` must point to a reachable API host. Do not use `localhost` for real devices unless the API is running on the device itself.

Update `eas.json` before building:

```json
"EXPO_PUBLIC_API_URL": "https://YOUR_PUBLIC_API_HOST/api"
```

## Android APK for Direct Install

```bash
cd deploy/mobile
npx eas-cli login
npx eas-cli build:configure
npm run build:android:apk
```

Download the APK from the EAS build link and install it on Android.

## Android Play Store Bundle

```bash
cd deploy/mobile
npm run build:android:aab
```

Upload the generated AAB to Google Play Console.

## iPhone Install

iPhone builds require Apple signing. Use the preview profile for internal installation or the production profile for TestFlight/App Store.

```bash
cd deploy/mobile
npx eas-cli login
npm run build:ios:preview
```

For App Store/TestFlight:

```bash
cd deploy/mobile
npm run build:ios:store
```

## Local Native Projects

If you want native `ios/` and `android/` folders for Xcode/Android Studio:

```bash
cd deploy/mobile
npm run prebuild
```

Then open the generated native projects in Xcode or Android Studio.
