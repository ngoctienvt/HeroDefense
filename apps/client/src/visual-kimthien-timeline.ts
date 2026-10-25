import { KIMTHIEN as K } from '../../../content/kimthien-design.js';
import { fadeOut, motion, sweep } from './visual-kit-timeline.js';

/**
 * Pure timing/layout for Kim Thiền Tử Thu Yêu Trận (h013). No Babylon imports: testable.
 * Art measured by assets/vfx-source/kimthien/process-art.py (active-inventory.json). The server owns the zone
 * (`golden-bowl` ground effect, `remaining` 5 s, pull, damage); everything here is presentation of its lifetime.
 */

/** Server windup for skill-h013 (combat.ts WINDUP_SECONDS); a cast whose resolve never arrives is dropped after CAST_GRACE. */
export const DEFAULT_WINDUP = .25;
export const CAST_GRACE = .3;

/** Sheet layout: every bowl sheet is 320 px cells; the rear/front sheets are 4x4 (16 frames), the others 4x2. */
export const SHEET_CELL = 320;
export const BOWL_COLUMNS = 4, BOWL_ROWS = 4, SMALL_COLUMNS = 4, SMALL_ROWS = 2;
/** Bowl frames: 0-3 materialise, 4-11 hold (seamless loop with travelling glints), 12-15 break apart. */
export const APPEAR_FRAMES = 4, HOLD_START = 4, HOLD_COUNT = 8, BREAK_START = 12, BREAK_FRAMES = 4;
export const SUCTION_FRAMES = 8, COLLAPSE_FRAMES = 8;

/** Measured on the processed rear sheet hold frames: painted rim spans 16..303 px (288) of the 320 canvas. */
export const BOWL_RIM_PX = 288;
/** Rim width equals the zone diameter (R7), so the painted bowl spans exactly what the server pulls. */
export const BOWL_SIZE = K.zoneRadius * 2 * SHEET_CELL / BOWL_RIM_PX;
/** Canvas rows (px from the top): hold-frame bottom of both bowl layers, the centre of the painted floor ellipse, the collapse pedestal. */
export const BOWL_BOTTOM_PX = 300, FLOOR_CENTER_PX = 250, COLLAPSE_BOTTOM_PX = 317;
/** Fraction of the plane height (from the top) that sits on the locked point: the middle of the bowl floor. */
export const BOWL_ANCHOR_Y = FLOOR_CENTER_PX / SHEET_CELL;
/** The collapse bud's pedestal bottom lands on the rear bowl's bottom (same ground contact). */
export const COLLAPSE_ANCHOR_Y = BOWL_ANCHOR_Y + (COLLAPSE_BOTTOM_PX - BOWL_BOTTOM_PX) / SHEET_CELL;
/** Suction swirl planes: painted swirl spans ~.93 of the canvas; the inner one fills the bowl floor, the outer one is a veil. */
export const SUCTION_SIZE = 9.9, SUCTION_OUTER_SIZE = 12.5, SUCTION_LIFT = .9, SUCTION_OUTER_LIFT = 1;
export const SUCTION_ALPHA = .85, SUCTION_OUTER_ALPHA = .35;

/** Phase lengths (seconds). */
export const APPEAR_SECONDS = .4, APPEAR_FRAME_SECONDS = APPEAR_SECONDS / APPEAR_FRAMES;
export const HOLD_FRAME_SECONDS = .12, SUCTION_FRAME_SECONDS = .07;
export const COLLAPSE_SECONDS = .4, COLLAPSE_FRAME_SECONDS = COLLAPSE_SECONDS / COLLAPSE_FRAMES, REDUCED_COLLAPSE_SECONDS = .2;
/** The bowl layers dissolve over the first part of the collapse while the bud fades in over its first part. */
export const LAYER_FADE_SECONDS = .12, BUD_FADE_IN = .1, BUD_FADE_OUT = .1, BUD_SHRINK_SECONDS = .15, BUD_SHRINK_TO = .55;
/** A ground mark missing this long means the server ended the zone (or it left the zone/screen). */
export const MARK_GRACE = .2, MAX_SEEN_STEP = .05;
/** Ids of finished bowls are remembered this long after their last mark, so a stale snapshot cannot rebuild a folded bowl. */
export const ENDED_MEMORY = 1;
/** A just-created bowl younger than this is reused when the resolve event arrives after its ground mark. */
export const REUSE_AGE = .3;
/** A resolve the ground snapshot never confirmed (practice cast in the lobby) is a short show: appear + hold + collapse. */
export const UNCONFIRMED_SECONDS = 1.6;
/** A ground mark this close to an unconfirmed bowl's point belongs to it. */
export const ADOPT_DISTANCE = 1.5;
/** The ground shows the zone edge faintly while the bowl is up; one pulse per period, each living a little longer. */
export const RING_PERIOD = 1, RING_LIFE = 1.1;
/** Pooled bowls at once (extra casts beyond this are dropped and logged). */
export const MAX_BOWLS = 4;

