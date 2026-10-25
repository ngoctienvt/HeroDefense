import { tier3Ability } from './visual-tier3-content.js';
import { motion, sweep, fadeOut } from './visual-kit-timeline.js';

export const CHUNG_QUY = { id: 'h00N', skill: tier3Ability('h00N').id,
  radius: tier3Ability('h00N').effect?.radius ?? 0, seconds: tier3Ability('h00N').effect?.groundBurnSeconds ?? 0 } as const;
export const CQ_CAPS = { casts: 8, strikes: 12, grounds: 16, hits: 64, planes: 176 } as const;
export const FLIGHT = .32, SLAM = .8, EXIT = .22;
export function sealCharge(age: number, windup: number): { alpha: number; scale: number } {
  const p = motion.settle(sweep(age, 0, windup)); return { alpha: .3 + .7 * p, scale: .45 + .55 * p };
}
export function sealFlight(age: number): number { return motion.launch(sweep(age, 0, FLIGHT)); }
export function fireHold(remaining: number, missingAge = 0): { alpha: number; scale: number } {
  const closing = Math.min(1, Math.max(0, remaining) / .5);
  const alpha = closing * fadeOut(missingAge, 0, EXIT);
  return { alpha, scale: .25 + .75 * motion.settle(closing) };
}
export function talismanShape(reveal: number, b: { left: number; right: number; top: number; bottom: number }) {
  return { length: 4.5 * reveal, height: 4.5 * (b.bottom - b.top) / (b.right - b.left) };
}
