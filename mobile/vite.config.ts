import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

const port = Number(process.env.PORT) || 5173;
const codegenNativeComponentShim = fileURLToPath(
  new URL('./src/web/codegenNativeComponent.ts', import.meta.url)
);
const reactNativeWebShim = fileURLToPath(
  new URL('./src/web/reactNativeShim.ts', import.meta.url)
);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: /^react-native\/Libraries\/Utilities\/codegenNativeComponent$/,
        replacement: codegenNativeComponentShim,
      },
      {
        find: /^react-native$/,
        replacement: reactNativeWebShim,
      },
      {
        find: /^react-native\/.*/,
        replacement: reactNativeWebShim,
      },
      {
        find: 'events',
        replacement: reactNativeWebShim,
      },
    ],
  },
  optimizeDeps: {
    exclude: ['react-native', 'react-native-web', 'react-native-safe-area-context', 'expo-status-bar', 'lucide-react-native'],
  },
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
    global: 'globalThis',
    'process.env.EXPO_OS': JSON.stringify('web'),
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    'global.global': 'globalThis',
    'process.env.EXPO_PUBLIC_API_BASE_URL': JSON.stringify(process.env.EXPO_PUBLIC_API_BASE_URL || ''),
    'process.env.VITE_API_BASE_URL': JSON.stringify(process.env.VITE_API_BASE_URL || ''),
    'process.env.EXPO_PUBLIC_WEB_BASE_URL': JSON.stringify(process.env.EXPO_PUBLIC_WEB_BASE_URL || ''),
    'process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID': JSON.stringify(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || ''),
    'process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID': JSON.stringify(process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || ''),
    'process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID': JSON.stringify(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || ''),
  },
  server: {
    host: '0.0.0.0',
    port,
    strictPort: true,
    // Local API calls go through the Vite dev proxy so the browser never
    // needs to know the backend origin during development.
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port,
    strictPort: true,
  },
});
