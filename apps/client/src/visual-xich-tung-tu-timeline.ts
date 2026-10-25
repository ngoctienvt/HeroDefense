import { motion, sweep, fadeOut } from './visual-kit-timeline.js';
export const XICH = { id: 'h010', skill: 'tier3-tier4-h010', recipients: 4 } as const;
export const XT_CAPS = { casts: 6, streams: 24, fire: 64, planes: 128 } as const;
export const FIRE_CLOSE = .32, RAIN_LIFE = .65;
export function dewTravel(distance: number, origin: boolean, reduced: boolean): number { return !origin || reduced || distance < .02 ? 0 : Math.min(.48, .12 + distance * .035); }
export function dewHead(age: number, travel: number): number { return travel <= 0 ? 1 : motion.launch(sweep(age, 0, travel)); }
export function gourdPose(age: number, windup: number, closing: boolean, reduced: boolean) {
  const power = reduced ? 1 : motion.settle(sweep(age, 0, windup));
  const fold = !closing || reduced ? 0 : motion.settle(sweep(age, 0, .34));
  return { turn: reduced ? 0 : closing ? -.4 + fold * .65 : .2 - power * .6, scale: closing ? 1 - fold * .6 : .65 + power * .35,
    alpha: closing ? fadeOut(age, .1, .24) : .45 + .45 * power, fill: .04 + power * .12 };
}
