import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { buildAssetManifest, scanAssets } from '../tools/assets/asset-references.js';

let root = '';
function write(path: string, content: string): void {
  const full = join(root, path);
  mkdirSync(join(full, '..'), { recursive: true });
  writeFileSync(full, content);
}

describe('asset manifest builder', () => {
  afterEach(() => { if (root) rmSync(root, { recursive: true, force: true }); });

  it('hashes every file and preloads only referenced, live assets', () => {
    root = mkdtempSync(join(tmpdir(), 'asset-manifest-'));
    write('content/data/catalog.json', JSON.stringify({ heroes: [{ id: 'h001' }] }));
    write('apps/client/index.html', '<div></div>');
    write('apps/client/test/x.test.ts', "'only-in-test'");
    write('apps/client/src/a.ts', [
      "const music = '/assets/audio/music.mp3';",
      'const sheet = (id: string) => `/assets/hero-stylized-${id}.webp`;',
      "const sprite = (n: number) => `/assets/hero-sprites-${n}.webp`;",
    ].join('\n'));
    write('apps/client/public/assets/audio/music.mp3', 'm');
    write('apps/client/public/assets/hero-stylized-h001.webp', 'sheet');
    write('apps/client/public/assets/hero-stylized-h001.json', '{}');
    write('apps/client/public/assets/hero-sprites-0.webp', 'legacy');
    write('apps/client/public/assets/only-in-test.webp', 't');
    write('apps/client/public/assets/orphan.webp', 'o');

    const entries = scanAssets(root);
    const status = Object.fromEntries(entries.map(e => [e.path, e.status]));
    expect(status).toMatchObject({
      'audio/music.mp3': 'exact',
      'hero-stylized-h001.webp': 'pattern',
      // A template without extension only matches .webp, so the layout JSON is not counted.
      'hero-stylized-h001.json': 'unreferenced',
      'hero-sprites-0.webp': 'pattern',
      'only-in-test.webp': 'test',
      'orphan.webp': 'unreferenced',
    });
    const manifest = buildAssetManifest(entries);
    expect(Object.keys(manifest.files)).toHaveLength(6);
    expect(Object.values(manifest.files).every(hash => /^[0-9a-f]{10}$/.test(hash))).toBe(true);
    // Dead fallback atlases stay shipped (hashed) but are not preloaded.
    expect(manifest.preload.map(f => f.path)).toEqual(['audio/music.mp3', 'hero-stylized-h001.webp']);

    write('apps/client/public/assets/hero-stylized-h001.webp', 'sheet v2');
    const next = buildAssetManifest(scanAssets(root));
    expect(next.files['hero-stylized-h001.webp']).not.toBe(manifest.files['hero-stylized-h001.webp']);
    expect(next.version).not.toBe(manifest.version);
    expect(next.files['audio/music.mp3']).toBe(manifest.files['audio/music.mp3']);
  });
});
