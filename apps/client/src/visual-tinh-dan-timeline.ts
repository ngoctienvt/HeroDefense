import { motion, sweep, fadeOut } from './visual-kit-timeline.js';
export const TINH = { id: 'h03T', skill: 'tier3-tier4-h03T', radius: 5.5 } as const;
export const TD_CAPS = { casts: 6, actions: 8, flows: 32, contacts: 48, echoes: 64, planes: 192 } as const;
export const LOTUS_CONTACT = .22, LOTUS_LIFE = .92, ECHO_CLOSE = .34;
export function lotusCharge(age: number, windup: number, reduced: boolean) {
  const power = reduced ? 1 : motion.settle(sweep(age, 0, windup));
  return { frame: reduced ? 2 : Math.min(3, Math.floor(power * 4)), scale: .65 + power * .35, alpha: .3 + .5 * power, fill: .03 + .09 * power };
}
export function lotusExit(age: number, reduced: boolean) {
  const fold = reduced ? 0 : motion.settle(sweep(age, .42, LOTUS_LIFE - .42));
  return { fold, scale: 1 - fold * .75, turn: fold * .65, alpha: fadeOut(age, .42, LOTUS_LIFE - .42) };
}
