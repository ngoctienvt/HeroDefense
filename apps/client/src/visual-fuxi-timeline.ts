import { FUXI } from '../../../content/fuxi-design.js';
import { fadeOut, motion, segmentFrame } from './visual-kit-timeline.js';

const clamp01 = (t: number): number => Math.max(0, Math.min(1, t));

/**
 * Pure beats of Phục Hy Tiên Thiên Bát Quái Càn Khôn Trận (no Babylon imports, testable).
 * Sheet layouts: awakening 4×4 (oblique view, drawn at the battlefield camera angle): 0–3 jade pillars and eight
 * trigram plaques rising out of the crystals, 4–9 plaques lifted and settling, 10–15 plaques lowering onto the ring;
 * inward-current 4×2 flat top-down array with qi threads spiralling to the centre; release 4×2 flat array lowering and
 * unthreading into shards; causality node 4×2 knot (loops).
 * Beats: cast (0.25 s windup) pillars rise at the locked point → ability event: plaques lift and lower, the R9.5 rim
 * compresses toward the centre → snapshot hold (6 s) with the flat array and its threads → last 0.4 s the array unthreads.
 * Nothing here decides a result; the server owns damage, pull, slow, sunder and the soul link.
 */
export const WAKE_CHARGE_LAST = 3;
export const WAKE_IMPACT_START = 4;
export const WAKE_IMPACT_FRAMES = 12;
export const WAKE_FRAME_SECONDS = .04;
export const WAKE_SECONDS = WAKE_IMPACT_FRAMES * WAKE_FRAME_SECONDS;
/** A lost ability event never leaves the charge hanging past windup + this. */
export const CAST_GRACE = .6;
/** Server windup of this hero (combat.ts WINDUP_SECONDS); used only when a lobby cast carries no cast event. */
export const DEFAULT_WINDUP = .25;
/** Disc width as a fraction of the awakening cell width (the oblique ellipse nearly fills the cell). */
export const WAKE_DISC_FILL = .93;

/** Frames 0–3 across the windup; held on 3 if the event is late; reduced motion shows the formed ring only. */
export function wakeChargeFrame(age: number, windup: number, reduced: boolean): number {
  if (reduced) return WAKE_CHARGE_LAST;
  return Math.min(WAKE_CHARGE_LAST, Math.floor(clamp01(age / Math.max(.05, windup)) * (WAKE_CHARGE_LAST + 1)));
}

/** Frames 4–15 from the ability event; reduced motion holds a settled frame. */
export function wakeImpactFrame(age: number, reduced: boolean): number {
  return reduced ? WAKE_IMPACT_START + WAKE_IMPACT_FRAMES - 4 : segmentFrame(age, WAKE_IMPACT_START, WAKE_IMPACT_FRAMES, WAKE_FRAME_SECONDS);
}
export const wakeSeconds = (reduced: boolean): number => reduced ? .25 : WAKE_SECONDS;

/** Pillars gain presence through the windup; after the event they hand over to the flat array in the last half. */
export function wakeAlpha(age: number, windup: number, landedAge: number | undefined, reduced: boolean): number {
  if (landedAge === undefined) return .35 + .65 * clamp01(age / Math.max(.05, windup));
  return fadeOut(landedAge, wakeSeconds(reduced) * .5, wakeSeconds(reduced) * .5);
}

/** Telegraph rim keeps the server radius; only its strength changes. */
export const rimCharge = (age: number, windup: number): number => clamp01(age / Math.max(.05, windup));

/** Compression: the rim sinks toward the centre after the event (never grows past the server radius). */
export const COMPRESS_SECONDS = .45;
export const COMPRESS_FLOOR = .3;
export function compressScale(landedAge: number): number {
  return 1 - (1 - COMPRESS_FLOOR) * motion.settle(landedAge / COMPRESS_SECONDS);
}
export const compressAlpha = (landedAge: number): number => fadeOut(landedAge, COMPRESS_SECONDS * .35, COMPRESS_SECONDS * .65);

/** Hold phase of one snapshot zone. `age` counts from the first snapshot that carried it. */
export const HOLD_FADE_IN = .45;
export const LATE_FADE_IN = .15;
export const CLOSE_SECONDS = .4;
/** A zone first seen with this much of the duration already gone (reconnect, lobby) skips the opening. */
export const LATE_THRESHOLD = .6;

export function isLateZone(remaining: number): boolean {
  return FUXI.duration - remaining > LATE_THRESHOLD;
}

/** Fade-in at the start, `closing` handled by the release sheet, so alpha only covers entry here. */
export function holdAlpha(age: number, late: boolean): number {
  return clamp01(age / (late ? LATE_FADE_IN : HOLD_FADE_IN));
}

export const isClosing = (remaining: number): boolean => remaining <= CLOSE_SECONDS;

/** Inward-current threads loop at 11 fps; reduced motion holds frame 0. */
export const CURRENT_FRAMES = 8;
export const CURRENT_FRAME_SECONDS = .09;
export const currentFrame = (time: number, reduced: boolean): number =>
  reduced ? 0 : Math.floor(Math.max(0, time) / CURRENT_FRAME_SECONDS) % CURRENT_FRAMES;

/** Release sheet plays across the last 0.4 s of `remaining`; reduced motion holds a mid frame. */
export const RELEASE_FRAMES = 8;
export function releaseFrame(remaining: number, reduced: boolean): number {
  if (reduced) return 3;
  return Math.max(0, Math.min(RELEASE_FRAMES - 1, Math.floor((1 - remaining / CLOSE_SECONDS) * RELEASE_FRAMES)));
}

/** A zone that vanished from the snapshot early retracts quickly instead of popping. */
export const RETRACT_SECONDS = .25;
export const retractAlpha = (missingAge: number): number => fadeOut(missingAge, 0, RETRACT_SECONDS);

/** Causality rope: draws on from the first endpoint, then holds; the last 0.4 s it lets go. */
export const LINK_DRAW_SECONDS = .25;
export const LINK_FADE_IN = .2;
export const linkHead = (age: number, reduced: boolean): number => reduced ? 1 : motion.easeOut(clamp01(age / LINK_DRAW_SECONDS));
export function linkAlpha(age: number, remaining: number, missingAge = 0): number {
  const entry = clamp01(age / LINK_FADE_IN);
  const exit = remaining < CLOSE_SECONDS ? clamp01(remaining / CLOSE_SECONDS) : 1;
  return entry * exit * retractAlpha(missingAge);
}
export const NODE_FRAMES = 8;
export const NODE_FRAME_SECONDS = .08;
export const nodeFrame = (time: number, reduced: boolean): number =>
  reduced ? 0 : Math.floor(Math.max(0, time) / NODE_FRAME_SECONDS) % NODE_FRAMES;
/** Rope width follows its length so the 3:1 painted braid never stretches into a thread. */
export const linkWidth = (length: number): number => Math.max(.6, Math.min(1.2, length / 3));
