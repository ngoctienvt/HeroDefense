/**
 * Pure timing for Mẫu Đơn Tiên Tử (h00F) "Bách Hoa Hồi Xuân Khúc" (no Babylon imports, so it is testable).
 * Art: assets/vfx-source/mandon (Codex-painted, see prompts/). Bloom flipbook `mandon-bloom`: frames 0-3 the
 * petal glyph ring and buds rise during the server windup, 4-15 a giant peony opens around her and fans its
 * petals out. Petal stream = painted strip growing peony-head-first from her to each healed ally; heal flipbook
 * `mandon-heal` blooms on the ally; the haste buff is a petal ring under the ally for as long as the snapshot holds it.
 */
import { motion, segmentFrame, sweep } from './visual-kit-timeline.js';

export const MANDON_ID = 'h00F';
export const MANDON_SKILL = `skill-${MANDON_ID}`;
export const MANDON_ATLAS = { bloom: 'mandon-bloom', heal: 'mandon-heal' } as const;
export const PETAL_STREAM_URL = '/assets/vfx-mandon-petal-ribbon.webp';
export const PETAL_RING_URL = '/assets/vfx-mandon-petal-ring.webp';

/** catalog `effect.radius`: allies within this many units of her are healed (at most 4). */
export const HEAL_RADIUS = 8;
export const MAX_HEAL_TARGETS = 4;
/** combat.ts `hasteAllyMax(ally, 4.5, 0.35, 0.15)`: this exact pair identifies her buff in the snapshot (no other hero sets attackBonus .15). */
export const HASTE_AMOUNT = .35;
export const HASTE_ATTACK_BONUS = .15;
/** Server windup when a cast event carries none (combat.ts WINDUP_SECONDS). */
export const DEFAULT_WINDUP = .25;

/** Bloom: frames 0-3 form during the windup (held on 3), then 4-15 at 18 fps. */
const BLOOM_FPS = 18;
export const BLOOM_AFTER_SECONDS = 12 / BLOOM_FPS;
export function bloomFormingFrame(age: number, windup: number): number {
  return segmentFrame(age, 0, 4, Math.max(.04, windup) / 4);
}
export function bloomOpenFrame(age: number): number { return segmentFrame(age, 4, 12, 1 / BLOOM_FPS); }
/** Seconds after the ability when the peony is fully open (frame 8) and the petal wave leaves it. */
export const BLOOM_RELEASE_DELAY = 4 / BLOOM_FPS;
/** A cast whose ability never comes (cancelled / left the zone) gives up after this long. */
export const ORPHAN_SECONDS = 1.2;

/** Ground petal wave that sweeps out to the heal radius, so the 8-unit reach is shown without a hard circle. */
export const WAVE_SECONDS = .6;
export const WAVE_START_RADIUS = 1.4;
export function waveRadius(age: number): number {
  return WAVE_START_RADIUS + (HEAL_RADIUS - WAVE_START_RADIUS) * motion.easeOut(sweep(age, 0, WAVE_SECONDS));
}
export function waveAlpha(age: number): number { return .55 * (1 - sweep(age, .12, WAVE_SECONDS - .12)); }

/**
 * Petal stream, peony head first: starts when the bloom opens (staggered per ally), the strip grows from her to
 * the ally in STREAM_EXTEND with the texture window sliding so the head leads, holds, thins and fades.
 */
export const STREAM_START = BLOOM_RELEASE_DELAY * .6;
export const STREAM_STAGGER = .07;
export const STREAM_EXTEND = .2;
export const STREAM_LIFE = .55;
export function streamReach(age: number): number { return motion.easeOut(sweep(age, 0, STREAM_EXTEND)); }
export function streamAlpha(age: number): number { return 1 - sweep(age, STREAM_EXTEND + .12, STREAM_LIFE - STREAM_EXTEND - .12); }
export function streamWidth(age: number): number { return 1 - .3 * sweep(age, STREAM_EXTEND + .08, STREAM_LIFE - STREAM_EXTEND - .08); }
/** Plane width for a stream of `length`: keeps the painted 3:1 aspect, clamped so short streams stay thick. */
export function streamPlaneWidth(length: number): number { return Math.min(1.6, Math.max(1.1, length / 3)); }
/** The head reaches the ally when the strip is fully out: the heal flipbook starts then. */
export const HEAL_DELAY = STREAM_EXTEND * .9;
const HEAL_FPS = 16;
export const HEAL_SECONDS = 8 / HEAL_FPS;
export function healFrame(age: number): number { return segmentFrame(age, 0, 8, 1 / HEAL_FPS); }

/** Haste ring under an ally: grows in, turns clockwise while the snapshot holds the buff, withers when it stops. */
export const HASTE_RADIUS = 1.3;
export const HASTE_GROW = .3;
export const HASTE_FADE = .35;
export const HASTE_SPIN = 2.2; // rad/s
export function hasteScale(sinceStart: number): number { return .5 + .5 * motion.impactOvershoot(sweep(sinceStart, 0, HASTE_GROW)); }
export function hasteAlpha(sinceStart: number, sinceLastMark: number): number {
  return .9 * motion.settle(sweep(sinceStart, 0, HASTE_GROW)) * (1 - sweep(sinceLastMark, 0, HASTE_FADE));
}
/** Petal flecks drift up from a hasted ally at most once per this many seconds. */
export const PETAL_GATE = .6;
