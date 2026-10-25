import { NGUYEN_THUY } from '../../../content/new-divine-design.js';
import { motion, unitDirection } from './visual-kit-timeline.js';

type Point = { x: number; z: number };
const clamp = (value: number, min = 0, max = 1): number => Math.max(min, Math.min(max, value));

/** Presentation timing for Bàn Cổ Phướng: Phá Toái Hư Không. None of it decides a result: the server event does. */
export const NT_TIME = {
  /** Banner flipbook after the resolve: three-way split (4–7), hold (8–11), dissolve (12–15). */
  splitSeconds: .3, holdSeconds: .3, dissolveSeconds: .35,
  /** One sword stream: head flight, then the tail leaves. */
  streamFlight: .26, streamLife: .5,
  /** All rends of one resolve land inside this window so it reads as one sweep, never as separate hits. */
  sweepSpread: .3,
  rendSeconds: .75, breakSeconds: .8,
  /** Fresh hit art is capped per resolve: a zone can hold dozens of monsters. */
  maxFullRends: 24, maxGroundRends: 48, maxStreams: 3,
} as const;
export const BANNER_RELEASE_SECONDS = NT_TIME.splitSeconds + NT_TIME.holdSeconds + NT_TIME.dissolveSeconds;

/** Banner frames 0–3 follow the windup (open silk, loose strands) and hold the last one if the resolve is late. */
export function bannerCastFrame(age: number, windup: number, reduced: boolean): number {
  if (reduced) return 3;
  return Math.min(3, Math.floor(clamp(age / Math.max(.05, windup)) * 4));
}

/** Frames 4–15 once the server resolves: split into three strands, hold the pinwheel, dissolve. */
export function bannerReleaseFrame(age: number, reduced: boolean): number {
  if (reduced) return 9;
  const { splitSeconds: split, holdSeconds: hold, dissolveSeconds: dissolve } = NT_TIME;
  if (age < split) return 4 + Math.floor(clamp(age / split) * 3.999);
  if (age < split + hold) return 8 + Math.floor(clamp((age - split) / hold) * 3.999);
  return 12 + Math.floor(clamp((age - split - hold) / dissolve) * 3.999);
}

/** Banner opacity: builds with the charge, full through the split, gone with the dissolve. */
export function bannerAlpha(age: number, windup: number, releaseAge: number | undefined): number {
  if (releaseAge === undefined) return .3 + .7 * motion.easeOut(clamp(age / Math.max(.05, windup)));
  return 1 - clamp((releaseAge - NT_TIME.splitSeconds - NT_TIME.holdSeconds * .5) / (NT_TIME.holdSeconds * .5 + NT_TIME.dissolveSeconds));
}

/** Banner scale grows from a fold to its full width while it opens (reduced motion: full size). */
export function bannerScale(age: number, windup: number, reduced: boolean): number {
  return reduced ? 1 : .7 + .3 * motion.easeOut(clamp(age / Math.max(.05, windup)));
}

/** Rend frames: 0–2 pull-in, 3–8 the cut opens with the cross flare, 9–11 settle, 12–15 close and dissolve. */
export function rendFrame(age: number, reduced: boolean): number {
  if (reduced) return 6;
  return Math.min(15, Math.floor(clamp(age / NT_TIME.rendSeconds) * 16));
}

/** Ground crack: only the open/settle half of the sheet (the flat cut), held until the fade. */
export function rendGroundFrame(age: number, reduced: boolean): number {
  if (reduced) return 9;
  return 8 + Math.floor(clamp(age / NT_TIME.rendSeconds) * 7.999);
}

export function rendAlpha(age: number): number {
  return clamp((NT_TIME.rendSeconds - age) / .2) * clamp(age / .04 + .35);
}

/** The shield/armour break sheet has 8 frames over `breakSeconds`. */
export function breakFrame(age: number, reduced: boolean): number {
  if (reduced) return 3;
  return Math.min(7, Math.floor(clamp(age / NT_TIME.breakSeconds) * 8));
}

