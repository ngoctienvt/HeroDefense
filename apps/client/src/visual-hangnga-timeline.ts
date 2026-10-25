import { arcHeight, fadeOut, motion, piecewise, sweep } from './visual-kit-timeline.js';

/**
 * Pure timing/geometry of Hằng Nga's ultimate (no Babylon imports, so it is unit tested). One resolve = one moon
 * sheet around the caster, one silk per other ally in R9,5 and, on the independent `freeze-h018` event, one silk drop
 * per monster the server froze. Every number is presentation only; the server decides who is healed, shielded or frozen.
 */
export const DEFAULT_WINDUP = .25;
export const SHEET_FRAMES = 16;
export const SHEET_COLUMNS = 4;
/** Moon sheet frames 0-4 open during the windup, 5-7 hold while the ability is late, 8-15 fold away after it. */
export const OPEN_FRAMES = 5;
export const HOLD_FIRST = 5;
export const HOLD_COUNT = 3;
export const FOLD_FIRST = 8;
export const FOLD_FRAME_SECONDS = .05;
export const HOLD_FRAME_SECONDS = .09;
/** A cast whose ability never arrives is cleaned this long after its windup, with no impact. */
export const LATE_CAST_GRACE = .3;
export const REDUCED_SHEET_FRAME = 6;
/** World width of the 400 px sheet canvas, and how far above the caster's feet its centre floats. */
export const MOON_SIZE = 8;
export const MOON_LIFT = 4.2;

/** Silk (ribbon art, aspect 5.95:1): the head crosses the field in .34 s, longer than the table's .2 s so it can be read. */
export const SILK_FLIGHT = .34;
export const SILK_SETTLE = .25;
export const SILK_ASPECT = 5.9535;
export const SILK_MAX_LENGTH = 4.4;
export const SILK_MIN_LENGTH = 1.8;
export const SILK_CHEST = 1.7;
export const SILK_ARC = 1.1;
/** A caster closer than this to a recipient is the recipient herself: no flight, only the wrap. */
export const SELF_DISTANCE = .6;

/** The shield wrap: starts when the silk lands, orbits the ally while the snapshot shows a shield, unwinds in .3 s. */
export const WRAP_DELAY = SILK_FLIGHT;
export const UNWIND_SECONDS = .3;
export const WRAP_LENGTH = 3.2;
export const WRAP_RADIUS_X = 1.3;
export const WRAP_RADIUS_Z = .55;
export const WRAP_LIFT = 1.7;
export const WRAP_SPIN = 2.1;

/** Freeze: silk falls from above onto each frozen monster; the shared freeze sheet takes over from the snapshot. */
export const DROP_HEIGHT = 7;
export const DROP_SECONDS = .22;
export const DROP_HOLD = .12;
export const DROP_FADE = .25;
export const DROP_STAGGER = .015;
export const DROP_MAX_DELAY = .24;
export const MAX_FREEZE_SILKS = 16;
export const MAX_REDUCED_FREEZE = 6;

export interface MoonPose { frame: number; alpha: number; scale: number; done: boolean }

/**
 * Moon sheet over time. `resolveAt` is the sheet age at which the ability arrived (undefined = still waiting);
 * a resolve with no cast starts at age 0 and plays straight into the fold. Reduced motion keeps one open frame.
 */
export function moonPose(age: number, resolveAt: number | undefined, windup: number, reduced: boolean): MoonPose {
  const scale = reduced ? 1 : .85 + .15 * motion.settle(age / .35);
  const fadeIn = Math.min(1, age / .06);
  if (resolveAt !== undefined) {
    const since = Math.max(0, age - resolveAt);
    const foldSeconds = (SHEET_FRAMES - FOLD_FIRST) * FOLD_FRAME_SECONDS;
    if (reduced) return { frame: REDUCED_SHEET_FRAME, alpha: fadeIn * fadeOut(since, .1, .3), scale, done: since >= .4 };
    const frame = Math.min(SHEET_FRAMES - 1, FOLD_FIRST + Math.floor(since / FOLD_FRAME_SECONDS));
    return { frame, alpha: fadeIn, scale, done: since >= foldSeconds + FOLD_FRAME_SECONDS };
  }
  const end = windup + LATE_CAST_GRACE;
  const alpha = fadeIn * fadeOut(age, end - .15, .15);
  if (reduced) return { frame: REDUCED_SHEET_FRAME, alpha, scale, done: age >= end };
  const frame = age < windup ? Math.min(OPEN_FRAMES - 1, Math.floor(OPEN_FRAMES * age / Math.max(1e-3, windup)))
    // Subtracting the windup can put an exact frame boundary just below its integer.
    : HOLD_FIRST + Math.floor((age - windup) / HOLD_FRAME_SECONDS + 1e-9) % HOLD_COUNT;
  return { frame, alpha, scale, done: age >= end };
}

