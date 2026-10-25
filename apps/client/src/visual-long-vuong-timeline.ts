import { tier3Ability } from './visual-tier3-content.js';
import { motion, unitDirection } from './visual-kit-timeline.js';

const effect = tier3Ability('h00Q').effect;
export const LONG_VUONG = { id: 'h00Q', skill: tier3Ability('h00Q').id,
  length: effect?.length ?? 0, width: effect?.width ?? 0 } as const;
export const WAVE_SECONDS = .75;
export const DRAIN_SECONDS = .45;
export const waterDirection = unitDirection;
const clamp = (n: number) => Math.max(0, Math.min(1, n));

export function waterCharge(age: number, windup: number, reduced: boolean) {
  const power = clamp(age / Math.max(.001, windup));
  return { power, size: reduced ? 1 : .55 + .45 * motion.anticipate(power),
    alpha: .22 + .68 * power, frame: reduced ? 2 : Math.min(4, Math.floor(power * 5)) };
}

/** The profile, including its curling lip, remains within the server's rectangular lane. */
export function waterWave(age: number, reduced: boolean) {
  const progress = reduced ? 1 : motion.settle(age / .58);
  const crash = reduced ? 1 : motion.settle((age - .4) / .35);
  return { along: .9 + Math.max(0, LONG_VUONG.length - 1.8) * progress, crash,
    height: reduced ? .15 : (.25 + .75 * motion.impactOvershoot(age / .18)) * (1 - .8 * crash),
    alpha: clamp((WAVE_SECONDS - age) / .18), frame: reduced ? 9 : Math.min(15, Math.floor(age / WAVE_SECONDS * 16)) };
}

/** Snapshot remaining, never a fresh client-side four-second lifetime. */
export function waterPool(remaining: number, reduced: boolean) {
  const drain = 1 - clamp(remaining / DRAIN_SECONDS);
  return { drain, scale: reduced ? 1 : 1 - .85 * motion.launch(drain),
    alpha: clamp(remaining / .16), spin: reduced ? 0 : motion.settle(drain) * Math.PI * .7 };
}

/** Inverse of the crest's settle curve: visual impact when it reaches the confirmed target. */
export function waterStrikeDelay(origin: { x: number; z: number }, target: { x: number; z: number },
  dir: { x: number; z: number } | undefined, reduced: boolean): number {
  if (reduced || !dir) return 0;
  const along = (target.x - origin.x) * dir.x + (target.z - origin.z) * dir.z;
  const progress = clamp((along - .9) / Math.max(.001, LONG_VUONG.length - 1.8));
  return .58 * (1 - Math.cbrt(1 - progress));
}

export function waterTargetSample<T>(targets: readonly T[]): T[] {
  return targets.length <= 24 ? [...targets] : Array.from({ length: 24 }, (_, i) => targets[Math.floor(i * targets.length / 24)]);
}
