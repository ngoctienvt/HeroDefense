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
  // Only the four intact poses loop; frames 8–15 visibly dismantle the water/rake crown.
  const hold = [4, 5, 6, 7, 6, 5];
  return { frame: reduced ? 5 : exiting || remaining < .35 ? 8 + Math.min(7, Math.floor(drain * 8))
      : hold[Math.floor(Math.max(0, age) * 9) % hold.length],
    scale: reduced ? 1 : 1 - (exiting ? .8 : .25) * motion.launch(drain), alpha: clamp(remaining / .12),
    sink: reduced ? 0 : drain * .65 };
}

/** World-space curling front: its outermost profile vertex never exceeds the confirmed R5. */
export function tideWave(age: number, rupture: boolean) {
  const life = rupture ? RUPTURE_SECONDS : TIDE_SECONDS;
  const travel = motion.settle(age / (rupture ? .3 : .42));
  return { radius: .85 + (BAT_GIOI.radius - .42 - .85) * travel, thickness: .42,
    height: (rupture ? 1.75 : 1.3) * (1 - .65 * motion.settle(Math.max(0, age - .22) / .42)),
    crash: clamp((age - .24) / .32), alpha: clamp(age / .045) * clamp((life - age) / .24) };
}

/** Outermost point of the profile during its standing → crashed interpolation. */
export function tideFrontRadius(age: number, rupture: boolean): number {
  const p = tideWave(age, rupture);
  return p.radius + (.7 + .3 * p.crash) * p.thickness;
}

/** Invert the visible lip, including its outward curl; damage is already resolved by the server. */
export function tideContactDelay(distance: number, rupture: boolean, reduced: boolean): number {
  if (reduced || !Number.isFinite(distance)) return 0;
  const reach = Math.min(BAT_GIOI.radius, Math.max(0, distance));
  if (reach <= tideFrontRadius(0, rupture)) return 0;
  let low = 0, high = .56;
  for (let i = 0; i < 20; i++) {
    const mid = (low + high) / 2;
    if (tideFrontRadius(mid, rupture) < reach) low = mid; else high = mid;
  }
  return high;
}

/** A cropped front lip below the anchor, so it cannot wash over the hero's torso. */
export const GUARD_FRONT_CUT = .68;
export function guardFrontGeometry(size: number) {
  return { height: size * (1 - GUARD_FRONT_CUT), offset: -size * GUARD_FRONT_CUT / 2 };
}