export type BowlPhase = 'appear' | 'hold' | 'collapse';
export interface BowlClock {
  phase: BowlPhase;
  /** Seconds since the bowl started (total) and since the current phase started. */
  age: number; phaseAge: number;
  /** Seconds since the last ground mark; `confirmed` once the ground effect has been seen. */
  seen: number; confirmed: boolean;
  /** Server `remaining` from the last ground mark. */
  remaining?: number;
  /** Swirl alpha the bowl starts from (the windup swirl hands over its alpha). */
  swirlFrom: number;
}

export function startBowl(options: { late?: boolean; swirlFrom?: number } = {}): BowlClock {
  return { phase: options.late ? 'hold' : 'appear', age: 0, phaseAge: 0, seen: 0, confirmed: Boolean(options.late),
    remaining: undefined, swirlFrom: options.swirlFrom ?? 0 };
}

/** The ground snapshot confirms the zone and carries its remaining time. */
export function markClock(clock: BowlClock, remaining: number): BowlClock {
  const next = { ...clock, seen: 0, confirmed: true, remaining };
  // A fold started by a stall (long frame) while the server still reports plenty of time goes back to holding.
  return clock.phase === 'collapse' && remaining > COLLAPSE_SECONDS * 1.5 ? { ...next, phase: 'hold', phaseAge: 0 } : next;
}

/** Collapse length (reduced motion folds quickly, no sheet). */
export function collapseSeconds(reduced: boolean): number { return reduced ? REDUCED_COLLAPSE_SECONDS : COLLAPSE_SECONDS; }

export function appearSeconds(reduced: boolean): number { return reduced ? 0 : APPEAR_SECONDS; }

/** True once the zone should fold: the server is about to end it, stopped reporting it, or an unconfirmed show ran its course. */
export function shouldCollapse(clock: BowlClock): boolean {
  if (clock.confirmed) return (clock.remaining ?? Infinity) <= COLLAPSE_SECONDS || clock.seen > MARK_GRACE;
  return clock.age >= UNCONFIRMED_SECONDS - COLLAPSE_SECONDS;
}

export function advanceBowl(clock: BowlClock, dt: number, reduced: boolean): BowlClock {
  // One long frame (tab refocus, GC pause) must not look like missing ground marks: only a short step counts toward `seen`.
  const next = { ...clock, age: clock.age + dt, phaseAge: clock.phaseAge + dt, seen: clock.seen + Math.min(dt, MAX_SEEN_STEP) };
  if (next.phase === 'collapse') return next;
  if (shouldCollapse(next)) return { ...next, phase: 'collapse', phaseAge: 0 };
  if (next.phase === 'appear' && next.phaseAge >= appearSeconds(reduced)) return { ...next, phase: 'hold', phaseAge: 0 };
  return next;
}

export function bowlDone(clock: BowlClock, reduced: boolean): boolean {
  return clock.phase === 'collapse' && clock.phaseAge >= collapseSeconds(reduced);
}

export interface LayerPose { frame: number; alpha: number }

/** Frame/alpha of the rear and front bowl layers (they always share both, so the wall and the lip open and close together). */
export function bowlLayerPose(clock: BowlClock, reduced: boolean): LayerPose {
  if (reduced) return { frame: HOLD_START + 1, alpha: clock.phase === 'collapse' ? fadeOut(clock.phaseAge, 0, REDUCED_COLLAPSE_SECONDS) : 1 };
  switch (clock.phase) {
    case 'appear':
      return { frame: Math.min(APPEAR_FRAMES - 1, Math.floor(clock.phaseAge / APPEAR_FRAME_SECONDS)), alpha: Math.min(1, clock.phaseAge / .08) };
    case 'hold':
      return { frame: HOLD_START + Math.floor(clock.phaseAge / HOLD_FRAME_SECONDS) % HOLD_COUNT, alpha: 1 };
    default:
      return { frame: BREAK_START + Math.min(1, Math.floor(clock.phaseAge / (LAYER_FADE_SECONDS / 2))),
        alpha: fadeOut(clock.phaseAge, 0, LAYER_FADE_SECONDS) };
  }
}

