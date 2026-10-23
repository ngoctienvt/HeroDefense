import { HAUNGHE as H } from '../../../content/hau-nghe-design.js';
import { fadeOut, motion, segmentFrame, sweep } from './visual-kit-timeline.js';

/**
 * Pure timing/layout for Hậu Nghệ Cửu Nhật Liên Châu Trảm (h017). No Babylon imports: testable.
 * Art measured by assets/vfx-source/hau-nghe/process-art.py (active-inventory.json). Everything here is
 * presentation; the server already resolved damage at the `ability` event.
 */

/** Server windup for skill-h017 when the cast event omits it (combat.ts WINDUP_SECONDS). */
export const DEFAULT_WINDUP = .25;
/** A cast whose impact never arrives (cancelled, caster died) is cleaned up this long after its windup. */
export const CAST_GRACE = .3;

/** Sunpiercer arrow art: 4.531:1, tip at .9902 of the width, shaft centred vertically. */
export const ARROW_ASPECT = 4.531;
export const ARROW_LENGTH = 9;
export const ARROW_WIDTH = ARROW_LENGTH / ARROW_ASPECT;
/** The basic shot flies a shorter arrow along the 12-unit pierce line. */
export const BASIC_ARROW_LENGTH = 6;
export const BASIC_ARROW_WIDTH = BASIC_ARROW_LENGTH / ARROW_ASPECT;

export const BASIC_FLIGHT = .1;
/** After arrival the arrow dissolves into the blast. */
export const ARROW_FADE = .1;
/** Height the arrow nocks at beside the caster and the height of its head when it strikes. */
export const NOCK_HEIGHT = 1.7, STRIKE_HEIGHT = .7;

/** Detonation sheet: 16 frames, blast centred in each cell; frames 6–7 reach the cell edge (peak). */
export const DETONATION_FRAMES = 16, DETONATION_FRAME_SECONDS = .04;
export const DETONATION_LIFE = DETONATION_FRAMES * DETONATION_FRAME_SECONDS;
/** Billboard size so the peak frames (≈ .92 of the cell) span the R6.5 blast; the ring marks the exact edge. */
export const DETONATION_SIZE = H.blastRadius * 2 / .92;
/** The blast centre sits a little above the cell middle once the billboard stands on the ground. */
export const DETONATION_ANCHOR_Y = .6;

/** Scorch decal: painted star reaches ≈ .96 of the half-size on its spokes. */
export const SCORCH_SIZE = H.blastRadius * 2 / .96;
export const SCORCH_HOLD = .3, SCORCH_COOL = .8;
export const SCORCH_LIFE = SCORCH_HOLD + SCORCH_COOL;

/**
 * The suns: seven discs (the art has seven; the user accepted that) hover in an arc above the caster and follow him
 * until the server confirms the resolve, then dive one after another onto the confirmed point; the blast starts as
 * the last one lands. Presentation only: damage was resolved by the server at the `ability` event.
 */
export const SUN_COUNT = 7;
/** Sun plane size (world units) and its swell while falling. */
export const SUN_SIZE = 1.7, SUN_DIVE_GROWTH = .35;
/** Arc above the caster: height of its base over the feet, half-width and rise of the middle sun. */
export const HOVER_HEIGHT = 4.1, ARC_RADIUS = 2.7, ARC_RISE = 1.1, ARC_HALF_ANGLE = 1.05;
/** No origin (lobby, reconnect): the suns start this high over the point. */
export const SKY_HEIGHT = 9;
export const SUN_POP_STAGGER = .03, SUN_POP_SECONDS = .12;
export const DIVE_STAGGER = .02, DIVE_FLIGHT = .18;
/** The last sun lands here; the blast plays at that moment. */
export const DIVE_BLAST_DELAY = (SUN_COUNT - 1) * DIVE_STAGGER + DIVE_FLIGHT;
/** Where each sun comes to rest around the point (ring radius), so the dive reads as seven suns, not one. */
export const LANDING_SPREAD = .9, LANDING_HEIGHT = .5;

