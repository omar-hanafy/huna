import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * Deployed to GitHub Pages at https://omar-hanafy.github.io/huna/, so every asset
 * URL must carry the project base path. Anything referencing an asset at runtime
 * must go through `import.meta.env.BASE_URL` rather than a leading slash.
 */
export default defineConfig({
  base: '/huna/',
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
  build: {
    // Production sourcemaps are not published. They would ship the full source
    // of a personal mental-health app to anyone who opens devtools.
    sourcemap: false,
    target: 'es2022',
  },
});
