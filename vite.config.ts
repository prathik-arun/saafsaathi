import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// Vite config: React, Tailwind and the PWA plugin (service worker + manifest).
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'SaafSaathi',
        short_name: 'SaafSaathi',
        description: 'Sort it. Report it. Clean it.',
        theme_color: '#0F766E',
        background_color: '#0F766E',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // App shell + both AI models are cached so scanning works offline.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,json,bin,tflite,txt}'],
        // The built-in recogniser (14 MB) is cached the first time Scan opens, not at install.
        globIgnores: ['models/imagenet/**'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        navigateFallbackDenylist: [/^\/__/],
        runtimeCaching: [
          {
            urlPattern: /\/models\/imagenet\//,
            handler: 'CacheFirst',
            options: { cacheName: 'imagenet-model', expiration: { maxEntries: 10 } },
          },
          {
            // MediaPipe wasm is large, so cache it on first use instead of at install.
            urlPattern: /\/mediapipe\/.*\.(wasm|js)$/,
            handler: 'CacheFirst',
            options: { cacheName: 'mediapipe', expiration: { maxEntries: 6 } },
          },
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts' },
          },
          {
            urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\/.*/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'map-tiles', expiration: { maxEntries: 400 } },
          },
        ],
      },
    }),
  ],
  build: {
    chunkSizeWarningLimit: 2000,
  },
})
