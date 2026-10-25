import { XINGTIAN as X } from '../../../content/xingtian-design.js';
import { fadeOut, motion, segmentFrame, sweep } from './visual-kit-timeline.js';

/**
 * Pure timing/layout for Hình Thiên Vũ Can Thích (h011). No Babylon imports: testable. Art measured by
 * assets/vfx-source/xingtian/process-art.py (active-inventory.json). Everything here is presentation; the server already
 * resolved damage (`ability skill-h011`, R6, pull .5) and the fire waves (`fire-wave-h011`, 6 long, half-width 1).
 */

/** Server windup for skill-h011 when the cast event omits it (combat.ts WINDUP_SECONDS). */
export const DEFAULT_WINDUP = .25;
/** A cast whose resolve never arrives (cancelled, caster died) is cleaned up this long after its windup. */
export const CAST_GRACE = .3;
export const RADIUS = X.blastRadius;

/**
 * Vortex sheet (4x4, 288 px canvas, hollow axis at the centre, ground line at .9097 of the height):
 * frames 1-4 the Ma Hỏa rim draws in and two arcs open (the windup), 5-8 the arcs swirl up around the body, 9-12 the full
 * hollow column, 13-16 it breaks into ash. The windup shows 1-4 and holds frame 4 until the server resolves.
 */
export const VORTEX_FRAMES = 16, WINDUP_FRAMES = 4, VORTEX_FRAME_SECONDS = .04;
export const VORTEX_BURST_FRAMES = VORTEX_FRAMES - WINDUP_FRAMES;
export const VORTEX_LIFE = VORTEX_BURST_FRAMES * VORTEX_FRAME_SECONDS;
/** World width of the vortex plane: the painted column is ≈ .87 of it, about 1.4× the hero sprite, inside the R6 ring. */
export const VORTEX_SIZE = 10.5, VORTEX_ANCHOR_Y = .9097;
/** The column swells from this share of its size at the first windup frame, to this at the resolve, then overshoots to 1. */
export const WINDUP_SCALE_FROM = .62, WINDUP_SCALE_TO = .82;
export const REDUCED_VORTEX_FRAME = 8, REDUCED_BURST_LIFE = .55;

export function windupFrame(age: number, windup: number): number {
  return Math.min(WINDUP_FRAMES - 1, Math.floor(Math.max(0, age) / (Math.max(.05, windup) / WINDUP_FRAMES)));
}
export function windupPose(age: number, windup: number, reduced: boolean): { frame: number; scale: number; alpha: number } {
  const grow = sweep(age, 0, Math.max(.05, windup));
  return { frame: reduced ? WINDUP_FRAMES - 1 : windupFrame(age, windup),
    scale: reduced ? WINDUP_SCALE_TO : WINDUP_SCALE_FROM + (WINDUP_SCALE_TO - WINDUP_SCALE_FROM) * motion.easeOut(grow),
    alpha: reduced ? .85 : Math.min(1, age / (Math.max(.05, windup) * .5)) };
}
export function burstPose(age: number, reduced: boolean): { frame: number; scale: number; alpha: number } {
  if (reduced) return { frame: REDUCED_VORTEX_FRAME, scale: 1, alpha: fadeOut(age, REDUCED_BURST_LIFE - .25, .25) };
  return { frame: segmentFrame(age, WINDUP_FRAMES, VORTEX_BURST_FRAMES, VORTEX_FRAME_SECONDS),
    scale: WINDUP_SCALE_TO + (1 - WINDUP_SCALE_TO) * motion.impactOvershoot(sweep(age, 0, .18)),
    alpha: fadeOut(age, VORTEX_LIFE - .08, .08) };
}

/**
 * Ground ring: the painted rim is an ellipse 1200 x 985 px of a 1254 canvas (pre-foreshortened), so the plane is stretched in
 * Z to make a true circle of the gameplay radius. The painted centre is a few px off the canvas centre; the plane is shifted back.
 */
