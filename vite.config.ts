import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  /**
   * Port dedie a GymTrack.
   *
   * Un service worker est enregistre pour une ORIGINE, pas pour un projet.
   * Sur le port 5173 par defaut, plusieurs apps (MacroTrack,
   * GymTrack…) partagent `http://localhost:5173` : le SW de la derniere
   * installee intercepte les navigations et sert SA coquille en cache, quel
   * que soit le serveur de dev qui tourne. Meme cause pour le localStorage,
   * partage lui aussi par origine.
   *
   * strictPort : mieux vaut un echec explicite qu'un repli silencieux sur un
   * port deja colonise par une autre app.
   */
  server: { port: 5177, strictPort: true },
  preview: { port: 4177, strictPort: true },

  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Le manifeste est desactive en dev : sur iOS, un manifeste sans scope
      // servi depuis le serveur de dev fait basculer la PWA en web-app legacy.
      devOptions: { enabled: false },
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'GymTrack',
        short_name: 'GymTrack',
        description: "Journal d'entrainement pilote a la data.",
        lang: 'fr',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#ffffff',
        theme_color: '#ffffff',
        categories: ['health', 'fitness', 'productivity'],
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          // Version dediee : Android rogne l'icone maskable en cercle, le motif
          // doit donc tenir dans les 80 % centraux, fond etendu bord a bord.
          {
            src: 'pwa-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        /**
         * Notification de fin de repos, programmee d'avance par le worker.
         *
         * Greffe sur le worker genere plutot que passage en `injectManifest` :
         * on n'a besoin que de deux ecouteurs, pas de reprendre a notre charge
         * toute la strategie de cache hors ligne, qui est le coeur de l'app.
         * Le fichier est aussi precache par le motif ci-dessous, donc sa
         * modification fait bien monter une nouvelle version du worker.
         */
        importScripts: ['/rest-notify.js'],
        // App shell complet precache : l'app doit demarrer dans un sous-sol
        // sans reseau. Aucun appel externe n'est necessaire au runtime.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gymtrack-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
