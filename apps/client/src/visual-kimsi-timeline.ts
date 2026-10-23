import { KIMSI as K } from '../../../content/kimsi-design.js';
import { EASE_OUT_KEYS, fadeOut, motion, piecewise, segmentFrame, sweep } from './visual-kit-timeline.js';

/**
 * Pure timing/layout for Kim Sí Đại Bằng (h016). No Babylon imports: testable.
 * Art measured by assets/vfx-source/kimsi/process-art.py (active-inventory.json). Everything here is presentation;
 * the server already resolved damage, bleed and berserk at the `ability` event.
 */

/** Server windup for skill-h016 when the cast event omits it. */
export const DEFAULT_WINDUP = .25;
/** A cast whose resolve never arrives is dropped this long after its windup. */
export const CAST_GRACE = .3;

/** Storm sheet: 16 frames, rosette drawn top-down (laid flat). Row 0 gathers, rows 1-3 cut, burst and dissipate. */
export const STORM_FRAMES = 16, STORM_GATHER_FRAMES = 4, STORM_FRAME_SECONDS = .034;
export const STORM_BURST_FRAMES = STORM_FRAMES - STORM_GATHER_FRAMES;
export const STORM_BURST_LIFE = STORM_BURST_FRAMES * STORM_FRAME_SECONDS;
/** Farthest painted pixel of any storm frame is .9865 of the half-canvas, so the sheet spans exactly the server radius. */
export const STORM_EXTENT = .9865;
export const STORM_SIZE = K.stormRadius * 2 / STORM_EXTENT;
/** Peak frame of the burst (reduced motion holds it). */
export const STORM_PEAK_FRAME = 6;

/** Gather: frames 0-3 follow the windup and the feathers swirl in from the rim to the caster. */
export function gatherFrame(age: number, windup: number): number {
  return Math.min(STORM_GATHER_FRAMES - 1, Math.floor(sweep(age, 0, Math.max(.05, windup)) * STORM_GATHER_FRAMES));
}
export function gatherScale(age: number, windup: number, reduced: boolean): number {
  return reduced ? 1 : .55 + .45 * motion.settle(sweep(age, 0, Math.max(.05, windup)));
}
/** The held gather frame fades if the resolve never comes. */
export function gatherAlpha(age: number, windup: number): number {
  return Math.min(1, age / .06) * fadeOut(age, windup + .05, CAST_GRACE - .05);
}

export function burstFrame(age: number, reduced: boolean): number {
  return reduced ? STORM_PEAK_FRAME
    : segmentFrame(age, STORM_GATHER_FRAMES, STORM_BURST_FRAMES, STORM_FRAME_SECONDS);
}
export function burstAlpha(age: number, reduced: boolean): number {
  return reduced ? fadeOut(age, .12, .2) : fadeOut(age, STORM_BURST_LIFE - .08, .08);
}
/** Opens from 86 % and settles on exactly 1; the overshoot never passes the gameplay radius by more than 2 %. */
export function burstScale(age: number, reduced: boolean): number {
  return reduced ? 1 : .86 + .14 * motion.impactOvershoot(sweep(age, 0, .12));
}
export const BURST_LIFE = STORM_BURST_LIFE;

/** Feather ring: single feathers (3.92:1, tip +X) swirling in during the windup and thrown out at the resolve. */
export const FEATHER_COUNT = 14, FEATHER_LENGTH = 2.7, FEATHER_ASPECT = 3.9184;
export const FEATHER_HEIGHT = .9;
export const RING_START = K.stormRadius, RING_END = 1.5;
export const THROW_SECONDS = .32;

/** Phase angle and radius of feather `i` `age` seconds into the windup (accelerating inward, spinning faster). */
export function gatherFeather(i: number, age: number, windup: number): { angle: number; radius: number } {
  const t = sweep(age, 0, Math.max(.05, windup));
  const base = (i / FEATHER_COUNT) * Math.PI * 2;
  return { angle: base + 5.5 * t + .6 * Math.sin(i), radius: RING_START + (RING_END - RING_START) * motion.launch(t) };
}
/** Same feather `age` seconds after the resolve: swirls out to just inside the edge, then fades. */
export function throwFeather(i: number, age: number): { angle: number; radius: number; alpha: number } {
  const t = sweep(age, 0, THROW_SECONDS);
  const base = (i / FEATHER_COUNT) * Math.PI * 2 + 5.5;
  return { angle: base + 2.2 * t, radius: RING_END + (K.stormRadius - .5 - RING_END) * piecewise(EASE_OUT_KEYS, t),
    alpha: fadeOut(age, THROW_SECONDS * .55, THROW_SECONDS * .45) };
}
/** World-flat yaw that points a plane's local +X along the tangent of a circle at `angle` (swirling direction). */
export function tangentYaw(angle: number, inward = .35): number {
  const dx = -Math.sin(angle) - Math.cos(angle) * inward, dz = Math.cos(angle) - Math.sin(angle) * inward;
  return Math.atan2(-dz, dx);
}

/** Feather-cut sheet (4x2, 8 frames): one X cut over a target. */
export const CUT_FRAMES = 8, CUT_FRAME_SECONDS = .04, CUT_LIFE = CUT_FRAMES * CUT_FRAME_SECONDS;
export const CUT_SIZE = 2.7, CUT_BASIC_SIZE = 1.7, CUT_CRIT_SIZE = 2.3, CUT_LIFT = 1;
/** One wave: the cut reaches a target `distance` units from the caster up to this long after the resolve. */
export const CUT_WAVE_SECONDS = .12;
export function cutDelay(distance: number, reduced: boolean): number {
  return reduced ? 0 : CUT_WAVE_SECONDS * Math.min(1, Math.max(0, distance) / K.stormRadius);
}
export function cutFrame(age: number, reduced: boolean): number {
  return reduced ? 3 : Math.min(CUT_FRAMES - 1, Math.floor(age / CUT_FRAME_SECONDS));
}
export function cutAlpha(age: number, reduced: boolean): number {
  return reduced ? fadeOut(age, .12, .15) : 1;
}
export const CUT_REDUCED_LIFE = .27;

