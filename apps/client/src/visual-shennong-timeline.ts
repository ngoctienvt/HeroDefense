import { SHENNONG } from '../../../content/shennong-design.js';
import { motion, segmentFrame } from './visual-kit-timeline.js';

/**
 * Pure timing/layout for Thần Nông Bách Thảo Luyện Thiên Đỉnh (no Babylon: testable). Presentation only: the server
 * decides damage, heal, weakness and the 5.5 s of the grove; every phase here follows an event or a snapshot `remaining`.
 * Art metrics come from assets/vfx-source/shennong/metadata.json (frames realigned to one ground line).
 */
const clamp01 = (t: number): number => Math.max(0, Math.min(1, t));

/** Server windup for skill-h01E when the cast event omits it (combat.ts WINDUP_SECONDS). */
export const DEFAULT_WINDUP = .25;
/** Seconds of closing at the end of the grove: mist is drawn back into the vessel, roots retract, leaves fall. */
export const EXIT = .45;

/** Vessel sheet (4×4, 334×467 cells): body ≈ 140 px wide, foot on row .94 of every frame. */
export const POT_BODY = 3.6;
export const POT_WIDTH = 334 / 140 * POT_BODY;
export const POT_HEIGHT = POT_WIDTH * 467 / 334;
export const POT_ANCHOR_Y = .940043;
/** Windup: the vessel drops from this height onto the locked point. */
export const POT_DROP = 5;

/** Eruption frames 2–11 right after the server impact; 12–15 settle; then the loop of steam frames. */
export const ERUPT_SECONDS = .84;
const SETTLE_SECONDS = .4;
/** The geyser reads over monsters only for the burst; the 5 s hold drops behind them (world pass). */
export const FOREGROUND_SECONDS = .9;
/** Wave of medicine that races out to the radius. */
export const SHOCK_SECONDS = .42;
/** Lobby casts have no `shennong-grove` snapshot: hold this long, then close. */
export const FALLBACK_HOLD = 1.6;
export const ZONE_GRACE = .35;

export const charge = (age: number, windup: number): number => clamp01(age / Math.max(.05, windup));

/** Windup frames 0–1 (closed → lid cracking); the vessel falls with a launch curve and lands at the end. */
export function castPose(age: number, windup: number, reduced: boolean): { frame: number; lift: number; alpha: number } {
  const c = charge(age, windup);
  return { frame: c > .7 ? 1 : 0, lift: reduced ? 0 : POT_DROP * (1 - motion.launch(c)), alpha: .35 + .65 * motion.easeOut(c) };
}

/** Vessel frame `age` seconds after the impact with `remaining` seconds of grove left. */
export function potFrame(age: number, remaining: number, reduced: boolean): number {
  if (remaining < EXIT) return 15;
  if (reduced) return 14;
  if (age < ERUPT_SECONDS) {
    if (age < .12) return segmentFrame(age, 2, 2, .06);
    if (age < .44) return segmentFrame(age - .12, 4, 4, .08);
    return segmentFrame(age - .44, 8, 4, .1);
  }
  if (age < ERUPT_SECONDS + SETTLE_SECONDS) return segmentFrame(age - ERUPT_SECONDS, 12, 4, SETTLE_SECONDS / 4);
  return [14, 15, 14, 13][Math.floor((age - ERUPT_SECONDS - SETTLE_SECONDS) * 5) % 4];
}

/** Slam on the impact: a small squash that settles (reduced motion: none). */
export function potScale(age: number, reduced: boolean): number {
  return reduced || age > .2 ? 1 : 1 + .07 * (1 - motion.settle(age / .2));
}

/** Opacity of the vessel: full through the grove, gone with the exit. */
export const potAlpha = (remaining: number): number => clamp01(remaining / (EXIT * .7));

/** Zone age a late snapshot joins at: never replays the burst. */
export const zoneStartAge = (remaining: number): number => Math.max(0, SHENNONG.zoneSeconds - remaining);

/** Ground medicine wave: radius fraction (0..1) and opacity of the shock ring racing to the gameplay radius. */
export function shock(age: number, reduced: boolean): { radius: number; alpha: number } {
  if (age >= SHOCK_SECONDS) return { radius: 1, alpha: 0 };
  const t = age / SHOCK_SECONDS;
  return { radius: reduced ? 1 : motion.easeOut(t), alpha: reduced ? .5 * (1 - t) : (1 - t * t) * .9 };
}

