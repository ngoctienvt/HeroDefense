import { fadeOut, motion, sweep } from './visual-kit-timeline.js';
export const LOI = { id: 'h00T', skill: 'tier3-tier4-h00T', pulse: 'tier3-tier4-pulse-h00T', radius: 6.5, hitRadius: 1.5, barrageLife: 2.5, burnLife: 3 } as const;
export const LC_CAPS = { casts: 6, barrage: 12, burn: 64, strikes: 24, targets: 24, planes: 128, previews: 8 } as const;
export const BOLT_CONTACT = .14, PULSE_LIFE = .7, STORM_CLOSE = .38, BURN_CLOSE = .32;
export function stormCharge(age: number, windup: number, reduced: boolean) {
  const power = reduced ? 1 : motion.settle(sweep(age, 0, windup));
  return { frame: reduced ? 2 : Math.min(3, Math.floor(power * 4)), scale: .55 + .45 * power, alpha: .22 + .5 * power, fill: .025 + .06 * power };
}
export function boltPose(age: number, reduced: boolean) {
  return { headHeight: reduced ? 0 : 6 * (1 - motion.launch(sweep(age, 0, BOLT_CONTACT))), visible: !reduced && age < BOLT_CONTACT,
    alpha: fadeOut(age, .52, PULSE_LIFE - .52), hitFrame: reduced ? 1 : Math.min(7, Math.floor(Math.max(0, age - BOLT_CONTACT) / .56 * 8)) };
}
export function stormPose(remaining: number, closing: number | undefined, reduced: boolean) {
  const collapse = closing === undefined ? 0 : motion.settle(sweep(closing, 0, STORM_CLOSE));
  return { frame: reduced ? 2 : Math.floor(Math.max(0, LOI.barrageLife - remaining) / .14) % 8,
    scale: reduced ? 1 : 1 - collapse * .7, lift: reduced ? 6 : 6 + collapse * 1.4,
    alpha: closing === undefined ? .84 : .84 * fadeOut(closing, 0, STORM_CLOSE), border: closing === undefined && remaining > 0 };
}
export function staticBurnPose(remaining: number, closing: number | undefined, reduced: boolean) {
  return { frame: reduced ? 4 : closing === undefined ? Math.floor(Math.max(0, LOI.burnLife - remaining) / .085) % 12 : 12 + Math.min(3, Math.floor(closing / BURN_CLOSE * 4)),
    scale: reduced || closing === undefined ? 1 : 1 - motion.settle(sweep(closing, 0, BURN_CLOSE)) * .45,
    alpha: closing === undefined ? .9 : .9 * fadeOut(closing, 0, BURN_CLOSE) };
}
