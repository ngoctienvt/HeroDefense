import { defineConfig } from 'vite';

export default defineConfig({
  root: 'apps/client',
  server: {
    port: 5173,
    strictPort: true,
    proxy: { '/api': 'http://127.0.0.1:2567', '/game': { target: 'ws://127.0.0.1:2567', ws: true } },
  },
  build: { outDir: '../../dist/client', emptyOutDir: true, chunkSizeWarningLimit: 1800 },
});
