import { DOUZHAN as D } from '../../../content/douzhan-design.js';
import { fadeOut, motion, sweep } from './visual-kit-timeline.js';

/**
 * Pure timing/layout for Đấu Chiến Thắng Phật (h012) Pháp Thiên Tượng Địa. No Babylon imports: testable.
 * Art measured by assets/vfx-source/douzhan/process-art.py (active-inventory.json). Everything here is presentation;
 * the server resolves the lane damage and spawns the clones at the `ability` event.
 */

/** Server windup for skill-h012 when the cast event omits it (combat.ts WINDUP_SECONDS). */
export const DEFAULT_WINDUP = .25;
/** A cast whose resolve never arrives (cancelled, caster died) is cleaned up this long after its windup. */
export const CAST_GRACE = .3;

/** The server lane: from the caster along `direction`, `LANE_LENGTH` long and `LANE_WIDTH` wide (inPanguRift). */
export const LANE_LENGTH = D.staffLength, LANE_WIDTH = D.staffWidth;

/** Staff: hangs on a pivot just in front of the caster; when it lies flat its tip is exactly at the lane end. */
export const PIVOT_OFFSET = .6, STAFF_LENGTH = LANE_LENGTH - PIVOT_OFFSET, STAFF_RADIUS = .85, HAND_HEIGHT = 1.5;
/** Elevation angles (rad above the ground): first seen, raised for the strike, lying on the lane, rebound peak. */
export const START_ANGLE = .3, RAISE_ANGLE = .87, LIE_ANGLE = .06, REBOUND_ANGLE = .24;
/** The staff grows from this fraction of its size while it is lifted. */
export const GROW_FROM = .3;
export const SLAM_SECONDS = .12, REBOUND_SECONDS = .16, STAFF_HOLD = .2, STAFF_FADE = .15;
/** Seconds the staff stays visible after the resolve. */
export const STAFF_LIFE = SLAM_SECONDS + REBOUND_SECONDS + STAFF_HOLD + STAFF_FADE;

export interface StaffPose { angle: number; scale: number; alpha: number }

/** Windup: the staff appears small, grows and lifts to the strike angle; a late resolve holds the last pose. */
export function raisePose(age: number, windup: number, reduced: boolean): StaffPose {
  if (reduced) return { angle: .35, scale: 1, alpha: 1 };
  const t = motion.easeOut(sweep(age, 0, Math.max(.05, windup)));
  return { angle: START_ANGLE + (RAISE_ANGLE - START_ANGLE) * t, scale: GROW_FROM + (1 - GROW_FROM) * t,
    alpha: sweep(age, 0, .05) };
}

/** Resolve: a fast accelerating slam onto the lane, a small rebound, then it lies there and fades. `landed` = contact. */
export function slamPose(age: number, reduced: boolean): StaffPose & { landed: boolean } {
  if (reduced) return { angle: LIE_ANGLE, scale: 1, alpha: fadeOut(age, .25, .15), landed: true };
  const alpha = fadeOut(age, SLAM_SECONDS + REBOUND_SECONDS + STAFF_HOLD, STAFF_FADE);
  if (age < SLAM_SECONDS) {
    const t = motion.launch(sweep(age, 0, SLAM_SECONDS));
    return { angle: RAISE_ANGLE + (LIE_ANGLE - RAISE_ANGLE) * t, scale: 1, alpha, landed: false };
  }
  const u = sweep(age, SLAM_SECONDS, REBOUND_SECONDS);
  return { angle: LIE_ANGLE + (REBOUND_ANGLE - LIE_ANGLE) * 4 * u * (1 - u), scale: 1, alpha, landed: true };
}

/** Pivot height: the hand while lifted, the staff's own radius when it rests on the ground. */
export function pivotHeight(angle: number): number {
  return STAFF_RADIUS + (HAND_HEIGHT - STAFF_RADIUS) * Math.max(0, Math.min(1, angle / RAISE_ANGLE));
}

