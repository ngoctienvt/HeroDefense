import { LUCNHI as L } from '../../../content/lucnhi-design.js';
import { fadeOut, motion, segmentFrame, sweep } from './visual-kit-timeline.js';

/**
 * Pure timing/layout for Lục Nhĩ Mỹ Hầu (h03Y). No Babylon imports: testable. Art measured by
 * assets/vfx-source/lucnhi/process-art.py (active-inventory.json). Presentation only: the server owns the
 * lock point, the six pulses and their target lists, and hides the caster through `shadowAssault`.
 */

/** Server windup for skill-h03Y when the cast event omits it (combat.ts WINDUP_SECONDS). */
export const DEFAULT_WINDUP = .25;
/** A cast whose resolve never arrives (cancelled, caster died) is cleaned up this long after its windup. */
export const CAST_GRACE = .3;

/** Sheet atlases are 4×2 cells of 320 px; ground line / star centre as a fraction of the (padded) cell from the top. */
export const SHEET_COLUMNS = 4, SHEET_ROWS = 2, SHEET_FRAMES = 8;
export const VANISH_ANCHOR = .7078, RETURN_ANCHOR = .7897, HIT_ANCHOR = .6716;
/** Plane sizes (world units): the smoke whorl spans ≈ .9 of the canvas, the six-point star ≈ .5. */
export const SMOKE_SIZE = 5.2, HIT_SIZE = 3.2;

/** Vanish sheet: frames 1–4 gather during the windup (peak = the seam closes), 5–8 disperse after the resolve. */
export const VANISH_GATHER_FRAMES = 4;
export const VANISH_DISPERSE_SECONDS = .2;
/** Return sheet plays once, when the assault marker is lost. */
export const RETURN_SECONDS = .25;

/** Hide the blob a hair before the end so the last, nearly empty frame never pops off. */
const FADE_TAIL = .05;

/** Frame of the vanish sheet: gathers over the windup, holds the peak while the resolve is late, then disperses. */
export function vanishFrame(age: number, windup: number, resolvedAt?: number): number {
  if (resolvedAt !== undefined && age >= resolvedAt) {
    const step = VANISH_DISPERSE_SECONDS / (SHEET_FRAMES - VANISH_GATHER_FRAMES);
    return segmentFrame(age - resolvedAt, VANISH_GATHER_FRAMES, SHEET_FRAMES - VANISH_GATHER_FRAMES, step);
  }
  return segmentFrame(age, 0, VANISH_GATHER_FRAMES, Math.max(.02, windup) / VANISH_GATHER_FRAMES);
}

/** When the smoke is released: after its dispersal, or (no resolve) after windup + grace. */
export function vanishEnd(windup: number, resolvedAt?: number): number {
  return resolvedAt === undefined ? windup + CAST_GRACE : resolvedAt + VANISH_DISPERSE_SECONDS;
}

export function vanishAlpha(age: number, windup: number, resolvedAt: number | undefined, reduced: boolean): number {
  const end = vanishEnd(windup, resolvedAt);
  const grow = reduced ? 1 : Math.min(1, age / .05);
  return grow * fadeOut(age, end - (reduced ? .12 : FADE_TAIL), reduced ? .12 : FADE_TAIL);
}

export function returnFrame(age: number): number {
  return segmentFrame(age, 0, SHEET_FRAMES, RETURN_SECONDS / SHEET_FRAMES);
}
export function returnAlpha(age: number, reduced: boolean): number {
  return fadeOut(age, RETURN_SECONDS - (reduced ? .12 : FADE_TAIL), reduced ? .12 : FADE_TAIL);
}

/** Lock boundary: two open arcs (214° each) turn 180° apart and close into the full R6.5 ring over the windup. */
export const BOUNDARY_RADIUS = L.strikeRadius;
/** Painted arc: fitted ring radius = .9085 of the half canvas (process-art.py). */
export const BOUNDARY_RING_RATIO = .9085;
export const BOUNDARY_SIZE = BOUNDARY_RADIUS * 2 / BOUNDARY_RING_RATIO;
export const BOUNDARY_HOLD = .06, BOUNDARY_FADE = .25;

export function boundaryEnd(windup: number, resolvedAt?: number): number {
  return resolvedAt === undefined ? windup + CAST_GRACE : resolvedAt + BOUNDARY_HOLD + BOUNDARY_FADE;
}