/** Suction swirl: a closed loop of 8 frames, continuous for as long as the zone lasts; fades as the bowl folds. */
export function suctionPose(clock: BowlClock, reduced: boolean, layerAlpha = SUCTION_ALPHA): LayerPose {
  if (reduced) return { frame: 1, alpha: clock.phase === 'collapse' ? 0 : layerAlpha * .5 };
  const frame = Math.floor(clock.age / SUCTION_FRAME_SECONDS) % SUCTION_FRAMES;
  switch (clock.phase) {
    case 'appear': return { frame, alpha: layerAlpha * (clock.swirlFrom + (1 - clock.swirlFrom) * motion.settle(sweep(clock.phaseAge, 0, APPEAR_SECONDS))) };
    case 'hold': return { frame, alpha: layerAlpha };
    default: return { frame, alpha: layerAlpha * fadeOut(clock.phaseAge, 0, .2) };
  }
}

export interface BudPose extends LayerPose { scale: number }

/** Collapse bud (Codex bowl-collapse sheet): fades in as the bowl layers dissolve, folds shut over 8 frames, shrinks into the point. */
export function budPose(clock: BowlClock, reduced: boolean): BudPose | undefined {
  if (clock.phase !== 'collapse' || reduced) return undefined;
  const age = clock.phaseAge;
  const shrink = sweep(age, COLLAPSE_SECONDS - BUD_SHRINK_SECONDS, BUD_SHRINK_SECONDS);
  return { frame: Math.min(COLLAPSE_FRAMES - 1, Math.floor(age / COLLAPSE_FRAME_SECONDS)),
    alpha: Math.min(1, age / BUD_FADE_IN) * fadeOut(age, COLLAPSE_SECONDS - BUD_FADE_OUT, BUD_FADE_OUT),
    scale: 1 - (1 - BUD_SHRINK_TO) * motion.settle(shrink) };
}

/** Windup swirl (cast → resolve): grows and brightens at the locked point; the resolve takes its alpha over. */
export function windupPose(age: number, windup: number, reduced: boolean): { scale: number; alpha: number; frame: number } {
  const t = sweep(age, 0, Math.max(.05, windup));
  return { scale: reduced ? 1 : .55 + .45 * motion.settle(t), alpha: reduced ? .5 : SUCTION_ALPHA * Math.min(1, t * 1.4),
    frame: reduced ? 1 : Math.floor(age / SUCTION_FRAME_SECONDS) % SUCTION_FRAMES };
}

/** One inward drop: starts on a ring around the point and flies at the centre (never outward). */
export function inwardDrop(rand: () => number, radius = K.zoneRadius): { x: number; z: number; vx: number; vz: number; vy: number } {
  const angle = rand() * Math.PI * 2, r = radius * (.6 + .4 * rand());
  const x = Math.cos(angle) * r, z = Math.sin(angle) * r;
  // Speed × the longest particle life (1 s) stays below r, so a drop never reaches or crosses the centre (even with the
  // ±.5 scatter the spray adds): it only ever moves inward.
  const speed = r * (.5 + .3 * rand());
  return { x, z, vx: -Math.cos(angle) * speed, vz: -Math.sin(angle) * speed, vy: 1.2 + rand() * 1.6 };
}

/** A falling petal/dust spot over the folding bowl (gravity does the rest). */
export function showerDrop(rand: () => number): { x: number; z: number; y: number } {
  const angle = rand() * Math.PI * 2, r = 2.6 * Math.sqrt(rand());
  return { x: Math.cos(angle) * r, z: Math.sin(angle) * r, y: 2 + rand() * 2.4 };
}
/** Drops per second while the zone holds, and per pulse of the collapse (falling petals and dust, a soft shower, no blast). */
export const DROPS_PER_SECOND = 22, COLLAPSE_SHOWER = 14;
