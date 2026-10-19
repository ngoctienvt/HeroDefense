/**
 * Pure timing helpers shared by every hero VFX (no Babylon imports, so they are testable).
 * A recipe picks a motion preset and keys; it never hand-writes linear interpolation.
 */
export type Key = readonly [time: number, value: number];

const clamp01 = (t: number): number => Math.max(0, Math.min(1, t));

/** Linear interpolation between sorted keys; clamps before the first and after the last key. */
export function piecewise(keys: readonly Key[], t: number): number {
  if (keys.length === 0) return 0;
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t0, v0] = keys[i - 1], [t1, v1] = keys[i];
    if (t <= t1) return t1 === t0 ? v1 : v0 + (v1 - v0) * (t - t0) / (t1 - t0);
  }
  return keys[keys.length - 1][1];
}

/** Frame within a `[start, start + count)` run of an atlas, advancing every `frameSeconds`, held on the last. */
export function segmentFrame(age: number, start: number, count: number, frameSeconds: number): number {
  return Math.min(start + count - 1, start + Math.max(0, Math.floor(age / frameSeconds)));
}

/** Eased 0→1 progress of a sweep of `life` seconds starting `delay` seconds after `age` 0. */
export function sweep(age: number, delay: number, life: number): number {
  return clamp01((age - delay) / Math.max(1e-6, life));
}

/**
 * Unit XZ direction: the server's `direction`, else derived from origin → event point.
 * Never falls back to a fixed axis (that drew swings behind the hero); undefined when degenerate.
 */
export function unitDirection(event: { direction?: { x: number; z: number }; x?: number; z?: number },
  origin: { x: number; z: number }): { x: number; z: number } | undefined {
  const raw = event.direction
    ?? (event.x !== undefined && event.z !== undefined ? { x: event.x - origin.x, z: event.z - origin.z } : undefined);
  const length = raw ? Math.hypot(raw.x, raw.z) : 0;
  return raw && length > 1e-3 ? { x: raw.x / length, z: raw.z / length } : undefined;
}

/** Parabolic arc height over t in 0..1 (0 at both ends, `peak` in the middle). */
export function arcHeight(t: number, peak: number): number {
  const c = clamp01(t);
  return 4 * peak * c * (1 - c);
}

/** 1 until `start`, then falls to 0 over `duration`. */
export function fadeOut(age: number, start: number, duration: number): number {
  return 1 - clamp01((age - start) / Math.max(1e-6, duration));
}

/** Ease-out keys taken from the authored tsunami reference (frame 1/3/5/7/9 → 0/.45/.72/.9/1). */
export const EASE_OUT_KEYS: readonly Key[] = [[0, 0], [.25, .45], [.5, .72], [.75, .9], [1, 1]];

/** Motion presets, all mapping t in 0..1 to progress; cast beats pick these instead of linear lerps. */
export const motion = {
  /** Pulls back slightly (≈ -0.1) before moving forward: the wind-up of a strike. */
  anticipate(t: number): number {
    const c = clamp01(t), s = 1.2;
    return c * c * ((s + 1) * c - s);
  },
  /** Accelerates from rest toward the target. */
  launch(t: number): number { const c = clamp01(t); return c * c * c; },
  /** Arrives with a small overshoot (≈ 1.1) and returns to 1. */
  impactOvershoot(t: number): number {
    const c = clamp01(t) - 1, s = 1.4;
    return 1 + c * c * ((s + 1) * c + s);
  },
  /** Fast then slowing: recovery after an impact. */
  settle(t: number): number { const c = 1 - clamp01(t); return 1 - c * c * c; },
  /** Ease-out through the authored reference keys. */
  easeOut(t: number): number { return piecewise(EASE_OUT_KEYS, clamp01(t)); },
} as const;
