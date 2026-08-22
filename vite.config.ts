/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          // Firebase se separa porque es la mitad del bundle y cambia poco.
          if (id.includes('firebase/firestore') || id.includes('@firebase/firestore')) return 'firebase-firestore';
          if (id.includes('firebase/') || id.includes('@firebase/')) return 'firebase-core';
          if (id.includes('node_modules/zod/')) return 'zod';
          // TODO el resto (react, react-dom, react-router, vaul, radix, scheduler,
          // tslib...) va a UN solo chunk a proposito. Separar 'react-vendor' de
          // 'vendor' generaba un ciclo (vendor -> react-vendor -> vendor): al
          // cargar, 'vendor' se inicializaba antes que React y la app moria con
          // "Cannot read properties of undefined (reading 'useLayoutEffect')",
          // dejando la pantalla en blanco. Rollup avisaba con
          // "Circular chunk: vendor -> react-vendor -> vendor".
          return 'vendor';
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
    // Los tests de reglas de Firestore corren aparte (necesitan el emulador):
    // ver vitest.rules.config.ts / `npm run test:rules`.
    exclude: ['node_modules/**', 'dist/**', 'tests/rules/**'],
    coverage: {
      reporter: ['text', 'html'],
      include: ['src/api/**', 'src/hooks/**'],
    },
  },
});
