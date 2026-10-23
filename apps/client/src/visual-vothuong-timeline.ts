/**
 * Pure timing for Vô Thường (h00H) "Hắc Bạch Đoạt Mệnh Xích" (no Babylon imports, so it is testable).
 * Art: assets/vfx-source/vothuong (Codex-painted, see prompts/). Flipbook `vothuong-reap` (4x4): 0-3 the talisman
 * ring tightens around the victim during the server windup, 4-7 the chain-sickle cuts (the X is frame 6, the star
 * burst frame 7), 8-15 the soul is pulled up out of the ink. Flipbook `vothuong-soul` (8x2): the soul wisp flying
 * back (0-7) and dissolving into him (8-15). Chain strip: painted sickle-and-chain, hook head on the right, thrown
 * from his hand to the victim. Mark ring: top-down yin-yang decal under the enemy the snipe will pick when the
 * server's crit condition (Phá Giáp or <35% HP) holds.
 *
 * Server facts (combat.ts): `cast skill-h00H` (windup 0.25 s, `target` + x/z = victim) then `ability skill-h00H`
 * (`target`, x/z = victim, `targets` = [victim]); the shot is instant, so flight/strike times below are
 * presentation only. A killed victim shows up as a `death` event (same tick, emitted before the ability event);
 * the +70 Nộ refund is energy on the unit, not an event.
 */
import { motion, segmentFrame, sweep } from './visual-kit-timeline.js';

export const VOTHUONG_ID = 'h00H';
export const VOTHUONG_SKILL = `skill-${VOTHUONG_ID}`;
export const VOTHUONG_ATLAS = { reap: 'vothuong-reap', soul: 'vothuong-soul' } as const;
export const CHAIN_STRIP_URL = '/assets/vfx-vothuong-chain-strip.webp';
export const MARK_RING_URL = '/assets/vfx-vothuong-mark-ring.webp';

/** catalog/combat.ts: the crit condition and Nộ refund the VFX mirrors (never decides). */
export const CRIT_HP_RATIO = .35;
export const MARK_ENERGY_RATIO = .6;
/** Server windup when a cast event carries none (combat.ts WINDUP_SECONDS). */
export const DEFAULT_WINDUP = .25;

/** Telegraph: frames 0-3 form during the windup, held on 3 until the chain lands. */
export const TELEGRAPH_FRAMES = 4;
export function telegraphFrame(age: number, windup: number): number {
  return segmentFrame(age, 0, TELEGRAPH_FRAMES, Math.max(.04, windup) / TELEGRAPH_FRAMES);
}
/** A cast whose ability never comes (target gone / left the zone) gives up after this long. */
export const ORPHAN_SECONDS = 1.2;

/**
 * Chain strip (hook head first): leaves his hand at the ability, reaches the victim in CHAIN_EXTEND, holds, thins and
 * fades. The reap strike starts when the head arrives.
 */
export const CHAIN_EXTEND = .14;
export const CHAIN_LIFE = .5;
export const STRIKE_DELAY = CHAIN_EXTEND * .9;
export function chainReach(age: number): number { return motion.launch(sweep(age, 0, CHAIN_EXTEND)) * .35 + motion.easeOut(sweep(age, 0, CHAIN_EXTEND)) * .65; }
export function chainAlpha(age: number): number { return 1 - sweep(age, CHAIN_EXTEND + .1, CHAIN_LIFE - CHAIN_EXTEND - .1); }
export function chainWidth(age: number): number { return 1 - .35 * sweep(age, CHAIN_EXTEND + .06, CHAIN_LIFE - CHAIN_EXTEND - .06); }
/** Plane width for a strip of `length`: keeps the painted 3:1 aspect, clamped so short strips stay thick. */
export function stripPlaneWidth(length: number): number { return Math.min(3.4, Math.max(2.2, length / 3)); }

/**
 * Reap strike (age counted from the head's arrival): frames 4-8 cut and burst at 20 fps; a victim the server
 * killed keeps going to 15 (the soul rises), a survivor's ink fades out after the burst.
 */
export const REAP_FPS = 20;
export const REAP_START_FRAME = 4;
export const REAP_HIT_FRAMES = 5;
export const REAP_KILL_FRAMES = 12;
export const REAP_FADE = .15;
export function reapFrame(age: number, killed: boolean): number {
  return segmentFrame(age, REAP_START_FRAME, killed ? REAP_KILL_FRAMES : REAP_HIT_FRAMES, 1 / REAP_FPS);
}
export function reapSeconds(killed: boolean): number {
  return killed ? REAP_KILL_FRAMES / REAP_FPS : REAP_HIT_FRAMES / REAP_FPS + REAP_FADE;
}
export function reapAlpha(age: number, killed: boolean): number {
  return killed ? 1 : 1 - sweep(age, REAP_HIT_FRAMES / REAP_FPS, REAP_FADE);
}
/** The soul leaves the ink when frame 9 (the soul is clear of the burst) shows. */
export const SOUL_RELEASE = 5 / REAP_FPS;

/** Soul return: wisp flies victim → him over SOUL_FLIGHT (frames 0-7), then dissolves into him (8-15 at 16 fps). */
export const SOUL_FLIGHT = .5;
export const SOUL_ARRIVE_FPS = 16;
export const SOUL_ARRIVE_SECONDS = 8 / SOUL_ARRIVE_FPS;
export const SOUL_ARC = 1.3;
/** Height of the wisp's base above the ground at the victim and at his chest. */
export const SOUL_START_Y = .3;
export const SOUL_END_Y = .5;
export function soulFlightFrame(age: number): number { return segmentFrame(age, 0, 8, SOUL_FLIGHT / 8); }
export function soulArriveFrame(age: number): number { return segmentFrame(age - SOUL_FLIGHT, 8, 8, 1 / SOUL_ARRIVE_FPS); }
export function soulProgress(age: number): number { return motion.launch(sweep(age, 0, SOUL_FLIGHT)) * .6 + sweep(age, 0, SOUL_FLIGHT) * .4; }
export function soulAlpha(age: number): number { return .35 + .65 * sweep(age, 0, SOUL_FLIGHT * .3); }

/** Mark ring under the pending victim: grows in, turns slowly while the snapshot holds the condition, withers after. */
export const MARK_DIAMETER = 3.6;
export const MARK_GROW = .25;
export const MARK_FADE = .3;
export const MARK_SPIN = .5; // rad/s
export function markScale(sinceStart: number): number { return .6 + .4 * motion.impactOvershoot(sweep(sinceStart, 0, MARK_GROW)); }
export function markAlpha(sinceStart: number, sinceLastMark: number): number {
  return .85 * motion.settle(sweep(sinceStart, 0, MARK_GROW)) * (1 - sweep(sinceLastMark, 0, MARK_FADE));
}
