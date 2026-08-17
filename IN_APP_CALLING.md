# In-app audio calling

The Marketplace app now has real WebRTC audio calling layered on top of the existing messaging conversation.

## What is implemented

- Caller starts an in-app audio call from an existing conversation.
- Receiver is detected by the authenticated `/api/calls/incoming/` polling endpoint.
- Receiver can Accept or Decline.
- Either side can End the call.
- UI states: Calling, Ringing, Connected, Ended.
- SDP offers/answers and ICE candidates are relayed through the existing Django API.
- The Connected state is only shown after the WebRTC peer connection reports `connected`; it is not a visual-only/fake state.
- Existing message polling, typing indicators, message sending, and conversation behavior are unchanged.

## Expo Go limitation

`react-native-webrtc` contains native code and is **not available in Expo Go**. The project is therefore configured for an Expo Development Build instead. This is required for real native WebRTC audio; pretending the feature works in Expo Go would only produce a fake UI.

The current project uses Expo SDK 54, React Native 0.81.5, `react-native-webrtc` 124.x, and the SDK-54-compatible `@config-plugins/react-native-webrtc` 13.x.

## First setup

From `mobile/`:

```bash
npm install
npx expo prebuild
```

For Android development:

```bash
npx eas build --platform android --profile development
npx expo start --dev-client
```

Or locally, when the Android toolchain is installed:

```bash
npx expo run:android
```

For iOS, create/run the equivalent development build on a physical device.

Both users need a build containing `react-native-webrtc`; Expo Go cannot be used for the native call test.

## Backend setup

From `backend/`:

```bash
python manage.py migrate
```

The new `calls` app adds the `Call` model and authenticated signaling endpoints under `/api/calls/`.

## Network reliability

The implementation includes a public STUN server for basic NAT discovery. Some mobile carriers, corporate networks, and symmetric-NAT configurations require TURN for reliable connectivity. If calls connect on the same/local networks but fail across different carriers or restrictive networks, add a TURN service and issue short-lived TURN credentials from the backend. Do not ship a permanent TURN password in `EXPO_PUBLIC_*` variables.
