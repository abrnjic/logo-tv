import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { execFileSync } from 'node:child_process'

let catalogueRevision = {};
if (process.env.GITHUB_SHA) {
  catalogueRevision = {
    sha: process.env.GITHUB_SHA,
    committedAt: execFileSync('git', ['show', '-s', '--format=%cI', 'HEAD'], { encoding: 'utf8' }).trim(),
  };
}

// https://vite.dev/config/
export default defineConfig({
  define: { __CATALOGUE_REVISION__: JSON.stringify(catalogueRevision) },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // The catalogue contains 13k records and owner-editable source paths.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
      devOptions: {
        enabled: true
      },
      manifest: {
        name: 'Logo TV',
        short_name: 'LogoTV',
        description: 'Premium kolekcija visokokvalitetnih logotipa za TV kanale',
        theme_color: '#1a1a1a',
        background_color: '#1a1a1a',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  base: '/logo-tv/',
})
