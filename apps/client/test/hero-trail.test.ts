import { describe, expect, it } from 'vitest';
import { catmullRom, trailActive, TRAIL_FOLLOW, TRAIL_LEAD } from '../src/hero-trail-timeline.js';

describe('3D hero weapon trail', () => {
  it('samples only the attack clip, from just before the wind-up peak to a little after the hit', () => {
    expect(trailActive('walk', .5, .3, .5)).toBe(false);
    expect(trailActive('idle', .5, .3, .5)).toBe(false);
    expect(trailActive('attack', .3 - TRAIL_LEAD - .01, .3, .5)).toBe(false);
    expect(trailActive('attack', .3 - TRAIL_LEAD, .3, .5)).toBe(true);
    expect(trailActive('attack', .5 + TRAIL_FOLLOW, .3, .5)).toBe(true);
    expect(trailActive('attack', .5 + TRAIL_FOLLOW + .01, .3, .5)).toBe(false);
    expect(trailActive('attack', Number.NaN, .3, .5)).toBe(false);
  });

  it('smooths between samples and passes through them', () => {
    const a = { x: 0, y: 0, z: 0 }, b = { x: 1, y: 0, z: 0 }, c = { x: 2, y: 1, z: 0 }, d = { x: 3, y: 1, z: 1 };
    const out = new Float32Array(3);
    catmullRom(a, b, c, d, 0, out, 0);
    expect([...out]).toEqual([1, 0, 0]);
    catmullRom(a, b, c, d, 1, out, 0);
    expect(out[0]).toBeCloseTo(2, 5); expect(out[1]).toBeCloseTo(1, 5); expect(out[2]).toBeCloseTo(0, 5);
  });
});
