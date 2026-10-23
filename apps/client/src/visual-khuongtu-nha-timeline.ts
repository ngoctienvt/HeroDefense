import { KHUONGTU as K } from '../../../content/khuongtu-nha-design.js';
import { fadeOut, motion, segmentFrame, sweep } from './visual-kit-timeline.js';

/**
 * Pure timing/layout for Khương Tử Nha Phong Thần Pháp Trận (h019). No Babylon imports: testable.
 * Art measured by assets/vfx-source/khuongtu-nha/process-art.py (active-inventory.json). Everything here is
 * presentation: the server owns the 5 s zone, the eight bolts (one `bolt-h019` event each, 0.625 s apart) and every seal.
 */

/** Server windup for skill-h019 when the cast event omits it (combat.ts WINDUP_SECONDS). */
export const DEFAULT_WINDUP = .25;
/** A cast whose resolve never arrives (cancelled, caster died) is closed this long after its windup; no impact. */
export const CAST_GRACE = .3;
/** After the resolve, wait this long for the snapshot to show the zone; none (practice lobby) → close. */
export const MARK_WAIT = .7;
/** A snapshot-driven zone that stops being marked this long is gone (killed caster, zone swap): close. */
export const MARK_LOSS = .25;
/** Nothing outlives the server's zone by more than this (a reconnect keeps bounded state). */
export const ZONE_CAP = K.zoneSeconds + 1;

export const BOLT_INTERVAL = K.zoneSeconds / K.boltCount;

/** Scroll sheet: 16 frames on a 4x4 grid. 0-3 unfurl, 4-7 fully open (6 widest), 8-11 curl back, 12-15 rolled again. */
export const SCROLL_FRAMES = 16, SCROLL_OPEN_FRAME = 6, SCROLL_CURL_FIRST = 8, SCROLL_CURL_FRAMES = 8;
/** The scroll opens completely in this long after the cast (plan: T0 → 0.2 s). */
export const OPEN_SECONDS = .2;
/** The scroll rolls into its axle and the seal lines retract to the centre in this long at the end. */
export const CLOSE_SECONDS = .35;
/** Open scroll shimmers between the open frames while it hangs over the zone. */
export const HOLD_CYCLE: readonly number[] = [6, 7, 6, 5];
export const HOLD_FRAME_SECONDS = .22;
/** Widest open frame is .891 of the cell; the plane is sized so it spans ≈ 5 world units. */
export const SCROLL_SIZE = 5.6;
/** Plane centre above the locked point along screen-up: the open scroll hangs clear of the monsters at the centre. */
export const SCROLL_LIFT = 4.5;
export const BOLT_PULSE_SECONDS = .14;

/** Seal art: the stone ring ends at 477 px of the 1254 px canvas centre (measured); that edge is the R7 zone edge. */
export const ARRAY_SOLID_FRACTION = 477 / 1254;
export const ARRAY_EDGE_RATIO = .97;
export const ARRAY_SIZE = K.zoneRadius * ARRAY_EDGE_RATIO / ARRAY_SOLID_FRACTION;
export const ARRAY_DRAW_SECONDS = .28;
export const ARRAY_SPIN = .12;

/** Bolt hit sheet: 4x2, frames 0 spark, 1-2 bolt descending, 3 burst, 4-7 shards fade; contact point measured. */
export const BOLT_FRAMES = 8;
export const BOLT_STRIKE_SECONDS = .18, BOLT_TAIL_SECONDS = .15;
export const BOLT_LIFE = BOLT_STRIKE_SECONDS + BOLT_TAIL_SECONDS;
export const BOLT_SIZE = 4.8;
export const BOLT_ANCHOR_Y = .86;
/** The burnt dot a bolt leaves: small, cools in under a second; never a zone. */
export const SCORCH_RADIUS = .8, SCORCH_LIFE = .9;
export const BOLT_REDUCED_FRAME = 3;

/** Basic attack: five-link chain along the server's targets, drawn with the side-on thunder strip. */
export const CHAIN_ASPECT = 3.2926;
export const CHAIN_LINK_STAGGER = .07, CHAIN_REVEAL = .07, CHAIN_LIFE = .2;
export const CHAIN_MAX_WIDTH = 1.1, CHAIN_MIN_WIDTH = .5;
export const CHAIN_FROM_HEIGHT = 1.6, CHAIN_TO_HEIGHT = 1;

