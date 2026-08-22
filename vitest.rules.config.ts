/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';

// Config separada para los tests de reglas de Firestore.
// Corren en Node (no jsdom) y requieren el emulador de Firestore levantado:
//   npm run test:rules
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/rules/**/*.{test,spec}.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallelism: false,
  },
});
