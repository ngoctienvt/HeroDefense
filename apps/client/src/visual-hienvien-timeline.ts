import { HIENVIEN as H } from '../../../content/hienvien-design.js';
import { fadeOut, motion, segmentFrame, sweep } from './visual-kit-timeline.js';

/**
 * Pure timing/layout for Hiên Viên Vạn Kiếm Trấn Cửu Châu (no Babylon: testable). Sizes are world units;
 * art anchors come from assets/vfx-source/hienvien/process-art.py (active-inventory.json).
 */

/** Server windup for skill-h01F when the cast event omits it (combat.ts WINDUP_SECONDS). */
export const DEFAULT_WINDUP = .25;

/**
 * Billboard anchors = fraction of the plane height, from the top, where the painted ground contact sits
 * (`billboardCenter` puts that point on the world feet along camera screen-up). Giant sword plane: 12 units
 * (~3x the hero body), ground line .8284.
 */
export const GIANT_SIZE = 12;
export const GIANT_ANCHOR_Y = .8284;
/** Windup: the sword gathers this high above its planted pose. */
export const GIANT_RISE = 5;
/** 4x2 sheets: shared ground line at .9744 of the canvas. */
export const S8_ANCHOR_Y = .9744;
export const ARRIVAL_SIZE = 3.4, RAIN_SIZE = 3.6, HIT_SIZE = 3.5;

/** Ground array: painted outer edge at .8498 of the half-size lands on the R8.5 gameplay radius. */
export const ARRAY_SIZE = H.giantRadius * 2 / .8498;
/** Eight outer pads measured at .62–.65 of the half-size, one every 45°; the centre pad holds the giant sword. */
export const PAD_RADIUS = .635 * ARRAY_SIZE / 2;
export const CAULDRON_COUNT = 8;
export function padOffsets(): { x: number; z: number }[] {
  return Array.from({ length: CAULDRON_COUNT }, (_, k) => {
    const angle = Math.PI / 2 + k * Math.PI / 4;
    return { x: Math.cos(angle) * PAD_RADIUS, z: Math.sin(angle) * PAD_RADIUS };
  });
}
/** Cauldron billboard (512x475 art with a 12 px bottom margin): feet on the ground. */
export const CAULDRON_HEIGHT = 2.7;
export const CAULDRON_WIDTH = CAULDRON_HEIGHT * 475 / 512;
export const CAULDRON_ANCHOR_Y = 1 - 12 / 512;

/** Plunge after the server impact (frames 4–6), crack and debris (7–11), settled hold, dissolve (12–15). */
const PLUNGE = .08, DEBRIS_FRAME = .075;
export const HOLD_FRAME = 11;
/** The giant sword reads over monsters only for the strike itself; the 5 s hold drops behind them. */
export const FOREGROUND_SECONDS = .45;
export const EXIT = .45;
/** Lobby casts have no `xuanyuan-sword` snapshot: hold this long, then dissolve. */
export const FALLBACK_HOLD = 1.2;
/** Seconds after the impact without any zone snapshot before the fallback hold applies. */
export const ZONE_GRACE = .35;

const clamp01 = (t: number): number => Math.max(0, Math.min(1, t));
export const charge = (age: number, windup: number): number => clamp01(age / Math.max(.05, windup));

/** Windup frames 0–3 spread over the server windup. */
export const castFrame = (age: number, windup: number, reduced: boolean): number =>
  reduced ? 3 : segmentFrame(age, 0, 4, Math.max(.05, windup) / 4);

/** Height above the planted pose: hovering high and drawing up a little as the charge builds. */
export function castLift(age: number, windup: number, reduced: boolean): number {
  // Reduced motion: hold still at the gathered height; the sword never reads as planted before the server hit.
  return reduced ? GIANT_RISE : GIANT_RISE * (1 + .12 * motion.settle(charge(age, windup)));
}

/** Zone age a late snapshot joins at: never replays the slam. */
export const zoneStartAge = (remaining: number): number => Math.max(0, H.rainSeconds - remaining);

