import type { Vec } from '../../contracts/src/types.js';

export const ARENA = { minX: -44, maxX: 44, minZ: -36, maxZ: 28 } as const;

/** Shared center-road spawn point for wave 5/10/15/20 bosses (`owner: 'party'`). */
export const BOSS_SPAWN = { x: 0, z: -22 } as const;

export function withinArena(x: number, z: number): boolean {
  return Number.isFinite(x) && Number.isFinite(z)
    && x >= ARENA.minX && x <= ARENA.maxX && z >= ARENA.minZ && z <= ARENA.maxZ;
}

export function withinZone(_zone: number, x: number, z: number): boolean {
  return withinArena(x, z);
}

/** Nearest walkable point of the arena; points already inside are returned unchanged. */
export function clampToZone(_zone: number, point: Vec): Vec {
  return {
    x: Math.max(ARENA.minX, Math.min(ARENA.maxX, point.x)),
    z: Math.max(ARENA.minZ, Math.min(ARENA.maxZ, point.z)),
  };
}

const CENTERS: Record<number, number[]> = {
  1: [0], 2: [-20, 20], 3: [-30, 0, 30], 4: [-30, -10, 10, 30],
};

export function laneCenters(count: number): number[] {
  return CENTERS[Math.max(1, Math.min(4, count))];
}

export function enemyRoute(count: number, lane: number, startX?: number): Vec[] {
  const x = startX ?? laneCenters(count)[lane] ?? 0;
  return count === 1
    ? [{ x, z: -34 }, { x: 0, z: 27 }]
    : [{ x, z: -34 }, { x, z: -22 }, { x: 0, z: 5 }, { x: 0, z: 27 }];
}

export function enemyRouteFor(players: readonly string[], owner: string): Vec[] {
  const count = Math.max(1, players.length);
  if (owner === 'party') return enemyRoute(count, 0, 0);
  return enemyRoute(count, Math.max(0, players.indexOf(owner)));
}

export function deploymentPosition(count: number, lane: number, slot: number): Vec {
  const spread = (lane - (count - 1) / 2) * 15;
  return { x: Math.max(-40, Math.min(40, spread + (slot % 3 - 1) * 3.2)), z: 9 + Math.floor(slot / 3) * 4 };
}
