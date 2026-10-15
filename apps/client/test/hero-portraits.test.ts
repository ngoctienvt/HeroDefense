import { describe, expect, it } from 'vitest';
import { HEROES } from '../../../content/catalog.js';
import { hasHeroPortrait, heroArtTile, portraitCoverage, spriteUv } from '../src/hero-portraits.js';
import { existsSync } from 'node:fs';

describe('hero portrait atlas', () => {
  it('assigns exactly one portrait tile to every catalog hero', () => {
    expect(portraitCoverage()).toBe(70);
    for (const hero of HEROES) expect(hasHeroPortrait(hero.id)).toBe(true);
  });
  it('has a valid, unique battlefield sprite tile and asset for every hero', () => {
    const uvs = new Set<string>();
    for (const hero of HEROES) {
      const uv = spriteUv(hero.id);
      expect(uv).toHaveLength(8);
      expect(uv!.every(value => value >= 0 && value <= 1)).toBe(true);
      uvs.add(`${heroArtTile(hero.id)?.atlas}:${uv!.join(',')}`);
    }
    // Tile coordinates repeat across atlases; the nine sources must all exist.
    for (let atlas = 0; atlas < 9; atlas++) {
      expect(existsSync(new URL(`../public/assets/hero-sprites-${atlas}.webp`, import.meta.url))).toBe(true);
    }
    expect(uvs.size).toBe(70);
  });
});