/** Frame of the planted sword `age` seconds after the impact with `remaining` seconds of zone left. */
export function strikeFrame(age: number, remaining: number, reduced: boolean): number {
  if (remaining < EXIT) return reduced ? 15 : segmentFrame(EXIT - remaining, 12, 4, EXIT / 4);
  if (reduced) return HOLD_FRAME;
  if (age < PLUNGE) return segmentFrame(age, 4, 3, PLUNGE / 3);
  return segmentFrame(age - PLUNGE, 7, 5, DEBRIS_FRAME);
}

/** Height of the sword during the plunge: from the gathered pose down to the ground with a small overshoot. */
export function strikeLift(age: number, reduced: boolean): number {
  if (reduced || age >= PLUNGE) return 0;
  return GIANT_RISE * .6 * (1 - motion.impactOvershoot(age / PLUNGE));
}

/** Alpha of the planted sword: full on impact, slight qi breathing while held, gone at the end of the exit. */
export function strikeAlpha(age: number, remaining: number, reduced: boolean): number {
  const exit = remaining < EXIT ? clamp01(remaining / (EXIT * .4)) : 1;
  const breathe = reduced || age < .6 ? 1 : .94 + .06 * Math.sin(age * 4.2);
  return exit * breathe;
}

/** Ground array: grows in during the windup, firm on impact, fades on the exit. */
export function arrayPose(castAge: number | undefined, windup: number, remaining: number): { scale: number; alpha: number } {
  if (castAge !== undefined) {
    const c = charge(castAge, windup);
    return { scale: .82 + .18 * motion.settle(c), alpha: .2 + .45 * c };
  }
  return { scale: 1, alpha: .92 * clamp01(remaining / EXIT) };
}

/** Each cauldron drops from the sky, staggered around the ring, landing with a small overshoot. */
export const CAULDRON_DROP = .22, CAULDRON_STAGGER = .035, CAULDRON_DELAY = .05, CAULDRON_FALL = 3.2;
export const cauldronStart = (k: number): number => CAULDRON_DELAY + k * CAULDRON_STAGGER;
export function cauldronPose(age: number, k: number, remaining: number, reduced: boolean): { lift: number; alpha: number; landed: boolean } {
  const exit = remaining < EXIT ? 1 - remaining / EXIT : 0;
  if (reduced) return { lift: 0, alpha: 1 - exit, landed: true };
  const t = sweep(age, cauldronStart(k), CAULDRON_DROP);
  return { lift: CAULDRON_FALL * (1 - motion.impactOvershoot(t)) - .35 * motion.launch(exit),
    alpha: Math.min(clamp01(t * 4), 1 - exit), landed: t >= 1 };
}
export const arrivalFrame = (age: number): number => segmentFrame(age, 0, 8, .07);
export const ARRIVAL_LIFE = 8 * .07;

/** Rain sword: compressed fall (≤ .1 s, frames 0–3) so the contact lands on the server hit, then planted 4–7. */
export const RAIN_FALL = .09, RAIN_HEIGHT = 4.2, RAIN_LIFE = RAIN_FALL + .36;
export function rainPose(age: number, reduced: boolean): { frame: number; lift: number; alpha: number } {
  if (reduced) return { frame: 4, lift: 0, alpha: .7 * fadeOut(age, .1, .15) };
  if (age < RAIN_FALL) return { frame: segmentFrame(age, 0, 4, RAIN_FALL / 4), lift: RAIN_HEIGHT * (1 - motion.launch(age / RAIN_FALL)), alpha: 1 };
  const after = age - RAIN_FALL;
  return { frame: segmentFrame(after, 4, 4, .09), lift: 0, alpha: fadeOut(after, .22, .14) };
}
export const hitFrame = (age: number): number => segmentFrame(age, 0, 8, .055);
export const HIT_LIFE = 8 * .055;

/** Server sword order for the basic fan: five linear pierces spread by `swordFanRadians` around `direction`. */
export function fanDirections(direction: { x: number; z: number }): { x: number; z: number }[] {
  const center = Math.atan2(direction.z, direction.x);
  return Array.from({ length: H.swords }, (_, i) => {
    const angle = center + (i - (H.swords - 1) / 2) * H.swordFanRadians;
    return { x: Math.cos(angle), z: Math.sin(angle) };
  });
}
