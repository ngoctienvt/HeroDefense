import { readFileSync } from 'node:fs';
import { expect, it, vi } from 'vitest';
import { loadMonsterMotionManifest, monsterMotionClipFrame } from '../src/monster-motion.js';
import { swingProgress } from '../src/visual-actors.js';

it('keeps Hac Phong anticipation before strike and shows contact when strike starts', async () => {
  const data: unknown = JSON.parse(readFileSync(
    new URL('../public/assets/monster-motion-b001.json', import.meta.url), 'utf8'));
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 200, ok: true, json: async () => data }));
  vi.stubGlobal('location', { search: '' });
  try {
    const manifest = await loadMonsterMotionManifest('b001');
    expect(manifest).toBeDefined();
    if (!manifest) throw new Error('Missing Hac Phong manifest');
    for (const direction of manifest.directionOrder) {
      const windup = swingProgress({ action: 'attack', attackPhase: 'windup' }, .98);
      const strike = swingProgress({ action: 'attack', attackPhase: 'strike' }, 0);
      const recover = swingProgress({ action: 'attack', attackPhase: 'strike' }, 1);
      expect(monsterMotionClipFrame(manifest, 'attack', direction, 0, windup, false).key)
        .toBe(`attack:${direction}:3`);
      expect(monsterMotionClipFrame(manifest, 'attack', direction, 0, strike, false).key)
        .toBe(`attack:${direction}:5`);
      expect(monsterMotionClipFrame(manifest, 'attack', direction, 0, recover, false).key)
        .toBe(`attack:${direction}:7`);
    }
  } finally {
    vi.unstubAllGlobals();
  }
});
