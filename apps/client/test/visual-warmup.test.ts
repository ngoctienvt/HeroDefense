import { describe, expect, it } from 'vitest';
import type { GameState } from '../../../packages/contracts/src/types.js';
import { waveArt, warmupHeroIds } from '../src/visual-warmup.js';

describe('GPU warm-up scope', () => {
  it('warms the own collection and deployed allies, not the benches of allies', () => {
    const units = {
      a: { heroId: 'h001', owner: 'me', slot: 0 }, b: { heroId: 'h001', owner: 'me', slot: -1 },
      c: { heroId: 'h041', owner: 'me', slot: -1 }, d: { heroId: 'h014', owner: 'ally', slot: 2 },
      e: { heroId: 'h03Z', owner: 'ally', slot: -1 },
    } as unknown as GameState['units'];
    expect(warmupHeroIds({ units }, 'me').sort()).toEqual(['h001', 'h014', 'h041']);
  });

  it('lists hero skins and monster atlases a wave can spawn, bosses included', () => {
    const wave1 = waveArt(1);
    expect(wave1.monsters.length + wave1.skins.length).toBeGreaterThan(0);
    for (const wave of [5, 10, 15, 20]) {
      const art = waveArt(wave);
      expect(art.skins.length + art.monsters.length, `wave ${wave}`).toBeGreaterThan(0);
      expect(new Set(art.skins).size).toBe(art.skins.length);
    }
  });
});