export const GROUND_EXTENT_X = .9553, GROUND_EXTENT_Z = .7847;
export const GROUND_CENTRE_X = .004, GROUND_CENTRE_Z = .0136;
export const GROUND_SIZE_X = RADIUS * 2 / GROUND_EXTENT_X, GROUND_SIZE_Z = RADIUS * 2 / GROUND_EXTENT_Z;
export const GROUND_HOLD = .2, GROUND_COOL = .55;
export const GROUND_LIFE = GROUND_HOLD + GROUND_COOL;
/** Windup: the rim fades in from this alpha to the next as the resolve nears (the server fixed the area at the cast). */
export const GROUND_WINDUP_ALPHA: readonly [number, number] = [.3, .8];
export function groundWindupAlpha(age: number, windup: number): number {
  return GROUND_WINDUP_ALPHA[0] + (GROUND_WINDUP_ALPHA[1] - GROUND_WINDUP_ALPHA[0]) * motion.easeOut(sweep(age, 0, Math.max(.05, windup)));
}
/** After the resolve: snaps in, holds, then cools and tightens a little. Never a lasting damage zone. */
export function groundBurstPose(age: number, reduced: boolean): { alpha: number; scale: number } {
  const cool = sweep(age, GROUND_HOLD, GROUND_COOL);
  return { alpha: Math.min(1, age / .05) * fadeOut(age, GROUND_HOLD, GROUND_COOL), scale: reduced ? 1 : 1 - .05 * motion.settle(cool) };
}
/** Embers pulled in from the R6 rim during the windup, per second. */
export const PULL_PER_SECOND = 70;

/** Fire wave (`berserk-wave.webp`, 3.32:1, axe head on +X at .994, ember tail at .005): a 6 x 2 lane along `direction`. */
export const WAVE_LENGTH = X.fireWaveLength, WAVE_HALF_WIDTH = X.fireWaveHalfWidth;
export const WAVE_ASPECT = 3.3247;
export const WAVE_WIDTH = WAVE_LENGTH / WAVE_ASPECT;
export const WAVE_FLIGHT = .22, WAVE_HOLD = .06, WAVE_FADE = .2;
export const WAVE_LIFE = WAVE_FLIGHT + WAVE_HOLD + WAVE_FADE;
export const WAVE_HEIGHT = .8;

/** Head distance from the caster `age` seconds after the event (decelerating), and the visible length behind it. */
export function wavePose(age: number, reduced: boolean): { head: number; length: number; alpha: number } {
  const head = WAVE_LENGTH * (reduced ? 1 : motion.easeOut(sweep(age, 0, WAVE_FLIGHT)));
  const retreat = reduced ? 0 : motion.settle(sweep(age, WAVE_FLIGHT + WAVE_HOLD, WAVE_FADE));
  return { head, length: Math.min(WAVE_LENGTH, head) * (1 - retreat),
    alpha: reduced ? fadeOut(age, .12, .18) : fadeOut(age, WAVE_FLIGHT + WAVE_HOLD, WAVE_FADE) };
}
/** Seconds until the head has travelled `distance` along the lane (so a monster flares as the wave reaches it). */
export function waveArrival(distance: number, reduced: boolean): number {
  if (reduced || distance <= 0) return 0;
  if (distance >= WAVE_LENGTH) return WAVE_FLIGHT;
  let low = 0, high = WAVE_FLIGHT;
  for (let i = 0; i < 24; i++) {
    const mid = (low + high) / 2;
    if (wavePose(mid, false).head < distance) low = mid; else high = mid;
  }
  return high;
}
/** Distance of a point along the lane and its sideways offset; null when it is outside the 6 x 2 lane. */
export function laneDistance(origin: { x: number; z: number }, direction: { x: number; z: number },
  point: { x: number; z: number }): number | null {
  const x = point.x - origin.x, z = point.z - origin.z;
  const along = x * direction.x + z * direction.z, side = Math.abs(x * direction.z - z * direction.x);
  return along >= 0 && along <= WAVE_LENGTH && side <= WAVE_HALF_WIDTH ? along : null;
}