/** Ground crescents of the storm, evenly around the caster (one simultaneous cut, not a rain). */
export const STORM_SLASHES = 4;
export const STORM_SLASH_LIFE = .3;
export function stormSlashDirection(i: number): { x: number; z: number } {
  const angle = (i / STORM_SLASHES) * Math.PI * 2 + Math.PI / 4;
  return { x: Math.cos(angle), z: Math.sin(angle) };
}

/** Basic strike: a crescent on the frontal half-plane; a double strike swings the second crescent to the other side. */
export const BASIC_REACH = K.cleaveRadius, BASIC_ARC = 1.45, BASIC_LIFE = .22;
export const DOUBLE_STRIKE_WINDOW = .5;
export function strikeDirection(dir: { x: number; z: number }, followUp: boolean, flip: boolean): { x: number; z: number } {
  if (!followUp) return dir;
  const turn = flip ? -.4 : .4, c = Math.cos(turn), s = Math.sin(turn);
  return { x: dir.x * c - dir.z * s, z: dir.x * s + dir.z * c };
}

/** Berserk mantle: 4x8 atlas of 3:1 strips, layer A = even raw rows (shoulder), layer B = odd rows (feet). */
export const MANTLE_COLUMNS = 4, MANTLE_ROWS = 8, MANTLE_ASPECT = 3;
export type MantleLayer = 'shoulder' | 'feet';
export const MANTLE_WIDTH: Record<MantleLayer, number> = { shoulder: 4.6, feet: 4.9 };
export const MANTLE_LIFT: Record<MantleLayer, number> = { shoulder: 1.55, feet: .4 };
export const MANTLE_INTRO_FRAMES = 2, MANTLE_INTRO_SECONDS = .08, MANTLE_LOOP_SECONDS = .075;
/** Last loop step of each layer (layer B's fade steps are cut by the canvas edge, so it loops 2..9 and fades in code). */
export const MANTLE_LOOP_END: Record<MantleLayer, number> = { shoulder: 11, feet: 9 };
export const MANTLE_FOLD_SECONDS = .3;

/** Atlas frame index (row-major in the 4x8 grid) of step `k` (0..15) of a layer. */
export function mantleAtlasFrame(layer: MantleLayer, k: number): number {
  const row = (layer === 'shoulder' ? 0 : 1) + 2 * (k >> 2);
  return row * MANTLE_COLUMNS + (k & 3);
}
/** Step of the layer `age` seconds after the marker appeared (intro, then looping); `phase` offsets the two layers. */
export function mantleStep(layer: MantleLayer, age: number, phase = 0): number {
  if (age < MANTLE_INTRO_FRAMES * MANTLE_INTRO_SECONDS) return Math.floor(age / MANTLE_INTRO_SECONDS);
  const loopLength = MANTLE_LOOP_END[layer] - MANTLE_INTRO_FRAMES + 1;
  const n = Math.floor((age - MANTLE_INTRO_FRAMES * MANTLE_INTRO_SECONDS) / MANTLE_LOOP_SECONDS) + phase;
  return MANTLE_INTRO_FRAMES + (n % loopLength);
}
/** Fold after the marker is lost: the held pale frame shrinks toward the body and fades in `MANTLE_FOLD_SECONDS`. */
export function mantleFold(layer: MantleLayer, age: number): { alpha: number; widthScale: number; heightScale: number; drop: number; step: number } {
  const t = sweep(age, 0, MANTLE_FOLD_SECONDS);
  const fadeStart = layer === 'shoulder' ? 12 : 10;
  return { alpha: 1 - t * t, widthScale: 1 - .45 * motion.settle(t), heightScale: 1 - .3 * t, drop: .7 * t * t,
    step: layer === 'shoulder' ? Math.min(15, fadeStart + Math.floor(t * 4)) : Math.min(11, fadeStart + Math.floor(t * 2)) };
}
export function mantleAppear(age: number, reduced: boolean): number {
  return reduced ? 1 : Math.min(1, age / .1);
}

/** Bleed scar (4x4, 16 frames): 0-3 appears, 4-11 holds, 12-15 fades; present exactly while the snapshot has a bleed. */
export const BLEED_SIZE = 1.15, BLEED_LIFT = .85, BLEED_INTRO_SECONDS = .05, BLEED_LOOP_SECONDS = .09, BLEED_FADE_SECONDS = .06;
export function bleedFrame(age: number): number {
  if (age < 4 * BLEED_INTRO_SECONDS) return Math.floor(age / BLEED_INTRO_SECONDS);
  return 4 + (Math.floor((age - 4 * BLEED_INTRO_SECONDS) / BLEED_LOOP_SECONDS) % 8);
}
export function bleedFadeFrame(age: number): number {
  return Math.min(15, 12 + Math.floor(age / BLEED_FADE_SECONDS));
}
export const BLEED_FADE_LIFE = 4 * BLEED_FADE_SECONDS;
/** Seconds between droplets while the scar is held. */
export const BLEED_DRIP_SECONDS = .55;

/** A marker missing for longer than this (frames of lag aside) ends its status. */
export const MARKER_GRACE = .12;
