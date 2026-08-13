module.exports = ({ config }) => {
  const domain = (process.env.EXPO_PUBLIC_WEB_DOMAIN || process.env.MARKETPLACE_WEB_DOMAIN || '').trim();
  const packageName = process.env.EXPO_PUBLIC_ANDROID_PACKAGE || 'com.marketplace.mobile';
  const bundleIdentifier = process.env.EXPO_PUBLIC_IOS_BUNDLE_ID || 'com.marketplace.mobile';

  return {
    ...config,
    name: 'Marketplace',
    slug: 'marketplace',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
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
      },
      ...(domain ? { associatedDomains: [`applinks:${domain}`] } : {}),
    },
    android: {
      ...(config.android || {}),
      package: packageName,
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
      ...(domain ? {
        intentFilters: [{
          action: 'VIEW',
          autoVerify: true,
          data: [{ scheme: 'https', host: domain, pathPrefix: '/listing' }],
          category: ['BROWSABLE', 'DEFAULT'],
        }],
      } : {}),
    },
    web: {
      ...(config.web || {}),
      favicon: './assets/favicon.png',
    },
    plugins: [
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
    },
  };
};
