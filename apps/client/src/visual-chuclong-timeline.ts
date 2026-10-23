import { CHUCLONG as C } from '../../../content/chuclong-design.js';
import { fadeOut, motion, segmentFrame } from './visual-kit-timeline.js';
import { tier6HoldFrame } from './visual-tier6-timeline.js';

const clamp01 = (t: number): number => Math.max(0, Math.min(1, t));

/**
 * Pure beats of Chúc Long Khai Mục: Nhật Nguyệt Đảo Nghịch (no Babylon imports, testable).
 * Sheet layouts (4×4 unless noted):
 * - dragon-eye-eclipse: 0–3 eye opens under the moon, 4–7 it narrows to a star, 8–11 dark disc with the star (night hold),
 *   12–15 shards dissolve;
 * - blazing-daybreak: 0–3 red brow opens into an ember eye, 4–7 it cracks and bursts, 8–11 fire petals and rock, 12–15 embers;
 * - eternal-night-wave: one crest rolling across (frame 0 low drift → 7 crest → 15 settled);
 * - daybreak-impact 4×2: orb, starburst, pillar, slash, crescent, flame, flame, embers;
 * - dragon-solar-burn P16: 0–3 grow, 4–11 loop, 12–15 release.
 * Beats: cast (0.25 s windup) the eye opens over the caster → `skill-h01K` the eye closes to a dark disc and the night
 * front sweeps every frozen target → ~1.5 s of night → `summer-h01K` the disc cracks into the daybreak eye and the day
 * front burns every target. Nothing here decides a result; every beat starts from a server event.
 */
export const EYE_SIZE = 9.5;
/** Height of the eye centre above the caster's feet along screen-up (the hero plane is 7.4 tall). */
export const EYE_LIFT = 10;
export const EYE_OPEN_FRAMES = 4;
export const EYE_CLOSE_START = 4;
export const EYE_CLOSE_FRAME_SECONDS = .07;
export const EYE_HOLD_FIRST = 8;
export const EYE_HOLD_COUNT = 3;
export const EYE_DISSOLVE_START = 12;
export const EYE_DISSOLVE_FRAMES = 4;
export const EYE_DISSOLVE_FRAME_SECONDS = .05;
export const EYE_DISSOLVE_SECONDS = EYE_DISSOLVE_FRAMES * EYE_DISSOLVE_FRAME_SECONDS;
/** Night eye hands over to the day eye with a short overlap so frame 0 of the brow never pops in. */
export const EYE_CROSSFADE = .14;
/** Frame at which the night hold needs the eye to leave the foreground pass (the disc is dark and wide). */
export const EYE_FOREGROUND_UNTIL = EYE_HOLD_FIRST;
export const DAY_FRAMES = 16;
export const DAY_FRAME_SECONDS = .05;
export const DAY_SECONDS = DAY_FRAMES * DAY_FRAME_SECONDS;
/** A lost `summer-h01K` (caster died, phase dropped) never leaves the night eye hanging past phaseDelay + this. */
export const SUMMER_GRACE = .6;
/** A lost `skill-h01K` after a cast never leaves the opened eye past windup + this. */
export const WINTER_GRACE = .6;

/** Frames 0–3 across the windup; a late event holds the open eye. Reduced motion shows the open eye. */
export function openFrame(age: number, windup: number, reduced: boolean): number {
  if (reduced) return EYE_OPEN_FRAMES - 1;
  return Math.min(EYE_OPEN_FRAMES - 1, Math.floor(clamp01(age / Math.max(.05, windup)) * EYE_OPEN_FRAMES));
}

/** The eye swells in with the cast (anticipate pulls it back a hair first, then it settles at full size). */
export function openScale(age: number, windup: number, reduced: boolean): number {
  return reduced ? 1 : .55 + .45 * motion.settle(age / Math.max(.05, windup));
}
export const openAlpha = (age: number, windup: number): number => .3 + .7 * clamp01(age / Math.max(.05, windup) * 2);

/**
 * After `skill-h01K`: frames 4–7 close the eye, then the dark disc holds on frames 8,9,10,9… until the day event.
 * Reduced motion keeps one still frame of the dark disc.
 */
