import { describe, expect, it } from 'vitest';
import { isVersionedAssetRequest } from '../src/server.js';

describe('versioned asset caching', () => {
  it('treats only /assets/... with a 10-hex ?v= as immutable', () => {
    expect(isVersionedAssetRequest('/assets/hero-stylized-h001.webp?v=abcdef0123')).toBe(true);
    expect(isVersionedAssetRequest('/assets/terrain/island-main.json?v=0123456789')).toBe(true);
    expect(isVersionedAssetRequest('/assets/models/pangu.glb?v=0123456789')).toBe(true);
    expect(isVersionedAssetRequest('/assets/hero-stylized-h001.webp')).toBe(false);
    expect(isVersionedAssetRequest('/assets/hero-stylized-h001.webp?v=old')).toBe(false);
    expect(isVersionedAssetRequest('/assets/x.webp?v=abcdef0123&y=1')).toBe(false);
    expect(isVersionedAssetRequest('/index.html?v=abcdef0123')).toBe(false);
  });
});
