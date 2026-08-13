import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const port = Number(process.env.PORT) || 5173;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'react-native': 'react-native-web',
    },
  },
  define: {
    'process.env.EXPO_PUBLIC_API_BASE_URL': JSON.stringify(process.env.EXPO_PUBLIC_API_BASE_URL || ''),
    'process.env.EXPO_PUBLIC_WEB_BASE_URL': JSON.stringify(process.env.EXPO_PUBLIC_WEB_BASE_URL || ''),
    'process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID': JSON.stringify(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || ''),
    'process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID': JSON.stringify(process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || ''),
    'process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID': JSON.stringify(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || ''),
  },
  server: {
    host: '0.0.0.0',
    port,
    strictPort: true,
  },
  preview: {
    host: '0.0.0.0',
    port,
    strictPort: true,
  },
});