export interface SilkPose { progress: number; arrived: boolean; lengthScale: number; alpha: number; done: boolean }

/** Visible silk length: shorter for near allies so the tail never reaches behind the caster. */
export function silkLength(distance: number): number {
  return Math.max(SILK_MIN_LENGTH, Math.min(SILK_MAX_LENGTH, distance * .55));
}

/** Head progress along the caster → ally line (eased out, arcing over the field), tail scale and fade. */
export function silkPose(age: number): SilkPose {
  const t = sweep(age, 0, SILK_FLIGHT);
  const progress = motion.easeOut(t);
  const arrived = age >= SILK_FLIGHT;
  const lengthScale = piecewise([[0, .35], [.3 * SILK_FLIGHT, 1], [SILK_FLIGHT, 1], [SILK_FLIGHT + SILK_SETTLE, .2]], age);
  return { progress, arrived, lengthScale, alpha: Math.min(1, age / .05) * fadeOut(age, SILK_FLIGHT, SILK_SETTLE),
    done: age >= SILK_FLIGHT + SILK_SETTLE };
}

/**
 * UV window showing only the leading `fraction` of the ribbon (head is texture +X, u = 1). Applied together with a
 * plane `fraction` times as long, so the art is revealed rather than stretched.
 */
export function revealUvs(base: readonly number[], fraction: number): number[] {
  const f = Math.max(.02, Math.min(1, fraction));
  return base.map((v, i) => i % 2 === 0 ? 1 - f + v * f : v);
}

/** Fraction of the silk already out of the caster: the tail may not trail behind the starting point. */
export function revealFraction(travelled: number, length: number): number {
  return Math.max(.02, Math.min(1, travelled / Math.max(1e-3, length)));
}

/** Plane lengthening that keeps a strip's apparent length constant along a view-skewed direction. */
export function foreshorten(direction: { x: number; y: number; z: number }, look: { x: number; y: number; z: number }): number {
  const length = Math.hypot(direction.x, direction.y, direction.z) || 1;
  const dot = (direction.x * look.x + direction.y * look.y + direction.z * look.z) / length;
  return Math.max(.45, Math.sqrt(Math.max(0, 1 - dot * dot)));
}

export interface WrapPose { alpha: number; length: number; offset: { x: number; y: number; z: number }; direction: { x: number; y: number; z: number } }

/**
 * Shield silk orbiting an ally. `age` counts from the first shield frame, `out` from the first frame without one
 * (0 while the shield lasts). Reduced motion freezes the angle. There is no timer: only the snapshot ends it.
 */
export function wrapPose(age: number, out: number, reduced: boolean): WrapPose {
  const appear = sweep(age, WRAP_DELAY, .2);
  const unwind = Math.min(1, out / UNWIND_SECONDS);
  const angle = reduced ? .6 : WRAP_SPIN * age + unwind * unwind * 9;
  const rise = reduced ? 0 : unwind * 1.4;
  const swing = reduced ? 0 : .22 * Math.sin(angle * .5);
  return {
    alpha: appear * (1 - unwind),
    length: WRAP_LENGTH * appear * (1 - motion.launch(unwind) * .85),
    offset: { x: Math.cos(angle) * WRAP_RADIUS_X, y: WRAP_LIFT + swing + rise, z: Math.sin(angle) * WRAP_RADIUS_Z },
    direction: { x: -Math.sin(angle) * WRAP_RADIUS_X, y: .08, z: Math.cos(angle) * WRAP_RADIUS_Z },
  };
}

export interface DropPose { height: number; arrived: boolean; alpha: number; done: boolean }

/** Silk falling onto a frozen monster: accelerates down, holds a beat, then fades. */
export function dropPose(age: number): DropPose {
  const fall = sweep(age, 0, DROP_SECONDS);
  const arrived = age >= DROP_SECONDS;
  return {
    height: DROP_HEIGHT + (SILK_CHEST - DROP_HEIGHT) * motion.launch(fall),
    arrived,
    alpha: Math.min(1, age / .04) * fadeOut(age, DROP_SECONDS + DROP_HOLD, DROP_FADE),
    done: age >= DROP_SECONDS + DROP_HOLD + DROP_FADE,
  };
}

/** Frozen monsters land staggered, capped, never all in the same frame. */
export function dropDelay(index: number): number {
  return Math.min(DROP_MAX_DELAY, index * DROP_STAGGER);
}

/** Point of the silk head at `progress` (0..1) along the caster → ally line, arcing over the field at chest height. */
export function silkPoint(from: { x: number; z: number }, to: { x: number; z: number }, progress: number): { x: number; y: number; z: number } {
  const p = Math.max(0, Math.min(1, progress));
  return { x: from.x + (to.x - from.x) * p, y: SILK_CHEST + arcHeight(p, SILK_ARC), z: from.z + (to.z - from.z) * p };
}
