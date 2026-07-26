import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
  return {
    plugins: [
      react({
        // Enable TypeScript support in JSX/TSX files
        babel: {
          plugins: [],
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
      sourcemap: 'hidden',
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
