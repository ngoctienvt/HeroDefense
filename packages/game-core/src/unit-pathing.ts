import type { Enemy, Unit, Vec } from '../../contracts/src/types.js';
import { clampToZone, withinZone } from './battlefield-layout.js';
import { contactDistance, enemySpacingRadius, unitSpacingRadius } from './crowd-movement.js';

type Blocker = { id: string; x: number; z: number; radius: number };
type Mover = Vec & { id: string; zone: number };
const blockedArrivals = new WeakSet<Mover>();

/** Bodies can be crossed while walking; only the final standing position needs free space. */
export function walkUnitWithPathing(unit: Unit, destination: Vec, amount: number,
  units: Iterable<Unit>, enemies: Iterable<Enemy>): boolean {
  const blockers: Blocker[] = [];
  for (const other of units) {
    if (other.id === unit.id || other.zone !== unit.zone || other.hp <= 0 || other.respawn > 0
      || (other.slot < 0 && other.summonDuration === undefined)) continue;
    blockers.push({ id: other.id, x: other.x, z: other.z,
      radius: unitSpacingRadius(unit) + unitSpacingRadius(other) });
  }
  for (const enemy of enemies) {
    if (enemy.zone !== unit.zone || enemy.hp <= 0) continue;
    blockers.push({ id: enemy.id, x: enemy.x, z: enemy.z, radius: contactDistance(unit, enemy) });
  }
  return walkToStandingSpot(unit, destination, amount, blockers);
}

export function walkEnemyWithPathing(enemy: Enemy, destination: Vec, amount: number,
  units: Iterable<Unit>, enemies: Iterable<Enemy>): boolean {
  const blockers: Blocker[] = [];
  for (const unit of units) {
    if (unit.zone !== enemy.zone || unit.hp <= 0 || unit.respawn > 0
      || (unit.slot < 0 && unit.summonDuration === undefined)) continue;
    blockers.push({ id: unit.id, x: unit.x, z: unit.z, radius: contactDistance(unit, enemy) });
  }
  for (const other of enemies) {
    if (other.id === enemy.id || other.zone !== enemy.zone || other.hp <= 0) continue;
    blockers.push({ id: other.id, x: other.x, z: other.z,
      radius: enemySpacingRadius(enemy) + enemySpacingRadius(other) });
  }
  return walkToStandingSpot(enemy, destination, amount, blockers);
}

function walkToStandingSpot(unit: Mover, destination: Vec, amount: number, blockers: Blocker[]): boolean {
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(destination.x) || !Number.isFinite(destination.z)) return false;
  let goal = clampToZone(unit.zone, destination);
  const free = (point: Vec) => withinZone(unit.zone, point.x, point.z)
    && blockers.every(body => Math.hypot(point.x - body.x, point.z - body.z) >= body.radius + .01);
  // Reserve the standing spot throughout the approach so the mover does not oscillate at arrival.
  if (!free(goal)) {
    const heading = Math.atan2(unit.z - goal.z, unit.x - goal.x);
    let available: Vec | undefined;
    for (let radius = .25; radius <= 16 && !available; radius += .25) {
      for (let sample = 0; sample < 32; sample++) {
        const angle = heading + sample * Math.PI / 16;
        const candidate = { x: goal.x + Math.cos(angle) * radius, z: goal.z + Math.sin(angle) * radius };
        if (!free(candidate)) continue;
        available = candidate;
        // Refine the last search band so a compact melee footprint does not round
        // the stopping distance past attack reach (contact clearance is only .15).
        for (let inset = .025; inset < .25; inset += .025) {
          const refined = { x: goal.x + Math.cos(angle) * (radius - inset),
            z: goal.z + Math.sin(angle) * (radius - inset) };
          if (!free(refined)) break;
          available = refined;
        }
        break;
      }
    }
    if (!available) {
      if (!blockedArrivals.has(unit)) console.debug(JSON.stringify({ event: 'pathing.arrival-full', unitId: unit.id, zone: unit.zone }));
      blockedArrivals.add(unit);
      return false;
    }
    goal = available;
  }
  blockedArrivals.delete(unit);
  const dx = goal.x - unit.x, dz = goal.z - unit.z, gap = Math.hypot(dx, dz);
  if (gap < .001) return free(unit);
  const step = Math.min(amount, gap);
  const point = { x: unit.x + dx / gap * step, z: unit.z + dz / gap * step };
  if (!withinZone(unit.zone, point.x, point.z)) return false;
  unit.x = point.x; unit.z = point.z;
  return gap <= amount && free(unit);
}
