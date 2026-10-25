import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { debug } from './debug.js';
import type { KitPainted } from './visual-kit-painted.js';
import type { KitSpray } from './visual-kit-spray.js';
import { cameraLook, placeStrip, resetStrip } from './visual-de-tuan-strip.js';
import { DIVE_SECONDS, diveProgress, SWORD_LENGTH, SWORD_LIFE, SWORD_WIDTH, swordAlpha } from './visual-de-tuan-timeline.js';

type Dive = { mesh: Mesh; from: Vector3; to: Vector3; age: number; arrived: boolean; onArrive: () => void };
const MAX_DIVES = 3;

/**
 * The Thiên Đế sword: on the server's ability event the blade formed by the ten Kim Ô leaves the convergence point and
 * dives onto the main target (head leading, accelerating), trailing feather embers. `onArrive` runs when the head lands,
 * which is when the sunburst opens. Reduced motion skips the flight and lands at once.
 */
export class DeTuanSword {
  private dives: Dive[] = [];

  constructor(private scene: Scene, private art: KitPainted, private spray: KitSpray) {}

  launch(from: Vector3, to: Vector3, reduced: boolean, onArrive: () => void): void {
    if (reduced || this.dives.length >= MAX_DIVES) {
      if (!reduced) debug('visual.detuan.cap', { layer: 'sword' });
      onArrive();
      return;
    }
    const mesh = this.art.acquire('sword');
    if (!mesh) { onArrive(); return; }
    this.dives.push({ mesh, from: from.clone(), to: to.clone(), age: 0, arrived: false, onArrive });
    this.place(this.dives[this.dives.length - 1]);
  }

  tick(dt: number): void {
    for (let i = this.dives.length - 1; i >= 0; i--) {
      const dive = this.dives[i];
      dive.age += dt;
      if (!dive.arrived && dive.age >= DIVE_SECONDS) { dive.arrived = true; dive.onArrive(); }
      if (dive.age >= SWORD_LIFE) { this.free(dive); this.dives.splice(i, 1); continue; }
      this.place(dive);
      if (!dive.arrived) this.spray.trail(this.head(dive), dive.to.subtract(dive.from).normalize().scale(-2), 2);
    }
  }

  clear(): void {
    for (const dive of this.dives) this.free(dive);
    this.dives.length = 0;
  }

  private head(dive: Dive): Vector3 {
    return Vector3.Lerp(dive.from, dive.to, diveProgress(dive.age));
  }

  private place(dive: Dive): void {
    const direction = dive.to.subtract(dive.from);
    const progress = diveProgress(dive.age);
    // The strip starts centred on the convergence point (over the sheet's own blade) and ends with its head on the target.
    const unit = direction.lengthSquared() > 1e-8 ? direction.normalize() : Vector3.Down();
    const tailCentre = dive.to.subtract(unit.scale(SWORD_LENGTH / 2));
    const centre = Vector3.Lerp(dive.from, tailCentre, progress);
    const head = centre.add(unit.scale(SWORD_LENGTH / 2));
    if (!placeStrip(dive.mesh, head, unit, cameraLook(this.scene), SWORD_LENGTH, SWORD_WIDTH)) dive.mesh.setEnabled(false);
    dive.mesh.visibility = swordAlpha(dive.age);
  }

  private free(dive: Dive): void {
    resetStrip(dive.mesh);
    this.art.release(dive.mesh);
  }
}
