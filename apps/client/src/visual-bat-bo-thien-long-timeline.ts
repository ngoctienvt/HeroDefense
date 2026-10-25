import { motion, sweep, fadeOut } from './visual-kit-timeline.js';
export const THIEN_LONG = { id: 'h03V', skill: 'tier3-tier4-h03V', length: 13, width: 5.5 } as const;
export const BT_CAPS = { casts: 6, lanes: 8, targets: 48, hits: 96, haste: 64, planes: 192 } as const;
export const DRAGON_TRAVEL = .44, DRAGON_LIFE = .9, PILLAR_LIFE = .5, HASTE_CLOSE = .32;
export interface DragonDirection { x: number; z: number }
export function dragonCharge(age: number, windup: number, reduced: boolean) {
  const power = reduced ? 1 : motion.settle(sweep(age, 0, windup));
  return { frame: reduced ? 2 : Math.min(3, Math.floor(power * 4)), scale: .55 + .45 * power, alpha: .35 + .5 * power, head: .04 + .96 * power };
}
export function dragonFlight(age: number, reduced: boolean) {
  const fold = reduced ? 0 : motion.settle(sweep(age, .52, DRAGON_LIFE - .52));
  return { head: reduced ? 1 : motion.launch(sweep(age, 0, DRAGON_TRAVEL)), tail: fold * .82,
    coil: 1 - fold * .8, lift: fold * .8, alpha: fadeOut(age, .52, DRAGON_LIFE - .52) };
}
export function dragonContactDelay(origin: { x: number; z: number } | undefined, dir: DragonDirection | undefined, at: { x: number; z: number }, reduced: boolean): number {
  if (!origin || !dir || reduced) return 0;
  const along = Math.max(0, Math.min(THIEN_LONG.length, (at.x - origin.x) * dir.x + (at.z - origin.z) * dir.z));
  return Math.cbrt(along / THIEN_LONG.length) * DRAGON_TRAVEL;
}
