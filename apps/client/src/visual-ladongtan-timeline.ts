/**
 * Pure timing for Lã Động Tân (h00D) "Thuần Dương Thiên Kiếm Trận" (no Babylon imports, so it is testable).
 * Art: assets/vfx-source/ladongtan (Codex-painted, see prompts/). Flipbook `ladongtan-fall` (16 frames): 0-5 the
 * ground glint and the giant sword falling (played inside the server windup, held on 5 until the ability),
 * 6-15 the sword biting the ground, the shock ring and the embers. Flipbook `ladongtan-flame` (8 frames, seamless
 * loop): the burning ring of the sword array. Decal `array-ring` (top-down, 8 swords): the shock wave and then
 * the array itself while the server ground effect (catalog `groundBurnSeconds`) lives.
 */
import { motion, segmentFrame, sweep } from './visual-kit-timeline.js';

export const LADONGTAN_ID = 'h00D';
export const LADONGTAN_SKILL = `skill-${LADONGTAN_ID}`;
export const LADONGTAN_ATLAS = { fall: 'ladongtan-fall', flame: 'ladongtan-flame' } as const;
/** Snapshot marker kind the battlefield sends for a live h00D ground effect (battlefield-ladongtan.ts). */
export const LADONGTAN_ARRAY_MARK = 'array';
export const ARRAY_RING_URL = '/assets/vfx-ladongtan-array-ring.webp';

/** catalog `effect.radius`: the sword lands on the cluster and the burning array covers this radius. */
export const STRIKE_RADIUS = 4.2;
/** catalog `effect.groundBurnSeconds`: the server ground effect lifetime (80% ATK/s). Only the replay uses it; live arrays follow the snapshot. */
export const ARRAY_SECONDS = 3;
/** Server windup when a cast event carries none (combat.ts WINDUP_SECONDS). */
export const DEFAULT_WINDUP = .25;
/** A cast whose ability never comes (cancelled / left the zone) gives up after this long. */
export const ORPHAN_SECONDS = 1.2;

/** Fall flipbook: frames 0-5 play inside the windup so the blade bites the ground on the ability event. */
export const FALL_FORMING_FRAMES = 6;
const FALL_FORMING_SHARE = .9;
export function fallFormingFrame(age: number, windup: number): number {
  return segmentFrame(age, 0, FALL_FORMING_FRAMES, Math.max(.04, windup) * FALL_FORMING_SHARE / FALL_FORMING_FRAMES);
}
/** After the ability: the bite and the sword dissolving into light are fast (6-11), the ring and embers settle (12-15). */
const FAST_FPS = 26;
const SETTLE_FPS = 14;
const FAST_FRAMES = 6;
const SETTLE_FRAMES = 4;
export const FALL_FAST_SECONDS = FAST_FRAMES / FAST_FPS;
export const FALL_AFTER_SECONDS = FALL_FAST_SECONDS + SETTLE_FRAMES / SETTLE_FPS;
export function fallImpactFrame(age: number): number {
  if (age < FALL_FAST_SECONDS) return FALL_FORMING_FRAMES + Math.floor(Math.max(0, age) * FAST_FPS);
  return FALL_FORMING_FRAMES + FAST_FRAMES + Math.min(SETTLE_FRAMES - 1, Math.floor((age - FALL_FAST_SECONDS) * SETTLE_FPS));
}
/** Reduced motion keeps the telegraph and the strike as still frames: the falling blade (2), then the bite (7). */
export const STILL_FALLING = 2;
export const STILL_IMPACT = 7;
export const STILL_SECONDS = .35;

/**
 * The array decal: the shock wave leaves the impact point and stops at the strike radius; from then on it is the
 * array itself. It turns clockwise slowly, and withers once the snapshot stops marking it.
 */
export const WAVE_START_RADIUS = 1.1;
export const WAVE_SECONDS = .32;
export const ARRAY_SPIN = .35; // rad/s
export const ARRAY_FADE = .45;
/** Marks arrive every frame while the ground effect lives; the wither starts after this gap. A fresh impact waits longer for its first snapshot. */
export const MARK_HOLD = .12;
export const UNCONFIRMED_HOLD = .8;
export function arrayRadius(age: number): number {
  return WAVE_START_RADIUS + (STRIKE_RADIUS - WAVE_START_RADIUS) * motion.easeOut(sweep(age, 0, WAVE_SECONDS));
}
export function arrayAlpha(age: number, sinceMark: number, confirmed: boolean): number {
  const hold = confirmed ? MARK_HOLD : UNCONFIRMED_HOLD;
  return .9 * motion.settle(sweep(age, 0, .12)) * (1 - sweep(sinceMark, hold, ARRAY_FADE));
}
export function arrayExpired(sinceMark: number, confirmed: boolean): boolean {
  return sinceMark >= (confirmed ? MARK_HOLD : UNCONFIRMED_HOLD) + ARRAY_FADE;
}
/** A snapshot mark within this distance of an unconfirmed impact belongs to it. */
export const MATCH_DISTANCE = 1.5;

/** Burning ring of the array: a seamless 8-frame loop that rises as the shock ring passes, and drops with the decal. */
export const FLAME_FRAMES = 8;
export const FLAME_FPS = 12;
export const FLAME_DELAY = .22;
export const FLAME_RISE = .3;
/** Painted ring is flatter than the battlefield camera shows a ground circle; the sprite is stretched taller by this. */
export const FLAME_STRETCH = 1.25;
export function flameFrame(age: number): number {
  return Math.floor(Math.max(0, age) * FLAME_FPS) % FLAME_FRAMES;
}
export function flameAlpha(age: number, sinceMark: number, confirmed: boolean): number {
  const hold = confirmed ? MARK_HOLD : UNCONFIRMED_HOLD;
  return motion.settle(sweep(age, FLAME_DELAY, FLAME_RISE)) * (1 - sweep(sinceMark, hold, ARRAY_FADE));
}
/** Embers drift up from the ring at most once per this many seconds. */
export const EMBER_GATE = .5;
