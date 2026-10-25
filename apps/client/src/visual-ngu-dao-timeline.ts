import { fadeOut, motion, sweep } from './visual-kit-timeline.js';
export const NGU_DAO = { id: 'h00Y', skill: 'tier3-tier4-h00Y', radius: 6.5, targets: 8 } as const;
export const ND_CAPS = { casts: 6, wheels: 6, pairs: 48, marks: 96, pulses: 48, contacts: 72, planes: 256 } as const;
export const SOUL_CLOSE = .34, WHEEL_CONTACT = .16, WHEEL_LIFE = 1.02;
export function samsaraCharge(age: number, windup: number, reduced: boolean) {
  const power = reduced ? 1 : motion.settle(sweep(age, 0, windup));
  return { frame: reduced ? 6 : Math.min(7, Math.floor(power * 8)), scale: .6 + .4 * power, alpha: .3 + .55 * power, fill: .02 + .06 * power };
}
export function samsaraWheel(age: number, reduced: boolean) {
  return { frame: reduced ? 8 : Math.min(15, 7 + Math.floor(Math.max(0, age) / WHEEL_LIFE * 9)),
    scale: reduced ? 1 : 1 - motion.settle(sweep(age, .55, WHEEL_LIFE - .55)) * .6,
    turn: reduced ? 0 : motion.settle(sweep(age, 0, WHEEL_LIFE)) * .4, alpha: fadeOut(age, .5, WHEEL_LIFE - .5) };
}
export function soulClose(age: number | undefined, reduced: boolean) {
  const close = age === undefined || reduced ? 0 : motion.settle(sweep(age, 0, SOUL_CLOSE));
  return { fold: close, scale: 1 - close * .65, alpha: age === undefined ? .85 : .85 * fadeOut(age, 0, SOUL_CLOSE) };
}
export function frenzyFrame(remaining: number, closing: number | undefined, reduced: boolean): number {
  return reduced ? 4 : closing === undefined ? Math.floor(Math.max(0, 5 - remaining) / .12) % 12 : 12 + Math.min(3, Math.floor(closing / SOUL_CLOSE * 4));
}
