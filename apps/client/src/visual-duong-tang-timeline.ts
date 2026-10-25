import { fadeOut, motion, sweep } from './visual-kit-timeline.js';
export const DUONG_TANG = { id: 'h00S', skill: 'tier3-tier4-h00S', radius: 6, groundLife: 4.5 } as const;
export const DT_CAPS = { charge: 6, strikes: 6, painted: 96, grounds: 12, targets: 24 } as const;
export const FILLET_CONTACT = .28, FILLET_LIFE = .7, GROUND_CLOSE = .36;
export function chantState(age: number, windup: number, reduced: boolean) {
  const power = reduced ? 1 : motion.settle(sweep(age, 0, windup));
  return { frame: reduced ? 2 : Math.min(3, Math.floor(power * 4)), size: reduced ? 2.2 : 1.3 + .9 * power, alpha: .35 + .55 * power, fill: .025 + .075 * power };
}
export function filletState(age: number, reduced: boolean) {
  const impact = age >= FILLET_CONTACT;
  return { frame: reduced ? 8 : age < FILLET_CONTACT ? Math.min(9, Math.floor(sweep(age, 0, FILLET_CONTACT) * 10)) : 9 + Math.min(6, Math.floor(sweep(age, FILLET_CONTACT, FILLET_LIFE - FILLET_CONTACT) * 7)),
    lift: reduced ? 0 : 3.2 * (1 - motion.launch(sweep(age, 0, FILLET_CONTACT))), alpha: fadeOut(age, .52, FILLET_LIFE - .52), impact };
}
export function groundPose(remaining: number, closing: number | undefined, reduced: boolean) {
  return { scale: closing === undefined || reduced ? 1 : 1 - motion.settle(sweep(closing, 0, GROUND_CLOSE)),
    alpha: closing === undefined ? .48 : .48 * fadeOut(closing, 0, GROUND_CLOSE),
    bellFrame: reduced ? 3 : Math.floor(Math.max(0, DUONG_TANG.groundLife - remaining) / .14) % 8,
    border: closing === undefined && remaining > 0 };
}
export function hitFrame(age: number, reduced: boolean): number { return reduced ? 2 : Math.min(7, Math.floor(Math.max(0, age) / .48 * 8)); }

/** Recovery skips the contact flash: closing a server region must never imply another damage hit. */
export function closingFilletFrame(age: number, reduced: boolean): number {
  const frames = [4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15];
  return reduced ? 8 : frames[Math.min(frames.length - 1, Math.floor(Math.max(0, age) / GROUND_CLOSE * frames.length))];
}
