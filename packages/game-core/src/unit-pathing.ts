import type { Enemy, Unit, Vec } from '../../contracts/src/types.js';
import { clampToZone, withinZone } from './battlefield-layout.js';
import { contactDistance, enemyRadius, unitSpacingRadius } from './crowd-movement.js';

type Blocker = { id: string; x: number; z: number; radius: number };
type Mover = Vec & { id: string; zone: number };
const blockedSteps = new WeakMap<Mover, number>();

function canStep(from: Vec, to: Vec, blockers: Blocker[], zone: number): boolean {
  if (!withinZone(zone, to.x, to.z)) return false;
  const stepX = to.x - from.x, stepZ = to.z - from.z;
  const stepLengthSq = stepX * stepX + stepZ * stepZ;
  for (const blocker of blockers) {
    const startGap = Math.hypot(from.x - blocker.x, from.z - blocker.z);
    const endGap = Math.hypot(to.x - blocker.x, to.z - blocker.z);
    // Forced displacement may begin inside a footprint. Allow only steps outward.
    if (startGap < blocker.radius - .001 && endGap > startGap + .001) continue;
    const projection = stepLengthSq > 0
      ? Math.max(0, Math.min(1, ((blocker.x - from.x) * stepX + (blocker.z - from.z) * stepZ) / stepLengthSq)) : 0;
    const nearestX = from.x + stepX * projection, nearestZ = from.z + stepZ * projection;
    if (Math.hypot(nearestX - blocker.x, nearestZ - blocker.z) < blocker.radius - .001) return false;
  }
  return true;
}

/** A moving unit yields or walks around occupied footprints; blockers are never pushed. */
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
  return walkAroundBlockers(unit, destination, amount, blockers);
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
      radius: enemyRadius(enemy) + enemyRadius(other) });
  }
  return walkAroundBlockers(enemy, destination, amount, blockers);
}

function walkAroundBlockers(unit: Mover, destination: Vec, amount: number, blockers: Blocker[]): boolean {
  if (!Number.isFinite(amount) || amount <= 0) return false;
  let goal = { x: destination.x, z: destination.z };
  for (const blocker of blockers) {
    const gap = Math.hypot(goal.x - blocker.x, goal.z - blocker.z);
    if (gap >= blocker.radius) continue;
    const dx = unit.x - blocker.x, dz = unit.z - blocker.z;
    const length = Math.hypot(dx, dz);
    const side = unit.id < blocker.id ? -1 : 1;
    goal = { x: blocker.x + (length > .001 ? dx / length : side) * (blocker.radius + .05),
      z: blocker.z + (length > .001 ? dz / length : 0) * (blocker.radius + .05) };
  }
  goal = clampToZone(unit.zone, goal);
  const dx = goal.x - unit.x, dz = goal.z - unit.z;
  const gap = Math.hypot(dx, dz);
  if (gap < .08) { blockedSteps.delete(unit); return true; }
  const step = Math.min(amount, gap), headingX = dx / gap, headingZ = dz / gap;
  const direct = { x: unit.x + headingX * step, z: unit.z + headingZ * step };
  if (canStep(unit, direct, blockers, unit.zone)) {
    unit.x = direct.x; unit.z = direct.z;
    blockedSteps.delete(unit);
    return gap - step < .08;
  }

  // Prefer one stable passing side; turn further only when the shallow detour is blocked.
  const side = [...unit.id].reduce((hash, char) => hash + char.charCodeAt(0), 0) % 2 ? 1 : -1;
  for (const angle of [Math.PI / 4, Math.PI / 2, Math.PI * 3 / 4]) {
    for (const sign of [side, -side]) {
      const radians = angle * sign, cosine = Math.cos(radians), sine = Math.sin(radians);
      const candidate = { x: unit.x + (headingX * cosine - headingZ * sine) * step,
        z: unit.z + (headingX * sine + headingZ * cosine) * step };
      if (!canStep(unit, candidate, blockers, unit.zone)) continue;
      unit.x = candidate.x; unit.z = candidate.z;
      blockedSteps.delete(unit);
      return false;
    }
  }
  const waits = (blockedSteps.get(unit) ?? 0) + 1;
  blockedSteps.set(unit, waits);
  if (waits === 20) console.debug(JSON.stringify({ event: 'pathing.blocked', unitId: unit.id, zone: unit.zone }));
  return false;
}
