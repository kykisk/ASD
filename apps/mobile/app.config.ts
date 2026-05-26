import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'AutiCare',
  slug: 'auticare',
  version: '1.0.0',
  orientation: 'portrait',
  scheme: 'auticare',

  icon: './assets/images/icon.png',
  userInterfaceStyle: 'automatic',

  splash: {
    image: './assets/images/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#FDFBF7',
  },

  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.auticare.app',
  },

  android: {
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon.png',
      backgroundColor: '#FDFBF7',
    },
    package: 'com.auticare.app',
  },

  plugins: [
    'expo-router',
    'expo-secure-store',
    [
      'expo-notifications',
      {
        icon: './assets/images/icon.png',
        color: '#5B8A72',
        sounds: [],
      },
    ],
  ],

  experiments: {
    typedRoutes: true,
  },

  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3100/v1',
  },
});
