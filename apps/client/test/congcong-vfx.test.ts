import { describe, expect, it } from 'vitest';
import { CONGCONG as C } from '../../../content/congcong-design.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { CongcongTracker } from '../src/battlefield-congcong.js';
import { BUZHOU_BREAK_SECONDS, blackIceShatter, blackIceSpread, buzhouFrame, cleaveDirection, cleaveSweep, CLEAVE_LIFE, iceCageFrame,
  ICE_SHATTER, splashFrame, SPLASH_LIFE, TSUNAMI_CRASH_END, TSUNAMI_EXPAND, TSUNAMI_LIFE, tsunamiCrash, tsunamiHeight,
  tsunamiRadius } from '../src/visual-congcong-timeline.js';

describe('Cộng Công VFX timeline', () => {
  it('raises and cracks Bất Chu Sơn across the windup, then breaks only after the server impact', () => {
    expect(buzhouFrame(0, C.windup)).toBe(0);
    expect(buzhouFrame(.3, C.windup)).toBeLessThanOrEqual(5);
    expect(buzhouFrame(C.windup - .01, C.windup)).toBe(9);
    // Late impact: the mountain holds its fully cracked frame instead of breaking early.
    expect(buzhouFrame(C.windup + .3, C.windup)).toBe(9);
    expect(buzhouFrame(C.windup, C.windup, C.windup)).toBe(10);
    expect(buzhouFrame(C.windup + BUZHOU_BREAK_SECONDS, C.windup, C.windup)).toBe(15);
    expect(buzhouFrame(C.windup + 5, C.windup, C.windup)).toBe(15);
  });

  it('expands the tsunami crest monotonically to exactly the server wave radius', () => {
    let previous = 0;
    for (let age = 0; age <= TSUNAMI_LIFE; age += .02) {
      const radius = tsunamiRadius(age, C.waveRadius);
      expect(radius).toBeGreaterThanOrEqual(previous);
      expect(radius).toBeLessThanOrEqual(C.waveRadius);
      previous = radius;
    }
    expect(tsunamiRadius(TSUNAMI_EXPAND, C.waveRadius)).toBe(C.waveRadius);
    expect(tsunamiCrash(TSUNAMI_EXPAND)).toBe(0);
    expect(tsunamiCrash(TSUNAMI_CRASH_END)).toBeCloseTo(1);
    expect(tsunamiHeight(TSUNAMI_LIFE)).toBeCloseTo(0);
  });

  it('holds black ice for the full server freeze and shatters only at its end', () => {
    expect(blackIceSpread(TSUNAMI_EXPAND)).toBe(1);
    expect(blackIceShatter(C.iceVisualSeconds - ICE_SHATTER - .01, C.iceVisualSeconds)).toBe(0);
    expect(blackIceShatter(C.iceVisualSeconds, C.iceVisualSeconds)).toBeCloseTo(1);
  });

  it('plays splash, ice cage and cleave frames inside their atlases', () => {
    expect(splashFrame(0)).toBe(0);
    expect(splashFrame(SPLASH_LIFE)).toBe(10);
    expect(iceCageFrame(0)).toBe(0);
    for (let age = .25; age < 3; age += .07) {
      const frame = iceCageFrame(age);
      expect(frame).toBeGreaterThanOrEqual(4);
      expect(frame).toBeLessThanOrEqual(8);
    }
    expect(iceCageFrame(.9, .9)).toBe(9);
    expect(iceCageFrame(1.2, .9)).toBe(11);
    expect(cleaveSweep(0)).toEqual({ head: 0, tail: 0 });
    expect(cleaveSweep(CLEAVE_LIFE)).toEqual({ head: 1, tail: 1 });
  });
});

describe('Cộng Công cleave direction', () => {
  it('faces the server direction, or the struck enemy when the event has none — never a fixed axis', () => {
    const origin = { x: 10, z: 10 };
    expect(cleaveDirection({ direction: { x: 0, z: -1 } }, origin)).toEqual({ x: 0, z: -1 });
    const derived = cleaveDirection({ x: 7, z: 6 }, origin)!;
    expect(derived.x).toBeCloseTo(-.6);
    expect(derived.z).toBeCloseTo(-.8);
    expect(cleaveDirection({}, origin)).toBeUndefined();
    expect(cleaveDirection({ x: 10, z: 10 }, origin)).toBeUndefined();
  });
});

describe('Cộng Công freeze routing', () => {
  const wave = (targets: string[]): GameEvent => ({ id: 1, kind: 'ability', skillId: 'skill-h01G', targets });

  it('cages only wave targets that the snapshot still marks as frozen, and expires', () => {
    let now = 10;
    const tracker = new CongcongTracker(() => now);
    tracker.record(wave(['e1']));
    expect(tracker.cage('e1', 'frost')).toBe(true);
    expect(tracker.cage('e1', 'slow')).toBe(false);
    expect(tracker.cage('e2', 'frost')).toBe(false);
    now += C.iceVisualSeconds + 1;
    expect(tracker.cage('e1', 'frost')).toBe(false);
  });

  it('debug replay forces cages and wards without snapshot status, then clears', () => {
    const now = 0;
    const tracker = new CongcongTracker(() => now);
    tracker.force(['e1'], ['h1']);
    expect(tracker.cage('e1', undefined)).toBe(true);
    expect(tracker.ward('h1')).toBe(true);
    tracker.clear();
    expect(tracker.cage('e1', undefined)).toBe(false);
    expect(tracker.ward('h1')).toBe(false);
  });
});
