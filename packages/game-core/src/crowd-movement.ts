import type { Enemy, Unit, Vec } from '../../contracts/src/types.js';
import { clampToZone } from './battlefield-layout.js';
import { SpatialGrid } from './spatial-grid.js';

export const MONSTER_ROW_SPACING = 3.3;

export function unitRadius(unit: Unit): number {
  if (unit.summonKind === 'ancient-tree') return 1.3;
  return (unit.block && unit.block > 0) ? 0.9 : 0.7;
}

export function unitSpacingRadius(unit: Unit): number {
  return unitRadius(unit);
}

/** Distance between body centers when an enemy and a unit can meet without overlapping. */
export function contactDistance(unit: Unit, enemy: Enemy): number {
  return unitSpacingRadius(unit) + enemySpacingRadius(enemy);
}

/** Separate settled bodies, allowing walkers to cross without being pushed sideways. */
export function resolveUnitCollisions(units: Iterable<Unit>, moving: ReadonlySet<string> = new Set()): void {
  const active = Array.from(units).filter(unit => unit.hp > 0 && unit.respawn <= 0
    && (unit.slot >= 0 || unit.summonDuration !== undefined));
  for (let pass = 0; pass < 2; pass++) for (let i = 0; i < active.length; i++) {
    const first = active[i];
    for (let j = i + 1; j < active.length; j++) {
      const second = active[j];
      if (first.zone !== second.zone || moving.has(first.id) || moving.has(second.id)) continue;
      const dx = second.x - first.x, dz = second.z - first.z;
      const minDistance = unitRadius(first) + unitRadius(second);
      const distance = Math.hypot(dx, dz);
      if (distance >= minDistance) continue;
      const nx = distance > .0001 ? dx / distance : first.id < second.id ? -1 : 1;
      const nz = distance > .0001 ? dz / distance : 0;
      const push = Math.min(.4, minDistance - distance + .001);
      const priority = (unit: Unit) => unit.summonKind === 'ancient-tree' ? 3
        : unit.stopped || unit.orderMode === 'hold' ? 2 : !unit.destination && !unit.target ? 1 : 0;
      const firstPriority = priority(first), secondPriority = priority(second);
      const firstShare = firstPriority > secondPriority ? 0 : secondPriority > firstPriority ? 1 : .5;
      first.x -= nx * push * firstShare; first.z -= nz * push * firstShare;
      second.x += nx * push * (1 - firstShare); second.z += nz * push * (1 - firstShare);
      for (const body of [first, second]) {
        const inside = clampToZone(body.zone, body);
        body.x = inside.x; body.z = inside.z;
      }
    }
  }
}

/**
 * Visual boss radius (about ±3.3 world units for 2× sprites), also used by boss skill reach.
 * Standing clearance is deliberately smaller and belongs to enemySpacingRadius.
 */
export const BOSS_BODY_RADIUS = 3.3;
/** Growth over the previous 2.3 footprint; boss skill radii (measured from the boss centre) add it. */
export const BOSS_REACH_GROWTH = BOSS_BODY_RADIUS - 2.3;

export function monsterRadius(
  monsterId?: Enemy['monsterId'],
  kind?: Enemy['kind'],
  rank?: Enemy['rank'],
): number {
  if (rank === 'boss' || kind === 'boss' || monsterId === 'b001') return BOSS_BODY_RADIUS;
  // Elites and chieftains are drawn at 1× (minions at 0.8×), so their footprint is the minion's scaled up.
  if (rank === 'chieftain' || rank === 'elite') return 1.75;
  if (monsterId === 'm003' || monsterId === 'm004') return 1.55;
  return 1.4;
}

export function enemyRadius(enemy: Enemy): number {
  return monsterRadius(enemy.monsterId, enemy.kind, enemy.rank);
}

/** Compact standing footprint; keep visual/boss skill radii unchanged. */
export function enemySpacingRadius(enemy: Enemy): number {
  return enemyRadius(enemy) * .65;
}

/** Step away from a nearby target while staying in the current combat area. */
export function retreatFromTarget(mover: Vec, target: Vec, amount: number, zone: number): Vec {
  const dx = mover.x - target.x, dz = mover.z - target.z;
  const distance = Math.hypot(dx, dz);
  if (distance < .001 || amount <= 0) return { x: mover.x, z: mover.z };
  return clampToZone(zone, { x: mover.x + dx / distance * amount, z: mover.z + dz / distance * amount });
}

/** Resolve settled enemy overlaps; moving bodies pass through either faction freely. */
export function resolveSoftCollisions(enemies: Iterable<Enemy>, heroes: Iterable<Unit> = [],
  anchored: ReadonlySet<string> = new Set(), moving: ReadonlySet<string> = new Set()): void {
  const activeEnemies: Enemy[] = [];
  for (const e of enemies) {
    if (e.hp > 0) activeEnemies.push(e);
  }
  const heroList = Array.from(heroes).filter(hero => hero.hp > 0 && hero.respawn <= 0);
  const reach = 2 * monsterRadius(undefined, 'boss', 'boss');

  // Two bounded passes settle dense arrivals without a single-frame jump.
  for (let pass = 0; pass < 2; pass++) {
    const grid = new SpatialGrid(activeEnemies);
    for (const e1 of activeEnemies) {
      for (const e2 of grid.near(e1, e1.zone, reach)) {
        if (e2.id <= e1.id || e1.zone !== e2.zone || moving.has(e1.id) || moving.has(e2.id)) continue;
        const minDist = enemySpacingRadius(e1) + enemySpacingRadius(e2);
        const dx = e2.x - e1.x, dz = e2.z - e1.z;
        const distSq = dx * dx + dz * dz;
        if (distSq >= minDist * minDist) continue;
        const dist = Math.sqrt(distSq);
        const push = Math.min(.3, minDist - dist + .001);
        const nx = dist > .0001 ? dx / dist : -1;
        const nz = dist > .0001 ? dz / dist : 0;
        const first = anchored.has(e1.id), second = anchored.has(e2.id);
        const firstShare = first === second ? .5 : first ? .1 : .9;
        e1.x -= nx * push * firstShare; e1.z -= nz * push * firstShare;
        e2.x += nx * push * (1 - firstShare); e2.z += nz * push * (1 - firstShare);
      }
    }
    for (const enemy of activeEnemies) for (const hero of heroList) {
      if (enemy.zone !== hero.zone || moving.has(enemy.id) || moving.has(hero.id)) continue;
      const dx = enemy.x - hero.x, dz = enemy.z - hero.z;
      const minDist = contactDistance(hero, enemy);
      const dist = Math.hypot(dx, dz);
      if (dist >= minDist) continue;
      const nx = dist > .0001 ? dx / dist : enemy.id < hero.id ? -1 : 1;
      const nz = dist > .0001 ? dz / dist : 0;
      const push = Math.min(.45, minDist - dist);
      enemy.x += nx * push; enemy.z += nz * push;
    }
  }
}
