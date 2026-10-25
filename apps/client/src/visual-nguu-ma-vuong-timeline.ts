import { tier3Ability } from './visual-tier3-content.js';
import { motion, sweep, fadeOut } from './visual-kit-timeline.js';
export const NGUU_MA_VUONG = { id: 'h00P', skill: tier3Ability('h00P').id,
  radius: tier3Ability('h00P').effect?.radius ?? 0 } as const;
export const NM_CAPS = { casts: 8, shocks: 8, hits: 64, planes: 192 } as const;
export const HOOF_CONTACT = .06, QUAKE_LIFE = .8, FISSURE_LIFE = 1.65, DUST_LIFE = .55;
/** Interior rock clusters, never a crown of identical objects on the skill boundary. */
export const ROCK_CLUSTERS = [
  { x: -2.45, z: .65, size: 3.15, delay: .05 }, { x: -1.6, z: 1.25, size: 2.1, delay: .08 },
  { x: -.9, z: .85, size: 1.65, delay: .1 }, { x: 1.85, z: -1.5, size: 3.7, delay: .03 },
  { x: 2.65, z: -.9, size: 2.3, delay: .09 }, { x: 2.1, z: -2.2, size: 1.8, delay: .12 },
  { x: -.25, z: -2.8, size: 2.8, delay: .07 }, { x: -1.1, z: -2.65, size: 1.75, delay: .11 },
  { x: .75, z: 2.7, size: 2.5, delay: .06 },
] as const;
export function hornCharge(age: number, windup: number, reduced: boolean) {
  const p = sweep(age, 0, windup);
  return { frame: reduced ? 2 : Math.min(2, Math.floor(p * 3)), alpha: .3 + .7 * p,
    scale: reduced ? 1 : .55 + .45 * motion.settle(p) };
}
export function hoofShock(age: number, reduced: boolean) {
  return { frame: reduced ? 5 : Math.min(15, Math.floor(age / QUAKE_LIFE * 16)),
    scale: reduced ? 1 : .65 + .35 * motion.settle(sweep(age, 0, .23)),
    alpha: fadeOut(age, .55, .25), fissure: fadeOut(age, .55, FISSURE_LIFE - .55) };
}
export function spikePose(age: number, delay: number, reduced: boolean) {
  const t = age - delay;
  if (reduced) return { reveal: 1, height: 1, alpha: fadeOut(age, .8, .45) };
  const rise = motion.impactOvershoot(sweep(t, 0, .24));
  return { reveal: Math.min(1, Math.max(0, rise)) * (1 - motion.settle(sweep(t, .72, .52))),
    height: Math.max(1, rise), alpha: t < 0 ? 0 : fadeOut(t, .9, .34) };
}
export function dustDirection(origin: { x: number; z: number }, target: { x: number; z: number }) {
  const x = target.x - origin.x, z = target.z - origin.z, length = Math.hypot(x, z);
  return Number.isFinite(length) && length > .001 ? { x: x / length, z: z / length } : undefined;
}
/** Bound every opaque/fringe texel corner inside the ground circle projected by the actual camera. */
export function quakePlaneSize(radius: number, elevation: number, hull: readonly (readonly number[])[], padding: number): number {
  if (!Number.isFinite(radius) || radius <= 0 || !Number.isFinite(elevation) || elevation <= .001) return 0;
  const edge = Math.max(...hull.map(([x, y]) => Math.hypot(x, y / elevation)));
  return Number.isFinite(edge) && edge > 0 ? radius / (edge + padding / elevation) : 0;
}
