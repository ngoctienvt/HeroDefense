// Vite plugin: exposes `virtual:asset-manifest` (content hash per public asset + lobby preload list).
// Hashes are baked into the hashed JS bundle, so index.html (no-store) always points at fresh versions
// and every /assets/* URL can carry ?v=<hash> with a one-year immutable cache.
import type { Plugin } from 'vite';
import { buildAssetManifest, scanAssets } from './asset-references.js';

const VIRTUAL_ID = 'virtual:asset-manifest';
const RESOLVED_ID = `\0${VIRTUAL_ID}`;

export function assetManifestPlugin(root: string): Plugin {
  return {
    name: 'thien-dao-asset-manifest',
    resolveId(id) { return id === VIRTUAL_ID ? RESOLVED_ID : null; },
    load(id) {
      if (id !== RESOLVED_ID) return null;
      const started = Date.now();
      const manifest = buildAssetManifest(scanAssets(root));
      this.info(`asset manifest ${manifest.version}: ${Object.keys(manifest.files).length} files, `
        + `${manifest.preload.length} preload, ${Date.now() - started} ms`);
      return `export default ${JSON.stringify(manifest)};`;
    },
  };
}
