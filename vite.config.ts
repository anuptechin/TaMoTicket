import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import type { IncomingMessage, ServerResponse } from 'node:http';

const AI_TARGET = `http://localhost:${process.env.AI_PORT || 8787}`;

/**
 * Forwards /api/* to the optional AI server. If it is not running (offline demo),
 * it answers "AI off" with a 200 so the browser console stays clean and the app
 * uses its scripted fallbacks.
 */
function aiBridge(): Plugin {
  const readBody = (req: IncomingMessage) =>
    new Promise<string>((resolve) => {
      let data = '';
      req.on('data', (c) => (data += c));
      req.on('end', () => resolve(data));
    });
  const handler = async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (!req.url?.startsWith('/api/')) return next();
    const offline = req.url.startsWith('/api/health') ? { ai: false } : { text: '' };
    const body = req.method === 'POST' ? await readBody(req) : undefined;
    res.setHeader('Content-Type', 'application/json');
    try {
      const r = await fetch(AI_TARGET + req.url, {
        method: req.method,
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: AbortSignal.timeout(7000),
      });
      res.statusCode = 200;
      res.end(r.ok ? await r.text() : JSON.stringify(offline));
    } catch {
      res.statusCode = 200;
      res.end(JSON.stringify(offline));
    }
  };
  return {
    name: 'ai-bridge',
    configureServer: (s) => void s.middlewares.use(handler),
    configurePreviewServer: (s) => void s.middlewares.use(handler),
  };
}

export default defineConfig({
  plugins: [react(), aiBridge()],
  server: { port: 5173 },
  preview: { port: 4173 },
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          charts: ['recharts'],
          motion: ['framer-motion'],
        },
      },
    },
  },
  test: { environment: 'node' },
} as never);
