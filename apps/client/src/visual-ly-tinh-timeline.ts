import { fadeOut, motion, sweep } from './visual-kit-timeline.js';
export const LY_TINH = { id: 'h00W', skill: 'tier3-tier4-h00W', radius: 6, allyRange: 8 } as const;
export const LT_CAPS = { casts: 6, towers: 6, targets: 24, support: 24, rays: 64, planes: 112 } as const;
export const PAGODA_CONTACT = .26, PAGODA_LIFE = .94, SEAL_LIFE = 1.2;
export function pagodaCast(age: number, windup: number, reduced: boolean) {
  const power = reduced ? 1 : motion.settle(sweep(age, 0, windup));
  return { frame: reduced ? 3 : Math.min(6, Math.floor(power * 7)), lift: reduced ? 2.3 : 2.1 + motion.launch(sweep(age, 0, windup)) * 2,
    scale: reduced ? 1 : 1 - power * .25, alpha: .35 + power * .55, fill: .025 + power * .06 };
}
export function pagodaPose(age: number, reduced: boolean) {
  const close = reduced ? 0 : motion.settle(sweep(age, .58, PAGODA_LIFE - .58));
  return { frame: reduced ? 6 : age < PAGODA_CONTACT ? Math.min(5, Math.floor(sweep(age, 0, PAGODA_CONTACT) * 6)) : 6 + Math.min(9, Math.floor(sweep(age, PAGODA_CONTACT, PAGODA_LIFE - PAGODA_CONTACT) * 10)),
    lift: reduced ? 0 : 5 * (1 - motion.launch(sweep(age, 0, PAGODA_CONTACT))), width: 1 - close * .32, alpha: fadeOut(age, .65, PAGODA_LIFE - .65) };
}
export function pagodaSeal(age: number, reduced: boolean) {
  return { scale: reduced ? 1 : 1 - motion.settle(sweep(age, .7, SEAL_LIFE - .7)) * .65, alpha: fadeOut(age, .65, SEAL_LIFE - .65) };
}
export function guardDelay(distance: number, hasOrigin: boolean, reduced: boolean): number { return reduced || !hasOrigin || distance < .05 ? 0 : .12 + Math.min(.25, Math.max(0, distance) * .025); }
export function guardPose(age: number, travel: number, reduced: boolean) {
  const receipt = age >= travel, after = Math.max(0, age - travel);
  return { head: reduced || travel === 0 ? 1 : motion.launch(sweep(age, 0, travel)), receipt,
    fold: reduced ? 1 : 1 - motion.settle(sweep(after, .07, .25)) * .6, alpha: receipt ? fadeOut(after, .08, .24) : .92 };
}

