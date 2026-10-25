import { tier3Ability } from './visual-tier3-content.js';
import { motion } from './visual-kit-timeline.js';

export const BAT_GIOI = { id: 'h00J', skill: tier3Ability('h00J').id,
  radius: tier3Ability('h00J').effect?.radius ?? 0 } as const;
export const TIDE_SECONDS = .8, RUPTURE_SECONDS = .85, GUARD_EXIT = .22;
const clamp = (n: number) => Math.max(0, Math.min(1, n));
export function tideCharge(age: number, windup: number, reduced: boolean) {
  const power = clamp(age / Math.max(.001, windup));
  return { power, scale: reduced ? 1 : .35 + .65 * motion.anticipate(power), alpha: .2 + .65 * power,
    frame: reduced ? 2 : Math.min(3, Math.floor(power * 4)) };
}
export function tideImpact(age: number, rupture: boolean, reduced: boolean) {
  const life = rupture ? RUPTURE_SECONDS : TIDE_SECONDS;
  return { frame: reduced ? 6 : Math.min(15, 4 + Math.floor(age / life * 12)),
    scale: reduced ? 1 : .45 + .55 * motion.settle(age / .38), alpha: clamp((life - age) / .22) };
}
export function tideGuard(age: number, remaining: number, reduced: boolean, exiting = false) {
  const end = clamp(remaining / .35), drain = 1 - end;
  return { frame: reduced ? 5 : 4 + Math.floor(age * 12) % 8,
    scale: reduced ? 1 : 1 - (exiting ? .8 : .25) * motion.launch(drain), alpha: clamp(remaining / .12),
    sink: reduced ? 0 : drain * .65 };
}
