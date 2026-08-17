# WebRTC development

Marketplace uses `react-native-webrtc` with Expo SDK 54. The SDK 54 compatibility matrix pairs Expo 54 with `react-native-webrtc` 124.0.6 and `@config-plugins/react-native-webrtc` 13.0.0.

### Important: `npm install` is not enough

`react-native-webrtc` contains native Android code. `npm install` only places the JavaScript package in `node_modules`; it does **not** add the native WebRTC module to an already-installed Expo Go app.

That is why tapping **Call** in Expo Go can produce:

> WebRTC native module not found.

The app now catches this condition and shows a helpful message instead of the red error screen, but actual in-app calls still require a native development/standalone build.

The app is configured with `newArchEnabled: false` for Android because this WebRTC setup uses the legacy architecture. This setting only takes effect after a new native Android build.

## Recommended: Android development client

1. From the `mobile` folder run:
   `npm install`
2. Build a fresh development APK:
   `npm run build:android:development-device`
3. Install the generated APK on the Android phone.
4. Start Metro:
   `npx expo start --dev-client --clear`
5. Open the **Marketplace development client**, not Expo Go.
6. Sign in and test the Call button.

If you are using a physical phone, the phone and computer must be able to reach the API/Metro server. If the API is running locally, use your computer's LAN IP rather than `localhost` on the phone.

## Local Android Studio build

If Android Studio and the Android SDK are installed:

1. `npm install`
2. `npm run prebuild:webrtc`
3. `npm run android:webrtc`
4. For subsequent JS changes, run `npx expo start --dev-client`.

## Expo Go

Expo Go can still be used for ordinary Marketplace screens that do not need the native WebRTC module, but **in-app audio calls are not supported in Expo Go**.
