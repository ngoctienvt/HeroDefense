import { TUONG_THAN as T } from '../../../content/tuong-than-design.js';
import { fadeOut, motion, segmentFrame } from './visual-kit-timeline.js';

/**
 * Pure beats of Tướng Thần: Huyết Hải Vạn Thi Trận (no Babylon imports, testable).
 * Sheet layouts: awakening 4×4 — frames 0–3 blood ripples gather on the ground, 4–11 the crest curls over, 12–15 it
 * collapses back into droplets; general summon 4×2 — 0–4 the bone-horn ring rises with its blood pool, 5–7 it settles;
 * general hit 4×2 — 0–3 the slash opens, 4–7 it drips away. Nothing here decides a result: the server owns damage,
 * healing, the blood sea (`blood-sea.radius/remaining`) and the generals (`summonDuration`).
 */
const clamp01 = (t: number): number => Math.max(0, Math.min(1, t));

/** Real radius of the sea (design). The snapshot radius wins at runtime; this is the cast telegraph. */
export const SEA_RADIUS = T.seaRadius;
export const SEA_SECONDS = T.seaSeconds;
/** A lost resolve never leaves the charge hanging past windup + this. */
export const CAST_GRACE = .6;

/** Gather: blood ripples 0–3 across the windup, held if the resolve is late. Reduced motion shows one still. */
export const GATHER_LAST = 3;
export function gatherFrame(age: number, windup: number, reduced: boolean): number {
  if (reduced) return GATHER_LAST;
  return Math.min(GATHER_LAST, Math.floor(clamp01(age / Math.max(.05, windup)) * (GATHER_LAST + 1)));
}
export const gatherCharge = (age: number, windup: number): number => clamp01(age / Math.max(.05, windup));
export const gatherAlpha = (age: number, windup: number): number => .3 + .7 * clamp01(age / Math.max(.05, windup) * 2);
/** Ripple under the caster swells while the blood tightens into it. */
export const GATHER_SIZE = 6.4;
export const gatherScale = (age: number, windup: number, reduced: boolean): number =>
  reduced ? 1 : .55 + .45 * motion.settle(age / Math.max(.05, windup));

/** Surge: the crest (frames 4–15) starts on the resolve and plays through once. */
export const SURGE_START = 4;
export const SURGE_FRAMES = 12;
export const SURGE_FRAME_SECONDS = .065;
export const SURGE_SECONDS = SURGE_FRAMES * SURGE_FRAME_SECONDS;
export const surgeFrame = (age: number, reduced: boolean): number =>
  reduced ? 8 : segmentFrame(age, SURGE_START, SURGE_FRAMES, SURGE_FRAME_SECONDS);
export const surgeSeconds = (reduced: boolean): number => reduced ? .4 : SURGE_SECONDS;
/** The crest lands with a small overshoot, then settles. */
export const surgeScale = (age: number, reduced: boolean): number => reduced ? 1 : .8 + .2 * motion.impactOvershoot(age / .16);
export const surgeAlpha = (age: number, reduced: boolean): number => fadeOut(age, surgeSeconds(reduced) * .78, surgeSeconds(reduced) * .22);
/** Hero plane is 7.5 tall; the crest towers over him, the five side crests ring the real radius. */
export const CREST_WIDTH = 9.5;
export const RING_CRESTS = 5;
export const RING_CREST_WIDTH = 5.6;
export const RING_CREST_RADIUS = 5.4;
export const RING_CREST_STAGGER = .05;
export function ringCrestPoint(index: number, count = RING_CRESTS, radius = RING_CREST_RADIUS): { x: number; z: number } {
  const angle = Math.PI / count + index * Math.PI * 2 / count;
  return { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius };
}

/** Opening of the sea: the pool spreads from the caster to the radius, then holds. Late joins start fully open. */
export const SEA_SPREAD_SECONDS = .4;
export const seaSpread = (age: number, reduced: boolean): number =>
  reduced ? 1 : .35 + .65 * motion.settle(age / SEA_SPREAD_SECONDS);
/** Pool fades in under the crest so it hands over from the transient decal without a pop. */
export const seaFadeIn = (age: number): number => clamp01(.35 + age / .25);
/** The last SEA_EXIT seconds of `remaining`: the pool sinks into its grooves, the rim collapses. */
export const SEA_EXIT = .45;
export const seaExit = (remaining: number): number => 1 - clamp01(remaining / SEA_EXIT);
/** Snapshots arrive slower than frames; a marker silent this long means the sea really ended. */
export const SEA_GRACE = .25;
export const seaAge = (remaining: number): number => Math.max(0, SEA_SECONDS - remaining);
export const seaScale = (age: number, remaining: number, reduced: boolean): number =>
  seaSpread(age, reduced) * (1 - .1 * seaExit(remaining));
/** Boundary rim never exceeds the snapshot radius. */
export const seaRimScale = (remaining: number): number => 1 - .06 * seaExit(remaining);

