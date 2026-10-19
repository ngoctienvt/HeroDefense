import { fadeOut, motion } from './visual-kit-timeline.js';

/**
 * Pure timing for Chúc Dung VFX (no Babylon imports) so the beats are testable.
 * Gameplay numbers (radius, lava/ember seconds) come from content/chucdung-design.ts; these only map
 * time to visuals.
 *
 * Ultimate beats: cast (windup telegraph heats up) → volcano erupts at the point with a shock ring and
 * a molten plume → volcano slumps and dissolves → lava pool stays for the server lavaSeconds.
 */

/** Volcano cone: rises with a small overshoot, holds, then slumps (uCrash) and dissolves. */
export const CONE_RISE = .16;
export const CONE_HOLD_END = .5;
export const CONE_LIFE = .8;
/** Reduced motion shows the cone briefly and static. */
export const CONE_LIFE_REDUCED = .38;

export function coneHeight(age: number): number {
  return age < CONE_RISE ? motion.impactOvershoot(age / CONE_RISE) : 1;
}

/** 0 = standing, 1 = slumped flat. */
export function coneCrash(age: number): number {
  return Math.max(0, Math.min(1, (age - CONE_HOLD_END) / (CONE_LIFE - CONE_HOLD_END)));
}

export function coneDissolve(age: number): number { return coneCrash(age) * .65; }

/** Molten plume above the crater: shoots up fast, thins, dissolves. */
export const PLUME_LIFE = .6;

export function plumeRise(age: number): number { return motion.settle(age / PLUME_LIFE); }

export function plumeDissolve(age: number): number {
  return Math.max(0, Math.min(1, (age / PLUME_LIFE - .3) / .7));
}

export function plumeAlpha(age: number): number { return fadeOut(age, PLUME_LIFE * .35, PLUME_LIFE * .65); }

/** Shock ring: expands to `max` along the authored ease-out, fading in its tail. */
export const RING_LIFE = .45;
export const STRIKE_RING_LIFE = .3;
const RING_START_RADIUS = .5;

export function ringRadius(age: number, life: number, max: number): number {
  const start = Math.min(RING_START_RADIUS, max);
  return start + (max - start) * motion.easeOut(age / life);
}

export function ringAlpha(age: number, life: number): number { return fadeOut(age, life * .25, life * .75); }

/** Windup telegraph: 0 → 1 across the server windup (min 0.05s to avoid division by ~0). */
export function telegraphCharge(age: number, windup: number): number {
  return Math.max(0, Math.min(1, age / Math.max(.05, windup)));
}

/** Pool of lava/embers: spreads out of the crater, holds, then cools away in the last `fade` seconds. */
export const POOL_SPREAD = .35;
export const LAVA_FADE = .9;
export const EMBER_FADE = .8;

export function poolSpread(age: number): number { return motion.easeOut(age / POOL_SPREAD); }

export function poolAlpha(age: number, total: number, fade: number): number {
  return Math.min(1, age / .12) * fadeOut(age, Math.max(0, total - fade), fade);
}
