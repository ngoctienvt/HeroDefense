import { piecewise } from './visual-kit-timeline.js';

/** Pure lane/flight/layout maths of Niết Bàn Phần Thiên Vũ (no Babylon, so it is unit-tested). */
export type XZ = { x: number; z: number };

export const FLIGHT_SECONDS = 1.25;
export const BIRD_SIZE = 17;
export const GATHER_SIZE = 9;
/** Shortest/longest lane the bird crosses (world units); the damage itself is zone-wide. */
export const MIN_LANE = 26;
export const MAX_LANE = 46;
const LANE_MARGIN = 5;
export const MAX_STRIKES = 24;
export const GHOST_LAGS = [.1, .2, .31] as const;
export const GHOST_VISIBILITY = [.42, .27, .15] as const;

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));
const unit = (v: XZ): XZ | undefined => {
  const length = Math.hypot(v.x, v.z);
  return Number.isFinite(length) && length > 1e-3 ? { x: v.x / length, z: v.z / length } : undefined;
};

/**
 * Presentation axis of the sweep. The ability event carries no direction, so: server direction (the cast event's,
 * kept by the caller) → caster→locked point → principal axis of the target spread (oriented away from the caster) →
 * `fallback` (screen-right). Damage hits the whole zone, so this only chooses where the bird flies.
 */
export function resolveDirection(serverDir: XZ | undefined, origin: XZ, point: XZ, targets: readonly XZ[],
  fallback: XZ): XZ {
  const direct = (serverDir && unit(serverDir)) ?? unit({ x: point.x - origin.x, z: point.z - origin.z });
  if (direct) return direct;
  if (targets.length > 0) {
    let sxx = 0, sxz = 0, szz = 0, mx = 0, mz = 0;
    for (const t of targets) { mx += t.x / targets.length; mz += t.z / targets.length; }
    for (const t of targets) {
      const dx = t.x - mx, dz = t.z - mz;
      sxx += dx * dx; sxz += dx * dz; szz += dz * dz;
    }
    const angle = .5 * Math.atan2(2 * sxz, sxx - szz);
    const axis = { x: Math.cos(angle), z: Math.sin(angle) };
    const away = (mx - origin.x) * axis.x + (mz - origin.z) * axis.z;
    if (sxx + szz > 1e-3) return away < 0 ? { x: -axis.x, z: -axis.z } : axis;
  }
  return unit(fallback) ?? { x: 1, z: 0 };
}

export interface FlightPath { start: XZ; end: XZ; dir: XZ; length: number }

/** Bird path: the caster → past the farthest known point (min `MIN_LANE`, max `MAX_LANE`). */
export function flightPath(origin: XZ, dir: XZ, point: XZ, targets: readonly XZ[]): FlightPath {
  let far = 0;
  for (const p of [point, ...targets]) far = Math.max(far, projection(origin, dir, p));
  const length = Math.min(MAX_LANE, Math.max(MIN_LANE, far + LANE_MARGIN));
  return { start: { x: origin.x, z: origin.z }, dir, length,
    end: { x: origin.x + dir.x * length, z: origin.z + dir.z * length } };
}

export const projection = (origin: XZ, dir: XZ, p: XZ): number => (p.x - origin.x) * dir.x + (p.z - origin.z) * dir.z;

const PROGRESS_KEYS = [[0, 0], [.1, .03], [.45, .5], [.85, .96], [1, 1]] as const;
/** Slow gather, hard acceleration through the middle, long glide out: bird head progress along the lane. */
export function flightProgress(t: number): number { return piecewise(PROGRESS_KEYS, clamp01(t)); }

/** Seconds into the flight at which the head reaches `p` (0..1); numeric inverse of the monotonic progress curve. */
export function timeAtProgress(p: number): number {
  let lo = 0, hi = 1;
  const goal = clamp01(p);
  for (let i = 0; i < 24; i++) { const mid = (lo + hi) / 2; if (flightProgress(mid) < goal) lo = mid; else hi = mid; }
  return hi * FLIGHT_SECONDS;
}

/** Delay of the hit on a point `along` metres down the lane: the bird passes it, then it bursts. */
export function strikeDelay(along: number, length: number): number {
  return length <= 0 ? 0 : timeAtProgress(along / length) * .92;
}

/** Wing-beat schedule (frame indices of the 16-pose sheet): launch, beat, beat, stoop, dissolve. */
const FLIGHT_FRAMES = [3, 4, 5, 4, 5, 6, 5, 4, 5, 6, 5, 6, 10, 9, 12, 13, 14, 15] as const;
export function birdFrame(t: number): number {
  return FLIGHT_FRAMES[Math.min(FLIGHT_FRAMES.length - 1, Math.floor(clamp01(t) * FLIGHT_FRAMES.length))];
}

/** Charge: the gathering bird (frames 0..3) over the caster while the telegraph tightens. */
export function gatherFrame(power: number): number { return Math.min(3, Math.floor(clamp01(power) * 4)); }

export function birdVisibility(t: number): number { return 1 - clamp01((t - .88) / .12) * .35; }

/** Evenly thins `points` to `max` (kept in lane order) so a crowded wave never exceeds the plane/spray budget. */
export function sampleStrikes<T extends XZ>(points: readonly T[], origin: XZ, dir: XZ, max = MAX_STRIKES): T[] {
  const sorted = [...points].sort((a, b) => projection(origin, dir, a) - projection(origin, dir, b));
  if (sorted.length <= max) return sorted;
  return Array.from({ length: max }, (_, i) => sorted[Math.round(i * (sorted.length - 1) / (max - 1))]);
}

export interface Placement { dx: number; dz: number; size: number; phase: number }

/** Feather-rain clusters over the whole R: centre + eight in a golden-angle spiral, ±15 % size. */
export function rainLayout(radius: number): Placement[] {
  const base = radius * .66;
  return Array.from({ length: 9 }, (_, i) => {
    const angle = i * 2.399963, reach = i === 0 ? 0 : radius * (.3 + .55 * Math.sqrt(i / 8));
    return { dx: Math.cos(angle) * reach, dz: Math.sin(angle) * reach,
      size: base * (.92 + .16 * ((i * 5) % 7) / 6), phase: i * 3 };
  });
}

/** Carpet fire: a ring on the R boundary (the zone reads as a wall of fire) plus a few inside. */
export function flameLayout(radius: number): Placement[] {
  const ring = Array.from({ length: 9 }, (_, i) => {
    const a = i / 9 * Math.PI * 2 + .3;
    return { dx: Math.cos(a) * radius * .86, dz: Math.sin(a) * radius * .86, size: radius * .82, phase: i * 5 };
  });
  const inner = Array.from({ length: 4 }, (_, i) => {
    const a = i / 4 * Math.PI * 2 + .9;
    return { dx: Math.cos(a) * radius * .38, dz: Math.sin(a) * radius * .38, size: radius * .66, phase: i * 3 + 2 };
  });
  return [...ring, ...inner];
}

/** Flames at the ignition stay in front of monsters; later they drop to the ground pass. */
export const IGNITE_FOREGROUND_SECONDS = .9;