export function nightFrame(age: number, reduced: boolean): number {
  if (reduced) return EYE_HOLD_FIRST + 1;
  const closeSeconds = (EYE_HOLD_FIRST - EYE_CLOSE_START) * EYE_CLOSE_FRAME_SECONDS;
  if (age < closeSeconds) return segmentFrame(age, EYE_CLOSE_START, EYE_HOLD_FIRST - EYE_CLOSE_START, EYE_CLOSE_FRAME_SECONDS);
  const step = Math.floor((age - closeSeconds) / .16) % (2 * EYE_HOLD_COUNT - 2);
  return EYE_HOLD_FIRST + (step < EYE_HOLD_COUNT ? step : 2 * EYE_HOLD_COUNT - 2 - step);
}

/** Frame 12–15 shards, started on the day event (or when the watchdog gives up); never starts below frame 12. */
export function dissolveFrame(age: number, reduced: boolean): number {
  return reduced ? EYE_DISSOLVE_START + 1 : segmentFrame(age, EYE_DISSOLVE_START, EYE_DISSOLVE_FRAMES, EYE_DISSOLVE_FRAME_SECONDS);
}
export const dissolveSeconds = (reduced: boolean): number => reduced ? .2 : EYE_DISSOLVE_SECONDS + .04;
export const dissolveAlpha = (age: number, reduced: boolean): number => fadeOut(age, 0, dissolveSeconds(reduced));

export const dayFrame = (age: number, reduced: boolean): number =>
  reduced ? 6 : segmentFrame(age, 0, DAY_FRAMES, DAY_FRAME_SECONDS);
export const daySeconds = (reduced: boolean): number => reduced ? .35 : DAY_SECONDS;
/** The day eye overshoots a little as the crack opens, then settles. */
export const dayScale = (age: number, reduced: boolean): number =>
  reduced ? 1 : .8 + .2 * motion.impactOvershoot(age / .3);
/** Fades in with the crossfade, holds, then cools out over the last frames. */
export const dayAlpha = (age: number, reduced: boolean): number =>
  clamp01(age / EYE_CROSSFADE) * fadeOut(age, daySeconds(reduced) - .2, .2);

/** Night-front crest (16 frames) rolling over one target, staggered by its distance from the caster. */
export const WAVE_FRAMES = 16;
export const WAVE_FRAME_SECONDS = .05;
export const WAVE_SECONDS = WAVE_FRAMES * WAVE_FRAME_SECONDS;
/** Monsters are 5.5–13 tall (the usual 7.3): the crest must read at that scale, not as a 3-unit garnish. */
export const WAVE_SIZE = 7.5;
export const MAX_WAVES = 16;
export const MAX_DECALS = 20;
/** Stagger: the front reaches the far end of the zone this long after it leaves the caster. */
export const FRONT_SPREAD_SECONDS = .4;
export const FRONT_REACH = 14;
export const waveFrame = (age: number, reduced: boolean): number =>
  reduced ? 7 : segmentFrame(age, 0, WAVE_FRAMES, WAVE_FRAME_SECONDS);
export const waveSeconds = (reduced: boolean): number => reduced ? .35 : WAVE_SECONDS;
export const waveAlpha = (age: number, reduced: boolean): number => .94 * fadeOut(age, waveSeconds(reduced) - .14, .14);

/** Delay before the front reaches a target at `distance` from the caster; reduced motion applies every hit at once. */
export function frontDelay(distance: number, reduced: boolean): number {
  return reduced ? 0 : FRONT_SPREAD_SECONDS * clamp01(distance / FRONT_REACH);
}

/** Day-front impact (8 frames): orb → starburst → pillar → slash → crescent → flame → ember. */
export const IMPACT_FRAMES = 8;
export const IMPACT_FRAME_SECONDS = .06;
export const IMPACT_SECONDS = IMPACT_FRAMES * IMPACT_FRAME_SECONDS;
export const IMPACT_SIZE = 7.5;
export const impactFrame = (age: number, reduced: boolean): number =>
  reduced ? 2 : segmentFrame(age, 0, IMPACT_FRAMES, IMPACT_FRAME_SECONDS);
