import { fadeOut, motion, segmentFrame, sweep } from './visual-kit-timeline.js';
import layout from './visual-khong-tuoc-layout.json';
import { tier3Ability } from './visual-tier3-content.js';

export const KHONG_TUOC = { id: 'h03R', skill: tier3Ability('h03R').id, hit: 'peacock-poison-hit-h03R',
  radius: tier3Ability('h03R').effect?.radius ?? 0 } as const;
export const FAN_LIFE = 1.12, FALL_TIME = .32, BLESSING_LIFE = .72, EXIT_TIME = .3;
export function fanFrame(age: number, windup?: number, reduced = false): number {
  if (reduced) return 5;
  return windup !== undefined ? Math.min(3, Math.floor(sweep(age, 0, windup) * 4))
    : segmentFrame(age, 4, 12, FAN_LIFE / 12);
}
export function blessingFrame(age: number, reduced: boolean): number {
  return reduced ? 3 : segmentFrame(age, 0, 8, BLESSING_LIFE / 8);
}
export function featherPose(age: number, reduced: boolean): { lift: number; angle: number; alpha: number } {
  const t = sweep(age, 0, FALL_TIME), arrival = motion.settle(t);
  return { lift: reduced ? 2 : 6 * (1 - arrival) + 1.5, angle: reduced ? 0 : Math.sin(t * Math.PI) * .28,
    alpha: fadeOut(age, FALL_TIME * .7, FALL_TIME * .3) };
}
/** Project the entire measured common canvas silhouette onto the ground circle, with the hole as pivot. */
export function fanSize(screenUpY: number): number {
  const b = layout.fan.bounds, l = layout.fan;
  const horizontal = Math.max(Math.abs(b.left - .5), Math.abs(b.right - .5));
  const vertical = Math.max(Math.abs(b.top - l.anchorY), Math.abs(b.bottom - l.anchorY));
  // screenUp.y = cos(elevation); ground screen-up compression = sin(elevation).
  const elevation = Math.sqrt(Math.max(.04, 1 - screenUpY * screenUpY));
  return KHONG_TUOC.radius / Math.hypot(horizontal, vertical / elevation);
}
export function plumeFrame(age: number, exit: number | undefined, reduced: boolean): number {
  if (reduced) return 6;
  return exit === undefined ? 4 + Math.floor(age / .14) % 8 : segmentFrame(exit, 12, 4, EXIT_TIME / 4);
}
