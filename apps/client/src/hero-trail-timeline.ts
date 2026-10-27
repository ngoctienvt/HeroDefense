/**
 * Pure timing for the weapon trail of 3D hero models (visual-hero-trail.ts); no Babylon imports, so it is testable.
 * The trail is sampled while the attack clip runs from just before the wind-up peak to a little after the hit.
 */
/** Seconds a trail sample stays visible. */
export const TRAIL_LIFE = .16;
/** Samples kept per trail (one per rendered frame while active). */
export const TRAIL_SAMPLES = 14;
/** Ribbon pieces between two samples (Catmull-Rom). */
export const TRAIL_SUBDIVIDE = 3;
/** Attack-clip window (fractions) around the model's own raised/impact phases. */
export const TRAIL_LEAD = .08;
export const TRAIL_FOLLOW = .2;

export function trailActive(clip: string, progress: number, raised: number, impact: number): boolean {
  if (clip !== 'attack' || !Number.isFinite(progress)) return false;
  return progress >= Math.max(0, raised - TRAIL_LEAD) && progress <= Math.min(1, impact + TRAIL_FOLLOW);
}

type P3 = { x: number; y: number; z: number };
/** Uniform Catmull-Rom between b and c (a, d = neighbours) at t, written as xyz into out[offset..]. */
export function catmullRom(a: P3, b: P3, c: P3, d: P3, t: number, out: { [i: number]: number }, offset: number): void {
  const t2 = t * t, t3 = t2 * t;
  const f = (pa: number, pb: number, pc: number, pd: number) =>
    .5 * (2 * pb + (pc - pa) * t + (2 * pa - 5 * pb + 4 * pc - pd) * t2 + (3 * pb - pa - 3 * pc + pd) * t3);
  out[offset] = f(a.x, b.x, c.x, d.x); out[offset + 1] = f(a.y, b.y, c.y, d.y); out[offset + 2] = f(a.z, b.z, c.z, d.z);
}