export const impactSeconds = (reduced: boolean): number => reduced ? .3 : IMPACT_SECONDS;
export const impactScale = (age: number, reduced: boolean): number =>
  reduced ? 1 : .85 + .15 * motion.impactOvershoot(age / .14);
export const impactAlpha = (age: number, reduced: boolean): number => .95 * fadeOut(age, impactSeconds(reduced) - .12, .12);

/** Local frost / scorch marks left under every target (they only mark the hit, they are no danger zone). */
export const FROST_DECAL_DIAMETER = 5.2;
export const FROST_DECAL_SECONDS = .9;
export const SCORCH_DECAL_DIAMETER = 5.6;
export const SCORCH_DECAL_SECONDS = 1.1;

/** Caster telegraph (ground, shader): the cold gathers INTO the caster, it never grows past this local size. */
export const GATHER_START_DIAMETER = 10;
export const GATHER_END_DIAMETER = 4.6;
export const gatherDiameter = (age: number, windup: number, reduced: boolean): number =>
  reduced ? GATHER_END_DIAMETER
    : GATHER_START_DIAMETER + (GATHER_END_DIAMETER - GATHER_START_DIAMETER) * motion.settle(age / Math.max(.05, windup));
export const gatherAlpha = (age: number, windup: number, resolved: number | undefined): number =>
  (.2 + .6 * clamp01(age / Math.max(.05, windup))) * (resolved === undefined ? 1 : fadeOut(resolved, 0, .3));

/** Freeze hold (snapshot `frozen.remaining`, ≤ 2.5 s): frost under the target, cracking in the last FROST_EXIT seconds. */
export const FROST_EXIT = .3;
export const frostAlpha = (remaining: number): number => .55 * clamp01(remaining / FROST_EXIT);
export const frostCrack = (remaining: number): number => 1 - clamp01(remaining / FROST_EXIT);

/** Burn hold (snapshot `burn.remaining`, ≤ 4 s): P16 ring under the target, release over the last BURN_EXIT seconds. */
export const BURN_EXIT = .3;
export const BURN_SIZE = 5.2;
export function burnFrame(age: number, remaining: number, reduced: boolean): number {
  return tier6HoldFrame(Math.max(0, age), 16, remaining, reduced, BURN_EXIT);
}
/** Snapshots arrive slower than frames: a marker silent this long really ended. */
export const MARK_GRACE = .25;

/** Time gift: the two-tone strip (2172×724) flies caster → ally head first, then the ally gets the closing arcs. */
export const GIFT_FLIGHT_SECONDS = .42;
export const GIFT_STRIP_LENGTH = 7;
export const GIFT_STRIP_WIDTH = GIFT_STRIP_LENGTH * 724 / 2172;
export const GIFT_FADE = .14;
export const GIFT_HEIGHT = 3.4;
export const GIFT_ARC = 2.2;
export const MAX_GIFTS = 12;
export const giftProgress = (age: number): number => motion.easeOut(age / GIFT_FLIGHT_SECONDS);
export const giftAlpha = (age: number): number => age < GIFT_FLIGHT_SECONDS ? 1 : fadeOut(age, GIFT_FLIGHT_SECONDS, GIFT_FADE);
export const GIFT_SHEET_FRAMES = 8;
export const GIFT_SHEET_FRAME_SECONDS = .05;
export const GIFT_SHEET_SIZE = 5.6;
export const giftSheetFrame = (age: number, reduced: boolean): number =>
  reduced ? 3 : segmentFrame(age, 0, GIFT_SHEET_FRAMES, GIFT_SHEET_FRAME_SECONDS);
export const giftSheetSeconds = (reduced: boolean): number => reduced ? .3 : GIFT_SHEET_FRAMES * GIFT_SHEET_FRAME_SECONDS;

/** Server clock the module may compare against; kept here so tests pin the pair of event delays. */
export const NIGHT_SECONDS = C.phaseDelay;
