import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { heroDirection, hasHeroMotion, motionFrameUv, MOTION_HEROES } from '../src/hero-motion.js';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { hasStylizedMotion } from '../src/stylized-motion.js';

describe('directional hero sprite sheets', () => {
  it('ships one WebP sheet for each sample hero', () => {
    expect(MOTION_HEROES).toHaveLength(25);
    expect(MOTION_HEROES.filter(id => !hasStylizedMotion(id))).toEqual(['h018', 'h01A', 'h01C', 'h03W', 'h01B']);
    for (const heroId of MOTION_HEROES) {
      expect(hasHeroMotion(heroId)).toBe(true);
      const path = new URL(`../public/assets/${hasStylizedMotion(heroId) ? 'hero-stylized' : 'hero-motion'}-${heroId}.webp`, import.meta.url);
      expect(existsSync(path)).toBe(true);
      const header = readFileSync(path).subarray(0, 12);
      expect(header.toString('ascii', 0, 4)).toBe('RIFF');
      expect(header.toString('ascii', 8, 12)).toBe('WEBP');
    }
    expect(hasHeroMotion('h00C')).toBe(true);
    expect(hasHeroMotion('h010')).toBe(false);
  });

  it('maps movement to the camera-relative front, back, left and right', () => {
    expect(heroDirection(0, 1, 0, 1)).toBe('south');
    expect(heroDirection(0, -1, 0, 1)).toBe('north');
    expect(heroDirection(-1, 0, 0, 1)).toBe('east');
    expect(heroDirection(1, 0, 0, 1)).toBe('west');
    expect(heroDirection(1, 0, 1, 0)).toBe('south');
    expect(heroDirection(0, -1, 1, 0)).toBe('west');
  });

  it('matches left/right to actual LH camera projection across camera orientations', () => {
    for (const [cameraX, cameraZ] of [[0, 10], [10, 0], [0, -10], [-10, 0]]) {
      const view = Matrix.LookAtLH(new Vector3(cameraX, 12, cameraZ), Vector3.Zero(), Vector3.Up());
      const origin = Vector3.TransformCoordinates(Vector3.Zero(), view);
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const screen = Vector3.TransformCoordinates(new Vector3(dx, 0, dz), view);
        const screenX = screen.x - origin.x;
        if (Math.abs(screenX) < .001) continue;
        expect(heroDirection(dx, dz, cameraX, cameraZ)).toBe(screenX > 0 ? 'east' : 'west');
      }
    }
  });

  it('gives each direction and pose a distinct UV cell', () => {
    const directions = ['south', 'west', 'north', 'east'] as const;
    const poses = ['idle', 'walk-a', 'walk-b', 'attack', 'cast', 'hit', 'death'] as const;
    const cells = new Set<string>();
    for (const pose of poses) for (const direction of directions) {
      const uv = motionFrameUv('h018', direction, pose);
      expect(uv.every(value => value >= 0 && value <= 1)).toBe(true);
      cells.add(uv.join(','));
    }
    expect(cells.size).toBe(28);
  });

  it('uses painted sheet gutters so the full figure stays in its own frame', () => {
    const front = motionFrameUv('h018', 'south', 'idle');
    const walk = motionFrameUv('h018', 'south', 'walk-a');
    expect(front[1]).toBeCloseTo(1 - 263 / 1659);
    expect(walk[5]).toBeCloseTo(1 - 269 / 1659);
    expect(front[1]).toBeGreaterThan(walk[5]);
    for (const heroId of MOTION_HEROES.filter(id => id !== 'h01B' && !hasStylizedMotion(id))) {
      const cells = new Set<string>();
      for (const pose of ['idle', 'walk-a', 'walk-b', 'attack', 'cast', 'hit', 'death'] as const)
        for (const direction of ['south', 'west', 'north', 'east'] as const) {
          const uv = motionFrameUv(heroId, direction, pose);
          expect(uv.every(value => value >= 0 && value <= 1)).toBe(true);
          expect(uv[0]).toBeLessThan(uv[2]);
          expect(uv[1]).toBeLessThan(uv[5]);
          cells.add(uv.join(','));
        }
      expect(cells.size).toBe(28);
    }
  });
});