/** Wave impact sheet: 8 frames (seed, axe-cut, flame, splash, curl, ash...), billboard at the monster. */
export const IMPACT_FRAMES = 8, IMPACT_FRAME_SECONDS = .05;
export const IMPACT_LIFE = IMPACT_FRAMES * IMPACT_FRAME_SECONDS, REDUCED_IMPACT_LIFE = .3, REDUCED_IMPACT_FRAME = 2;
export const IMPACT_SIZE = 4, IMPACT_ANCHOR_Y = .9, IMPACT_LIFT = 1.2, MAX_IMPACT_TARGETS = 12;
export function impactFrame(age: number, reduced: boolean): number {
  return reduced ? REDUCED_IMPACT_FRAME : segmentFrame(age, 0, IMPACT_FRAMES, IMPACT_FRAME_SECONDS);
}
export function impactAlpha(age: number, reduced: boolean): number {
  const life = reduced ? REDUCED_IMPACT_LIFE : IMPACT_LIFE;
  return Math.min(1, age / .02) * fadeOut(age, life - .08, .08);
}
export function impactLife(reduced: boolean): number { return reduced ? REDUCED_IMPACT_LIFE : IMPACT_LIFE; }

/**
 * Berserk shell (`unyielding-shell-sheet`, 4x4 pairs of 384x256: a left and a right shard around the torso gap): frames 1-4
 * form, 5-12 hold (ping-pong), 13-16 break apart and fall as ash. Follows the server's `berserk.remaining` (≤ 5 s).
 */
export const SHELL_FRAMES = 16, SHELL_FORM_FRAMES = 4, SHELL_FORM_FRAME_SECONDS = .1;
export const SHELL_HOLD_FIRST = 4, SHELL_HOLD_COUNT = 8, SHELL_HOLD_FRAME_SECONDS = .09;
export const SHELL_EXIT_FIRST = 12, SHELL_EXIT_FRAMES = 4, SHELL_EXIT_SECONDS = .3;
/** World size of the pair (the torso gap ≈ 30 % of the width leaves the hero visible); feet at .9062 of the height. */
export const SHELL_WIDTH = 9, SHELL_HEIGHT = 6, SHELL_ANCHOR_Y = .9062;
export const REDUCED_SHELL_FRAME = 7;
export const SHELL_MARKER_GRACE = .12;

/** Seconds into the exit when `remaining` seconds of the state are left (0 while more than the exit time remains); undefined = not exiting. */
export function shellExitAge(remaining: number): number | undefined {
  return remaining <= SHELL_EXIT_SECONDS ? SHELL_EXIT_SECONDS - Math.max(0, remaining) : undefined;
}
export function shellFrame(age: number, exitAge: number | undefined, reduced: boolean): { frame: number; alpha: number } {
  if (exitAge !== undefined) {
    const step = SHELL_EXIT_SECONDS / SHELL_EXIT_FRAMES;
    return { frame: reduced ? SHELL_EXIT_FIRST + 1 : SHELL_EXIT_FIRST + Math.min(SHELL_EXIT_FRAMES - 1, Math.floor(exitAge / step)),
      alpha: fadeOut(exitAge, SHELL_EXIT_SECONDS * .7, SHELL_EXIT_SECONDS * .3) };
  }
  if (reduced) return { frame: REDUCED_SHELL_FRAME, alpha: 1 };
  const formTime = SHELL_FORM_FRAMES * SHELL_FORM_FRAME_SECONDS;
  if (age < formTime) return { frame: Math.floor(age / SHELL_FORM_FRAME_SECONDS), alpha: Math.min(1, age / .08) };
  const step = Math.floor((age - formTime) / SHELL_HOLD_FRAME_SECONDS) % (2 * SHELL_HOLD_COUNT - 2);
  return { frame: SHELL_HOLD_FIRST + (step < SHELL_HOLD_COUNT ? step : 2 * SHELL_HOLD_COUNT - 2 - step), alpha: 1 };
}
