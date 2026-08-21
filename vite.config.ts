/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('firebase/app') || id.includes('@firebase/app')) return 'firebase-app';
            if (id.includes('firebase/firestore') || id.includes('@firebase/firestore')) return 'firebase-firestore';
            if (id.includes('firebase/')) return 'firebase-core';
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) return 'react-vendor';
            if (id.includes('zod')) return 'zod';
            return 'vendor';
          }
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      reporter: ['text', 'html'],
      include: ['src/api/**', 'src/hooks/**'],
    },
  },
});
