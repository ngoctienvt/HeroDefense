import type { Enemy, GameState, Unit, Vec } from '../../contracts/src/types.js';
import { withinZone } from './battlefield-layout.js';
import { contactDistance, enemySpacingRadius } from './crowd-movement.js';
import { distance } from './rules.js';

/**
 * Warcraft-style melee surround: each melee enemy claims an angle on a ring at
 * body-contact distance around its hero. Ring capacity follows from the
 * circumference, so a crowd wraps 360° around a hero and the overflow looks
 * for another hero with room (or keeps marching). Slots persist on
 * `enemy.engage` so neighbours dying or arriving never reshuffle the ring.
 */

type Occupant = { id: string; angle: number; half: number };
export type Rings = Map<string, Occupant[]>;

const SLOT_GAP = .02;
/** A chasing enemy only drops its hero for another one this much closer. */
export const RETARGET_MARGIN = 1.5;

export function wrapAngle(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

export function ringRadius(prey: Unit, enemy: Enemy): number {
  return contactDistance(prey, enemy) + .05;
}

/** Half of the angular width one enemy body occupies on its ring. */
export function slotHalfWidth(prey: Unit, enemy: Enemy): number {
  return Math.asin(Math.min(1, (enemySpacingRadius(enemy) + SLOT_GAP) / ringRadius(prey, enemy)));
}

/** How many bodies of this size fit around the hero (for logs and tests). */
export function ringCapacity(prey: Unit, enemy: Enemy): number {
  return Math.max(1, Math.floor(Math.PI / slotHalfWidth(prey, enemy) + 1e-6));
}

export function slotPoint(prey: Unit, enemy: Enemy, angle: number): Vec {
  const radius = ringRadius(prey, enemy);
  return { x: prey.x + Math.cos(angle) * radius, z: prey.z + Math.sin(angle) * radius };
}

export function usesRing(enemy: Enemy): boolean {
  return enemy.kind !== 'ranged';
}

/** Rebuild the ring registry from persisted slots; drop slots whose hero is gone. */
export function buildRings(state: GameState, enemies: Iterable<Enemy>, isPrey: (unit: Unit) => boolean): Rings {
  const rings: Rings = new Map();
  for (const enemy of enemies) {
    const engage = enemy.engage;
    if (!engage) continue;
    const prey = state.units[engage.target];
    if (enemy.hp <= 0 || !usesRing(enemy) || !prey || !isPrey(prey) || prey.zone !== enemy.zone) {
      enemy.engage = undefined;
      continue;
    }
    occupy(rings, prey.id, { id: enemy.id, angle: engage.angle, half: slotHalfWidth(prey, enemy) });
  }
  return rings;
}

function occupy(rings: Rings, preyId: string, occupant: Occupant): void {
  const list = rings.get(preyId);
  if (list) list.push(occupant);
  else rings.set(preyId, [occupant]);
}

export function releaseSlot(rings: Rings, enemy: Enemy): void {
  if (!enemy.engage) return;
  const list = rings.get(enemy.engage.target);
  if (list) {
    const index = list.findIndex(entry => entry.id === enemy.id);
    if (index >= 0) list.splice(index, 1);
  }
  enemy.engage = undefined;
}

function slotUsable(prey: Unit, enemy: Enemy, angle: number, others: readonly Unit[]): boolean {
  const point = slotPoint(prey, enemy, angle);
  if (!withinZone(enemy.zone, point.x, point.z)) return false;
  // A slot inside another hero's footprint can never be reached and makes pathing oscillate.
  return others.every(other => other.id === prey.id || other.zone !== enemy.zone
    || distance(other, point) >= contactDistance(other, enemy) - .05);
}

/**
 * Free ring angle closest to `preferred`, or undefined when the ring is full.
 * Candidates are the preferred angle, even samples around the ring and the
 * edges just beside each occupant.
 */
export function findFreeAngle(rings: Rings, prey: Unit, enemy: Enemy, preferred: number,
  others: readonly Unit[]): number | undefined {
  const half = slotHalfWidth(prey, enemy);
  const occupants = (rings.get(prey.id) ?? []).filter(entry => entry.id !== enemy.id);
  const candidates = [preferred];
  // Even samples find room on a ring partly covered by another hero's footprint.
  for (let step = 1; step <= 8; step++) candidates.push(preferred + step * Math.PI / 8, preferred - step * Math.PI / 8);
  for (const entry of occupants) {
    const offset = entry.half + half + 1e-4;
    candidates.push(entry.angle + offset, entry.angle - offset);
  }
  let best: number | undefined, bestGap = Infinity;
  for (const raw of candidates) {
    const angle = wrapAngle(raw);
    const gap = Math.abs(wrapAngle(angle - preferred));
    if (gap >= bestGap) continue;
    if (occupants.some(entry => Math.abs(wrapAngle(angle - entry.angle)) < entry.half + half - 1e-6)) continue;
    if (!slotUsable(prey, enemy, angle, others)) continue;
    best = angle; bestGap = gap;
  }
  return best;
}

/** Claim the free slot nearest to the enemy's approach direction; false when the hero is surrounded. */
export function claimSlot(rings: Rings, prey: Unit, enemy: Enemy, others: readonly Unit[]): boolean {
  const approach = Math.atan2(enemy.z - prey.z, enemy.x - prey.x);
  const angle = findFreeAngle(rings, prey, enemy, approach, others);
  if (angle === undefined) return false;
  releaseSlot(rings, enemy);
  enemy.engage = { target: prey.id, angle };
  occupy(rings, prey.id, { id: enemy.id, angle, half: slotHalfWidth(prey, enemy) });
  return true;
}

/** Keep the current slot while it stays reachable; otherwise move to the nearest free angle. */
export function refreshSlot(rings: Rings, prey: Unit, enemy: Enemy, others: readonly Unit[]): boolean {
  const engage = enemy.engage;
  if (!engage || engage.target !== prey.id) return claimSlot(rings, prey, enemy, others);
  if (slotUsable(prey, enemy, engage.angle, others)) return true;
  const angle = findFreeAngle(rings, prey, enemy, engage.angle, others);
  if (angle === undefined) { releaseSlot(rings, enemy); return false; }
  engage.angle = angle;
  const entry = rings.get(prey.id)?.find(item => item.id === enemy.id);
  if (entry) entry.angle = angle;
  return true;
}

/** Walk directly to the reserved slot, crossing other bodies along the way. */
export function slotApproachGoal(prey: Unit, enemy: Enemy, angle: number): Vec {
  return slotPoint(prey, enemy, angle);
}

/** In position to strike: on (or angularly within) its slot and inside attack reach. */
export function atSlot(prey: Unit, enemy: Enemy, angle: number, reach: number): boolean {
  // Walking stops within a few centimetres of the slot, which may sit just past reach.
  const gap = distance(enemy, prey);
  if (gap > reach + .15) return false;
  if (distance(enemy, slotPoint(prey, enemy, angle)) <= .7) return true;
  const current = Math.atan2(enemy.z - prey.z, enemy.x - prey.x);
  return Math.abs(wrapAngle(current - angle)) <= slotHalfWidth(prey, enemy);
}
