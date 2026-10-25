import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SHENNONG } from '../../../content/shennong-design.js';
import { GROVE_RADIUS_FACTOR, SN_ART } from '../src/visual-shennong-art.js';
import { castPose, EXIT, groveSpread, mistPose, MIST_COUNT, potAlpha, potFrame, rootFrame, shock, streamFade, streamPulse,
  treeGrowth, weakFrame, zoneStartAge } from '../src/visual-shennong-timeline.js';

const metadata = JSON.parse(readFileSync(new URL('../../../assets/vfx-source/shennong/metadata.json', import.meta.url), 'utf8'));
const range = (n: number): number[] => Array.from({ length: n }, (_, i) => i);

describe('Thần Nông art metrics', () => {
  it('match the realigned atlases written by assets/vfx-source/shennong/process-art.py', () => {
    const pairs = [['potFg', 'herbal-cauldron-eruption-sheet'], ['pot', 'herbal-cauldron-eruption-sheet'], ['mist', 'herbal-mist-sheet'],
      ['weak', 'herbal-weakness-sheet'], ['roots', 'ancient-root-emergence-sheet']] as const;
    for (const [slot, asset] of pairs) {
      const def = SN_ART[slot], meta = metadata[asset];
      expect([def.columns, def.rows, def.width, def.height], slot).toEqual([meta.columns, meta.rows, meta.width, meta.height]);
      if (slot !== 'roots') expect(def.anchorY, slot).toBeCloseTo(meta.anchorY, 5);
    }
  });
  it('treats the weakness sheet as the 8x4 grid it was drawn in (32 frames: in, loop, out)', () => {
    expect(SN_ART.weak.columns * SN_ART.weak.rows).toBe(32);
    expect(metadata['herbal-weakness-sheet'].frames).toBe(32);
  });
  it('keeps the grove decal inside the gameplay radius', () => {
    const full = groveSpread(5, 3, false);
    expect(SHENNONG.zoneRadius * 2 * full.scale / GROVE_RADIUS_FACTOR * GROVE_RADIUS_FACTOR / 2).toBeLessThanOrEqual(SHENNONG.zoneRadius);
    for (const age of [0, .2, .5, 1, 4]) expect(groveSpread(age, 5, false).scale).toBeLessThanOrEqual(1);
  });
});

