/**
 * Pure timing for Hồng Hài Nhi (h00C) "Tam Muội Chân Hỏa Liên Kích" (no Babylon imports, so it is testable).
 * Art: assets/vfx-source/honghainhi (Codex-painted, see prompts/). Sweep flipbook `honghainhi-sweep` (16 frames,
 * top-down, drawn as a GROUND quad): 0-2 the fire gathers during the server windup, 3-15 the spear sweeps 360 degrees,
 * becomes a full ring and dies to embers. `fire-ring` = scorched-ground decal left under the sweep. Ignite flipbook
 * `honghainhi-ignite` (8 frames) is a flame column on every enemy the snapshot shows burning from her.
 * Numbers come from content/catalog.ts skill-h00C and combat.ts (radius 4.2 around her, burn 4 s, sunder 4 s).
 */
import { motion, segmentFrame, sweep } from './visual-kit-timeline.js';

export const HONGHAINHI_ID = 'h00C';
export const HONGHAINHI_SKILL = `skill-${HONGHAINHI_ID}`;
export const HONGHAINHI_ATLAS = { sweep: 'honghainhi-sweep', ignite: 'honghainhi-ignite' } as const;
export const FIRE_RING_URL = '/assets/vfx-honghainhi-fire-ring.webp';

/** catalog `effect.radius`; combat.ts hits every enemy within 4.2 of her (a full circle, no direction). */
export const SKILL_RADIUS = 4.2;
/** combat.ts: `burn { remaining: 4 }` and `sunder` for 4 s on every enemy hit. */
export const BURN_SECONDS = 4;
/** Server windup when a cast event carries none (combat.ts WINDUP_SECONDS). */
export const DEFAULT_WINDUP = .25;

/** Measured from the processed art (assets/vfx-source/honghainhi/processed/measure.json). */
export const SWEEP_RING_FRACTION = .9442; // widest ring frame / cell width
export const FIRE_RING_FRACTION = .9807; // ring bbox / decal width
/** Plane sides that put the painted ring's outer edge exactly on the skill radius. */
export const SWEEP_PLANE = 2 * SKILL_RADIUS / SWEEP_RING_FRACTION;
export const FIRE_RING_PLANE = 2 * SKILL_RADIUS / FIRE_RING_FRACTION;

/** Sweep: frames 0-2 form during the windup (held on 2), 3-15 at 20 fps after the ability. */
const SWEEP_FPS = 20;
export const SWEEP_FORMING_FRAMES = 3;
export const SWEEP_OPEN_FRAMES = 13;
export const SWEEP_AFTER_SECONDS = SWEEP_OPEN_FRAMES / SWEEP_FPS;
export function sweepFormingFrame(age: number, windup: number): number {
  return segmentFrame(age, 0, SWEEP_FORMING_FRAMES, Math.max(.04, windup) / SWEEP_FORMING_FRAMES);
}
export function sweepOpenFrame(age: number): number { return segmentFrame(age, SWEEP_FORMING_FRAMES, SWEEP_OPEN_FRAMES, 1 / SWEEP_FPS); }
/** A cast whose ability never comes (cancelled / left the zone) gives up after this long. */
export const ORPHAN_SECONDS = 1.2;
/** Reduced motion keeps the telegraph and the reach as still frames: gathering fire (2), then the full ring (7). */
export const STILL_FORMING = 2;
export const STILL_RING = 7;
export const STILL_SECONDS = .4;

/** Scorched ring: appears once the sweep has closed the circle (frame 7), holds, then cools off. */
export const RING_DELAY = 4 / SWEEP_FPS;
export const RING_LIFE = 1.8;
export function ringAlpha(age: number): number {
  return .85 * motion.settle(sweep(age, 0, .2)) * (1 - sweep(age, RING_LIFE * .55, RING_LIFE * .45));
}
/** The decal lands slightly small and spreads to its full 4.2 reach, so the hit area reads as a shockwave. */
export function ringScale(age: number): number { return .86 + .14 * motion.easeOut(sweep(age, 0, .25)); }

/** Embers thrown off the closing ring (counts bounded by KitSpray's own pool). */
export const EMBER_COUNT = 22;

/**
 * Ignite flame on a burning enemy: 0-3 climb once (14 fps), then frames 3-5 loop while the snapshot holds the burn,
 * and 5-7 play out when it stops. Pure frame functions so the loop never runs backwards past the tail.
 */
const IGNITE_FPS = 14;
export const IGNITE_CLIMB_FRAMES = 4;
export const IGNITE_CLIMB_SECONDS = IGNITE_CLIMB_FRAMES / IGNITE_FPS;
const HOLD_LOOP = [3, 4, 5, 4] as const;
const HOLD_FPS = 9;
export const TAIL_FIRST = 5;
export const TAIL_FRAMES = 3;
const TAIL_FPS = 12;
export const TAIL_SECONDS = TAIL_FRAMES / TAIL_FPS;
export const IGNITE_STILL_FRAME = 3;
/** Marks arrive every frame while the burn holds; a gap this long means it ended. */
export const BURN_GAP = .25;
export function igniteClimbFrame(age: number): number { return segmentFrame(age, 0, IGNITE_CLIMB_FRAMES, 1 / IGNITE_FPS); }
export function igniteHoldFrame(sinceClimb: number): number {
  return HOLD_LOOP[Math.floor(Math.max(0, sinceClimb) * HOLD_FPS) % HOLD_LOOP.length];
}
export function igniteTailFrame(sinceEnd: number): number { return segmentFrame(sinceEnd, TAIL_FIRST, TAIL_FRAMES, 1 / TAIL_FPS); }
/** Frame while burning: climb, then the hold loop. */
export function igniteBurningFrame(age: number): number {
  return age < IGNITE_CLIMB_SECONDS ? igniteClimbFrame(age) : igniteHoldFrame(age - IGNITE_CLIMB_SECONDS);
}
/** Embers rise off a burning enemy at most once per this many seconds. */
export const EMBER_GATE = .5;
