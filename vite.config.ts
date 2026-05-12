import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'firebase/firestore': fileURLToPath(new URL('./src/lib/firestoreLite.ts', import.meta.url)),
      'firebase/storage': fileURLToPath(new URL('./src/lib/storageLite.ts', import.meta.url)),
      'firebase/functions': fileURLToPath(new URL('./src/lib/functionsLite.ts', import.meta.url)),
      'firebase/auth': fileURLToPath(new URL('./src/lib/authLite.ts', import.meta.url)),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