/** Seconds from the resolve until the staff touches down (impact layers start then); 0 with reduced motion. */
export function contactDelay(reduced: boolean): number { return reduced ? 0 : SLAM_SECONDS; }

/** Gathering clouds around the pivot during the windup: they spiral in, swell and fade when the staff comes down. */
export const CLOUD_COUNT = 3, CLOUD_SIZE = 3.2;
export function cloudPose(i: number, age: number, windup: number, reduced: boolean): { angle: number; radius: number; scale: number; alpha: number; frame: number } {
  const t = sweep(age, 0, Math.max(.05, windup)), base = (i / CLOUD_COUNT) * Math.PI * 2;
  if (reduced) return { angle: base, radius: .9, scale: .8, alpha: .7, frame: 0 };
  return { angle: base + 1.2 * t, radius: .45 + 2.6 * (1 - motion.easeOut(t)), scale: .55 + .45 * t,
    alpha: Math.min(1, t * 3) * .9, frame: i % 2 };
}

/** Lane telegraph (server-locked direction): faint at the cast, brighter as the strike nears, gone once the staff lands. */
export function laneAlpha(age: number, windup: number, sinceResolve: number | undefined, reduced: boolean): number {
  const ramp = reduced ? .5 : .08 + .47 * sweep(age, 0, Math.max(.05, windup));
  return ramp * (sinceResolve === undefined ? 1 : fadeOut(sinceResolve, 0, .12));
}

/** Fracture ribbon (top-down, 3:1): painted extent x .0267..0.9843 of the image is laid on the lane's 14 units. */
export const FRACTURE_X0 = .0267, FRACTURE_X1 = .9843, FRACTURE_ASPECT = 3;
export const FRACTURE_LENGTH = LANE_LENGTH / (FRACTURE_X1 - FRACTURE_X0);
export const FRACTURE_WIDTH = FRACTURE_LENGTH / FRACTURE_ASPECT;
export const FRACTURE_REVEAL = .11, FRACTURE_HOLD = .3, FRACTURE_CLOSE = .7;
export const FRACTURE_LIFE = FRACTURE_HOLD + FRACTURE_CLOSE;
/** Image fraction revealed so far (head leads on the right of the image, toward the lane end). */
export function fractureHead(age: number, reduced: boolean): number {
  if (reduced) return 1;
  const t = sweep(age, 0, FRACTURE_REVEAL);
  return 1 - (1 - t) * (1 - t);
}
/** Cracks snap in, hold, then close: they fade while narrowing toward the lane axis. */
export function fracturePose(age: number, reduced: boolean): { alpha: number; squeeze: number } {
  if (reduced) return { alpha: Math.min(1, age / .03) * fadeOut(age, .2, .3), squeeze: 1 };
  return { alpha: Math.min(1, age / .03) * fadeOut(age, FRACTURE_HOLD, FRACTURE_CLOSE),
    squeeze: 1 - .35 * motion.settle(sweep(age, FRACTURE_HOLD, FRACTURE_CLOSE)) };
}
export function fractureLife(reduced: boolean): number { return reduced ? .5 : FRACTURE_LIFE; }

