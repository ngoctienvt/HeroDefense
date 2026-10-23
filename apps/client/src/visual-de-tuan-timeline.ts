import { DE_TUAN as D } from '../../../content/new-divine-design.js';
import { fadeOut, motion, piecewise, segmentFrame } from './visual-kit-timeline.js';
import { ringState } from './visual-kit-recipe-timeline.js';
import { tier6HoldFrame } from './visual-tier6-timeline.js';

type Point = { x: number; z: number };
const clamp01 = (t: number): number => Math.max(0, Math.min(1, t));

/** Main and splash have distinct intensity; a missing main never promotes the first splash. */
export function solarSplashPoints<T extends Point>(targets: readonly T[], main?: Point): readonly T[] {
  if (!main) return targets;
  return targets.filter(point => Math.hypot(point.x - main.x, point.z - main.z) > .001);
}

/**
 * Pure beats of Đế Tuấn Thập Nhật Đồng Thăng (no Babylon imports, testable).
 * Sheet layouts (4×4 unless noted): convergence 0–9 ten crows gather into the sword, 10–15 sword unravels into feathers;
 * sunburst 0–3 ignite, 4–7 full ring, 8–11 feather debris, 12–15 embers; crow burst 4×2.
 * Beats: cast (windup) crows gather above the caster → ability event: sword dives onto the main target →
 * sunburst + shock ring to the real radius → scorch + feathers. Nothing here decides a result.
 */
export const CONVERGE_FRAMES = 10;
export const CONVERGE_LAST = CONVERGE_FRAMES - 1;
export const DISSOLVE_START = 10;
export const DISSOLVE_FRAMES = 6;
export const DISSOLVE_FRAME_SECONDS = .06;
export const DISSOLVE_SECONDS = DISSOLVE_FRAMES * DISSOLVE_FRAME_SECONDS;
/** Height of the convergence centre above the caster's feet, along screen-up (hero plane is 8.2 tall). */
export const CONVERGE_LIFT = 10.8;
export const CONVERGE_SIZE = 11.5;
/** A lost ability event never leaves the crows hanging past windup + this. */
export const CAST_GRACE = .6;

/** Frame 0–9 across the windup; reduced motion holds the formed sword. */
export function convergeFrame(age: number, windup: number, reduced: boolean): number {
  if (reduced) return CONVERGE_LAST;
  return Math.min(CONVERGE_LAST, Math.floor(clamp01(age / Math.max(.05, windup)) * CONVERGE_FRAMES));
}

export const convergeAlpha = (age: number, windup: number): number => .35 + .65 * clamp01(age / Math.max(.05, windup) * 2.2);

/** The flock sinks a little as it tightens into the blade, then hangs steady. */
export function convergeLift(age: number, windup: number, reduced: boolean): number {
  return reduced ? CONVERGE_LIFT : CONVERGE_LIFT + 1.6 * (1 - motion.settle(age / Math.max(.05, windup)));
}

/** After the ability event the blade leaves and the rest of the flock unravels (frames 10–15). */
export function dissolveFrame(age: number, reduced: boolean): number {
  return reduced ? DISSOLVE_START + 2 : segmentFrame(age, DISSOLVE_START, DISSOLVE_FRAMES, DISSOLVE_FRAME_SECONDS);
}
export const dissolveSeconds = (reduced: boolean): number => reduced ? .2 : DISSOLVE_SECONDS;

/** Telegraph rim reaches the server radius with the windup and cools out with the strike. */
export const rimAlpha = (age: number, windup: number, landedAge?: number): number =>
  (.28 + .62 * clamp01(age / Math.max(.05, windup))) * (landedAge === undefined ? 1 : fadeOut(landedAge, 0, .35));

/** Sword dive: accelerates from the convergence point onto the main target. */
export const DIVE_SECONDS = .16;
export const SWORD_LENGTH = 7.5;
/** Source strip is 1382×461: width keeps its own aspect. */
export const SWORD_WIDTH = SWORD_LENGTH * 461 / 1382;
export const SWORD_HIT_HEIGHT = 1.5;
const SWORD_FADE = .12;
export const SWORD_LIFE = DIVE_SECONDS + SWORD_FADE;
export const diveProgress = (age: number): number => motion.launch(age / DIVE_SECONDS);
export const swordAlpha = (age: number): number => age < DIVE_SECONDS ? 1 : fadeOut(age, DIVE_SECONDS, SWORD_FADE);

