import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { debug } from './debug.js';
import type { KitPainted } from './visual-kit-painted.js';
import { EXPOSED_SIZE, exposedPose, MAX_SPLITTING, REDUCED_SPLIT_LIFE, SPLIT_COLUMNS, SPLIT_LIFE, SPLIT_ROWS, splitPose }
  from './visual-lucnhi-timeline.js';

type Seal = { at: Vector3; age: number; touched: boolean; reduced: boolean; mesh?: Mesh };
type Ending = { at: Vector3; age: number; spin: number; split: boolean; pieces: (Mesh | undefined)[]; dirs: Vector3[] };
const MAX_SEALS = 80;
const SPIKE_ANGLES = [90, 150, 210, 270, 330, 30].map(degrees => degrees * Math.PI / 180);

/**
 * Crit-vulnerability seal (`critVulnerability`, 5 s, refreshed by every pulse) as a ground decal under each exposed
 * monster, drawn from the snapshot marker `exposed` (every frame). Its age counts from the first marked frame and is never
 * reset by re-marks. When the marker disappears the six-point seal splits into its six strokes that fly out along their
 * spikes (wedge frames cut by process-art.py); at most MAX_SPLITTING split at once (a whole assault expires together),
 * the rest and reduced motion fade out plainly. Armour break uses the shared red body tint (visual-status-tint.ts), never this art.
 */
export class LucnhiExposed {
  private seals = new Map<string, Seal>();
  private endings: Ending[] = [];

  constructor(private art: KitPainted) {}

  mark(id: string, at: Vector3, reduced: boolean): void {
    const seal = this.seals.get(id);
    if (seal) { seal.at.copyFrom(at); seal.touched = true; seal.reduced = reduced; return; }
    if (this.seals.size >= MAX_SEALS) { debug('visual.lucnhi.cap', { layer: 'exposed' }); return; }
    this.seals.set(id, { at: at.clone(), age: 0, touched: true, reduced });
  }

  tick(dt: number, time: number): void {
    for (const [id, seal] of this.seals) {
      if (!seal.touched) { this.seals.delete(id); this.finish(seal); continue; }
      seal.touched = false;
      seal.age += dt;
      seal.mesh ??= this.art.acquire('weakness', true);
      if (!seal.mesh) continue;
      const pose = exposedPose(seal.age, time, seal.reduced);
      seal.mesh.position.set(seal.at.x, .07, seal.at.z);
      seal.mesh.scaling.setAll(EXPOSED_SIZE * pose.scale);
      seal.mesh.rotation.z = pose.spin;
      seal.mesh.visibility = pose.alpha;
    }
    for (let i = this.endings.length - 1; i >= 0; i--) {
      const ending = this.endings[i];
      ending.age += dt;
      const life = ending.split ? SPLIT_LIFE : REDUCED_SPLIT_LIFE;
      if (ending.age >= life) { for (const piece of ending.pieces) this.art.release(piece); this.endings.splice(i, 1); continue; }
      const pose = ending.split ? splitPose(ending.age) : { travel: 0, alpha: 1 - ending.age / life, scale: 1 };
      ending.pieces.forEach((piece, k) => {
        if (!piece) return;
        piece.position.set(ending.at.x + ending.dirs[k].x * pose.travel, .08, ending.at.z + ending.dirs[k].z * pose.travel);
        piece.scaling.setAll(EXPOSED_SIZE * pose.scale);
        piece.visibility = pose.alpha;
      });
    }
  }

  clear(): void {
    for (const seal of this.seals.values()) this.art.release(seal.mesh);
    for (const ending of this.endings) for (const piece of ending.pieces) this.art.release(piece);
    this.seals.clear(); this.endings.length = 0;
  }

  /** Marker lost: split into six strokes, or a plain fade of the whole seal (reduced motion / cap). */
  private finish(seal: Seal): void {
    const spin = seal.mesh?.rotation.z ?? 0;
    this.art.release(seal.mesh);
    const splitting = this.endings.filter(ending => ending.split).length;
    const split = !seal.reduced && splitting < MAX_SPLITTING;
    if (!split) {
      const whole = this.art.acquire('weakness', true);
      if (whole) {
        whole.scaling.setAll(EXPOSED_SIZE); whole.rotation.z = spin;
        this.endings.push({ at: seal.at, age: 0, spin, split: false, pieces: [whole], dirs: [Vector3.Zero()] });
        whole.position.set(seal.at.x, .07, seal.at.z);
      }
      return;
    }
    const pieces: (Mesh | undefined)[] = [];
    const dirs: Vector3[] = [];
    for (let k = 0; k < SPIKE_ANGLES.length; k++) {
      const piece = this.art.acquire('split', true);
      pieces.push(piece);
      if (!piece) { dirs.push(Vector3.Zero()); continue; }
      piece.rotation.z = spin;
      this.art.frame(piece, k, SPLIT_COLUMNS, SPLIT_ROWS);
      // Image direction of the spike → world XZ through the plane's own matrix (no guess about the ground mapping).
      const world = Vector3.TransformNormal(new Vector3(Math.cos(SPIKE_ANGLES[k]), Math.sin(SPIKE_ANGLES[k]), 0),
        piece.computeWorldMatrix(true));
      world.y = 0;
      dirs.push(world.lengthSquared() > 1e-6 ? world.normalize() : Vector3.Zero());
    }
    this.endings.push({ at: seal.at, age: 0, spin, split: true, pieces, dirs });
    debug('visual.lucnhi.split', { pieces: pieces.filter(Boolean).length });
  }
}
