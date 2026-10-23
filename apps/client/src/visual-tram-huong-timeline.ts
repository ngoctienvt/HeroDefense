import { tier3Ability } from './visual-tier3-content.js';
import { fadeOut, motion, sweep } from './visual-kit-timeline.js';

export const TRAM_HUONG = { id: 'h03Q', skill: tier3Ability('h03Q').id,
  radius: tier3Ability('h03Q').effect?.radius ?? 0 } as const;
export const TH_CAPS = { casts: 8, strikes: 8, hits: 64, receipts: 32, planes: 160 } as const;
// Presentation only. Server has one resolve; neither of these schedules a hit.
export const AXE_CONTACT = .24, AXE_LIFE = 1.15, FISSURE_LIFE = 1.6, HIT_LIFE = .5, LOTUS_LIFE = .85;

export function lampCharge(age: number, windup: number, reduced: boolean) {
  const p = sweep(age, 0, windup);
  return { frame: reduced ? 2 : Math.min(2, Math.floor(p * 3)), alpha: .35 + .65 * p,
    scale: reduced ? 1 : .72 + .28 * motion.settle(p) };
}
export function axePose(age: number, reduced: boolean) {
  const p = sweep(age, 0, AXE_CONTACT), contact = age >= AXE_CONTACT;
  return { frame: reduced ? 5 : contact ? Math.min(15, 3 + Math.floor((age - AXE_CONTACT) / (AXE_LIFE - AXE_CONTACT) * 13))
    : 2,
    lift: reduced || contact ? 0 : 6 * (1 - motion.launch(p)),
    settle: reduced ? 0 : .28 * motion.settle(sweep(age, .76, AXE_LIFE - .76)),
    alpha: fadeOut(age, .94, AXE_LIFE - .94) };
}
export function fissurePose(age: number, reduced: boolean) {
  const open = motion.settle(sweep(age, 0, .16)), close = motion.settle(sweep(age, .7, FISSURE_LIFE - .7));
  return { width: reduced ? 1 : open * (1 - close), alpha: fadeOut(age, .95, FISSURE_LIFE - .95) };
}
export function lotusPose(age: number, reduced: boolean) {
  return { scale: reduced ? 1 : (.75 + .25 * motion.settle(sweep(age, 0, .18)))
    * (1 - .5 * motion.settle(sweep(age, .48, LOTUS_LIFE - .48))), alpha: fadeOut(age, .5, LOTUS_LIFE - .5) };
}
/** Event axis first, otherwise the actual caster→aim; overlap has no invented axis. */
export function splitDirection(direction: { x: number; z: number } | undefined,
  origin: { x: number; z: number } | undefined, aim: { x: number; z: number }) {
  const normalized = (x: number, z: number) => {
    const length = Math.hypot(x, z);
    return Number.isFinite(length) && length > .001 ? { x: x / length, z: z / length } : undefined;
  };
  return (direction ? normalized(direction.x, direction.z) : undefined)
    ?? (origin ? normalized(aim.x - origin.x, aim.z - origin.z) : undefined);
}
