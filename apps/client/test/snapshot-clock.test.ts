import { describe, expect, it } from 'vitest';
import {
  createMotionTrack, INTERPOLATION_DELAY, pushMotionSample, sampleMotionTrack, SnapshotClock, updateMovingState,
} from '../src/actor-interpolation.js';
import { belowTop } from '../src/visual-terrain-clouds.js';

/** Snapshots every 100 ms of server time; `arrivals` are their local receive times (seconds). */
function stamps(arrivals: number[], speed = 1): number[] {
  const clock = new SnapshotClock();
  return arrivals.map((at, i) => clock.stamp(at, i * .1 * speed, speed));
}

describe('snapshot clock for jittery networks', () => {
  it('keeps even 100 ms spacing when packets arrive in bursts', () => {
    // 2nd and 4th packets are late and land in the same frame as the next one.
    const result = stamps([1.0, 1.2, 1.2, 1.4, 1.4, 1.5]);
    for (let i = 1; i < result.length; i++) expect(result[i] - result[i - 1]).toBeGreaterThan(.05);
    expect(result.at(-1)! - result[0]).toBeCloseTo(.5, 1);
  });

  it('keeps a walker in the walk pose through a burst instead of flipping to idle', () => {
    const clock = new SnapshotClock();
    const track = createMotionTrack(0, 0, 1);
    // Walking 3 units/s; packets 3 and 5 are held back and arrive with the next one.
    const arrivals = [1.0, 1.1, 1.3, 1.3, 1.5, 1.5, 1.6, 1.7, 1.8, 1.9];
    let pushed = 0, idleFrames = 0;
    for (let now = 1.0; now <= 1.9; now += 1 / 60) {
      while (pushed < arrivals.length && arrivals[pushed] <= now + 1e-9) {
        pushMotionSample(track, clock.stamp(arrivals[pushed], pushed * .1, 1), pushed * .3, 0); pushed++;
      }
      const pose = sampleMotionTrack(track, now - clock.extraDelay);
      const moving = updateMovingState(track, Math.hypot(pose.vx, pose.vz), 1 / 60);
      if (!moving && now > 1.1 + INTERPOLATION_DELAY) idleFrames++;
    }
    expect(idleFrames).toBe(0);
  });

  it('accounts for game speed and never stamps backwards', () => {
    const result = stamps([1.0, 1.1, 1.2, 1.15, 1.4], 4);
    for (let i = 1; i < result.length; i++) expect(result[i]).toBeGreaterThan(result[i - 1]);
    expect(result[2] - result[0]).toBeCloseTo(.2, 1);
  });

  it('re-anchors after a long stall or a paused simulation', () => {
    const clock = new SnapshotClock();
    clock.stamp(1, 0, 1); clock.stamp(1.1, .1, 1);
    expect(clock.stamp(10, .2, 1)).toBeCloseTo(10, 5);
    expect(clock.stamp(20, .2, 1)).toBeCloseTo(20, 5);
  });
});

describe('sky sprites stay under the island top', () => {
  it('keeps a camera-facing quad and its bob below y = 0', () => {
    for (const size of [24, 52, 140]) expect(belowTop(size, 0) + size / 2 + 1).toBeLessThan(0);
  });
});
