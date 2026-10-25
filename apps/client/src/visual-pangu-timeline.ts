import { PANGU as P } from '../../../content/pangu-design.js';
import { motion } from './visual-kit-timeline.js';

const clamp01 = (t: number): number => Math.max(0, Math.min(1, t));

/**
 * Khai Thiên Nhất Phủ timing and placement as pure functions (tested). Art is the tier56 Codex inventory
 * packed by assets/vfx-source/pangu/process-art.py; sizes come from its runtime-scale reference composites.
 *
 * Event → beat: cast (windup 0.35 s, damage immune) = chaos qi gathers on Bàn Cổ + the axe shadow drops
 * over the locked point; ability = impact frame lands, rock banks split the ground, crater + R8.5 shock
 * ring, camera shake; cataclysm trait = one small ground crack under each zone-0 enemy the server hit;
 * pangu-rift ground (snapshot, 14×4.5, 5 s) = torn fissure from the caster with the looping chaos mouth.
 */
export const PANGU_ART = {
  charge: { url: '/assets/vfx-pangu-charge.webp', columns: 4, rows: 2, size: 7, anchorY: .88 },
  cleave: { url: '/assets/vfx-pangu-cleave.webp', columns: 4, rows: 4, size: 9, anchorY: 310 / 360 },
  quake: { url: '/assets/vfx-pangu-quake.webp', columns: 4, rows: 2, size: 2.6, aspect: 300 / 384, anchorY: 327 / 420 },
  crater: { url: '/assets/vfx-pangu-crater.webp', size: 7 },
  rift: { url: '/assets/vfx-pangu-rift.webp', cut: .84 },
  flow: { url: '/assets/vfx-pangu-flow.webp', columns: 4, rows: 2, length: 4.2, aspect: 264 / 400 },
} as const;

export const CHARGE_RELEASE = .32;   // dissolve frames 4..7 after the server resolves
export const CLEAVE_IMPACT = 1.15;   // impact frames 3..15
export const CLEAVE_TELEGRAPH_GRACE = .35;  // shadow fades if no ability event arrives after the windup
export const CRATER_LIFE = 2.6;
export const QUAKE_LIFE = .7;
export const QUAKE_STAGGER = .22;
export const RIFT_TEAR = .32;        // fissure tears open from caster to the axe head
export const RIFT_FADE = .35;
export const FLOW_FPS = 10;
export const SHAKE_SECONDS = .25;

/** Charge sheet: gather 0..3 across the windup and hold the axe mark, then dissolve 4..7 after resolve. */
export function chargeFrame(age: number, windup: number, resolvedAt?: number): number {
  if (resolvedAt === undefined || age < resolvedAt) return Math.min(3, Math.floor(clamp01(age / Math.max(.05, windup)) * 4));
  const after = (age - resolvedAt) / CHARGE_RELEASE;
  return after >= 1 ? -1 : 4 + Math.min(3, Math.floor(after * 4));
}

/** Axe shadow over the locked point during the windup: frames 0..2, held on 2 (falling, not yet struck). */
export function telegraphFrame(age: number, windup: number): number {
  return Math.min(2, Math.floor(motion.launch(age / Math.max(.05, windup)) * 3));
}

/** Impact: frame 3 (strike) the instant the server resolves, banks rise fast and settle slow. −1 = done. */
export function impactFrame(age: number): number {
  if (age < 0) return 3;
  if (age >= CLEAVE_IMPACT) return -1;
  return 3 + Math.min(12, Math.floor(motion.settle(age / CLEAVE_IMPACT) * 13));
}

export function craterAlpha(age: number): number {
  if (age < 0 || age >= CRATER_LIFE) return 0;
  return Math.min(1, age / .08) * (1 - clamp01((age - CRATER_LIFE * .55) / (CRATER_LIFE * .45)));
}

/** Cataclysm crack under one enemy; −1 = done. */
export function quakeFrame(age: number): number {
  if (age < 0) return 0;
  return age >= QUAKE_LIFE ? -1 : Math.min(7, Math.floor(age / QUAKE_LIFE * 8));
}

/** Deterministic per-hit delay so the aftershock ripples instead of popping all at once. */
export function quakeDelay(index: number): number {
  return ((index * .618034) % 1) * QUAKE_STAGGER;
}

export interface GroundPlacement { x: number; z: number; yaw: number; length: number; width: number }

/**
 * A ground plane from KitPainted (`rotation.x = π/2`) maps texture u to local +X and v to world +Z.
 * `yaw` turns local +X onto `dir` (Babylon applies Y after X), so u = 1 lands at origin + dir·(start+length).
 */
export function groundStrip(origin: { x: number; z: number }, dir: { x: number; z: number },
  start: number, length: number, width: number): GroundPlacement {
  const mid = start + length / 2;
  return { x: origin.x + dir.x * mid, z: origin.z + dir.z * mid, yaw: Math.atan2(-dir.z, dir.x), length, width };
}

/** How far the rift has torn open since it first appeared (0..1, ease-out). */
export function riftReveal(elapsed: number): number { return motion.settle(elapsed / RIFT_TEAR); }

export interface RiftLayout { body: GroundPlacement; uMax: number; mouth?: GroundPlacement }

export function riftAlpha(remaining: number): number { return clamp01(remaining / RIFT_FADE); }

/**
 * Static fissure body (art cut before its own head) and the looping chaos mouth at the far end.
 * `reveal` shortens both the plane and its UV range together so the art is never stretched.
 */
export function riftLayout(origin: { x: number; z: number }, dir: { x: number; z: number },
  length: number = P.riftLength, width: number = P.riftWidth, reveal = 1): RiftLayout {
  const bodyLength = length * PANGU_ART.rift.cut;
  const visible = Math.max(.001, Math.min(bodyLength, length * clamp01(reveal)));
  const flow = PANGU_ART.flow;
  return {
    body: groundStrip(origin, dir, 0, visible, width),
    uMax: visible / bodyLength,
    // The axe-head mouth only appears once the tear reaches the full server length.
    mouth: reveal >= 1 ? groundStrip(origin, dir, length - flow.length, flow.length, flow.length * flow.aspect) : undefined,
  };
}

export function flowFrame(time: number): number { return Math.floor(Math.max(0, time) * FLOW_FPS) % 8; }

/** UVs of a plane cropped to u ∈ [0, uMax] (base = the plane's own 0..1 UVs). */
export function croppedUvs(base: readonly number[], uMax: number): number[] {
  return base.map((v, i) => i % 2 === 0 ? v * clamp01(uMax) : v);
}
