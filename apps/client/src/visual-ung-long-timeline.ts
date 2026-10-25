import { motion, sweep, fadeOut } from './visual-kit-timeline.js';
export const UNG_LONG = { id: 'h00Z', skill: 'tier3-tier4-h00Z', pulse: 'tier3-tier4-pulse-h00Z', radius: 6.5, life: 4 } as const;
export const UL_CAPS = { casts: 6, barrage: 8, strikes: 24, targets: 24, contacts: 96, planes: 192, previews: 6 } as const;
export const BLIZZARD_CLOSE = .42, LANCE_CONTACT = .18, ICE_HIT_LIFE = .62;
export function frostCharge(age: number, windup: number, reduced: boolean) {
  const power = reduced ? 1 : motion.settle(sweep(age, 0, windup));
  return { frame: reduced ? 2 : Math.min(3, Math.floor(power * 4)), scale: .55 + .45 * power, alpha: .3 + .5 * power, fill: .02 + .07 * power };
}
export function blizzardPose(remaining: number, close: number | undefined, reduced: boolean) {
  const fold = close === undefined || reduced ? 0 : motion.settle(sweep(close, 0, BLIZZARD_CLOSE));
  const open = reduced ? 1 : motion.settle(sweep(Math.max(0, 4 - remaining), 0, .24));
  return { frame: reduced ? 2 : Math.floor(Math.max(0, 4 - remaining) / .085) % 8,
    scale: (.55 + .45 * open) * (1 - fold * .82), turn: reduced ? 0 : fold * 1.7, lift: fold * 1.4,
    alpha: close === undefined ? .3 + .36 * open : .66 * fadeOut(close, 0, BLIZZARD_CLOSE) };
}
export function lancePose(age: number, reduced: boolean) {
  return { visible: !reduced && age < LANCE_CONTACT, head: reduced ? 0 : 5 * (1 - motion.launch(sweep(age, 0, LANCE_CONTACT))),
    frame: reduced ? 2 : Math.min(7, Math.floor(Math.max(0, age - LANCE_CONTACT) / ICE_HIT_LIFE * 8)),
    alpha: fadeOut(Math.max(0, age - LANCE_CONTACT), .36, ICE_HIT_LIFE - .36) };
}
