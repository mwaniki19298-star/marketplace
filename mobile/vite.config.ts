import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

const port = Number(process.env.PORT) || 5173;
const codegenNativeComponentShim = fileURLToPath(
  new URL('./src/web/codegenNativeComponent.ts', import.meta.url)
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
        replacement: 'react-native-web',
      },
    ],
  },
  optimizeDeps: {
    exclude: ['react-native-safe-area-context'],
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
