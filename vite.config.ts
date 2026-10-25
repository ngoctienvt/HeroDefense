import { defineConfig } from 'vite';
import { assetManifestPlugin } from './tools/assets/vite-asset-manifest.js';

export default defineConfig({
  root: 'apps/client',
  plugins: [assetManifestPlugin(process.cwd())],
  server: {
    port: 5173,
    strictPort: true,
    proxy: { '/api': 'http://127.0.0.1:2567', '/game': { target: 'ws://127.0.0.1:2567', ws: true } },
  },
  build: { outDir: '../../dist/client', emptyOutDir: true, chunkSizeWarningLimit: 1800 },
});
