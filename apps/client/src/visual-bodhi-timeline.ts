import { BO_DE } from '../../../content/new-divine-design.js';
import { fadeOut, motion, sweep } from './visual-kit-timeline.js';

/**
 * Pure timing/layout for Bồ Đề Tổ Sư Đại Phẩm Thiên Tiên Quyết (h03X). No Babylon imports: testable.
 * Art measured by assets/vfx-source/bo-de/process-art.py (active-inventory.json). Everything here is presentation: the
 * server already healed, chose the two blessed allies and started their 5 s buff at the `ability` event.
 */

/** Server windup when the cast event omits it (BO_DE.windup). */
export const DEFAULT_WINDUP = BO_DE.windup;
/** The server heal circle: centred on the caster, radius fixed by design. */
export const HEAL_RADIUS = BO_DE.radius;
/** A cast whose resolve never arrives is cleaned up this long after its windup (no fake impact). */
export const CAST_GRACE = .3;

/** Canopy atlas (4x4): 0-3 gather, 4-7 full bloom, 8-11 leaves scatter, 12-15 last motes. */
export const CANOPY_COLUMNS = 4, CANOPY_ROWS = 4;
export const GATHER_FRAMES = 4, BLOOM_FIRST = 4, BLOOM_LAST = 15;
export const BLOOM_FRAME_SECONDS = .05;
/** Frames 4-7 (the full bloom) take .2 s: the "canopy opens in ~.2 s" beat. */
export const BLOOM_OPEN = 4 * BLOOM_FRAME_SECONDS;
export const CANOPY_LIFE = (BLOOM_LAST - BLOOM_FIRST + 1) * BLOOM_FRAME_SECONDS;
/** Plane size and where the painted leaves sit: bottom of the art at `CANOPY_ANCHOR_Y` of the plane, lifted over the head. */
export const CANOPY_SIZE = 5.2, CANOPY_ANCHOR_Y = .91, CANOPY_LIFT = 2;
/** The canopy stays sparse over monsters. */
export const CANOPY_ALPHA = .82;
/** Gather pose scale range and the frame held while a late resolve waits. */
export const GATHER_SCALE_FROM = .55, GATHER_SCALE_TO = .85;

/** Painted link: 4.59:1 ribbon, leaf-and-fruit head on texture +X. */
export const LINK_ASPECT = 4.5919;
export const LINK_LENGTH = 6;
export const LINK_WIDTH = LINK_LENGTH / LINK_ASPECT;
export const LINK_FLIGHT = .2, LINK_HOLD = .1, LINK_FOLD = .25;
export const LINK_LIFE = LINK_FLIGHT + LINK_HOLD + LINK_FOLD;
export const LINK_FROM_HEIGHT = 1.7, LINK_TO_HEIGHT = 1.4, LINK_ARC = 1.1;
/** No origin (lobby, reconnect): the link falls from this height onto the ally. */
export const LINK_SKY_HEIGHT = 8;
export const MAX_LINKS = 2;

/** Fruit release atlas (4x2): bud opens, wings of leaves sweep out. One real blessed recipient each. */
export const RELEASE_COLUMNS = 4, RELEASE_ROWS = 2, RELEASE_FRAMES = 8;
export const RELEASE_FRAME_SECONDS = .05;
export const RELEASE_LIFE = RELEASE_FRAMES * RELEASE_FRAME_SECONDS;
export const RELEASE_SIZE = 3.6, RELEASE_LIFT = 1.7;

/** Double-hit accent atlas (4x2): one leaf contact opens into two strokes. */
export const HIT_COLUMNS = 4, HIT_ROWS = 2, HIT_FRAMES = 8;
export const HIT_FRAME_SECONDS = .045;
export const HIT_LIFE = HIT_FRAMES * HIT_FRAME_SECONDS;
export const HIT_SIZE = 2.8, HIT_LIFT = 1;
/** Two events of one source inside this window are the same double strike: one accent. */
export const HIT_DEDUP = .15;
export const MAX_HIT_ACCENTS = 8;

/**
 * Leaf pair at the recipient's feet (4x4): 0-3 grows in, 4-11 loop (ground line aligned, loop jump removed),
 * 12-15 pulls back in. Solid art spans .76 of the plane; the pair stands on `PAIR_ANCHOR_Y` of its height.
 */
export const PAIR_COLUMNS = 4, PAIR_ROWS = 4;
export const PAIR_INTRO_FRAMES = 4, PAIR_LOOP_FIRST = 4, PAIR_LOOP_COUNT = 8, PAIR_OUTRO_FIRST = 12, PAIR_OUTRO_FRAMES = 4;
export const PAIR_INTRO_FRAME_SECONDS = .05, PAIR_LOOP_FRAME_SECONDS = .09;
export const PAIR_INTRO = PAIR_INTRO_FRAMES * PAIR_INTRO_FRAME_SECONDS;
/** Both leaves split and pull in over .3 s when the buff ends (server `remaining` runs out). */
export const PAIR_OUTRO = .3;
export const PAIR_SIZE = 3.9, PAIR_ANCHOR_Y = .8287;
export const REDUCED_PAIR_FRAME = PAIR_LOOP_FIRST + 3;
export const MAX_PAIRS = 12;
/** A marker missed for this long is a real end (the snapshot loop may skip a frame). */
export const MARK_GRACE = .06;
/** Footprint ring when the buff starts. */
export const FOOT_RING_RADIUS = 1.5, FOOT_RING_LIFE = .6;

