import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { debug } from './debug.js';
import { billboardCenter, farDirection } from './visual-kit-billboard.js';
import type { KitPainted } from './visual-kit-painted.js';
import { ARRIVAL_GROUND, ARRIVAL_LIFE, ARRIVAL_RADIUS, ARRIVAL_SIZE, ARRIVAL_WINDOW, CLONE_CAP, clonePose, EXIT_SECONDS,
  HIT_ANCHOR_Y, HIT_SIZE, hitAlpha, hitFrame, hitLife, type ClonePhase } from './visual-douzhan-timeline.js';

interface Clone { id: string; at: Vector3; age: number; phase: ClonePhase; touched: boolean; expired: boolean; reduced: boolean; mesh?: Mesh; meshId?: string }
interface Hit { at: Vector3; age: number; mirror: boolean; scale: number; reduced: boolean; mesh?: Mesh }
const MAX_CLONES = 24, MAX_HITS = 12;

/**
 * The Kim Thân Hầu Vương clones. `mark('clone', id, at)` is called every frame the unit is in the snapshot, so the arrival cloud
 * opens at each clone's real position (only for clones first seen within `ARRIVAL_WINDOW` of `summon-h012` and near its point:
 * a reconnect mid-life gets just the seal), a dim gold seal stays under it for as long as the snapshot has it (never past
 * `CLONE_CAP`), and when the unit is gone the cloud folds away in `EXIT_SECONDS`. No fake clone is kept. A clone's own strike
 * (`clone-attack-h012`, `clone-crit-h012`) plays the staff-hit sheet at the monster the server says it hit.
 */
export class DouzhanClones {
  private clones = new Map<string, Clone>();
  private hits: Hit[] = [];
  private armed?: { center: Vector3; left: number };
  private time = 0;

  constructor(private scene: Scene, private art: KitPainted) {}

  /** `summon-h012` (at the point the server spawned the clones around): the next fresh clones get the arrival cloud. */
  arm(center: Vector3): void {
    this.armed = { center: center.clone(), left: ARRIVAL_WINDOW };
    for (const clone of this.clones.values()) {
      if (clone.phase === 'hold' && clone.age < .6 && this.near(clone.at)) { clone.phase = 'arrive'; clone.age = 0; }
    }
  }

  mark(id: string, at: Vector3, reduced: boolean): void {
    let clone = this.clones.get(id);
    if (!clone) {
      if (this.clones.size >= MAX_CLONES) return;
      const arrives = this.near(at);
      clone = { id, at: at.clone(), age: arrives ? 0 : ARRIVAL_LIFE, phase: arrives ? 'arrive' : 'hold', touched: true, expired: false, reduced };
      this.clones.set(id, clone);
      debug('visual.douzhan.clone-start', { arrival: arrives, reduced });
    }
    clone.at.copyFrom(at); clone.touched = true; clone.reduced = reduced;
    if (clone.phase === 'exit' && !clone.expired) { clone.phase = 'hold'; clone.age = ARRIVAL_LIFE; }
  }

  /** One staff stroke on the monster at `at` from the attacker at `from`; the sheet leans in from the screen's left. */
  hit(at: Vector3, from: Vector3, reduced: boolean, crit: boolean): void {
    if (this.hits.length >= MAX_HITS) this.free(this.hits[0]);
    const far = farDirection(this.scene), right = new Vector3(far.z, 0, -far.x);
    const mirror = (at.x - from.x) * right.x + (at.z - from.z) * right.z < 0;
    this.hits.push({ at: at.clone(), age: 0, mirror, scale: crit ? 1.2 : 1, reduced });
  }

  tick(dt: number, time: number, up: Vector3): void {
    this.time = time;
    if (this.armed && (this.armed.left -= dt) <= 0) this.armed = undefined;
    for (const [id, clone] of this.clones) {
      clone.age += dt;
      const touched = clone.touched;
      clone.touched = false;
      if (clone.phase === 'arrive' && clone.age >= ARRIVAL_LIFE) clone.phase = 'hold';
      if (clone.phase !== 'exit' && (!touched || (clone.phase === 'hold' && clone.age > CLONE_CAP))) {
        clone.expired = touched; clone.phase = 'exit'; clone.age = 0;
        debug('visual.douzhan.clone-end', { capped: touched });
      }
      if (clone.phase === 'exit' && clone.age >= EXIT_SECONDS) {
        this.art.release(clone.mesh); clone.mesh = undefined;
        // A clone past the safety cap that the snapshot still has stays hidden until the unit is gone.
        if (!(clone.expired && touched)) this.clones.delete(id);
        continue;
      }
      this.drawClone(clone, up);
    }
    for (let i = this.hits.length - 1; i >= 0; i--) {
      const hit = this.hits[i];
      hit.age += dt;
      if (hit.age >= hitLife(hit.reduced)) { this.free(hit); continue; }
      hit.mesh ??= this.art.acquire('hit');
      if (!hit.mesh) continue;
      const size = HIT_SIZE * hit.scale;
      const feet = new Vector3(hit.at.x, 0, hit.at.z);
      hit.mesh.position.copyFrom(billboardCenter(feet, size, HIT_ANCHOR_Y, up));
      hit.mesh.scaling.set(hit.mirror ? -size : size, size, size);
      hit.mesh.visibility = hitAlpha(hit.age, hit.reduced);
      this.art.frame(hit.mesh, hitFrame(hit.age, hit.reduced), 4, 2);
    }
  }

  clear(): void {
    for (const clone of this.clones.values()) this.art.release(clone.mesh);
    this.clones.clear();
    for (const hit of [...this.hits]) this.free(hit);
    this.armed = undefined;
  }

  private near(at: Vector3): boolean {
    return Boolean(this.armed) && Math.hypot(at.x - (this.armed?.center.x ?? 0), at.z - (this.armed?.center.z ?? 0)) <= ARRIVAL_RADIUS;
  }

  private drawClone(clone: Clone, up: Vector3): void {
    // Arrival and exit stand in the foreground pass; the long-held seal drops to the world pass so it never covers monsters.
    const id = clone.phase === 'hold' ? 'cloud-hold' : 'cloud';
    if (clone.meshId !== id) { this.art.release(clone.mesh); clone.mesh = undefined; clone.meshId = id; }
    clone.mesh ??= this.art.acquire(id);
    if (!clone.mesh) return;
    const pose = clonePose(clone.phase, clone.age, this.time, clone.reduced), size = ARRIVAL_SIZE * pose.scale;
    clone.mesh.position.copyFrom(billboardCenter(new Vector3(clone.at.x, 0, clone.at.z), size, ARRIVAL_GROUND, up));
    clone.mesh.scaling.setAll(size);
    clone.mesh.visibility = pose.alpha;
    this.art.frame(clone.mesh, pose.frame, 4, 2);
  }

  private free(hit: Hit): void {
    this.art.release(hit.mesh);
    const index = this.hits.indexOf(hit);
    if (index >= 0) this.hits.splice(index, 1);
  }
}