export interface ZonePose { age: number; closeAge?: number; reduced: boolean; pulse: number }

/** Scroll frame, opacity, scale and extra lift for a zone: unfurl 0→6 in `OPEN_SECONDS`, shimmer, then curl 8→15. */
export function scrollPose(zone: ZonePose, time: number): { frame: number; alpha: number; scale: number; lift: number } {
  if (zone.closeAge !== undefined) {
    const close = sweep(zone.closeAge, 0, CLOSE_SECONDS);
    const frame = zone.reduced ? SCROLL_OPEN_FRAME
      : SCROLL_CURL_FIRST + Math.min(SCROLL_CURL_FRAMES - 1, Math.floor(close * SCROLL_CURL_FRAMES));
    return { frame, alpha: fadeOut(zone.closeAge, CLOSE_SECONDS - .1, .1),
      scale: zone.reduced ? 1 : 1 - .3 * motion.settle(close), lift: zone.reduced ? 0 : .5 * motion.settle(close) };
  }
  if (zone.reduced) return { frame: SCROLL_OPEN_FRAME, alpha: 1, scale: 1, lift: 0 };
  const open = sweep(zone.age, 0, OPEN_SECONDS);
  const held = Math.max(0, zone.age - OPEN_SECONDS);
  const frame = open < 1 ? Math.min(SCROLL_OPEN_FRAME, Math.floor(open * (SCROLL_OPEN_FRAME + 1)))
    : HOLD_CYCLE[Math.floor(held / HOLD_FRAME_SECONDS) % HOLD_CYCLE.length];
  const pulse = Math.max(0, zone.pulse) / BOLT_PULSE_SECONDS;
  return { frame, alpha: Math.min(1, open * 5),
    scale: (.55 + .45 * motion.impactOvershoot(open)) * (1 + .07 * pulse), lift: .12 * Math.sin(time * 2.4) };
}

/** Seal decal: lines gather in from a wider, spinning start in `ARRAY_DRAW_SECONDS`, turn slowly, retract to the centre on close. */
export function arrayPose(zone: ZonePose, time: number): { alpha: number; scale: number; spin: number } {
  const draw = zone.reduced ? 1 : sweep(zone.age, 0, ARRAY_DRAW_SECONDS);
  const settled = motion.settle(draw);
  let scale = zone.reduced ? 1 : 1 + .3 * (1 - settled);
  let alpha = zone.reduced ? 1 : Math.min(1, draw * 3) * (.93 + .05 * Math.sin(time * 2.2));
  let spin = zone.reduced ? 0 : ARRAY_SPIN * zone.age - 1.1 * (1 - settled);
  if (zone.closeAge !== undefined) {
    const retract = sweep(zone.closeAge, 0, CLOSE_SECONDS);
    scale *= 1 - .88 * motion.settle(retract);
    alpha *= fadeOut(zone.closeAge, .12, CLOSE_SECONDS - .12);
    if (!zone.reduced) spin += 2.4 * retract * retract;
  }
  return { alpha, scale, spin };
}

/** Bolt frame: the strike (spark → bolt → burst) takes `BOLT_STRIKE_SECONDS`, the shards then fade over the tail. */
export function boltFrame(age: number, reduced: boolean): number {
  if (reduced) return BOLT_REDUCED_FRAME;
  if (age < BOLT_STRIKE_SECONDS) return Math.min(4, Math.floor(age / BOLT_STRIKE_SECONDS * 5));
  return segmentFrame(age - BOLT_STRIKE_SECONDS, 5, 3, BOLT_TAIL_SECONDS / 3);
}
export function boltAlpha(age: number): number {
  return fadeOut(age, BOLT_LIFE - .06, .06);
}

/** Link `i` of the chain starts this long after the attack (the chain jumps target to target). */
export function chainDelay(i: number): number { return i * CHAIN_LINK_STAGGER; }
/** Fraction of the link drawn `age` seconds after its start: the head runs out, then the whole strip fades. */
export function chainReveal(age: number): number { return sweep(age, 0, CHAIN_REVEAL); }
export function chainAlpha(age: number): number { return fadeOut(age, CHAIN_LIFE * .5, CHAIN_LIFE * .5); }
/** Strip width for a link of `length`: the art's own aspect, kept inside a readable band. */
export function chainWidth(length: number): number {
  return Math.min(CHAIN_MAX_WIDTH, Math.max(CHAIN_MIN_WIDTH, length / CHAIN_ASPECT));
}
