import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Only exists inside a Vite build; stubbed so UpdateNotice is testable
      // rather than permanently uncovered.
      'virtual:pwa-register/react': fileURLToPath(new URL('./src/test/pwaRegisterStub.ts', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    // Playwright owns e2e; Vitest must not try to run those files.
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    restoreMocks: true,
    clearMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.{test,spec}.{ts,tsx}',
        'src/test/**',
        'src/main.tsx',
        // Both forms: '**' does not match zero directories in every matcher,
        // and a declaration file makes the v8 remapper throw a parse error.
        'src/*.d.ts',
        'src/**/*.d.ts',
      ],
      thresholds: {
        // The safety-critical layers carry the strict bars. UI coverage is
        // meaningful but not worth gaming a number over.
        'src/core/**': { statements: 100, branches: 100, functions: 100, lines: 100 },
        'src/storage/**': { statements: 90, branches: 85, functions: 90, lines: 90 },
      },
    },
  },
});
