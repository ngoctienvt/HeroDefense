import { describe, expect, it } from 'vitest';
import {
  createMotionTrack, INTERPOLATION_DELAY, MAX_EXTRAPOLATION, pushMotionSample, sampleMotionTrack,
  TELEPORT_DISTANCE, updateMovingState,
} from '../src/actor-interpolation.js';
import { monsterMotionFrame } from '../src/monster-motion.js';
import { swingProgress } from '../src/visual-actors.js';

describe('snapshot interpolation', () => {
  it('moves at constant speed between 10 Hz snapshots instead of run-stop easing', () => {
    const track = createMotionTrack(0, 0, 0);
    for (let n = 1; n <= 5; n++) pushMotionSample(track, n * .1, n * .15, 0);
    const positions = [.30, .32, .34, .36, .38].map(now => sampleMotionTrack(track, now + INTERPOLATION_DELAY).x);
    const steps = positions.slice(1).map((x, index) => x - positions[index]);
    for (const step of steps) expect(step).toBeCloseTo(.03, 5);
    expect(sampleMotionTrack(track, .3 + INTERPOLATION_DELAY).vx).toBeCloseTo(1.5);
  });

  it('extrapolates briefly past the newest snapshot, then holds', () => {
    const track = createMotionTrack(0, 0, 0);
    pushMotionSample(track, .1, 1, 0);
    const newest = .1 + INTERPOLATION_DELAY;
    expect(sampleMotionTrack(track, newest + MAX_EXTRAPOLATION / 2).x).toBeCloseTo(1.5);
    const held = sampleMotionTrack(track, newest + 1);
    expect(held.x).toBeCloseTo(1 + MAX_EXTRAPOLATION * 10);
    expect(held.vx).toBe(0);
  });

  it('snaps on teleports instead of sliding across the map', () => {
    const track = createMotionTrack(0, 0, 0);
    expect(pushMotionSample(track, .1, TELEPORT_DISTANCE + 1, 0)).toBe(true);
    expect(sampleMotionTrack(track, .5).x).toBe(TELEPORT_DISTANCE + 1);
    expect(pushMotionSample(track, .2, TELEPORT_DISTANCE + 1.5, 0)).toBe(false);
  });

  it('switches walk/idle with hysteresis so a crowd does not flicker', () => {
    const track = createMotionTrack(0, 0, 0);
    expect(updateMovingState(track, .3, .016)).toBe(true);
    expect(updateMovingState(track, .05, .05)).toBe(true);
    expect(updateMovingState(track, .2, .05)).toBe(true);
    expect(updateMovingState(track, .05, .05)).toBe(true);
    expect(updateMovingState(track, .05, .1)).toBe(false);
    expect(updateMovingState(track, .2, .016)).toBe(false);
  });
});

describe('monster swing presentation', () => {
  it('holds the anticipation cell through the wind-up and starts the strike on the impact cell', () => {
    for (const local of [0, .5, 1]) {
      const progress = swingProgress({ action: 'attack', attackPhase: 'windup' }, local);
      expect(monsterMotionFrame('attack', 0, progress, false)).toBe(3);
    }
    for (const local of [0, .5, 1]) {
      const progress = swingProgress({ action: 'attack', attackPhase: 'strike' }, local);
      expect(monsterMotionFrame('attack', 0, progress, false)).toBe(4);
    }
    expect(swingProgress({ action: 'attack' }, .3)).toBe(.3);
  });
});
