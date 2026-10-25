/**
 * Pure timing for Cự Linh Thần (h00E) "Tuyên Hoa Thiết Bích Trấn" (no Babylon imports, so it is testable).
 * Art: assets/vfx-source/culinh (Codex-painted, see prompts/). Quake flipbook `culinh-quake`: frames 0-3 gather
 * runes and drop the ghost hammer during the server windup, 4-15 slam, raise the iron wall ring and let it sink
 * after the ability. Guard flipbook `culinh-guard`: small iron plates rise around every recipient and settle
 * flush into the `bulwark-ring` decal that stays while the snapshot holds their `ward`.
 */
import { motion, piecewise, segmentFrame, sweep } from './visual-kit-timeline.js';

export const CULINH_ID = 'h00E';
export const CULINH_SKILL = `skill-${CULINH_ID}`;
/** combat.ts: `trait` event with the enemies the hammer quake slowed (`targets`) and its radius (`value`). */
export const QUAKE_SKILL = `quake-${CULINH_ID}`;
/** combat.ts: the quake slows for 1.2 s. */
export const SLOW_SECONDS = 1.2;
export const CULINH_ATLAS = { quake: 'culinh-quake', guard: 'culinh-guard' } as const;
export const BULWARK_URL = '/assets/vfx-culinh-bulwark.webp';

/** content/catalog.ts skill-h00E: ward radius 4.5 for allies; combat.ts: hammer quake slows enemies within 3.0. */
export const WARD_RADIUS = 4.5;
export const QUAKE_RADIUS = 3;
/** combat.ts WINDUP_SECONDS when a cast event carries none. */
export const DEFAULT_WINDUP = .25;
/** catalog statusSeconds: only the debug replay needs it; live VFX follows the snapshot `ward`. */
export const WARD_SECONDS = 4.5;

/** Guard ring around one ally: roughly the body footprint, clearly inside the 4.5 ward reach. */
export const BULWARK_DIAMETER = 2.3;

/** Quake flipbook frames 0-3 over the windup, held on 3 (hammer overhead) until the ability arrives. */
export function quakeFormingFrame(age: number, windup: number): number {
  return segmentFrame(age, 0, 4, Math.max(.04, windup) / 4);
}
/** After the ability: frames 4-15 at 16 fps (slam 4-5, wall bursts up 6-8, stands 9-11, sinks 12-15). */
const QUAKE_FPS = 16;
export const QUAKE_AFTER_SECONDS = 12 / QUAKE_FPS;
export function quakeImpactFrame(age: number): number { return segmentFrame(age, 4, 12, 1 / QUAKE_FPS); }
/** Seconds after the ability when the hammer lands (frame 5): the gold shard ring leaves the ground. */
export const SLAM_DELAY = 1 / QUAKE_FPS;
/** A cast whose ability never comes (cancelled / left the zone) gives up after this long. */
export const ORPHAN_SECONDS = 1.2;
/** Reduced motion keeps the telegraph and the result as still frames: hammer overhead (3), wall standing (9). */
export const STILL_HAMMER = 3;
export const STILL_WALL = 9;
export const STILL_SECONDS = .35;

const GUARD_FPS = 12;
export const GUARD_SECONDS = 8 / GUARD_FPS;
export function guardFrame(age: number): number { return segmentFrame(age, 0, 8, 1 / GUARD_FPS); }
/** The guard plates sink flush at frame 5-6; the persistent ring decal takes over from here. */
export const GUARD_HANDOFF = 5 / GUARD_FPS;

/** Bulwark ring: fades in as the plates settle (with a small overshoot), fades out when the ward ends. */
export const BULWARK_FADE_IN = .22;
export const BULWARK_FADE_OUT = .4;
export function bulwarkScale(age: number): number {
  return .8 + .2 * motion.impactOvershoot(sweep(age, GUARD_HANDOFF - .1, BULWARK_FADE_IN));
}
/** `sinceLastMark` is 0 while the snapshot still holds the ward; the ring fades over BULWARK_FADE_OUT afterwards. */
export function bulwarkAlpha(age: number, sinceLastMark: number): number {
  return motion.settle(sweep(age, GUARD_HANDOFF - .1, BULWARK_FADE_IN)) * (1 - sweep(sinceLastMark, 0, BULWARK_FADE_OUT));
}

/** Shield gone but ward (damage reduction) still holding: the ring stays, dimmer and slightly shrunk. */
export const WORN_ALPHA = .55;
export const WORN_SCALE = .94;
export function wornBlend(wornFor: number): number { return motion.settle(sweep(wornFor, 0, .3)); }
/** Every blow the shield absorbs rings the ring outward for a beat. */
export function bulwarkKick(sinceHit: number): number { return piecewise([[0, 1], [.05, 1.12], [.2, 1]], sinceHit); }

/** Gold dust rises from a quake-slowed enemy at most once per this many seconds. */
export const DUST_GATE = .35;
