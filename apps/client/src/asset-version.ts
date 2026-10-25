/**
 * Content-hashed asset URLs. `/assets/x.webp` becomes `/assets/x.webp?v=<hash>`, which the server
 * caches for a year (immutable). A rebuilt file gets a new hash, so players never keep a stale sprite.
 * Without an installed manifest (tests, plain Vite without the plugin) URLs pass through unchanged.
 */
export interface AssetManifest {
  version: string;
  files: Record<string, string>;
  preload: { path: string; bytes: number }[];
}

const ASSET_PREFIX = '/assets/';
let hashes = new Map<string, string>();
let installed: AssetManifest | null = null;

export function installAssetManifest(manifest: AssetManifest): void {
  installed = manifest;
  hashes = new Map(Object.entries(manifest.files));
}

export function assetManifest(): AssetManifest | null { return installed; }

/** Same-origin `/assets/` paths without a query gain `?v=<hash>`; everything else is returned as is. */
export function assetUrl(url: string): string {
  if (!hashes.size || url.startsWith('data:') || url.startsWith('blob:')) return url;
  let parsed: URL;
  try { parsed = new URL(url, location.origin); } catch { return url; }
  if (parsed.origin !== location.origin || parsed.search || !parsed.pathname.startsWith(ASSET_PREFIX)) return url;
  const hash = hashes.get(decodeURIComponent(parsed.pathname.slice(ASSET_PREFIX.length)));
  if (!hash) return url;
  // Keep the caller's form (relative stays relative) so Babylon's own path handling is unchanged.
  return `${url}?v=${hash}`;
}
