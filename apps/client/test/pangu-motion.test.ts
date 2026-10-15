import { describe, expect, it } from 'vitest';
import atlas from '../src/pangu-atlas.json';
import { motionFrameUv } from '../src/hero-motion.js';
import { panguFrame, PANGU_ANCHOR_OFFSET_Y, PANGU_REST_Y, PANGU_PLANE_HEIGHT } from '../src/pangu-motion.js';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector.js';

describe('Pangu atlas animation', () => {
  it('keeps 48 source frames and selects still idle plus animated walk and attack', () => {
    const seen = new Set<string>();
    for (const direction of ['south', 'west', 'north', 'east'] as const) {
      for (const [pose, times] of [['idle', [0, 220, 440, 660]], ['walk-a', [0, 140, 280, 420]]] as const) {
        for (const time of times) seen.add(panguFrame(direction, pose, time).key);
      }
      for (const progress of [0, .3, .5, 1]) seen.add(panguFrame(direction, 'attack', 0, progress).key);
    }
    expect(seen.size).toBe(36);
    expect(Object.keys(atlas.animations)).toHaveLength(12);
    expect(Object.keys(atlas.frames)).toHaveLength(48);
  });

  it('holds exactly the same idle frame and UVs for any elapsed time', () => {
    for (const direction of ['south', 'west', 'north', 'east'] as const) {
      const resting = panguFrame(direction, 'idle');
      for (const time of [0, 219, 220, 440, 660, 879, 10000]) {
        expect(panguFrame(direction, 'idle', time)).toEqual(resting);
      }
    }
  });

  it('loops locomotion and clamps attacks to their final recovery frame', () => {
    expect(panguFrame('south', 'idle', 880).key).toBe('south-idle-00');
    expect(panguFrame('west', 'walk-b', 560).key).toBe('west-walk-00');
    expect(panguFrame('east', 'attack', 0, 2).key).toBe('east-attack-03');
    expect(panguFrame('north', 'attack', 0, -1).key).toBe('north-attack-00');
    expect(panguFrame('south', 'idle', NaN).key).toBe('south-idle-00');
  });

  it('reuses attack for casting and a resting frame for unavailable poses', () => {
    expect(panguFrame('south', 'cast', 0, .5).key).toBe('south-attack-02');
    for (const pose of ['hit', 'death'] as const) {
      expect(panguFrame('north', pose, 660, 1).key).toBe('north-idle-00');
    }
    expect(panguFrame('west', 'walk-a', 420, 0, true).key).toBe('west-walk-00');
    expect(panguFrame('east', 'attack', 0, .1, true).key).toBe('east-attack-02');
  });

  it('keeps UV rectangles within the atlas and the declared feet origin above ground', () => {
    for (const direction of ['south', 'west', 'north', 'east'] as const) {
      const frame = panguFrame(direction, 'idle');
      expect(frame.uv.every(value => value >= 0 && value <= 1)).toBe(true);
      expect(frame.uv[0]).toBeLessThan(frame.uv[2]);
      expect(frame.uv[1]).toBeLessThan(frame.uv[5]);
      expect(motionFrameUv('h01B', direction, 'idle')).toEqual(frame.uv);
    }
    const localFeetY = (.5 - atlas.meta.anchor[1] / atlas.meta.cellSize) * PANGU_PLANE_HEIGHT + PANGU_ANCHOR_OFFSET_Y;
    for (const tilt of [0, .66, Math.PI / 2]) {
      const feet = Vector3.TransformCoordinates(new Vector3(0, localFeetY, 0), Matrix.RotationX(tilt));
      expect(feet.y + PANGU_REST_Y).toBeCloseTo(.12);
      expect(feet.z).toBeCloseTo(0);
    }
  });
});
