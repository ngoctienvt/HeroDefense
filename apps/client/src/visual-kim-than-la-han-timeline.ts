import { motion, sweep, fadeOut } from './visual-kit-timeline.js';
export const LA_HAN = { id: 'h03U', skill: 'tier3-tier4-h03U', activate: 'immortal-h03U' } as const;
export const KH_CAPS = { casts: 6, beads: 54, rays: 30, marks: 96, accents: 24, planes: 192 } as const;
export const VOW_CLOSE = .34, RECEIVE_LIFE = .52;
export function relicCharge(age: number, windup: number, reduced: boolean) {
  const p = reduced ? 1 : motion.settle(sweep(age, 0, windup)); return { scale: .6 + .4 * p, alpha: .3 + .55 * p, frame: reduced ? 2 : Math.min(3, Math.floor(p * 4)), fill: .02 + .1 * p };
}
export function vowFrame(remaining: number, active: boolean, closing: number | undefined, reduced: boolean): number {
  if (reduced) return active ? 6 : 4;
  if (closing !== undefined) return 12 + Math.min(3, Math.floor(closing / VOW_CLOSE * 4));
  const elapsed = Math.max(0, (active ? 2 : 4) - remaining);
  return elapsed < .28 ? Math.min(3, Math.floor(elapsed / .07)) : 4 + Math.floor(elapsed / .1) % 8;
}
export function vowExit(age: number | undefined, reduced: boolean) {
  const fold = age === undefined || reduced ? 0 : motion.settle(sweep(age, 0, VOW_CLOSE));
  return { fold, scale: 1 - fold * .65, alpha: age === undefined ? .9 : .9 * fadeOut(age, 0, VOW_CLOSE) };
}