/** Root-and-leaf decal spreads from the vessel to the full radius (never beyond it) and fades with the exit. */
export function groveSpread(age: number, remaining: number, reduced: boolean): { scale: number; alpha: number } {
  const spread = reduced ? 1 : .3 + .7 * motion.easeOut(clamp01((age - .08) / .55));
  const fadeIn = reduced ? 1 : clamp01((age + .02) / .25);
  return { scale: spread * (remaining < EXIT ? .9 + .1 * (remaining / EXIT) : 1), alpha: fadeIn * clamp01(remaining / EXIT) };
}

/** Mist columns around the ring: gaps stay open for monsters, centre is clear. */
export const MIST_COUNT = 7;
export const MIST_WIDTH = 4.6;
export const MIST_ANCHOR_Y = .8998;
export function mistPose(k: number, age: number, remaining: number, radius: number, reduced: boolean): {
  x: number; z: number; frame: number; alpha: number; } {
  const ring = radius * (.58 + .26 * (((k * 37) % 5) / 4));
  const drift = reduced ? 0 : (k % 2 ? 1 : -1) * age * .07;
  const closing = clamp01(1 - remaining / EXIT);
  const angle = k * Math.PI * 2 / MIST_COUNT + Math.sin(k * 2.3) * .22 + drift - closing * 1.2;
  const r = ring * (1 - .85 * motion.easeOut(closing));
  const delay = .25 + k * .06;
  const alpha = clamp01((age - delay) / .6) * (1 - closing) * .8;
  return { x: Math.cos(angle) * r, z: Math.sin(angle) * r,
    frame: reduced ? (k * 3) % 8 : Math.floor(age * 6 + k * 2) % 8, alpha };
}

/** Roots at each tree foot: 0–3 burst (.35 s), 4–11 loop, 12–15 retract inside the exit. */
export const ROOT_WIDTH = 7;
export const ROOT_FOOT_Y = 264 / 397;
export function rootFrame(age: number, remaining: number, reduced: boolean): number {
  if (remaining < EXIT) return reduced ? 14 : 12 + Math.min(3, Math.floor((1 - remaining / EXIT) * 4));
  if (reduced) return 8;
  if (age < .35) return segmentFrame(age, 0, 4, .0875);
  return 4 + Math.floor((age - .35) * 9) % 8;
}

/** The real tree actor rises from its roots: scale from a sprout to full height with a small overshoot. */
export function treeGrowth(age: number, reduced: boolean): number {
  if (reduced || age >= .6) return 1;
  return .12 + .88 * motion.impactOvershoot(clamp01((age - .08) / .5));
}

/** Weakness mark over a monster: 0–7 wilt in, 8–23 loop, 24–31 fade; `leaving` is seconds since the snapshot dropped it. */
export const WEAK_INTRO = .32, WEAK_OUTRO = .32;
export function weakFrame(age: number, leaving: number | undefined, reduced: boolean): number {
  if (reduced) return leaving === undefined ? 12 : 26;
  if (leaving !== undefined) return 24 + Math.min(7, Math.floor(leaving / WEAK_OUTRO * 8));
  if (age < WEAK_INTRO) return Math.min(7, Math.floor(age / WEAK_INTRO * 8));
  return 8 + Math.floor((age - WEAK_INTRO) * 10) % 16;
}

/** Life stream pulse: period seconds, head runs out first then the tail follows; returns the 0..1 head/tail along A→B. */
export const STREAM_PERIOD = 1.15;
export function streamPulse(clock: number, phase: number): { head: number; tail: number; alpha: number } {
  const u = (((clock + phase) % STREAM_PERIOD) + STREAM_PERIOD) % STREAM_PERIOD / STREAM_PERIOD;
  const head = motion.easeOut(clamp01(u / .42));
  const tail = clamp01((u - .16) / .5);
  return { head, tail: Math.min(head, tail), alpha: clamp01(u / .08) * clamp01((.78 - u) / .2) };
}

/** Fade of a persistent stream: in over .4 s, out with the exit. */
export const streamFade = (age: number, remaining: number): number => clamp01(age / .4) * clamp01(remaining / EXIT);
