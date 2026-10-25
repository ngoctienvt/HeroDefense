import { PHUONG_HOANG as P } from '../../../content/phuong-hoang-design.js';
import { motion, unitDirection } from './visual-kit-timeline.js';

export const HIT_SECONDS = .55;
export const SCORCH_SECONDS = .8;
export const EXTINGUISH_SECONDS = .6;
export const RAIN_END_SECONDS = .35;
const clamp = (v: number): number => Math.max(0, Math.min(1, v));

/** Server windup is mandatory: never guess a duration when the cast payload is incomplete. */
export function chargePose(age: number, windup: number, reduced = false) {
  const power = clamp(age / Math.max(.001, windup));
  return { power, scale: reduced ? 1 : .18 + .82 * motion.launch(power), alpha: .2 + .65 * power };
}

export function rainFrame(remaining: number, clock: number, reduced: boolean): number | undefined {
  if (!Number.isFinite(remaining) || remaining <= 0) return undefined;
  if (reduced) return 6;
  const elapsed = Math.max(0, P.rainSeconds - remaining);
  if (elapsed < .2) return Math.min(3, Math.floor(elapsed / .05));
  if (remaining <= RAIN_END_SECONDS)
    return Math.min(15, 12 + Math.floor((1 - remaining / RAIN_END_SECONDS) * 4));
  return 4 + Math.floor(Math.max(0, clock) * 8) % 8;
}

/** Full gameplay footprint stays R9; only the airborne flames fold inward on expiry. */
export function carpetPose(remaining: number, reduced: boolean) {
  const end = reduced ? 0 : motion.settle(1 - clamp(remaining / EXTINGUISH_SECONDS));
  const intro = reduced ? 1 : motion.settle((P.carpetSeconds - remaining) / .22);
  return { end, intro, flameHeight: 1 - end * .82, inward: 1 - end * .65,
    emberLift: end * .8, active: Number.isFinite(remaining) && remaining > 0 };
}

/** Ping-pong avoids the discontinuous last→first jump in the existing flame candidate. */
export function flameFrame(clock: number, reduced: boolean): number {
  if (reduced) return 3;
  const frame = Math.floor(Math.max(0, clock) * 10) % 14;
  return frame <= 7 ? frame : 14 - frame;
}

export function phoenixDirection(event: Parameters<typeof unitDirection>[0], origin: { x: number; z: number }) {
  return unitDirection(event, origin);
}

export function validPhoenixGround(radius: number, remaining: number, rain: number): boolean {
  return [radius, remaining, rain].every(Number.isFinite) && radius > 0 && remaining > 0 && rain >= 0;
}