describe('Thần Nông timeline', () => {
  it('drops the vessel during the windup and lands it with the lid still shut or cracking (frames 0-1)', () => {
    expect(castPose(0, .25, false).lift).toBeGreaterThan(castPose(.25, .25, false).lift);
    expect(castPose(.25, .25, false).lift).toBeCloseTo(0);
    for (const age of [0, .1, .25, .6]) expect([0, 1]).toContain(castPose(age, .25, false).frame);
    expect(castPose(.2, .25, true).lift).toBe(0);
  });
  it('runs the eruption through frames 2-11, settles through 12-15 and loops steam frames while held', () => {
    const erupt = range(40).map(i => potFrame(i * .02, 5, false));
    expect(erupt[0]).toBe(2);
    expect(Math.max(...erupt.slice(0, 41))).toBeLessThanOrEqual(15);
    for (let i = 1; i < erupt.length; i++) expect(erupt[i], `step ${i}`).toBeGreaterThanOrEqual(erupt[i - 1]);
    for (const age of [1.5, 2.2, 3.1, 4.4]) expect([13, 14, 15]).toContain(potFrame(age, 5.5 - age, false));
    expect(potFrame(3, EXIT * .5, false)).toBe(15);
    expect(potFrame(.2, 5, true)).toBe(14);
  });
  it('fades the vessel only with the exit', () => {
    expect(potAlpha(5)).toBe(1);
    expect(potAlpha(EXIT * .35)).toBeCloseTo(.5);
    expect(potAlpha(0)).toBe(0);
  });
  it('races the medicine wave to full radius and then removes it', () => {
    expect(shock(0, false).radius).toBe(0);
    expect(shock(.2, false).radius).toBeGreaterThan(.5);
    expect(shock(.5, false).alpha).toBe(0);
    expect(shock(.1, true).radius).toBe(1);
  });
  it('spreads the grove from the vessel, never past the radius, and closes with remaining', () => {
    expect(groveSpread(.1, 5.3, false).scale).toBeLessThan(groveSpread(.6, 4.8, false).scale);
    expect(groveSpread(3, 5, false)).toEqual({ scale: 1, alpha: 1 });
    expect(groveSpread(5.2, 0, false).alpha).toBe(0);
    expect(groveSpread(.01, 5, true).scale).toBe(1);
  });
  it('holds mist columns on the ring with the centre clear, then draws them back into the vessel', () => {
    for (let k = 0; k < MIST_COUNT; k++) {
      const held = mistPose(k, 3, 3, SHENNONG.zoneRadius, false);
      expect(Math.hypot(held.x, held.z)).toBeGreaterThan(SHENNONG.zoneRadius * .5);
      expect(Math.hypot(held.x, held.z)).toBeLessThan(SHENNONG.zoneRadius);
      expect(held.alpha).toBeGreaterThan(.5);
      const closing = mistPose(k, 5.3, .05, SHENNONG.zoneRadius, false);
      expect(Math.hypot(closing.x, closing.z)).toBeLessThan(Math.hypot(held.x, held.z) * .4);
      expect(closing.alpha).toBeLessThan(.1);
      expect(mistPose(k, .05, 5.4, SHENNONG.zoneRadius, false).alpha).toBe(0);
      expect(held.frame).toBeGreaterThanOrEqual(0);
      expect(held.frame).toBeLessThan(8);
    }
  });
  it('bursts roots (0-3), loops 4-11 and retracts 12-15 inside the exit; reconnect joins the loop', () => {
    expect(rootFrame(0, 5.5, false)).toBe(0);
    expect(rootFrame(.3, 5.2, false)).toBe(3);
    for (const age of [.4, 1, 2.3, 4.7]) {
      const frame = rootFrame(age, 5.5 - age, false);
      expect(frame).toBeGreaterThanOrEqual(4);
      expect(frame).toBeLessThanOrEqual(11);
    }
    expect(rootFrame(5.2, .3, false)).toBeGreaterThanOrEqual(12);
    expect(rootFrame(5.49, .01, false)).toBe(15);
    expect(rootFrame(3, 2.5, true)).toBe(8);
  });
  it('raises the tree actor from a sprout and leaves a reconnecting tree fully grown', () => {
    expect(treeGrowth(0, false)).toBeLessThan(.3);
    expect(treeGrowth(.3, false)).toBeGreaterThan(.6);
    expect(treeGrowth(3, false)).toBe(1);
    expect(treeGrowth(0, true)).toBe(1);
  });
  it('plays the weakness sheet as wilt-in 0-7, loop 8-23, fade 24-31', () => {
    expect(weakFrame(0, undefined, false)).toBe(0);
    expect(weakFrame(.31, undefined, false)).toBe(7);
    for (const age of [.4, 1, 2.7, 9]) {
      expect(weakFrame(age, undefined, false)).toBeGreaterThanOrEqual(8);
      expect(weakFrame(age, undefined, false)).toBeLessThanOrEqual(23);
    }
    expect(weakFrame(5, 0, false)).toBe(24);
    expect(weakFrame(5, .3, false)).toBe(31);
    expect(weakFrame(5, undefined, true)).toBe(12);
  });
  it('pulses the life stream: head leads, tail follows, silent between pulses, faded in and out', () => {
    for (const clock of range(60).map(i => i * .05)) {
      const pulse = streamPulse(clock, .2);
      expect(pulse.head).toBeGreaterThanOrEqual(0);
      expect(pulse.head).toBeLessThanOrEqual(1);
      expect(pulse.tail).toBeLessThanOrEqual(pulse.head);
      expect(pulse.alpha).toBeGreaterThanOrEqual(0);
      expect(pulse.alpha).toBeLessThanOrEqual(1);
    }
    expect(streamFade(0, 5)).toBe(0);
    expect(streamFade(1, 5)).toBe(1);
    expect(streamFade(3, EXIT / 2)).toBeCloseTo(.5);
  });
  it('joins a late snapshot mid-hold instead of replaying the burst', () => {
    expect(zoneStartAge(SHENNONG.zoneSeconds)).toBe(0);
    expect(zoneStartAge(2)).toBeCloseTo(SHENNONG.zoneSeconds - 2);
    expect(zoneStartAge(99)).toBe(0);
  });
});
