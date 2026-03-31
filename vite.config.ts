import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['favicon.svg', 'icon-192.svg', 'icon-512.svg'],
          manifest: {
            id: '/',
            name: 'BicingAI Barcelona',
            short_name: 'BicingAI',
            description: 'App ràpida en català per consultar Bicing a Barcelona, ideal per Android i escriptori.',
            lang: 'ca',
            start_url: '/',
            scope: '/',
            display: 'standalone',
            orientation: 'portrait-primary',
            theme_color: '#ef3437',
            background_color: '#020617',
            categories: ['navigation', 'travel', 'utilities'],
            icons: [
              {
                src: 'icon-192.svg',
                sizes: '192x192',
                type: 'image/svg+xml',
                purpose: 'any'
              },
              {
                src: 'icon-512.svg',
                sizes: '512x512',
                type: 'image/svg+xml',
                purpose: 'any maskable'
              }
            ],
            shortcuts: [
              {
                name: 'A prop meu',
                short_name: 'A prop',
                description: 'Troba ràpidament estacions properes',
                url: '/?focus=nearby',
                icons: [{ src: 'icon-192.svg', sizes: '192x192', type: 'image/svg+xml' }]
              },
              {
                name: 'Radar de trajecte',
                short_name: 'Radar',
                description: 'Obre directament el radar de trajecte',
                url: '/?focus=radar',
                icons: [{ src: 'icon-192.svg', sizes: '192x192', type: 'image/svg+xml' }]
              }
            ]
          },
          workbox: {
            globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
            runtimeCaching: [
              {
                urlPattern: /^https:\/\/api\.citybik\.es\/.*$/i,
                handler: 'NetworkFirst',
                options: {
                  cacheName: 'bicing-api',
                  networkTimeoutSeconds: 4,
                  expiration: {
                    maxEntries: 16,
                    maxAgeSeconds: 60 * 5
                  },
                  cacheableResponse: {
                    statuses: [0, 200]
                  }
                }
              },
              {
                urlPattern: /^https:\/\/[abc]\.basemaps\.cartocdn\.com\/.*$/i,
                handler: 'StaleWhileRevalidate',
                options: {
                  cacheName: 'carto-tiles',
                  expiration: {
                    maxEntries: 128,
                    maxAgeSeconds: 60 * 60 * 24 * 14
                  },
                  cacheableResponse: {
                    statuses: [0, 200]
                  }
                }
              },
              {
                urlPattern: /^https:\/\/cdn\.tailwindcss\.com\/.*$/i,
                handler: 'StaleWhileRevalidate',
                options: {
                  cacheName: 'tailwind-cdn',
                  expiration: {
                    maxEntries: 8,
                    maxAgeSeconds: 60 * 60 * 24 * 30
                  }
                }
              },
              {
                urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*$/i,
                handler: 'StaleWhileRevalidate',
                options: {
                  cacheName: 'google-fonts',
                  expiration: {
                    maxEntries: 16,
                    maxAgeSeconds: 60 * 60 * 24 * 365
                  }
                }
              }
            ]
          },
          devOptions: {
            enabled: true,
            type: 'module'
          }
        })
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
