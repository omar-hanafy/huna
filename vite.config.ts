import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Deployed to GitHub Pages at https://omar-hanafy.github.io/huna/, so every
 * asset URL carries the project base path. Anything referencing an asset at
 * runtime goes through `import.meta.env.BASE_URL` rather than a leading slash.
 */
export default defineConfig({
  base: '/huna/',
  plugins: [
    react(),
    VitePWA({
      // The manifest is hand-written in public/ so it can be reviewed as a
      // whole; the plugin only needs to know not to generate its own.
      manifest: false,
      injectRegister: 'auto',
      registerType: 'prompt',
      workbox: {
        /**
         * Take control on the first visit, so the app works offline from the
         * moment it is installed rather than from the second launch.
         */
        clientsClaim: true,
        /**
         * An update never activates under a live tab. Reloading someone
         * mid-episode to ship a new build would be a poor trade; the update
         * applies at the next cold start, and UpdateNotice offers it sooner.
         */
        skipWaiting: false,
        /**
         * Content JSON is precached alongside the shell. The alert flow has to
         * work with no signal: someone reaching for this on a train has the
         * worst connectivity precisely when they most need the sequence.
         */
        globPatterns: ['**/*.{js,css,html,json,svg,png,webmanifest,woff2}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
  },
  build: {
    // Production sourcemaps are not published. They would ship the full source
    // of a personal mental-health app to anyone who opens devtools.
    sourcemap: false,
    target: 'es2022',
    // Keep the shell small so a cold open on a slow connection is quick.
    // Vite 8 bundles with rolldown, whose grouping API is codeSplitting.
    rollupOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler|react-router)[\\/]/ },
            { name: 'storage', test: /node_modules[\\/](dexie|dexie-react-hooks)[\\/]/ },
            { name: 'i18n', test: /node_modules[\\/](i18next|react-i18next)[\\/]/ },
            { name: 'validation', test: /node_modules[\\/]zod[\\/]/ },
          ],
        },
      },
    },
  },
});
