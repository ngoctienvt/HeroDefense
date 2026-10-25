import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { HEROES } from '../../../content/catalog.js';
import { hasStylizedMotion, STYLIZED_HEROES, stylizedFrame, stylizedDimensions, STYLIZED_ANCHOR_Y, STYLIZED_PLANE_HEIGHT, STYLIZED_REST_Y } from '../src/stylized-motion.js';

const directions = ['south', 'west', 'north', 'east'] as const;
describe('Linh and Huyền stylized sprite contract', () => {
  it('covers the first two tiers and the published Hình Thiên bundle', () => {
    expect([...STYLIZED_HEROES].filter(id => HEROES.some(hero => hero.id === id && hero.tier <= 2)).sort())
      .toEqual(HEROES.filter(hero => hero.tier <= 2).map(hero => hero.id).sort());
    expect(new Set(STYLIZED_HEROES).size).toBe(STYLIZED_HEROES.length);
    expect(hasStylizedMotion('h011')).toBe(true); expect(hasStylizedMotion('h012')).toBe(true);
    expect(hasStylizedMotion('h013')).toBe(true);
    expect(hasStylizedMotion('h03Y')).toBe(true);
    expect(hasStylizedMotion('h03Z')).toBe(true);
    expect(hasStylizedMotion('h041')).toBe(true);
    expect(hasStylizedMotion('h040')).toBe(true);
    expect(hasStylizedMotion('h03W')).toBe(true);
    for (const id of ['h03X', 'h01I', 'h01J', 'h014', 'h015']) expect(hasStylizedMotion(id)).toBe(true);
    expect(hasStylizedMotion('h01C')).toBe(true);
    expect(hasStylizedMotion('h01F')).toBe(true);
    expect(hasStylizedMotion('h01E')).toBe(true);
    expect(hasStylizedMotion('h01K')).toBe(true);
    expect(hasStylizedMotion('h01D')).toBe(true);
    expect(hasStylizedMotion('h018')).toBe(true);
    expect(hasStylizedMotion('h017')).toBe(true);
    expect(hasStylizedMotion('h016')).toBe(true);
    expect(hasStylizedMotion('h019')).toBe(true);
    expect(hasStylizedMotion('h01A')).toBe(true);
    expect(hasStylizedMotion('h01G')).toBe(true);
    expect(hasStylizedMotion('h01H')).toBe(true);
    expect(STYLIZED_HEROES.filter(id => HEROES.some(hero => hero.id === id && (hero.tier === 3 || hero.tier === 4))))
      .toHaveLength(24);
    expect(hasStylizedMotion('h01B')).toBe(false);
  });
  it('keeps idle still at arbitrary elapsed time and uses it for hit/death fallback', () => {
    for (const direction of directions) {
      const still = stylizedFrame(direction, 'idle');
      for (const elapsed of [1, 151, 600, 19000]) expect(stylizedFrame(direction, 'idle', elapsed, .8)).toEqual(still);
      for (const pose of ['hit', 'death'] as const) expect(stylizedFrame(direction, pose, 999, .7)).toEqual(still);
    }
  });
  it('loops four distinct walking poses while walk-a and walk-b share a continuous clock', () => {
    for (const direction of directions) {
      expect(new Set([0, 150, 300, 450].map(t => stylizedFrame(direction, 'walk-a', t).key)).size).toBe(4);
      expect(stylizedFrame(direction, 'walk-a', 600)).toEqual(stylizedFrame(direction, 'walk-a', 0));
      expect(stylizedFrame(direction, 'walk-b', 300)).toEqual(stylizedFrame(direction, 'walk-a', 300));
    }
  });
  it('plays preparation, windup, release and recovery once; cast holds windup', () => {
    for (const direction of directions) {
      expect([0, .3, .5, .7].map(p => stylizedFrame(direction, 'attack', 0, p).key))
        .toEqual([0, 1, 2, 3].map(n => `${direction}.attack.${n}`));
      expect(stylizedFrame(direction, 'attack', 0, 1).key).toBe(`${direction}.attack.3`);
      expect(stylizedFrame(direction, 'cast', 1000, .9).key).toBe(`${direction}.attack.1`);
      expect(stylizedFrame(direction, 'walk-a', 450, 0, true).key).toBe(`${direction}.walk.0`);
      expect(stylizedFrame(direction, 'attack', 0, 0, true).key).toBe(`${direction}.attack.2`);
    }
  });
  it('matches every exported rectangle and animation duration with runtime UVs', () => {
    for (const hero of STYLIZED_HEROES) {
      const tier = HEROES.find(definition => definition.id === hero)?.tier;
      const collection = tier === 3 || tier === 4 ? 'tier3-tier4'
        : hero === 'h011' || hero === 'h012' || hero === 'h013' || hero === 'h014' || hero === 'h015' || hero === 'h016' || hero === 'h017' || hero === 'h018' || hero === 'h019' || hero === 'h01A' || hero === 'h01G' || hero === 'h01H' || hero === 'h01I' || hero === 'h01J' || hero === 'h03W' || hero === 'h03X' || hero === 'h03Y' || hero === 'h03Z' || hero === 'h040' || hero === 'h041' || hero === 'h01C' || hero === 'h01D' || hero === 'h01E' || hero === 'h01F' || hero === 'h01K'
          ? 'tier5-tier6' : 'linh-huyen-stylized';
      const url = new URL(`../../../assets/sprites/${collection}/${hero}/web/atlas.json`, import.meta.url);
      const atlas = JSON.parse(readFileSync(url, 'utf8'));
      expect(Object.keys(atlas.frames)).toHaveLength(36); expect(Object.keys(atlas.animations)).toHaveLength(12);
      expect(atlas.meta).toMatchObject({ size: { w: 1536, h: 1536 }, cellSize: 256, anchor: [128, 224], idle: 'still' });
      const dimensions = stylizedDimensions(hero);
      expect(dimensions.height).toBeCloseTo(atlas.meta.planeHeight);
      expect((.5-.875)*dimensions.height+dimensions.anchorY+STYLIZED_REST_Y).toBeCloseTo(.12);
      for (const direction of directions) for (const [pose, times] of [['idle', [0]], ['walk-a', [0,150,300,450]], ['attack', [0,.3,.5,.7]]] as const) {
        for (const time of times) {
          const frame = stylizedFrame(direction, pose, pose === 'walk-a' ? time : 0, pose === 'attack' ? time : 0);
          const rect = atlas.frames[frame.key].frame;
          expect(frame.uv[0]).toBeCloseTo((rect.x+.5)/1536); expect(frame.uv[1]).toBeCloseTo(1-(rect.y+rect.h-.5)/1536);
        }
      }
      expect(existsSync(new URL(`../public/assets/hero-stylized-${hero}.webp`, import.meta.url))).toBe(true);
      expect(existsSync(new URL(`../public/assets/hero-portrait-${hero}.webp`, import.meta.url))).toBe(true);
    }
  });
  it('anchors the support line to the feet without an idle displacement', () => {
    expect((.5-.875)*STYLIZED_PLANE_HEIGHT+STYLIZED_ANCHOR_Y+STYLIZED_REST_Y).toBeCloseTo(.12);
  });
});