/** How far along the lane (0 = caster, 1 = end) a target lies: it lands when the stream head passes it. */
export function hitDelay(along: number, reach: number): number {
  if (!Number.isFinite(along) || !Number.isFinite(reach) || reach <= 0) return 0;
  return clamp(along / reach) * NT_TIME.sweepSpread;
}

/** Head position (0..1) of a stream `age` seconds after it was released. */
export function streamProgress(age: number): number {
  return motion.launch(clamp(age / NT_TIME.streamFlight));
}

export function streamAlpha(age: number): number {
  return clamp(age / .05) * clamp((NT_TIME.streamLife - age) / .22);
}

/** Aim of the stream fan and how far it flies; undefined (no streams) when no real point proves a direction. */
export function streamAim(origin: Point, main: Point | undefined, targets: readonly Point[],
  direction?: Point): { dir: Point; reach: number } | undefined {
  const valid = targets.filter(p => Number.isFinite(p.x) && Number.isFinite(p.z));
  const centroid = valid.length
    ? { x: valid.reduce((s, p) => s + p.x, 0) / valid.length, z: valid.reduce((s, p) => s + p.z, 0) / valid.length }
    : undefined;
  const point = main && Number.isFinite(main.x) && Number.isFinite(main.z) ? main : centroid;
  const dir = unitDirection({ direction, x: point?.x, z: point?.z }, origin);
  if (!dir) return undefined;
  const farthest = valid.reduce((m, p) => Math.max(m, (p.x - origin.x) * dir.x + (p.z - origin.z) * dir.z), 0);
  return { dir, reach: clamp(Math.max(NGUYEN_THUY.lineLength, farthest + 1.5), NGUYEN_THUY.lineLength, 16) };
}

/** Fan of three: the central stream plus two rotated slightly; offsets and delays make one sweep, not three hits. */
export const STREAM_FAN = [
  { angle: 0, lateral: 0, delay: 0, reach: 1 },
  { angle: -.1, lateral: -1.1, delay: .04, reach: .92 },
  { angle: .1, lateral: 1.1, delay: .08, reach: .96 },
] as const;

/** Three motifs for one resolve; empty when direction cannot be proven from event positions. */
export function primordialStreams(origin: Point, target: Point, direction?: Point): { from: Point; to: Point }[] {
  const unit = unitDirection({ x: target.x, z: target.z, direction }, origin);
  if (!unit) return [];
  const length = Math.hypot(target.x - origin.x, target.z - origin.z);
  if (!Number.isFinite(length) || length < .001) return [];
  return [-1, 0, 1].map(side => {
    const offset = side * .65;
    return {
      from: { x: origin.x - unit.z * offset, z: origin.z + unit.x * offset },
      to: { x: origin.x + unit.x * length - unit.z * offset * .2,
        z: origin.z + unit.z * length + unit.x * offset * .2 },
    };
  });
}

type Vec3 = readonly [number, number, number];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (v: Vec3): Vec3 => { const l = Math.hypot(...v) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };

/**
 * Orientation of a camera-facing strip whose long axis follows the ground direction `dir` (art head on +X).
 * z leaves the plane's front (-Z) toward the camera, y = z × x keeps a proper rotation. `flip` is true when y points
 * down the screen (a beam travelling toward screen-left): the caller then mirrors the strip vertically so it is not upside down.
 */
export function beamBasis(dir: Point, view: Vec3, screenUp: Vec3): { x: Vec3; y: Vec3; z: Vec3; flip: boolean } | undefined {
  const x: Vec3 = [dir.x, 0, dir.z];
  if (Math.hypot(...x) < 1e-6 || Math.hypot(...view) < 1e-6) return undefined;
  const perp = unit([view[0] - x[0] * dot(view, x), view[1] - x[1] * dot(view, x), view[2] - x[2] * dot(view, x)]);
  const y = unit(cross(perp, x));
  return { x: unit(x), y, z: perp, flip: dot(y, screenUp) < 0 };
}
