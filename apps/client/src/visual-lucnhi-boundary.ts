import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { debug } from './debug.js';
import type { KitFxBank } from './visual-kit-fx-bank.js';
import type { KitPainted } from './visual-kit-painted.js';
import { BOUNDARY_RADIUS, BOUNDARY_SIZE, boundaryEnd, boundaryPose, CAST_GRACE } from './visual-lucnhi-timeline.js';

type Lock = { at: Vector3; age: number; windup: number; resolvedAt?: number; reduced: boolean; arcs: (Mesh | undefined)[] };
const MAX_LOCKS = 6;

/**
 * The R6.5 lock boundary at the point the server fixed at `cast` (pendingAbility.point). It exists only from the cast to
 * a beat after the resolve and is never kept as a damage zone: the pulses only hit the target list the server
 * recorded. Two copies of the Codex arc (a top-down circle arc of ~214°, fitted radius = the plane's ring ratio)
 * turn 180° apart and close into a ring as the windup runs out; a kit rim ring marks the exact gameplay radius.
 */
export class LucnhiBoundary {
  private locks = new Map<string, Lock>();

  constructor(private art: KitPainted, private bank: KitFxBank) {}

  begin(source: string, at: Vector3, windup: number, reduced: boolean): void {
    this.free(this.locks.get(source));
    if (this.locks.size >= MAX_LOCKS) { debug('visual.lucnhi.cap', { layer: 'boundary' }); return; }
    this.locks.set(source, { at: at.clone(), age: 0, windup, reduced, arcs: [] });
    this.bank.ring(at, BOUNDARY_RADIUS, 'lucnhi', { life: windup + CAST_GRACE, fill: 0, rim: 1, alpha: .9, hold: true,
      reduced, order: 3 });
  }

  /** The resolve starts the fade (never extends the boundary); no cast in flight means nothing to fade. */
  resolve(source: string): void {
    const lock = this.locks.get(source);
    if (lock) lock.resolvedAt ??= lock.age;
  }

  tick(dt: number): void {
    for (const [source, lock] of this.locks) {
      lock.age += dt;
      if (lock.age >= boundaryEnd(lock.windup, lock.resolvedAt)) { this.free(lock); this.locks.delete(source); continue; }
      const pose = boundaryPose(lock.age, lock.windup, lock.resolvedAt, lock.reduced);
      for (let i = 0; i < 2; i++) {
        const mesh = lock.arcs[i] ??= this.art.acquire('boundary', true);
        if (!mesh) continue;
        mesh.position.set(lock.at.x, .06, lock.at.z);
        mesh.scaling.setAll(BOUNDARY_SIZE * pose.scale);
        // In-plane turn (roll before the ground pitch): arc B is the first turned half a circle and spins the other way.
        mesh.rotation.z = i === 0 ? pose.spin : Math.PI - pose.spin;
        mesh.visibility = pose.alpha * .92;
      }
    }
  }

  clear(): void {
    for (const lock of this.locks.values()) this.free(lock);
    this.locks.clear();
  }

  private free(lock: Lock | undefined): void { if (lock) for (const mesh of lock.arcs) this.art.release(mesh); }
}
