import { describe, expect, it } from 'vitest';
import { arcHeight, EASE_OUT_KEYS, fadeOut, motion, piecewise, segmentFrame, sweep, unitDirection } from '../src/visual-kit-timeline.js';

describe('kit timeline helpers', () => {
  it('interpolates piecewise keys and clamps outside them', () => {
    const keys = [[0, 0], [.5, 10], [1, 20]] as const;
    expect(piecewise(keys, -1)).toBe(0);
    expect(piecewise(keys, .25)).toBeCloseTo(5);
    expect(piecewise(keys, .75)).toBeCloseTo(15);
    expect(piecewise(keys, 2)).toBe(20);
    expect(piecewise([], .3)).toBe(0);
  });

  it('keeps the authored ease-out reference keys', () => {
    expect(motion.easeOut(0)).toBe(0);
    expect(motion.easeOut(.25)).toBeCloseTo(.45);
    expect(motion.easeOut(.5)).toBeCloseTo(.72);
    expect(motion.easeOut(1)).toBe(1);
    expect(motion.easeOut(4)).toBe(1);
    expect(EASE_OUT_KEYS).toHaveLength(5);
  });

  it('plays atlas segments and holds the last frame', () => {
    expect(segmentFrame(0, 10, 6, .075)).toBe(10);
    expect(segmentFrame(.16, 10, 6, .075)).toBe(12);
    expect(segmentFrame(99, 10, 6, .075)).toBe(15);
    expect(segmentFrame(-1, 10, 6, .075)).toBe(10);
  });

  it('sweeps, fades and arcs within 0..1', () => {
    expect(sweep(0, .08, .26)).toBe(0);
    expect(sweep(.21, .08, .26)).toBeCloseTo(.5);
    expect(sweep(9, .08, .26)).toBe(1);
    expect(fadeOut(0, 1, 2)).toBe(1);
    expect(fadeOut(2, 1, 2)).toBeCloseTo(.5);
    expect(fadeOut(9, 1, 2)).toBe(0);
    expect(arcHeight(0, 2)).toBe(0);
    expect(arcHeight(.5, 2)).toBe(2);
    expect(arcHeight(1, 2)).toBe(0);
    expect(arcHeight(3, 2)).toBe(0);
  });

  it('derives the unit direction from the server value or caster to event point, never a fixed axis', () => {
    expect(unitDirection({ direction: { x: 3, z: 4 } }, { x: 0, z: 0 })).toEqual({ x: .6, z: .8 });
    expect(unitDirection({ x: 5, z: 1 }, { x: 5, z: -1 })).toEqual({ x: 0, z: 1 });
    expect(unitDirection({}, { x: 0, z: 0 })).toBeUndefined();
    expect(unitDirection({ x: 1, z: 1 }, { x: 1, z: 1 })).toBeUndefined();
  });

  it('motion presets: anticipate dips then arrives, overshoot passes 1 then returns, all end at 1', () => {
    expect(motion.anticipate(0)).toBeCloseTo(0);
    expect(Math.min(...Array.from({ length: 21 }, (_, i) => motion.anticipate(i / 20)))).toBeLessThan(0);
    expect(motion.anticipate(1)).toBeCloseTo(1);
    expect(motion.launch(.5)).toBeLessThan(.5);
    expect(motion.launch(1)).toBe(1);
    expect(Math.max(...Array.from({ length: 21 }, (_, i) => motion.impactOvershoot(i / 20)))).toBeGreaterThan(1);
    expect(motion.impactOvershoot(1)).toBeCloseTo(1);
    expect(motion.settle(.5)).toBeGreaterThan(.5);
    expect(motion.settle(0)).toBe(0);
    expect(motion.settle(1)).toBe(1);
  });
});
