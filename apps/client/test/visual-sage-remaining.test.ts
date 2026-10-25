import { describe, expect, it } from 'vitest';
import { baguaPhase, isBaguaLink } from '../src/visual-fuxi-remaining.js';
import { grovePhase, treeFrames } from '../src/visual-shennong-remaining.js';
import { chargeArtFrame } from '../src/visual-nuwa-charge-art.js';

describe('sage ultimate snapshot contracts', () => {
  it('holds the prepared art pose while waiting for a delayed resolve without entering impact frames', () => {
    expect(chargeArtFrame(0, .25, 0, 2, false)).toBe(0);
    expect(chargeArtFrame(.4, .25, 0, 2, false)).toBe(2);
    expect(chargeArtFrame(1.2, .25, 0, 2, false)).toBe(2);
    expect(chargeArtFrame(1.3, .25, 0, 2, false)).toBeUndefined();
    expect(chargeArtFrame(.4, .25, 0, 2, true)).toBe(1);
  });
  it('keeps authoritative radius while remaining time enters closure', () => {
    expect(baguaPhase(4, 5)).toEqual({ size: 8, closing: false });
    expect(baguaPhase(4, .3)).toEqual({ size: 8, closing: true });
    expect(grovePhase(6, .4)).toEqual({ size: 12, closing: true });
    expect(grovePhase(6, 2)).toEqual({ size: 12, closing: false });
  });
  it('rejects inactive or invalid snapshot markers', () => {
    for (const invalid of [0, -1, NaN, Infinity]) {
      expect(baguaPhase(9.5, invalid)).toBeUndefined();
      expect(grovePhase(invalid, 2)).toBeUndefined();
      expect(treeFrames(invalid)).toBeUndefined();
    }
  });
  it('does not attribute the normal attack soul link to Bagua', () => {
    expect(isBaguaLink(4, .35)).toBe(false);
    expect(isBaguaLink(2, .6)).toBe(true);
    expect(isBaguaLink(0, .6)).toBe(false);
  });
  it('does not replay tree emergence on reconnect during hold', () => {
    expect(treeFrames(5.5)).toEqual({ startFrame: 0, endFrame: 0 });
    expect(treeFrames(3)).toEqual({ startFrame: 7, endFrame: 7 });
    expect(treeFrames(.2)).toEqual({ startFrame: 14, endFrame: 14 });
    expect(treeFrames(.01)).toEqual({ startFrame: 15, endFrame: 15 });
  });
});
