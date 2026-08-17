module.exports = ({ config }) => {
  const domain = (process.env.EXPO_PUBLIC_WEB_DOMAIN || process.env.MARKETPLACE_WEB_DOMAIN || '').trim();
  const apiBaseUrl = (process.env.EXPO_PUBLIC_API_BASE_URL || '').trim().replace(/\/$/, '');
  const packageName = process.env.EXPO_PUBLIC_ANDROID_PACKAGE || 'com.marketplace.mobile';
  const bundleIdentifier = process.env.EXPO_PUBLIC_IOS_BUNDLE_ID || 'com.marketplace.mobile';
  const googleIosClientId = (process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '').trim();
  const googleAndroidClientId = (process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '').trim();

  return {
    ...config,
    name: 'Marketplace',
    slug: 'marketplace',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    // App scheme used for general deep links. Google AuthSession's native
    // provider uses the Android applicationId / iOS bundle identifier when
    // running in a standalone/development build.
    scheme: 'marketplace',
    ios: {
      ...(config.ios || {}),
      supportsTablet: true,
      bundleIdentifier,
      infoPlist: {
        ...((config.ios || {}).infoPlist || {}),
        LSApplicationQueriesSchemes: Array.from(new Set([
          ...(((config.ios || {}).infoPlist || {}).LSApplicationQueriesSchemes || []),
          'whatsapp',
        ])),
        CFBundleURLTypes: [
          ...(((config.ios || {}).infoPlist || {}).CFBundleURLTypes || []),
          { CFBundleURLSchemes: [bundleIdentifier] },
        ],
      },
      ...(domain ? { associatedDomains: [`applinks:${domain}`] } : {}),
    },
    android: {
      ...(config.android || {}),
      // Keep the legacy architecture for the WebRTC native module on Expo SDK 54.
      // The WebRTC module is native and must be compiled into the development client.
      newArchEnabled: false,
      package: packageName,
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
      usesCleartextTraffic: true,
      permissions: Array.from(new Set([
        ...(((config.android || {}).permissions || [])),
        'android.permission.RECORD_AUDIO',
        'android.permission.MODIFY_AUDIO_SETTINGS',
      ])),
      intentFilters: [
        ...(domain ? [{
          action: 'VIEW',
          autoVerify: true,
          data: [{ scheme: 'https', host: domain, pathPrefix: '/listing' }],
          category: ['BROWSABLE', 'DEFAULT'],
        }] : []),
        {
          action: 'VIEW',
          data: [{ scheme: packageName, pathPrefix: '/oauthredirect' }],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
    },
    web: {
      ...(config.web || {}),
      favicon: './assets/favicon.png',
    },
    plugins: [
      ['@config-plugins/react-native-webrtc', { microphonePermission: 'Allow Marketplace to use your microphone for in-app calls.' }],
      [
        'expo-image-picker',
        {
          photosPermission: 'Allow Marketplace to access your photos so you can add listing images.',
          cameraPermission: 'Allow Marketplace to use your camera so you can take listing photos.',
        },
      ],
    ],
    extra: {
      ...(config.extra || {}),
      marketplaceWebDomain: domain,
      apiBaseUrl,
      google: {
        webClientId: (process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '').trim(),
        androidClientId: (process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '').trim(),
        iosClientId: (process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '').trim(),
      },
      eas: {
        ...(config.extra?.eas || {}),
        projectId: '74068dfe-41f1-4547-8c6d-a8702ed12a25',
      },
    },
  };
};
