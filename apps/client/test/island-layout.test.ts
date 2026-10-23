import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ARENA, BOSS_SPAWN, enemyRoute, enemyRouteFor, laneCenters } from '../../../packages/game-core/src/battlefield-layout.js';

interface Part { positions: number[]; indices: number[]; uvs2?: number[] }
interface Island { top: Part; cliff: Part; rocks?: { centre: number[]; top: number; positions: number[]; indices: number[] }[]; meta?: { waterfalls?: { x: number; z: number }[] } }
const load = (name: string): Island => JSON.parse(readFileSync(new URL(`../public/assets/terrain/island-${name}.json`, import.meta.url), 'utf8'));

/** Distance from the island edge (uv2.x, world units) at an (x, z) on the flat top; null if off the mesh. */
function edgeDistance(top: Part, x: number, z: number): number | null {
  const p = top.positions, e = top.uvs2!;
  for (let t = 0; t < top.indices.length; t += 3) {
    const [a, b, c] = [top.indices[t], top.indices[t + 1], top.indices[t + 2]];
    const [ax, az, bx, bz, cx, cz] = [p[a * 3], p[a * 3 + 2], p[b * 3], p[b * 3 + 2], p[c * 3], p[c * 3 + 2]];
    const det = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
    if (Math.abs(det) < 1e-9) continue;
    const u = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / det;
    const v = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / det;
    if (u < -1e-6 || v < -1e-6 || u + v > 1 + 1e-6) continue;
    return u * e[a * 2] + v * e[b * 2] + (1 - u - v) * e[c * 2];
  }
  return null;
}

const MIN_RIM = 4; // grass rim width: the commandable ground must stay clear of it

describe('floating island meshes', () => {
  it('main: valid indexed geometry with the walkable top flat at y = 0', () => {
    const { top, cliff } = load('main');
    for (const part of [top, cliff]) {
      expect(part.positions.length % 3).toBe(0);
      expect(Math.max(...part.indices)).toBeLessThan(part.positions.length / 3);
      expect(part.positions.every(Number.isFinite)).toBe(true);
    }
    const flat = top.positions.filter((_, i) => i % 3 === 1).filter((_, i) => top.uvs2![i * 2] >= 1);
    expect(Math.max(...flat.map(Math.abs))).toBe(0);
    const cliffTops = cliff.positions.filter((_, i) => i % 3 === 1);
    expect(Math.max(...cliffTops)).toBeLessThan(0);
    const { rocks = [], meta } = load('main');
    const rockTris = rocks.reduce((sum, rock) => sum + rock.indices.length / 3, 0);
    expect(top.indices.length / 3 + cliff.indices.length / 3 + rockTris).toBeLessThanOrEqual(15000);
    // Satellite rocks stay below the playable top and outside the island footprint.
    for (const rock of rocks) {
      expect(rock.top).toBeLessThan(0);
      expect(edgeDistance(top, rock.centre[0], rock.centre[2])).toBeNull();
    }
    // Waterfalls start on the island edge, outside the commandable ground.
    for (const fall of meta?.waterfalls ?? []) expect(edgeDistance(top, fall.x, fall.z) ?? 0).toBeLessThan(1);
  });

  it('main: ARENA corners, lane gates, boss center road, routes and the shrine sit on dirt, clear of the rim', () => {
    const { top } = load('main');
    const points: [number, number][] = [
      [ARENA.minX, ARENA.minZ], [ARENA.maxX, ARENA.minZ], [ARENA.minX, ARENA.maxZ], [ARENA.maxX, ARENA.maxZ],
      [BOSS_SPAWN.x, BOSS_SPAWN.z],
      [0, 31], [0, 37], [-11, 37], [11, 37], [-9.5, 42], [9.5, 42],
    ];
    for (const p of enemyRouteFor(['p1'], 'party')) points.push([p.x, p.z]);
    for (let lanes = 1; lanes <= 4; lanes++) {
      for (const x of laneCenters(lanes)) points.push([x - 5.5, -39], [x + 5.5, -39], [x, -39]);
      for (let lane = 0; lane < lanes; lane++) for (const p of enemyRoute(lanes, lane)) points.push([p.x, p.z]);
    }
    for (const [x, z] of points) {
      const edge = edgeDistance(top, x, z);
      expect(edge, `(${x}, ${z}) must be on the island`).not.toBeNull();
      expect(edge!, `(${x}, ${z}) must be clear of the rim`).toBeGreaterThanOrEqual(MIN_RIM - .35);
    }
  });
});
