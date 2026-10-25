import { NHU_LAI as N } from '../../../content/new-divine-design.js';
import { motion, segmentFrame } from './visual-kit-timeline.js';

/** Frame layout of the Codex sheets (0-based, row-major, 4×4 unless noted). */
export const PALM_FORM_FRAMES = 6;       // 0–5: palm forms high above the point, turns and descends
export const PALM_CONTACT_FRAME = 6;     // 6–7: contact + rubble, 8–11: fractures into gold pieces, 12–15: motes fade
export const PALM_FRAME_COUNT = 16;
export const IMPACT_FRAME_COUNT = 8;     // palm-earth-impact: 4×2
export const MOUNTAIN_RISE_FRAMES = 4;   // 0–3 rise, 4–11 hold loop, 12–15 collapse
export const MOUNTAIN_HOLD_START = 4;
export const MOUNTAIN_HOLD_FRAMES = 8;
export const MOUNTAIN_EXIT_START = 12;

/** Palm plane: content fills ~94 % of the cell, so the plane edge sits just past the server radius 9.5 / 1.2. */
export const PALM_SIZE = 22;
export const PALM_ANCHOR_Y = .9;        // fraction of the cell (from the top) where the palm meets the ground
export const PALM_LIFT = 5.5;            // world units the palm hangs above the point at the start of the windup
export const IMPACT_SIZE = 15;
export const IMPACT_ANCHOR_Y = .78;
/** Registered 442² canvas (nominal cell + 64 px margin): content ≈ .67 of the plane width, feet at .86. */
export const MOUNTAIN_SIZE = 16;
export const MOUNTAIN_ANCHOR_Y = .86;
/** The range stands on the far rim of the zone, never over its middle. */
export const MOUNTAIN_FAR_OFFSET = 7;
/** The decal ring (outer stones) spans 0.9569 of the raw canvas; scale so it lands on the server radius. */
export const GROUND_RING_RATIO = .9569;
export const GROUND_SIZE = N.skillRadius * 2 / GROUND_RING_RATIO;

const EXIT = .5;
const CONTACT_FRAME_SECONDS = .06;
const clamp01 = (t: number): number => Math.max(0, Math.min(1, t));

/** Cast windup: the palm forms, then accelerates down, finishing on the last pre-contact frame (held if the event is late). */
export function palmCastFrame(age: number, windup: number, reduced: boolean): number {
  if (reduced) return PALM_FORM_FRAMES - 2;
  return Math.min(PALM_FORM_FRAMES - 1, Math.floor(clamp01(age / Math.max(.05, windup)) * PALM_FORM_FRAMES));
}

/** Height of the palm above the point: 0 at contact, never moves in reduced motion (the telegraph stays at the point). */
export function palmLift(age: number, windup: number, reduced: boolean): number {
  if (reduced) return 0;
  return PALM_LIFT * (1 - motion.launch(clamp01(age / Math.max(.05, windup))));
}

export const palmCastAlpha = (age: number, windup: number): number => .35 + .65 * clamp01(age / Math.max(.05, windup) * 1.6);

/** After the server ability event: contact dust, then the palm breaks into motes (frames 7–15). */
export function palmContactFrame(age: number, reduced: boolean): number {
  if (reduced) return PALM_CONTACT_FRAME + 1;
  return segmentFrame(age, PALM_CONTACT_FRAME, PALM_FRAME_COUNT - PALM_CONTACT_FRAME, CONTACT_FRAME_SECONDS);
}
export const PALM_CONTACT_SECONDS = (PALM_FRAME_COUNT - PALM_CONTACT_FRAME) * CONTACT_FRAME_SECONDS;
/** Slight overshoot on arrival so the contact reads as weight, then settles. */
export const palmContactScale = (age: number): number => 1 + .08 * (1 - motion.settle(age / .18));

export const impactFrame = (age: number, reduced: boolean): number =>
  reduced ? 3 : segmentFrame(age, 0, IMPACT_FRAME_COUNT, .075);
export const IMPACT_SECONDS = IMPACT_FRAME_COUNT * .075;

/** Telegraph that never outlives a lost ability event. */
export const PALM_CAST_GRACE = .6;

/** Age of a zone first seen with `remaining` left: a late snapshot or reconnect joins the hold, not a replayed rise. */
export const zoneStartAge = (remaining: number): number => Math.max(0, N.zoneSeconds - remaining);
export const zoneExiting = (remaining: number): boolean => remaining < EXIT;
export const zoneAlpha = (remaining: number): number => clamp01(remaining / EXIT);

/** Mountain frame (rear sheet): rise → looping hold → collapse over the last EXIT seconds. */
export function mountainFrame(age: number, remaining: number, reduced: boolean): number {
  if (reduced) return MOUNTAIN_HOLD_START + 3;
  if (remaining < EXIT) return MOUNTAIN_EXIT_START + Math.min(3, Math.floor((EXIT - remaining) / (EXIT / 4)));
  if (age < MOUNTAIN_RISE_FRAMES * .1) return segmentFrame(age, 0, MOUNTAIN_RISE_FRAMES, .1);
  return MOUNTAIN_HOLD_START + Math.floor(age * 4) % MOUNTAIN_HOLD_FRAMES;
}

/** Ground decal: stamps in over the first .15 s with a small overshoot, holds, fades with the zone. */
export function groundPose(age: number, remaining: number, reduced: boolean): { scale: number; alpha: number } {
  const fade = zoneAlpha(remaining);
  if (reduced) return { scale: 1, alpha: .9 * fade };
  return { scale: .85 + .15 * motion.impactOvershoot(age / .2), alpha: .95 * clamp01(age / .1) * fade };
}
