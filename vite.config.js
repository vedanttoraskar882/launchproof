import { defineConfig } from 'vite';
import { resolve } from 'path';
import { processSubmission } from './api/submit.js';

const rootDir = import.meta.dirname;

function setupApiAndRoutingMiddleware(server) {
  server.middlewares.use(async (req, res, next) => {
    const url = req.url.split('?')[0].split('#')[0];

    // 1. API Endpoints for Form Email Submissions
    if (url.startsWith('/api/')) {
      if (req.method !== 'POST') {
        res.writeHead(405, { 'Content-Type': 'application/json', 'Allow': 'POST' });
        res.end(JSON.stringify({ success: false, error: 'Method not allowed. Use POST.' }));
        return;
      }

      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const payload = body ? JSON.parse(body) : {};
          if (url.startsWith('/api/early-access')) payload.type = 'early-access';
          if (url.startsWith('/api/contact')) payload.type = 'contact';
          const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
          const result = await processSubmission(payload, clientIp);
          res.writeHead(result.status, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result.data));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Invalid request payload.' }));
        }
      });
      return;
    }

    // 2. Backward compatibility redirect: /service -> /services
    if (url === '/service') {
      res.writeHead(301, { Location: '/services' });
      res.end();
      return;
    }

    // 3. Clean URLs routing
    if (url === '/how-it-works') req.url = '/how-it-works/index.html';
    if (url === '/services') req.url = '/services/index.html';
    if (url === '/about-us') req.url = '/about-us/index.html';
    if (url === '/contact-us') req.url = '/contact-us/index.html';

    next();
  });
}

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
        howItWorks: resolve(rootDir, 'how-it-works/index.html'),
        services: resolve(rootDir, 'services/index.html'),
        service: resolve(rootDir, 'service/index.html'),
        aboutUs: resolve(rootDir, 'about-us/index.html'),
        contactUs: resolve(rootDir, 'contact-us/index.html')
      }
    }
  },
  plugins: [
    {
      name: 'html-rewrite-and-api-middleware',
      configureServer(server) {
        setupApiAndRoutingMiddleware(server);
      },
      configurePreviewServer(server) {
        setupApiAndRoutingMiddleware(server);
      }
    }
  ]
});