/** Sunburst flipbook: 16 frames, one-shot. */
export const BURST_FRAMES = 16;
export const BURST_FRAME_SECONDS = .045;
export const BURST_SECONDS = BURST_FRAMES * BURST_FRAME_SECONDS;
export const burstSeconds = (reduced: boolean): number => reduced ? .35 : BURST_SECONDS;
export const burstFrame = (age: number, reduced: boolean): number =>
  reduced ? 6 : segmentFrame(age, 0, BURST_FRAMES, BURST_FRAME_SECONDS);
/** Slight overshoot on arrival so the first frames land with weight, then settle. */
export const burstScale = (age: number, reduced: boolean): number => reduced ? 1 : 1 + .12 * (1 - motion.settle(age / .14));
export const MAIN_BURST_SIZE = 9.5;
export const SPLASH_BURST_SIZE = 3.6;
export const MAX_SPLASH_BURSTS = 10;
/** Foot of the sunburst art (fraction of plane height from the top, from the manifest). */
export const BURST_LIFT = .6;

/**
 * Shock ring = KitFxBank.ring(life RING_LIFE): its scale (ringState) runs .25 -> 1 over the first 40 % of the life and never
 * overshoots, so the rim lands on the real R8.5 at SHOCK_SECONDS. Splash bursts open when the rim reaches them.
 */
export const RING_LIFE = .8;
export const SHOCK_SECONDS = RING_LIFE * .4;
export const shockRadius = (age: number): number => D.skillRadius * ringState(age, RING_LIFE).scale;

/** Scorch (the ground decal) holds then cools; it marks where the blast was, it is no new danger zone. */
export const SCORCH_SECONDS = 1.5;
const SCORCH_KEYS = [[0, 0], [.08, .95], [.5, .75], [SCORCH_SECONDS, 0]] as const;
export const scorchAlpha = (age: number, reduced: boolean): number =>
  reduced ? fadeOut(age, .3, .5) * .85 : piecewise(SCORCH_KEYS, age);

/** Berserk wreath: P16 grow/hold/release driven only by the snapshot `remaining`. */
export const FORM_EXIT = .4;
export const FORM_WIDTH = 9.6;
/** Centre of the wreath above the feet along screen-up: crown just above the head, wing tips near the feet. */
export const FORM_CENTER_HEIGHT = 5.2;
export const FORM_FEET_DIAMETER = 6.2;
export function formFrame(remaining: number, reduced: boolean): number {
  const age = Math.max(0, D.berserkSeconds - remaining);
  return tier6HoldFrame(age, 16, remaining, reduced, FORM_EXIT);
}
/** Snapshots arrive slower than frames; a marker missing this long means the transformation really ended. */
export const FORM_GRACE = .25;
/** The feet decal fades with the same exit; late joins show it at once. */
export const formAlpha = (remaining: number): number => clamp01(remaining / FORM_EXIT);

/** Crow burst (crow-burst-h01I, R2.5 around the struck target): 8 frames. */
export const CROW_FRAME_SECONDS = .055;
export const CROW_FRAMES = 8;
export const CROW_SECONDS = CROW_FRAMES * CROW_FRAME_SECONDS;
/** packages/game-core/src/divine-god-combat.ts hits every monster within 2.5 of the struck target (not in DE_TUAN). */
export const CROW_BURST_RADIUS = 2.5;
export const CROW_SIZE = 6;
export const CROW_LIFT = 1.3;
/** Berserk attacks every ~0.4 s: cap concurrent bursts so a crowd never fills the screen. */
export const MAX_CROW_BURSTS = 3;
export const crowFrame = (age: number, reduced: boolean): number =>
  reduced ? 2 : segmentFrame(age, 0, CROW_FRAMES, CROW_FRAME_SECONDS);
export const crowSeconds = (reduced: boolean): number => reduced ? .22 : CROW_SECONDS;
export const crowScale = (age: number, reduced: boolean): number => reduced ? 1 : .8 + .2 * motion.impactOvershoot(age / .12);

/** Empowered hit strip (isCrit trait during berserk): head runs caster → target, then the streak cools. */
export const STREAK_SECONDS = .26;
export const STREAK_LENGTH = 5.2;
export const STREAK_WIDTH = STREAK_LENGTH * 461 / 1382;
export const MAX_STREAKS = 4;
export const streakHead = (age: number): number => motion.easeOut(age / (STREAK_SECONDS * .55));
export const streakAlpha = (age: number): number => fadeOut(age, STREAK_SECONDS * .5, STREAK_SECONDS * .5);
