import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

/**
 * The site has two pages:
 *   /      the product's landing page, a static file in public/index.html (built with the design kit in public/assets)
 *   /app/  the React dashboard (app/index.html)
 * Vite serves public/ as-is, so the dev server only needs `/` pointed at the static file.
 */
const landingAtRoot = (): Plugin => ({
  name: 'aeropulse-landing-at-root',
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      if (req.url === '/' || req.url?.startsWith('/?')) req.url = '/index.html' + req.url.slice(1);
      if (req.url === '/app') req.url = '/app/';
      next();
    });
  },
});

// https://vitejs.dev/config/
export default defineConfig({
  // GitHub Pages serves the site from /<repo>/; the deploy workflow sets BASE_PATH. Locally it stays /.
  base: process.env.BASE_PATH || '/',
  plugins: [landingAtRoot(), react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    chunkSizeWarningLimit: 1600,
    // the React bundle goes in its own folder so it never mixes with the design kit in public/assets
    assetsDir: 'app/static',
    rollupOptions: {
      input: {
        app: fileURLToPath(new URL('./app/index.html', import.meta.url)),
      },
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          charts: ['recharts'],
          icons: ['lucide-react']
        }
      }
    }
  },
  server: {
    port: 5173,
    host: true
  },
  preview: {
    port: 4173,
    host: true
  }
});
