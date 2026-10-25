import { STAFF_LENGTH, STAFF_RADIUS } from './visual-douzhan-timeline.js';

/** Plain 3-vector so the staff maths stays testable without Babylon. */
export interface Vec3 { x: number; y: number; z: number }

export interface StaffGeometry { positions: number[]; uvs: number[]; indices: number[]; normals: number[] }

/** Camera elevation used when no orbit camera is active (battlefield default beta .84 ≈ 42°). */
const FALLBACK_ELEVATION = .73;

const dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a: Vec3, b: Vec3): Vec3 => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
const scale = (a: Vec3, s: number): Vec3 => ({ x: a.x * s, y: a.y * s, z: a.z * s });
const unit = (a: Vec3): Vec3 => { const n = Math.hypot(a.x, a.y, a.z) || 1; return scale(a, 1 / n); };

/**
 * Cylinder along local +Y (base at y 0, tip at `length`) with the painted surface mapped once around the rim:
 * U = angle / 2π (seam at local +X, UV clamped, never tiled), V runs along the staff, so the Codex gold ring bands
 * (top/bottom image rows) land on the staff ends. The caps sample one flat gold texel (`capV`, from the art inventory).
 * Every triangle (body and caps) winds so its geometric normal agrees with the authored outward normal; the caller only
 * flips the whole mesh if Babylon's own convention disagrees.
 */
export function buildStaffGeometry(capV: number, segments = 32, length = STAFF_LENGTH, radius = STAFF_RADIUS): StaffGeometry {
  const positions: number[] = [], uvs: number[] = [], normals: number[] = [], indices: number[] = [];
  for (const y of [0, length]) {
    for (let s = 0; s <= segments; s++) {
      const a = (s / segments) * Math.PI * 2, c = Math.cos(a), n = Math.sin(a);
      positions.push(c * radius, y, n * radius); normals.push(c, 0, n); uvs.push(s / segments, y === 0 ? 1 : 0);
    }
  }
  const row = segments + 1;
  for (let s = 0; s < segments; s++) indices.push(s, s + row, s + 1, s + 1, s + row, s + row + 1);
  for (const [y, ny] of [[0, -1], [length, 1]] as const) {
    const centre = positions.length / 3;
    positions.push(0, y, 0); normals.push(0, ny, 0); uvs.push(.5, capV);
    for (let s = 0; s <= segments; s++) {
      const a = (s / segments) * Math.PI * 2;
      positions.push(Math.cos(a) * radius, y, Math.sin(a) * radius); normals.push(0, ny, 0); uvs.push(.5, capV);
    }
    for (let s = 0; s < segments; s++) {
      if (ny > 0) indices.push(centre, centre + 2 + s, centre + 1 + s); else indices.push(centre, centre + 1 + s, centre + 2 + s);
    }
  }
  return { positions, uvs, indices, normals };
}

/** Unit staff axis for the lane direction `dir` lifted `angle` radians above the ground. */
export function staffAxis(dir: { x: number; z: number }, angle: number): Vec3 {
  return { x: dir.x * Math.cos(angle), y: Math.sin(angle), z: dir.z * Math.cos(angle) };
}

/** Camera look direction (from the camera toward its target); a fixed elevated look along `far` when there is no camera. */
export function lookFromFar(far: { x: number; z: number }): Vec3 {
  return unit({ x: far.x * Math.cos(FALLBACK_ELEVATION), y: -Math.sin(FALLBACK_ELEVATION), z: far.z * Math.cos(FALLBACK_ELEVATION) });
}

/**
 * Orthonormal frame (local X, Y, Z in world space) for the staff: Y is the staff axis and X (the texture seam) points at the
 * side of the staff that faces away from the camera, i.e. the look direction with its component along the axis removed.
 * A staff pointing straight along the look direction has no far side: the seam falls back to a horizontal side vector.
 */
export function staffBasis(axis: Vec3, look: Vec3): { x: Vec3; y: Vec3; z: Vec3 } {
  const y = unit(axis);
  let x = { x: look.x - y.x * dot(look, y), y: look.y - y.y * dot(look, y), z: look.z - y.z * dot(look, y) };
  if (Math.hypot(x.x, x.y, x.z) < 1e-3) x = cross(y, { x: 0, y: 1, z: 0 });
  if (Math.hypot(x.x, x.y, x.z) < 1e-3) x = { x: 1, y: 0, z: 0 };
  x = unit(x);
  return { x, y, z: cross(x, y) };
}