/** Gather: frame 0..3 over the windup, growing; held on the last while the server is late. */
export function gatherPose(age: number, windup: number, reduced: boolean): { frame: number; scale: number; alpha: number } {
  const t = sweep(age, 0, Math.max(.05, windup));
  if (reduced) return { frame: GATHER_FRAMES - 1, scale: GATHER_SCALE_TO, alpha: CANOPY_ALPHA };
  return {
    frame: Math.min(GATHER_FRAMES - 1, Math.floor(t * GATHER_FRAMES)),
    scale: GATHER_SCALE_FROM + (GATHER_SCALE_TO - GATHER_SCALE_FROM) * motion.easeOut(t),
    alpha: CANOPY_ALPHA * Math.min(1, t * 3 + .15),
  };
}

/** Bloom after the resolve: the canopy opens (overshoot) over `BLOOM_OPEN`, scatters and thins to nothing. */
export function bloomPose(age: number, reduced: boolean): { frame: number; scale: number; alpha: number } {
  if (reduced) return { frame: BLOOM_FIRST + 1, scale: 1, alpha: CANOPY_ALPHA * fadeOut(age, .12, .2) };
  const frame = Math.min(BLOOM_LAST, BLOOM_FIRST + Math.floor(age / BLOOM_FRAME_SECONDS));
  const open = motion.impactOvershoot(sweep(age, 0, BLOOM_OPEN));
  return {
    frame,
    scale: GATHER_SCALE_TO + (1 - GATHER_SCALE_TO) * open + .06 * open,
    alpha: CANOPY_ALPHA * fadeOut(age, CANOPY_LIFE - .15, .15),
  };
}

/** Path of a link head: ease-out flight, then still. `progress` 0..1 along the straight line. */
export function linkProgress(age: number): number {
  return motion.easeOut(sweep(age, 0, LINK_FLIGHT));
}

/** Length/alpha of the ribbon behind the head: grows while it flies, holds, then folds into the ally. */
export function linkShape(age: number, distance: number): { length: number; alpha: number } {
  const full = Math.max(.6, Math.min(LINK_LENGTH, distance));
  const grow = Math.min(1, sweep(age, 0, LINK_FLIGHT) * 1.6);
  const fold = sweep(age, LINK_FLIGHT + LINK_HOLD, LINK_FOLD);
  return { length: full * grow * (1 - motion.settle(fold) * .85), alpha: fadeOut(age, LINK_FLIGHT + LINK_HOLD, LINK_FOLD) };
}

/** Height of the head: straight line between the two heights plus an arc (none when it falls from the sky). */
export function linkHeight(t: number, from: number, to: number, arc: number): number {
  return from + (to - from) * t + 4 * arc * t * (1 - t);
}

export function releaseFrame(age: number): number {
  return Math.min(RELEASE_FRAMES - 1, Math.floor(age / RELEASE_FRAME_SECONDS));
}
export function releasePose(age: number, reduced: boolean): { frame: number; alpha: number; scale: number } {
  if (reduced) return { frame: 2, alpha: fadeOut(age, .15, .2), scale: 1 };
  return { frame: releaseFrame(age), alpha: fadeOut(age, RELEASE_LIFE - .08, .08),
    scale: .85 + .15 * motion.impactOvershoot(sweep(age, 0, .15)) };
}

export function hitFrame(age: number): number {
  return Math.min(HIT_FRAMES - 1, Math.floor(age / HIT_FRAME_SECONDS));
}

/** One accent per double strike: true when `now` is clear of the source's previous accent. */
export function accentAllowed(last: number | undefined, now: number): boolean {
  return last === undefined || now - last >= HIT_DEDUP;
}

/**
 * Progress of the pair's leave: 0 while the buff runs, 1 when gone. `remaining` is the snapshot's `bodhiBlessing.remaining`
 * (undefined once the marker stopped), `out` the seconds since the marker stopped (after `MARK_GRACE`).
 */
export function pairExit(remaining: number | undefined, out: number): number {
  const byTime = remaining === undefined ? 0 : 1 - Math.min(1, Math.max(0, remaining) / PAIR_OUTRO);
  return Math.min(1, Math.max(byTime, out / PAIR_OUTRO));
}

/** Frame and alpha of the pair `age` seconds after it appeared (loop is locked to the clock, not to the exit). */
export function pairPose(age: number, exit: number, reduced: boolean): { frame: number; alpha: number } {
  if (reduced) return { frame: REDUCED_PAIR_FRAME, alpha: 1 - exit };
  if (exit > 0) {
    return { frame: PAIR_OUTRO_FIRST + Math.min(PAIR_OUTRO_FRAMES - 1, Math.floor(exit * PAIR_OUTRO_FRAMES)),
      alpha: exit > .75 ? (1 - exit) / .25 : 1 };
  }
  if (age < PAIR_INTRO) return { frame: Math.floor(age / PAIR_INTRO_FRAME_SECONDS), alpha: 1 };
  const loop = Math.floor((age - PAIR_INTRO) / PAIR_LOOP_FRAME_SECONDS) % PAIR_LOOP_COUNT;
  return { frame: PAIR_LOOP_FIRST + loop, alpha: 1 };
}
