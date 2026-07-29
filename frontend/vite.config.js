import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react({
        // Enable TypeScript support in JSX/TSX files
        babel: {
          plugins: [],
        },
      }),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icons/*.png', 'icons/*.svg', 'favicon.ico'],
        manifest: false,
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],

          // ── Navigation Fallback ──────────────────────────────────────────
          // Serve index.html for all navigation requests not matched by
          // runtimeCaching or the denylist. This is the SPA offline shell.
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [
            /^\/api/,       // API routes — handled by runtimeCaching
            /^\/admin/,     // Django admin — must be online
          ],

          // ── Runtime Caching ──────────────────────────────────────────────
          // Rules are evaluated in order. First match wins.
          // Sensitive auth endpoints (token/refresh, login, logout) are
          // excluded via urlPattern — they NEVER touch CacheStorage.
          runtimeCaching: [

            // ━━━ 1. Vite Hashed Assets (JS/CSS in /assets/) ━━━━━━━━━━━━━
            // Fingerprinted filenames are immutable — cache forever.
            // Strategy: CacheFirst — serve from cache, never revalidate.
            {
              urlPattern: /^https?:\/\/[^/]+\/assets\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'static-assets',
                expiration: {
                  maxEntries: 500,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },

            // ━━━ 2. Same-Origin Images ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // Faculty photos, school logos, UI icons.
            // Strategy: StaleWhileRevalidate — serve cached instantly,
            //           update in background if network available.
            {
              urlPattern: ({ request, url }) =>
                request.destination === 'image' &&
                url.origin === self.location.origin,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'images',
                expiration: {
                  maxEntries: 200,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },

            // ━━━ 3. Supabase Storage Images ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // User profile pictures, announcement media, assignment files.
            // Strategy: CacheFirst — these are immutable once uploaded.
            {
              urlPattern: /^https?:\/\/[^/]*\.supabase\.(co|in)\/storage\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'supabase-storage',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },

            // ━━━ 4. Google Fonts Stylesheets ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // Font CSS from Google CDN. Rarely changes.
            // Strategy: CacheFirst — serve cached, update yearly.
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-stylesheets',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },

            // ━━━ 5. Google Fonts Webfont Files ━━━━━━━━━━━━━━━━━━━━━━━━━━
            // Actual font files (woff2). Immutable once published.
            // Strategy: CacheFirst — serve cached, update yearly.
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-webfonts',
                expiration: {
                  maxEntries: 30,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },

            // ━━━ 6. Firebase / FCM Endpoints ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // Push notification registration and token management.
            // Strategy: NetworkOnly — must always reach the server.
            {
              urlPattern: /^https:\/\/(fcm\.googleapis\.com|firebaseinstallations\.googleapis\.com)\/.*/i,
              handler: 'NetworkOnly',
            },

            // ━━━ 7. Sensitive Auth Endpoints ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // Token refresh, login, logout — NEVER cached.
            // Strategy: NetworkOnly — prevents stale/leaked tokens.
            {
              urlPattern: ({ url }) =>
                url.pathname.includes('/token/') ||
                url.pathname.includes('/login') ||
                url.pathname.includes('/logout') ||
                url.pathname.includes('/password'),
              handler: 'NetworkOnly',
            },

            // ━━━ 8. Write Operations (POST/PUT/PATCH/DELETE) ━━━━━━━━━━━━
            // Any mutation request must reach the server.
            // Strategy: NetworkOnly — prevents duplicate submissions.
            {
              urlPattern: ({ request }) =>
                request.method !== 'GET' && request.method !== 'HEAD',
              handler: 'NetworkOnly',
            },

            // ━━━ 9. API Data — Public Endpoints ━━━━━━━━━━━━━━━━━━━━━━━━━
            // Public read-only data: announcements, calendar, programs,
            // faculty, enrollment status, news.
            // Strategy: NetworkFirst — try network, fall back to cache.
            {
              urlPattern: ({ url }) =>
                url.pathname.includes('/api/') && (
                  url.pathname.includes('/announcements') ||
                  url.pathname.includes('/calendar') ||
                  url.pathname.includes('/programs') ||
                  url.pathname.includes('/faculty') ||
                  url.pathname.includes('/departments') ||
                  url.pathname.includes('/enrollment-status') ||
                  url.pathname.includes('/news') ||
                  url.pathname.includes('/public/') ||
                  url.pathname.includes('/system/maintenance')
                ),
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-public',
                networkTimeoutSeconds: 5,
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24, // 1 day
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },

            // ━━━ 10. API Data — Authenticated Endpoints ━━━━━━━━━━━━━━━━━
            // User-specific data: dashboard, profile, classes, grades.
            // Strategy: NetworkFirst — fresh data preferred, but
            //           serve stale if offline for basic offline use.
            // NOTE: The axios interceptor handles 401 retry separately.
            //       The SW only caches successful GET responses.
            {
              urlPattern: ({ url }) =>
                url.pathname.includes('/api/') &&
                url.pathname.includes('/v1/'),
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-authenticated',
                networkTimeoutSeconds: 5,
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 6, // 6 hours
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },

            // ━━━ 11. Everything Else (External Resources) ━━━━━━━━━━━━━━━
            // Catch-all for any remaining external requests.
            // Strategy: NetworkFirst with short timeout.
            {
              urlPattern: ({ request }) => request.mode === 'cors',
              handler: 'NetworkFirst',
              options: {
                cacheName: 'external',
                networkTimeoutSeconds: 3,
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24, // 1 day
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
      }),
    ],
    define: {
      // Ensure global is defined
      'global': 'globalThis',
      'process.env': {},
    },
    resolve: {
      alias: {
        buffer: 'buffer/',
      },
    },
    optimizeDeps: {
      include: ['buffer'],
      esbuildOptions: {
        define: {
          global: 'globalThis',
        },
      },
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
        },
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.js',
      css: true,
    },
    build: {
      // Enable source maps for TypeScript debugging (Requirement 7.6)
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            // Vendor chunks - split large dependencies into separate bundles
            // React core (~140KB)
            if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
              return 'vendor-react';
            }
            // React Router (~50KB)
            if (
              id.includes('node_modules/react-router-dom/') ||
              id.includes('node_modules/react-router/')
            ) {
              return 'vendor-router';
            }
            // Chart libraries (~100KB+)
            if (id.includes('node_modules/recharts/')) {
              return 'vendor-charts';
            }
            // Export libraries (jspdf, xlsx, xlsx-populate, html2canvas ~200KB+)
            if (
              id.includes('node_modules/jspdf/') ||
              id.includes('node_modules/xlsx/') ||
              id.includes('node_modules/xlsx-populate/') ||
              id.includes('node_modules/html2canvas/')
            ) {
              return 'vendor-export';
            }
            // TanStack Query (~40KB)
            if (id.includes('node_modules/@tanstack/')) {
              return 'vendor-query';
            }
            // UI notification libraries (~60KB)
            if (
              id.includes('node_modules/sweetalert2/') ||
              id.includes('node_modules/react-hot-toast/')
            ) {
              return 'vendor-ui';
            }
            // Axios (~30KB)
            if (id.includes('node_modules/axios/')) {
              return 'vendor-axios';
            }

            // Route-based chunks for pages (Requirement 1.1)
            // Each top-level route gets its own chunk for optimal lazy loading
            if (id.includes('/src/pages/')) {
              // Top-level page files (e.g., Dashboard.jsx, Login.jsx)
              const pageMatch = id.match(/\/pages\/([^/]+)\.jsx?$/);
              if (pageMatch) {
                const pageName = pageMatch[1].toLowerCase();
                return `page-${pageName}`;
              }
              // Nested page folders (e.g., pages/dashboards/TeacherDashboard.jsx)
              const nestedMatch = id.match(/\/pages\/([^/]+)\/([^/]+)\.jsx?$/);
              if (nestedMatch) {
                const parentFolder = nestedMatch[1].toLowerCase();
                const pageName = nestedMatch[2].toLowerCase();
                return `page-${parentFolder}-${pageName}`;
              }
            }

            // Component chunks for heavy components >50KB (Requirement 1.1)
            // These components are lazy-loaded to reduce initial bundle size
            if (id.includes('/src/components/')) {
              // Heavy UI components identified during bundle analysis
              if (
                id.includes('PostComposerModal') ||
                id.includes('ReportChart') ||
                id.includes('RichTextEditor')
              ) {
                return 'component-heavy';
              }
            }
          },
        },
      },
      // Warn when main bundle exceeds 200KB (Requirements 1.4, 3.2)
      chunkSizeWarningLimit: 200,
    },
  };
});
