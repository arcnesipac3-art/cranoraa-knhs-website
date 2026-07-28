import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'KNHS School Portal',
  slug: 'knhs-mobile',
  owner: 'arccs-team',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  userInterfaceStyle: 'automatic',
  splash: {
    image: './assets/images/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#1E3A5F',
  },
  updates: {
    fallbackToCacheTimeout: 0,
    url: 'https://u.expo.dev/98a04804-eb81-474b-be20-ab77f47ce7e6',
  },
  runtimeVersion: {
    policy: 'appVersion',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.knhs.schoolportal',
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon.png',
      backgroundColor: '#1E3A5F',
    },
    package: 'com.knhs.schoolportal',
  },
  web: {
    favicon: './assets/images/favicon.png',
    bundler: 'metro',
  },
  plugins: [
    'expo-router',
    'expo-font',
    'expo-secure-store',
    'expo-notifications',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#1E3A5F',
        image: './assets/images/splash.png',
        imageWidth: 200,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.knhs.edu.ph/api/v1',
    wsBaseUrl: process.env.EXPO_PUBLIC_WS_BASE_URL || 'wss://api.knhs.edu.ph/ws',
    eas: {
      projectId: '98a04804-eb81-474b-be20-ab77f47ce7e6',
    },
  },
});