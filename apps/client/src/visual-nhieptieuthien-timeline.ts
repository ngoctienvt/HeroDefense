/**
 * Pure timing for Nhiếp Tiểu Thiến (h03O) "Lan Nhược U Hồn Khúc" (no Babylon imports, so it is testable).
 * Art: assets/vfx-source/nhieptieuthien (Codex-painted, see prompts/). Music flipbook `nhieptieuthien-music`:
 * frames 0-3 the orchid wreath of sound forms around her during the server windup, 4-15 it opens and fades.
 * Note ribbon = painted strip growing orchid-head-first from her to each healed ally; heal flipbook
 * `nhieptieuthien-heal` blooms on the ally; the Frost Shield (snapshot `frostShield`, 5 s, only when the heal
 * overflowed) is the ice shell flipbook `nhieptieuthien-frost` (no ground ring).
 */
import { motion, segmentFrame, sweep } from './visual-kit-timeline.js';

export const NHIEP_ID = 'h03O';
export const NHIEP_SKILL = `skill-${NHIEP_ID}`;
export const NHIEP_ATLAS = { music: 'nhieptieuthien-music', heal: 'nhieptieuthien-heal', frost: 'nhieptieuthien-frost' } as const;
export const NOTE_RIBBON_URL = '/assets/vfx-nhieptieuthien-note-ribbon.webp';

/** catalog `effect.radius` / `maxTargets`: the three lowest-health allies within 7,5 units are healed. */
export const HEAL_RADIUS = 7.5;
export const MAX_HEAL_TARGETS = 3;
/** combat.ts: `frostShield { remaining: 5, attackSlow: .40 }` set on an ally whose heal overflowed. */
export const SHIELD_SECONDS = 5;
export const SHIELD_ATTACK_SLOW = .4;
/** Server windup when a cast event carries none (combat.ts WINDUP_SECONDS). */
export const DEFAULT_WINDUP = .25;

/** Music wreath: frames 0-3 form during the windup (held on 3), then 4-15 at 18 fps. */
const MUSIC_FPS = 18;
export const MUSIC_AFTER_SECONDS = 12 / MUSIC_FPS;
export function musicFormingFrame(age: number, windup: number): number {
  return segmentFrame(age, 0, 4, Math.max(.04, windup) / 4);
}
export function musicOpenFrame(age: number): number { return segmentFrame(age, 4, 12, 1 / MUSIC_FPS); }
/** Seconds after the ability when the wreath is fully open (frame 8) and the ribbons leave it. */
export const MUSIC_RELEASE_DELAY = 4 / MUSIC_FPS;
/** A cast whose ability never comes (cancelled / left the zone) gives up after this long. */
export const ORPHAN_SECONDS = 1.2;

/**
 * Note ribbon, orchid head first: starts when the wreath opens (staggered per ally), the strip grows from her to
 * the ally in RIBBON_EXTEND with the texture window sliding so the head leads, holds, thins and fades.
 */
export const RIBBON_START = MUSIC_RELEASE_DELAY * .6;
export const RIBBON_STAGGER = .08;
export const RIBBON_EXTEND = .22;
export const RIBBON_LIFE = .6;
export function ribbonReach(age: number): number { return motion.easeOut(sweep(age, 0, RIBBON_EXTEND)); }
export function ribbonAlpha(age: number): number { return 1 - sweep(age, RIBBON_EXTEND + .14, RIBBON_LIFE - RIBBON_EXTEND - .14); }
export function ribbonWidth(age: number): number { return 1 - .3 * sweep(age, RIBBON_EXTEND + .08, RIBBON_LIFE - RIBBON_EXTEND - .08); }
/** Plane width for a ribbon of `length`: keeps the painted 3:1 aspect, clamped so short ribbons stay thick. */
export function ribbonPlaneWidth(length: number): number { return Math.min(1.7, Math.max(1.15, length / 3)); }
/** The orchid head reaches the ally when the strip is fully out: the heal flipbook starts then. */
export const HEAL_DELAY = RIBBON_EXTEND * .9;
const HEAL_FPS = 16;
export const HEAL_SECONDS = 8 / HEAL_FPS;
export function healFrame(age: number): number { return segmentFrame(age, 0, 8, 1 / HEAL_FPS); }

/**
 * Frost shell (flipbook frames 0-2 grow, 3-7 loop seamlessly) around an ally while the snapshot holds
 * `frostShield`; it thins out when the snapshot stops.
 */
const SHELL_GROW_FPS = 12;
const SHELL_LOOP_FPS = 10;
export const SHELL_GROW_SECONDS = 3 / SHELL_GROW_FPS;
export const SHELL_FADE = .4;
export const SHELL_STILL_FRAME = 5;
export function shellFrame(age: number): number {
  if (age < SHELL_GROW_SECONDS) return Math.min(2, Math.floor(age * SHELL_GROW_FPS));
  return 3 + Math.floor((age - SHELL_GROW_SECONDS) * SHELL_LOOP_FPS) % 5;
}
export function shellScale(age: number): number { return .86 + .14 * motion.impactOvershoot(sweep(age, 0, SHELL_GROW_SECONDS)); }
export function shellAlpha(age: number, sinceLastMark: number): number {
  return motion.settle(sweep(age, 0, SHELL_GROW_SECONDS)) * (1 - sweep(sinceLastMark, 0, SHELL_FADE));
}
/** Orchid/note flecks drift up from a shielded ally at most once per this many seconds. */
export const FLECK_GATE = .7;