/** Impact slot (cast → resolve): how long the shock rim and transient decal linger after landing. */
export const IMPACT_SECONDS = .75;
export const impactAlpha = (landedAge: number): number => fadeOut(landedAge, .1, IMPACT_SECONDS - .1);
export const rimAlpha = (age: number, windup: number, landedAge?: number): number =>
  (.28 + .62 * gatherCharge(age, windup)) * (landedAge === undefined ? 1 : impactAlpha(landedAge));
/** Shock rim = the telegraph rim sweeping out to the real radius; capped at 1 so it never passes R. */
export const shockScale = (landedAge: number): number => .35 + .65 * motion.settle(landedAge / .4);

/** Drain: a strip of blood is yanked from each listed monster into the caster, accelerating, head first. */
export const DRAIN_TRAVEL = .42;
export const DRAIN_FADE = .12;
export const DRAIN_LIFE = DRAIN_TRAVEL + DRAIN_FADE;
export const DRAIN_LENGTH = 5.5;
export const DRAIN_ASPECT = 461 / 1382;
export const DRAIN_HEIGHT = 1.8;
export const MAX_DRAINS = 12;
export const drainProgress = (age: number, reduced: boolean): number => reduced ? .35 : motion.launch(age / DRAIN_TRAVEL);
export const drainAlpha = (age: number, reduced: boolean): number =>
  reduced ? fadeOut(age, .1, .2) : Math.min(1, age / .05) * (age < DRAIN_TRAVEL ? 1 : fadeOut(age, DRAIN_TRAVEL, DRAIN_FADE));
export const drainSeconds = (reduced: boolean): number => reduced ? .3 : DRAIN_LIFE;
/** Never longer than the road it travels. */
export const drainLength = (distance: number): number => Math.max(2.4, Math.min(DRAIN_LENGTH, distance * 1.1));

/** Blood eddy left under each drained monster (ground contact; not a damage zone). */
export const EDDY_SECONDS = 1.1;
export const EDDY_SIZE = 3.2;
export const MAX_EDDIES = 12;
export const eddyFrame = (age: number, reduced: boolean): number => reduced ? 2 : Math.floor(age / .08) % 8;
export const eddyAlpha = (age: number): number => Math.min(1, age / .1) * fadeOut(age, EDDY_SECONDS * .55, EDDY_SECONDS * .45);

/** Flowing channels: thin ground ribbons running rim → centre (hold) / near the caster (gather). */
export const CHANNEL_INTERVAL = .42;
export const CHANNEL_LIFE = .95;
export const GATHER_CHANNELS = 5;
export const MAX_CHANNELS = 14;
/** The head races in, the tail follows: 0..1 along the run. */
export function channelState(age: number, life: number): { head: number; tail: number; alpha: number } {
  const t = clamp01(age / Math.max(.05, life));
  return { head: motion.easeOut(Math.min(1, t * 1.5)), tail: motion.settle(clamp01((t - .3) / .7)), alpha: t < .15 ? t / .15 : fadeOut(t, .7, .3) };
}

/** General summon (`blood-general-h03Z` event or a snapshot seen first): the horn ring rises with its blood pool. */
/** A snapshot that shows a general already this old (reconnect) skips the summon ring instead of replaying it. */
export const GENERAL_SECONDS = T.generalSeconds;
export const LATE_SUMMON_SKIP = .6;
export const SUMMON_FRAMES = 8;
export const SUMMON_FRAME_SECONDS = .07;
export const SUMMON_SECONDS = SUMMON_FRAMES * SUMMON_FRAME_SECONDS;
/** Generals walk at scale .76 of a 7.5 plane (≈ 5.7 tall): the ring is a little wider than he is tall. */
export const SUMMON_SIZE = 7;
export const summonSeconds = (reduced: boolean): number => reduced ? .35 : SUMMON_SECONDS;
export const summonFrame = (age: number, reduced: boolean): number =>
  reduced ? 3 : segmentFrame(age, 0, SUMMON_FRAMES, SUMMON_FRAME_SECONDS);
export const MAX_SUMMONS = 8;
export const GENERAL_POOL_SIZE = 3.6;
export const MAX_GENERALS = 8;
export const GENERAL_EXIT = .45;
export const generalExit = (remaining: number): number => 1 - clamp01(remaining / GENERAL_EXIT);
export const GENERAL_GRACE = .25;
/** Remembered summon ids; pruned once it outgrows this. */
export const MAX_SEEN_GENERALS = 64;

/** General hit (`blood-general-hit-h03Z` on the struck monster): 8 frames over the monster, plus a small ground splat. */
export const HIT_FRAMES = 8;
export const HIT_FRAME_SECONDS = .045;
export const HIT_SECONDS = HIT_FRAMES * HIT_FRAME_SECONDS;
export const HIT_SIZE = 3.4;
export const HIT_LIFT = 1.3;
export const MAX_HITS = 6;
export const hitFrame = (age: number, reduced: boolean): number =>
  reduced ? 2 : segmentFrame(age, 0, HIT_FRAMES, HIT_FRAME_SECONDS);
export const hitSeconds = (reduced: boolean): number => reduced ? .2 : HIT_SECONDS;
export const SPLAT_SECONDS = .6;
export const splatAlpha = (age: number): number => fadeOut(age, .08, SPLAT_SECONDS - .08) * .8;
