import { tier3Ability } from './visual-tier3-content.js';
import { motion, sweep } from './visual-kit-timeline.js';

export const TINH_VE = { id: 'h00M', skill: tier3Ability('h00M').id, pulse: 'tier3-tier4-pulse-h00M',
  radius: tier3Ability('h00M').effect?.radius ?? 0, hitRadius: 1.25 } as const;
export const STONE_FALL = .26, STONE_HIT = .5, CRATER_LIFE = .8, CALL_LIFE = .65;
export const TINH_CAPS = { charges: 8, calls: 8, warnings: 12, stones: 32 } as const;

/** tierPulses.remaining is a count. Timer is time until the next unissued pulse. */
export function barrageSeconds(pulse: { remaining: number; timer: number; interval: number }): number {
  if (![pulse.remaining, pulse.timer, pulse.interval].every(Number.isFinite)
    || !Number.isInteger(pulse.remaining) || pulse.remaining <= 0 || pulse.interval <= 0) return 0;
  return Math.max(0, pulse.timer) + Math.max(0, pulse.remaining - 1) * pulse.interval;
}
export function stoneCharge(age: number, windup: number, reduced: boolean) {
  const power = sweep(age, 0, windup);
  return { power, frame: reduced ? 1 : Math.min(2, Math.floor(power * 3)),
    scale: reduced ? .85 : .55 + .45 * motion.anticipate(power), alpha: .25 + .55 * power };
}
export function stoneCall(age: number, reduced: boolean) {
  return { frame: reduced ? 2 : Math.min(7, 2 + Math.floor(age / CALL_LIFE * 6)),
    alpha: 1 - sweep(age, CALL_LIFE - .22, .22) };
}
export function stoneFall(age: number) {
  const progress = motion.launch(sweep(age, 0, STONE_FALL));
  return { progress, height: 6 * (1 - progress), offset: 1.8 * (1 - progress), arrived: age >= STONE_FALL };
}
export function stoneImpact(age: number, reduced: boolean) {
  return { frame: reduced ? 2 : Math.min(7, 1 + Math.floor(Math.max(0, age) / STONE_HIT * 7)),
    alpha: 1 - sweep(age, STONE_HIT - .16, .16), craterAlpha: 1 - sweep(age, CRATER_LIFE - .3, .3) };
}
type Bounds = { left: number; right: number; top: number; bottom: number };
/** Right-hand source head leads; visible length and UV reveal grow together at fixed height. */
export function stoneTrail(progress: number, bounds: Bounds) {
  const reveal = sweep(progress, 0, .55), length = 2.8;
  return { reveal, length: length * reveal, height: length * (bounds.bottom - bounds.top) / (bounds.right - bounds.left) };
}
export function stoneTrailUvs(base: readonly number[], reveal: number, bounds: Bounds): number[] {
  const amount = Math.max(0, Math.min(1, reveal));
  return base.map((v, k) => k % 2 === 0 ? bounds.right - (1 - v) * (bounds.right - bounds.left) * amount
    : 1 - bounds.bottom + v * (bounds.bottom - bounds.top));
}