/** Position of sun `i` in the arc: sideways (camera-right units, -1..1 scaled by the radius) and height above the base. */
export function arcOffset(i: number, count = SUN_COUNT): { side: number; rise: number } {
  const t = count === 1 ? 0 : (i / (count - 1)) * 2 - 1;
  const angle = t * ARC_HALF_ANGLE;
  return { side: Math.sin(angle) * ARC_RADIUS, rise: Math.cos(angle) * ARC_RISE };
}

/** Pop-in (overshoot) one after another from the middle outward, then a slow pulse and bob; reduced motion is still. */
export function hoverPose(i: number, age: number, time: number, reduced: boolean): { scale: number; alpha: number; bob: number } {
  const rank = Math.abs(i - (SUN_COUNT - 1) / 2);
  const pop = reduced ? 1 : motion.impactOvershoot(sweep(age, rank * SUN_POP_STAGGER, SUN_POP_SECONDS));
  const alpha = reduced ? 1 : Math.min(1, sweep(age, rank * SUN_POP_STAGGER, SUN_POP_SECONDS) * 3);
  return { scale: pop * (reduced ? 1 : 1 + .05 * Math.sin(time * 6 + i)), alpha, bob: reduced ? 0 : .12 * Math.sin(time * 3 + i * 1.3) };
}

/** Launch order, outermost first and alternating sides, so the dive sweeps inward and the middle sun lands last. */
export const DIVE_ORDER: readonly number[] = [0, 6, 1, 5, 2, 4, 3];
export function diveRank(i: number): number { return Math.max(0, DIVE_ORDER.indexOf(i)); }
export function diveDelay(i: number): number { return diveRank(i) * DIVE_STAGGER; }

/** Accelerating dive of sun `i`, `age` seconds after the resolve: 0 before its launch, 1 on landing. */
export function diveProgress(i: number, age: number): number {
  return Math.pow(sweep(age, diveDelay(i), DIVE_FLIGHT), 2.2);
}
/** Landing spot of sun `i` around the point. */
export function landingOffset(i: number): { x: number; z: number } {
  const angle = (i / SUN_COUNT) * Math.PI * 2;
  return { x: Math.cos(angle) * LANDING_SPREAD, z: Math.sin(angle) * LANDING_SPREAD };
}
/** A sun is drawn until it lands; it swells as it falls. */
export function diveScale(progress: number): number { return 1 + SUN_DIVE_GROWTH * progress; }

/** Arrow progress along its path (accelerating) and the post-arrival dissolve. */
export function flightProgress(age: number, flight: number): number {
  return motion.launch(sweep(age, 0, Math.max(.03, flight)));
}
export function arrowAlpha(age: number, flight: number): number {
  return fadeOut(age, flight, ARROW_FADE);
}

export function detonationFrame(age: number, reduced: boolean): number {
  return reduced ? 5 : Math.min(DETONATION_FRAMES - 1, segmentFrame(age, 0, DETONATION_FRAMES, DETONATION_FRAME_SECONDS));
}
export function detonationAlpha(age: number, reduced: boolean): number {
  return reduced ? fadeOut(age, .12, .2) : fadeOut(age, DETONATION_LIFE - .1, .1);
}

/** Scorch mark: snaps in with the blast, holds, then cools and tightens; never a lasting damage zone. */
export function scorchPose(age: number): { alpha: number; scale: number } {
  const cool = sweep(age, SCORCH_HOLD, SCORCH_COOL);
  return { alpha: Math.min(1, age / .06) * fadeOut(age, SCORCH_HOLD, SCORCH_COOL), scale: 1 - .08 * motion.settle(cool) };
}

/** Seconds the blast layers need before everything is released. */
export const BLAST_LIFE = Math.max(DETONATION_LIFE, SCORCH_LIFE);

/** When the blast plays after the confirmed resolve: as the last sun lands; at once with reduced motion. */
export function strikeDelay(reduced: boolean): number {
  return reduced ? 0 : DIVE_BLAST_DELAY;
}