/** `spin` is the turn still to go (rad) before the arcs lock; arc B uses `spin` mirrored and offset by π. */
export function boundaryPose(age: number, windup: number, resolvedAt: number | undefined, reduced: boolean):
  { alpha: number; scale: number; spin: number } {
  const close = reduced ? 1 : motion.settle(sweep(age, 0, Math.max(.05, windup)));
  const end = boundaryEnd(windup, resolvedAt);
  const fade = resolvedAt === undefined ? fadeOut(age, end - BOUNDARY_FADE, BOUNDARY_FADE)
    : fadeOut(age, resolvedAt + BOUNDARY_HOLD, BOUNDARY_FADE);
  return { alpha: (reduced ? 1 : Math.min(1, age / .06)) * fade, scale: 1 + .1 * (1 - close), spin: (1 - close) * Math.PI / 3 };
}

/**
 * A server pulse: the cudgel flies in along `strikeDirection` and lands on each listed target; the six-point
 * hit sheet opens there. Pulse k uses the k-th 60° direction, so six pulses draw the six points of the seal.
 */
export const MAX_PULSE_TARGETS = 12;
export const STAFF_FLIGHT = .07, STAFF_FADE = .06;
export const STAFF_LENGTH = 3.6, STAFF_ASPECT = 4.5714, STAFF_WIDTH = STAFF_LENGTH / STAFF_ASPECT;
export const STAFF_HEIGHT = 1.1, STAFF_RUN_UP = 2.6;
export const HIT_PER_FRAME = .022, HIT_LIFE = SHEET_FRAMES * HIT_PER_FRAME;
export const HIT_LIFT = .9;

/** Unit direction (x, z) of pulse `index` (1..strikes); clamped, never an arbitrary axis. */
export function strikeDirection(index: number): { x: number; z: number } {
  const k = Math.max(1, Math.min(L.strikes, Math.floor(index) || 1));
  const angle = (k - 1) * Math.PI / 3 + Math.PI / 6;
  return { x: Math.cos(angle), z: Math.sin(angle) };
}

export function staffProgress(age: number): number { return motion.launch(sweep(age, 0, STAFF_FLIGHT)); }
export function staffAlpha(age: number): number { return fadeOut(age, STAFF_FLIGHT, STAFF_FADE); }
export function hitFrame(age: number, reduced: boolean): number {
  return reduced ? 1 : segmentFrame(age, 0, SHEET_FRAMES, HIT_PER_FRAME);
}
export function hitAlpha(age: number, reduced: boolean): number {
  return reduced ? fadeOut(age, HIT_LIFE - .09, .09) : fadeOut(age, HIT_LIFE - FADE_TAIL, FADE_TAIL);
}

/** Basic wave (`trait-h03Y`): one cudgel along the pierce line, flight and fade. */
export const BASIC_FLIGHT = .12, BASIC_FADE = .1;
export function basicProgress(age: number): number { return motion.launch(sweep(age, 0, BASIC_FLIGHT)); }
export function basicAlpha(age: number): number { return fadeOut(age, BASIC_FLIGHT, BASIC_FADE); }
/** Seconds after the throw that the head reaches `distance` along the pierce line (launch is cubic). */
export function basicArrival(distance: number): number {
  return BASIC_FLIGHT * Math.cbrt(Math.min(1, Math.max(0, distance / L.waveLength)));
}

/** Weakness seal (crit vulnerability): painted ≈ .7568 of the canvas, ground decal under the monster. */
export const EXPOSED_DIAMETER = 2.1, EXPOSED_EXTENT = .7568;
export const EXPOSED_SIZE = EXPOSED_DIAMETER / EXPOSED_EXTENT;
export const EXPOSED_POP = .14, EXPOSED_SPIN = .35;
export const SPLIT_LIFE = .35, SPLIT_TRAVEL = 1.1, SPLIT_COLUMNS = 3, SPLIT_ROWS = 2;
export const MAX_SPLITTING = 10;

/** Pop-in with overshoot on first sight (age counted from the first marked frame, never reset by re-marks). */
export function exposedPose(age: number, time: number, reduced: boolean): { scale: number; alpha: number; spin: number } {
  if (reduced) return { scale: 1, alpha: .9, spin: 0 };
  const pop = sweep(age, 0, EXPOSED_POP);
  return { scale: motion.impactOvershoot(pop), alpha: Math.min(1, pop * 3) * (.88 + .12 * Math.sin(time * 5)), spin: age * EXPOSED_SPIN };
}

/** One of the six strokes after the weakness ends: it flies out along its own spike while fading. */
export function splitPose(age: number): { travel: number; alpha: number; scale: number } {
  const t = sweep(age, 0, SPLIT_LIFE);
  return { travel: SPLIT_TRAVEL * motion.settle(t), alpha: fadeOut(age, SPLIT_LIFE * .35, SPLIT_LIFE * .65), scale: 1 - .12 * t };
}
/** Reduced motion: a short plain fade, no strokes. */
export const REDUCED_SPLIT_LIFE = .15;
