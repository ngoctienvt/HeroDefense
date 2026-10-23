import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { debug } from './debug.js';
import { cameraLook, resetStrip } from './visual-de-tuan-strip.js';
import type { KitPainted } from './visual-kit-painted.js';
import { placeSilk } from './visual-hangnga-strip.js';
import { SILK_ASPECT, UNWIND_SECONDS, WRAP_LENGTH, wrapPose } from './visual-hangnga-timeline.js';

type Wrap = { mesh?: Mesh; at: Vector3; age: number; out: number; touched: boolean; reduced: boolean };
const MAX_WRAPS = 24;
/** A registered recipient whose shield never shows up in a snapshot is forgotten after this long. */
const PENDING_SECONDS = 3;

/**
 * Phase 4 of the shield: while an ally the last `skill-h018` listed still shows a shield in the snapshot, a silk
 * orbits it (behind the body: the foreground pass is under the heroes). There is no timer: `mark` is called every
 * frame the snapshot has a shield; when the calls stop the silk unwinds in .3 s and the ally is forgotten. The shield
 * field is shared by every source, so only recipients of Hằng Nga's own event ever get the wrap (the client cannot
 * tell whose shield it is). The bubble itself is the shared shield layer.
 */
export class HangngaWrap {
  private recipients = new Map<string, number>();
  private wraps = new Map<string, Wrap>();

  constructor(private scene: Scene, private art: KitPainted) {}

  register(ids: readonly string[]): void {
    for (const id of ids) this.recipients.set(id, 0);
  }

  mark(id: string, at: Vector3, reduced: boolean): void {
    if (!this.recipients.has(id)) return;
    let wrap = this.wraps.get(id);
    if (wrap && wrap.out > 0) { this.drop(id, wrap); wrap = undefined; } // shield renewed while unwinding: wrap again
    if (!wrap) {
      if (this.wraps.size >= MAX_WRAPS) { debug('visual.hangnga.cap', { layer: 'wrap' }); return; }
      wrap = { at: at.clone(), age: 0, out: 0, touched: true, reduced };
      this.wraps.set(id, wrap);
    }
    wrap.at.copyFrom(at); wrap.touched = true; wrap.reduced = reduced;
  }

  tick(dt: number): void {
    const look = cameraLook(this.scene);
    for (const [id, age] of this.recipients) {
      if (this.wraps.has(id)) continue;
      if (age + dt > PENDING_SECONDS) this.recipients.delete(id); else this.recipients.set(id, age + dt);
    }
    for (const [id, wrap] of this.wraps) {
      if (wrap.touched) { wrap.age += dt; wrap.out = 0; wrap.touched = false; } else wrap.out += dt;
      if (wrap.out >= UNWIND_SECONDS) { this.drop(id, wrap); this.recipients.delete(id); continue; }
      this.place(wrap, look);
    }
  }

  clear(): void {
    for (const [id, wrap] of [...this.wraps]) this.drop(id, wrap);
    this.recipients.clear();
  }

  private place(wrap: Wrap, look: Vector3): void {
    const pose = wrapPose(wrap.age, wrap.out, wrap.reduced);
    if (pose.alpha <= .01 || pose.length < .1) { if (wrap.mesh) wrap.mesh.visibility = 0; return; }
    wrap.mesh ??= this.art.acquire('silk');
    const mesh = wrap.mesh;
    if (!mesh) return;
    const head = new Vector3(wrap.at.x + pose.offset.x, pose.offset.y, wrap.at.z + pose.offset.z);
    const direction = new Vector3(pose.direction.x, pose.direction.y, pose.direction.z);
    if (!placeSilk(mesh, head, direction, look, pose.length, WRAP_LENGTH / SILK_ASPECT)) { mesh.visibility = 0; return; }
    mesh.visibility = pose.alpha;
  }

  private drop(id: string, wrap: Wrap): void {
    resetStrip(wrap.mesh);
    this.art.release(wrap.mesh);
    this.wraps.delete(id);
  }
}
