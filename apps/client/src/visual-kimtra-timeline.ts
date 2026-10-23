/**
 * Pure timing for Kim Tra (h009) "Kim Chung Phản Kích Trận" (no Babylon imports, so it is testable).
 * Bell flipbook `kimtra-bell` (assets/vfx-source/kimtra/author.py bell): frames 0-3 materialise during
 * the server windup, 4-5 drop, 6 slam, 7-9 ring + dust, 10-15 fade while the seated shell takes over.
 * Every radius comes from the catalog / combat profile.
 */
import { HERO_COMBAT_PROFILES } from '../../../packages/contracts/src/combat-profiles.js';
import { HERO_BY_ID } from '../../../content/catalog.js';
import { motion, piecewise, segmentFrame, sweep } from './visual-kit-timeline.js';

export const KIMTRA_ID = 'h009';
export const KIMTRA_ATLAS = { bell: 'kimtra-bell', shatter: 'kimtra-shatter' } as const;
export const ARRAY_MASK_URL = '/assets/vfx-kimtra-array-mask.webp';

const geometry = HERO_COMBAT_PROFILES[KIMTRA_ID]?.geometry as unknown as { radius?: number; angle?: number } | undefined;
/** Frontal cleave reach (2.2) and half-angle (60°) of the basic sword swing. */
export const SLASH_REACH = geometry?.radius ?? 2.2;
export const SLASH_HALF_ANGLE = (geometry?.angle ?? Math.PI * 2 / 3) / 2;
/** Range in which the bell picks its second recipient (catalog skill radius 4.5). */
export const ARRAY_RADIUS = HERO_BY_ID[KIMTRA_ID]?.ability?.effect?.radius ?? 4.5;
/** Counter-strike radius while shielded (combat.ts: enemies within 3.0 of Kim Tra take 50%). */
export const REFLECT_RADIUS = 3;
/** Server windup used when a cast event carries none (combat.ts WINDUP_SECONDS). */
export const DEFAULT_WINDUP = .25;

/** Seconds of the post-impact part of the bell: drop .12, slam, then 9 frames at 18 fps. */
const DROP_SECONDS = .12;
const AFTER_FRAME_SECONDS = 1 / 18;
export const BELL_AFTER_SECONDS = DROP_SECONDS + 10 * AFTER_FRAME_SECONDS;
/** The seated shell fades in from frame 10 (when the solid bell starts to dissolve). */
export const SHELL_HANDOFF = DROP_SECONDS + 4 * AFTER_FRAME_SECONDS;
export const SHELL_FADE_IN = .3;
/** Bell frame while it forms during the windup (0-3), held on 3 until the ability arrives. */
export function bellFormingFrame(age: number, windup: number): number {
  return segmentFrame(age, 0, 4, Math.max(.04, windup) / 4);
}

/** Bell frame after the ability (`age` from impact): 4-5 drop, 6 slam, then 7-15. */
export function bellImpactFrame(age: number): number {
  if (age < DROP_SECONDS) return 4 + Math.min(1, Math.floor(age / (DROP_SECONDS / 2)));
  return segmentFrame(age - DROP_SECONDS, 6, 10, AFTER_FRAME_SECONDS);
}

/** Seconds the slam lands after the ability event (hit-stop/shake hook). */
export const SLAM_DELAY = DROP_SECONDS;

/** Formation sigil alpha: fades in over the windup, flares on the slam, gone before the dust settles over it. */
export function arrayAlpha(age: number, windup: number, impactAge: number | undefined): number {
  if (impactAge === undefined) return .75 * motion.settle(sweep(age, 0, Math.max(.05, windup)));
  return piecewise([[0, .75], [SLAM_DELAY, .95], [SLAM_DELAY + .18, 0]], impactAge);
}

/** Sigil radius: drawn at the skill radius, contracts toward the bell as it slams. */
export function arrayScale(impactAge: number | undefined): number {
  if (impactAge === undefined) return 1;
  return 1 - .55 * motion.impactOvershoot(sweep(impactAge, 0, SLAM_DELAY + .1));
}

/** Seated shell alpha after the handoff (0→1 over SHELL_FADE_IN). */
export function shellAlpha(sinceStart: number): number {
  return motion.settle(sweep(sinceStart, 0, SHELL_FADE_IN));
}

/**
 * The seated bell only stays full-size for the handoff. Allies that are never hit keep the shield (and the
 * bell) indefinitely, and enemies crowd Kim Tra, so it settles into a slimmer, fainter rim after this long;
 * a counter ring-out wakes it back to full. 0 = full bell, 1 = settled.
 */
export const SHELL_SETTLE_START = 1.2;
export function shellSettle(sinceWake: number): number { return motion.settle(sweep(sinceWake, SHELL_SETTLE_START, .5)); }

/** Shatter flipbook: 12 frames at 20 fps. */
export const SHATTER_SECONDS = 12 / 20;
export function shatterFrame(age: number): number { return segmentFrame(age, 0, 12, 1 / 20); }

/** Counter ring-out: the bell rings, a gold wave runs to REFLECT_RADIUS. */
export const RING_SECONDS = .42;
export function ringRadius(age: number): number { return REFLECT_RADIUS * motion.easeOut(sweep(age, 0, RING_SECONDS)); }
export function ringAlpha(age: number): number { return 1 - sweep(age, RING_SECONDS * .45, RING_SECONDS * .55); }
/** Bell shell pulse when it rings: quick squash then wobble back. */
export function ringPulse(age: number): number {
  return piecewise([[0, 1], [.05, 1.12], [.12, .95], [.2, 1.04], [.3, 1]], age);
}
/** One ring-out per Kim Tra per this many seconds (six blocked enemies can hit several times a second). */
export const RING_GATE = .35;

/** Basic sword arc: sweeps right → left over .16 s, tail eats it by .3 s. */
export const SLASH_LIFE = .3;
export function slashSweep(age: number): { head: number; tail: number } {
  return { head: motion.launch(sweep(age, 0, .16)) * .7 + motion.settle(sweep(age, 0, .16)) * .3,
    tail: motion.easeOut(sweep(age, .1, .2)) };
}
/** Events of one frontal swing arrive one per enemy hit; merge those of the same source within this window. */
export const SLASH_MERGE = .12;
