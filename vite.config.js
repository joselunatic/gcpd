import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const spaHistoryFallback = () => {
  const attach = (middlewares) => {
    middlewares.use((req, _res, next) => {
      if (!req.url || req.method !== 'GET') {
        next();
        return;
      }

      const [pathname] = req.url.split('?');
      const isAssetRequest = /\.[a-z0-9]+$/i.test(pathname);
      const isInternalRequest =
        pathname.startsWith('/api') ||
        pathname.startsWith('/@') ||
        pathname.startsWith('/src/') ||
        pathname.startsWith('/node_modules/') ||
        pathname.startsWith('/assets/') ||
        pathname.startsWith('/icons/') ||
        pathname.startsWith('/public/');

      if (isAssetRequest || isInternalRequest) {
        next();
        return;
      }

      const accepts = req.headers.accept || '';
      if (accepts.includes('text/html')) {
        next();
        return;
      }

      req.headers.accept = accepts ? `${accepts}, text/html` : 'text/html';
      req.url = '/index.html';
      next();
    });
  };

  return {
    name: 'gcpd-spa-history-fallback',
    configureServer(server) {
      attach(server.middlewares);
    },
    configurePreviewServer(server) {
      attach(server.middlewares);
    },
  };
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [spaHistoryFallback(), react()],
  resolve: {
    alias: [
      {
        find: /^zustand$/,
        replacement: fileURLToPath(new URL('./src/quest/shims/zustand.js', import.meta.url)),
      },
      {
        find: /^zustand\/shallow$/,
        replacement: fileURLToPath(
          new URL('./src/quest/shims/zustand-shallow.js', import.meta.url)
        ),
      },
    ],
    dedupe: ['react', 'react-dom'],
  },
  server: {
    host: true,
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:4000',
        ws: true,
      },
    },
  },
  preview: {
    host: true,
    port: 5174,
  },
})