/** Slam bursts (Codex dust-and-rock sheet, 16 frames on a 4x4 grid, ground line at .8625 of the cell): outward along the lane. */
export const BURST_DISTANCES: readonly number[] = [2, 4.7, 7.4, 10.1, 12.8];
export const BURST_STAGGER = .04, BURST_FRAME_SECONDS = .032, BURST_FRAMES = 16, BURST_SIZE = 5.2, BURST_GROUND = .8625;
export const BURST_LIFE = BURST_FRAMES * BURST_FRAME_SECONDS;
export function burstFrame(age: number, reduced: boolean): number {
  return reduced ? 5 : Math.min(BURST_FRAMES - 1, Math.max(0, Math.floor(age / BURST_FRAME_SECONDS)));
}
export function burstAlpha(age: number, reduced: boolean): number {
  return reduced ? fadeOut(age, .1, .25) : fadeOut(age, BURST_LIFE - .1, .1);
}
/** Seconds after contact when burst `i` starts: the shock runs from the caster to the lane end. */
export function burstStart(i: number, reduced: boolean): number { return reduced ? 0 : i * BURST_STAGGER; }
/** Distances that get a burst: the whole lane, or only its middle with reduced motion. */
export function burstDistances(reduced: boolean): readonly number[] { return reduced ? [BURST_DISTANCES[2]] : BURST_DISTANCES; }
/** Seconds after contact when the shock reaches `along` units from the caster (contact flares on listed monsters). */
export function shockArrival(along: number, reduced: boolean): number {
  return reduced ? 0 : Math.min(1, Math.max(0, along / LANE_LENGTH)) * (BURST_DISTANCES.length - 1) * BURST_STAGGER;
}

/** Clone arrival cloud (Codex sheet, 8 frames on a 4x4 grid, ground at .9068) and its hold/exit. */
export const ARRIVAL_FRAMES = 8, ARRIVAL_FRAME_SECONDS = .07, ARRIVAL_LIFE = ARRIVAL_FRAMES * ARRIVAL_FRAME_SECONDS;
export const ARRIVAL_SIZE = 3.4, ARRIVAL_GROUND = .9068, HOLD_FRAME = 5;
/** A clone first seen this soon after `summon-h012` (and this close to its point) gets the arrival cloud. */
export const ARRIVAL_WINDOW = 1.5, ARRIVAL_RADIUS = 4.5;
/** Safety cap on the marker (server clones last 7 s) and the short exit when the unit vanishes. */
export const CLONE_CAP = D.cloneSeconds + .5, EXIT_SECONDS = .25;

export interface ClonePose { frame: number; alpha: number; scale: number }
export type ClonePhase = 'arrive' | 'hold' | 'exit';
export function clonePose(phase: ClonePhase, age: number, time: number, reduced: boolean): ClonePose {
  if (phase === 'arrive') return { frame: reduced ? HOLD_FRAME : Math.min(ARRIVAL_FRAMES - 1, Math.floor(age / ARRIVAL_FRAME_SECONDS)),
    alpha: 1, scale: 1 };
  if (phase === 'hold') return { frame: HOLD_FRAME, alpha: .55, scale: reduced ? 1 : 1 + .04 * Math.sin(time * 3 + age) };
  const t = sweep(age, 0, EXIT_SECONDS);
  return { frame: 6 + Math.round(t), alpha: 1 - t, scale: 1 - .4 * motion.settle(t) };
}

/** Clone staff hit (Codex sheet, 8 frames, contact on frame 3, hit point at the anchor below). */
export const HIT_FRAMES = 8, HIT_SIZE = 4.4, HIT_ANCHOR_X = .5489, HIT_ANCHOR_Y = .9561;
const HIT_SWING_FRAME = .035, HIT_TAIL_FRAME = .06, HIT_CONTACT = 3;
export const HIT_CONTACT_SECONDS = HIT_CONTACT * HIT_SWING_FRAME;
export const HIT_LIFE = HIT_CONTACT_SECONDS + (HIT_FRAMES - HIT_CONTACT) * HIT_TAIL_FRAME;
export function hitFrame(age: number, reduced: boolean): number {
  if (reduced) return HIT_CONTACT;
  if (age < HIT_CONTACT_SECONDS) return Math.floor(age / HIT_SWING_FRAME);
  return Math.min(HIT_FRAMES - 1, HIT_CONTACT + Math.floor((age - HIT_CONTACT_SECONDS) / HIT_TAIL_FRAME));
}
export function hitAlpha(age: number, reduced: boolean): number {
  return reduced ? fadeOut(age, .15, .2) : fadeOut(age, HIT_LIFE - .06, .06);
}
export function hitLife(reduced: boolean): number { return reduced ? .35 : HIT_LIFE; }
