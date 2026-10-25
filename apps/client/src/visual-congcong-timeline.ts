import { arcHeight, fadeOut, motion, sweep, unitDirection } from './visual-kit-timeline.js';

/**
 * Pure timing for Cộng Công VFX (no Babylon imports) so the beats are testable.
 * Gameplay numbers come from content/congcong-design.ts; these only map time to visuals.
 *
 * Ultimate beats: cast (windup) → mountain rises and cracks → impact → mountain breaks,
 * tsunami ring expands to waveRadius, crashes → black ice holds for iceVisualSeconds.
 */

/** Manifest ids (visual-kit-atlases.json) of the three Cộng Công flipbooks. */
export const CONGCONG_ATLAS = { buzhou: 'congcong-buzhou', splash: 'congcong-splash', icecage: 'congcong-icecage' } as const;

/** Atlas layout of vfx-congcong-buzhou.webp: rise 0-5, crack 6-9, break 10-15. */
export const BUZHOU_FRAMES = 16;
export const BUZHOU_BREAK_FRAME_SECONDS = .075;
/** Seconds after impact until the last mountain frame has played. */
export const BUZHOU_BREAK_SECONDS = 6 * BUZHOU_BREAK_FRAME_SECONDS;

/** Mountain frame for `age` seconds after the cast; `impactAge` is when the server ability landed. */
export function buzhouFrame(age: number, windup: number, impactAge?: number): number {
  if (impactAge !== undefined && age >= impactAge) {
    return Math.min(BUZHOU_FRAMES - 1, 10 + Math.floor((age - impactAge) / BUZHOU_BREAK_FRAME_SECONDS));
  }
  const rise = Math.max(.05, Math.min(.36, windup * .45));
  if (age < rise) return Math.min(5, Math.floor(age / rise * 6));
  const crack = Math.max(.05, windup - rise);
  return Math.min(9, 6 + Math.floor((age - rise) / crack * 4));
}

/** Tsunami ring: expands over TSUNAMI_EXPAND, crashes until TSUNAMI_CRASH_END, drains by TSUNAMI_LIFE. */
export const TSUNAMI_EXPAND = .5;
export const TSUNAMI_CRASH_END = .78;
export const TSUNAMI_LIFE = 1.05;
const TSUNAMI_START_RADIUS = .35;
export function tsunamiProgress(age: number): number {
  return motion.easeOut(age / TSUNAMI_EXPAND);
}

/** Radius of the wave crest; never exceeds the server wave radius. */
export function tsunamiRadius(age: number, maxRadius: number): number {
  const start = Math.min(TSUNAMI_START_RADIUS, maxRadius);
  const progress = tsunamiProgress(age);
  return progress >= 1 ? maxRadius : Math.min(maxRadius, start + (maxRadius - start) * progress);
}

/** 0 = standing crest, 1 = crashed outward and flat. */
export function tsunamiCrash(age: number): number {
  if (age <= TSUNAMI_EXPAND) return 0;
  return Math.min(1, (age - TSUNAMI_EXPAND) / (TSUNAMI_CRASH_END - TSUNAMI_EXPAND));
}

/** Wall height multiplier: quick rise, hold, sink after the crash. */
export function tsunamiHeight(age: number): number {
  if (age < .15) return .15 + .85 * age / .15;
  if (age < TSUNAMI_CRASH_END) return 1;
  return fadeOut(age, TSUNAMI_CRASH_END, TSUNAMI_LIFE - TSUNAMI_CRASH_END);
}

/** Black ice: spreads with the wave, holds for the server freeze, shatters in the last ICE_SHATTER seconds. */
export const ICE_SHATTER = .35;

export function blackIceSpread(age: number): number {
  return Math.max(.08, tsunamiProgress(age));
}

export function blackIceShatter(age: number, duration: number): number {
  const start = duration - ICE_SHATTER;
  return age <= start ? 0 : Math.min(1, (age - start) / ICE_SHATTER);
}

/** Atlas layout of vfx-congcong-splash.webp: 12 frames, the last one empty. */
export const SPLASH_FRAME_SECONDS = .05;
export const SPLASH_LIFE = 11 * SPLASH_FRAME_SECONDS;

export function splashFrame(age: number): number {
  return Math.min(10, Math.floor(age / SPLASH_FRAME_SECONDS));
}

/** Atlas layout of vfx-congcong-icecage.webp: grow 0-3, hold 4-8, shatter 9-11. */
export const CAGE_GROW_SECONDS = .25;
export const CAGE_SHATTER_SECONDS = .21;

export function iceCageFrame(age: number, shatterAge?: number): number {
  if (shatterAge !== undefined && age >= shatterAge) {
    return Math.min(11, 9 + Math.floor((age - shatterAge) / (CAGE_SHATTER_SECONDS / 3)));
  }
  if (age < CAGE_GROW_SECONDS) return Math.min(3, Math.floor(age / CAGE_GROW_SECONDS * 4));
  // Slow glint loop over the hold frames.
  return 4 + Math.floor((age - CAGE_GROW_SECONDS) * 8) % 5;
}

/** Basic frontal cleave: the water crescent head sweeps, then the tail catches up. */
export const CLEAVE_LIFE = .34;

export function cleaveSweep(age: number): { head: number; tail: number } {
  return { head: sweep(age, 0, .18), tail: sweep(age, .08, CLEAVE_LIFE - .08) };
}

/**
 * Swing direction: the server's unit→target `direction`, else derived from caster→event point.
 * Never falls back to a fixed axis — that drew the crescent behind the hero.
 */
export function cleaveDirection(event: { direction?: { x: number; z: number }; x?: number; z?: number },
  origin: { x: number; z: number }): { x: number; z: number } | undefined {
  return unitDirection(event, origin);
}

/** Ally shield bolt travelling from Cộng Công: parabolic arc over BOLT_SECONDS. */
export const BOLT_SECONDS = .34;

export function boltArcHeight(t: number, peak: number): number {
  return arcHeight(t, peak);
}
