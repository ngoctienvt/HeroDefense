import { tier3Ability } from './visual-tier3-content.js';
import { motion, sweep, unitDirection } from './visual-kit-timeline.js';

const effect = tier3Ability('h00L').effect;
export const TIEU_BACH_LONG = { id: 'h00L', skill: tier3Ability('h00L').id,
  length: effect?.length ?? 0, width: effect?.width ?? 0 } as const;
export const GALE_FLIGHT = .72, GALE_EXIT = .4, GALE_HIT = .5;
export const GALE_CAPS = { charges: 8, flights: 8, hits: 48 } as const;
export function galeDirection(event: { direction?: { x: number; z: number } }, origin: { x: number; z: number }) {
  const direction = event.direction;
  if (!direction || ![direction.x, direction.z].every(Number.isFinite)) return undefined;
  return unitDirection({ direction }, origin);
}

/** Debug replay computes a direction explicitly; live events keep the server-only direction contract. */
export function galeReplayDirection(origin: { x: number; z: number }, at: { x: number; z: number }) {
  return galeDirection({ direction: { x: at.x - origin.x, z: at.z - origin.z } }, origin);
}

export function galeCharge(age: number, windup: number, reduced: boolean) {
  const power = sweep(age, 0, windup);
  return { power, frame: reduced ? 2 : Math.min(3, Math.floor(power * 4)),
    scale: reduced ? .9 : .55 + .45 * motion.anticipate(power), alpha: .25 + .6 * power };
}
export function galeProgress(age: number): number {
  return motion.settle(motion.launch(sweep(age, 0, GALE_FLIGHT)));
}
/** Inverse head motion; only positions already confirmed by server are scheduled. */
export function galeStrikeDelay(origin: { x: number; z: number }, target: { x: number; z: number },
  direction: { x: number; z: number } | undefined, reduced: boolean): number {
  if (!direction || reduced) return 0;
  const along = (target.x - origin.x) * direction.x + (target.z - origin.z) * direction.z;
  const progress = sweep(along, 0, TIEU_BACH_LONG.length);
  return GALE_FLIGHT * Math.cbrt(1 - Math.cbrt(1 - progress));
}
export function galePose(age: number, reduced: boolean) {
  return { progress: reduced ? 1 : galeProgress(age),
    echo: reduced ? 0 : galeProgress(age - .085),
    alpha: 1 - sweep(age, GALE_FLIGHT, GALE_EXIT),
    releaseFrame: reduced ? 3 : Math.min(7, 4 + Math.floor(age / .22 * 4)) };
}
type Bounds = { left: number; right: number; top: number; bottom: number };
export function dragonStrip(progress: number, bounds: Bounds) {
  const span = Math.min(7, TIEU_BACH_LONG.length), reveal = Math.min(1, TIEU_BACH_LONG.length * progress / span);
  return { reveal, length: span * reveal, height: span * (bounds.bottom - bounds.top) / (bounds.right - bounds.left) };
}
/** Real dragon and lane heads both face source +X; reveal the right-hand leading fraction. */
export function galeUvs(base: readonly number[], reveal: number, bounds: Bounds): number[] {
  const amount = Math.max(0, Math.min(1, reveal));
  return base.map((v, k) => k % 2 === 0 ? bounds.right - (1 - v) * (bounds.right - bounds.left) * amount
    : 1 - bounds.bottom + v * (bounds.bottom - bounds.top));
}
export function galeLane(origin: { x: number; z: number }, direction: { x: number; z: number }, progress: number) {
  const length = TIEU_BACH_LONG.length * Math.max(0, Math.min(1, progress));
  return { x: origin.x + direction.x * length / 2, z: origin.z + direction.z * length / 2,
    length, width: TIEU_BACH_LONG.width, yaw: Math.atan2(-direction.z, direction.x) };
}
export function galeTargets<T extends { x: number; y: number; z: number }>(points: readonly T[]): T[] {
  const valid = points.filter(p => [p.x, p.y, p.z].every(Number.isFinite));
  return valid.length <= GALE_CAPS.hits ? [...valid]
    : Array.from({ length: GALE_CAPS.hits }, (_, i) => valid[Math.floor(i * valid.length / GALE_CAPS.hits)]);
}
