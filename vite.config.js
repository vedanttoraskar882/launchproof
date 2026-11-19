import { defineConfig } from 'vite';
import { resolve } from 'path';

const rootDir = import.meta.dirname;

export default defineConfig({
  root: '.',
  server: {
    port: 3000,
    open: false
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(rootDir, 'index.html'),
        service: resolve(rootDir, 'service/index.html'),
        contactUs: resolve(rootDir, 'contact-us/index.html'),
        aboutUs: resolve(rootDir, 'about-us/index.html')
      }
    }
  },
  plugins: [
    {
      name: 'html-rewrite-middleware',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const url = req.url.split('?')[0].split('#')[0];
          if (url === '/service') req.url = '/service/index.html';
          if (url === '/contact-us') req.url = '/contact-us/index.html';
          if (url === '/about-us') req.url = '/about-us/index.html';
          next();
        });
      },
      configurePreviewServer(server) {
        server.middlewares.use((req, res, next) => {
          const url = req.url.split('?')[0].split('#')[0];
          if (url === '/service') req.url = '/service/index.html';
          if (url === '/contact-us') req.url = '/contact-us/index.html';
          if (url === '/about-us') req.url = '/about-us/index.html';
          next();
        });
      }
    }
  ]
});
