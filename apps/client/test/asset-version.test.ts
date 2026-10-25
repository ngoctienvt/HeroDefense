import { afterEach, describe, expect, it, vi } from 'vitest';
import { assetUrl, installAssetManifest } from '../src/asset-version.js';

describe('content-hashed asset URLs', () => {
  afterEach(() => { installAssetManifest({ version: '', files: {}, preload: [] }); vi.unstubAllGlobals(); });

  it('leaves URLs untouched before a manifest is installed (tests, plain Vite)', () => {
    expect(assetUrl('/assets/hero-stylized-h001.webp')).toBe('/assets/hero-stylized-h001.webp');
  });

  it('appends the content hash to same-origin /assets/ paths only', () => {
    vi.stubGlobal('location', { origin: 'http://26.1.2.3:2567' });
    installAssetManifest({ version: 'v', files: { 'hero-stylized-h001.webp': 'abcdef0123', 'models/pangu.glb': '0123456789' }, preload: [] });
    expect(assetUrl('/assets/hero-stylized-h001.webp')).toBe('/assets/hero-stylized-h001.webp?v=abcdef0123');
    expect(assetUrl('/assets/models/pangu.glb')).toBe('/assets/models/pangu.glb?v=0123456789');
    expect(assetUrl('http://26.1.2.3:2567/assets/models/pangu.glb')).toBe('http://26.1.2.3:2567/assets/models/pangu.glb?v=0123456789');
    // Unknown files, existing queries, other origins and data/blob URLs pass through.
    expect(assetUrl('/assets/unknown.webp')).toBe('/assets/unknown.webp');
    expect(assetUrl('/assets/hero-stylized-h001.webp?v=old')).toBe('/assets/hero-stylized-h001.webp?v=old');
    expect(assetUrl('https://cdn.example.com/assets/hero-stylized-h001.webp')).toBe('https://cdn.example.com/assets/hero-stylized-h001.webp');
    expect(assetUrl('data:image/png;base64,AAAA')).toBe('data:image/png;base64,AAAA');
    expect(assetUrl('blob:http://26.1.2.3:2567/x')).toBe('blob:http://26.1.2.3:2567/x');
  });
});
