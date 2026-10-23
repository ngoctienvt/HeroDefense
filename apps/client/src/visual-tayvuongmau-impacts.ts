import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { billboardCenter } from './visual-kit-billboard.js';
import type { KitPainted } from './visual-kit-painted.js';
import { IMPACT_FRAMES, IMPACT_SIZE, IMPACT_TIP_FROM_TOP, impactFrame, impactLife, impactPose } from './visual-tayvuongmau-timeline.js';

type Planted = { at: Vector3; age: number; reduced: boolean; mirror: boolean; mesh?: Mesh };
const MAX_PLANTED = 36;

/**
 * Hairpins stuck in the ground where a rain pin landed (Codex impact sheet, 6 frames, needle tip on one canvas point):
 * stone cracks, gold shards and jade crystals fly, then the pin pulls up out of the ground and fades (~.64 s).
 * Billboard in the foreground pass (over monsters, under heroes); the sprite's tip sits exactly on the landing point.
 * Every sheet frame leans the same way (head upper-left, tip lower-right), so a pin that fell toward screen-left is mirrored.
 */
export class TayvuongmauImpacts {
  private planted: Planted[] = [];

  constructor(private art: KitPainted) {}

  plant(at: Vector3, reduced: boolean, mirror = false): void {
    if (this.planted.length >= MAX_PLANTED) this.free(this.planted[0]);
    this.planted.push({ at: at.clone(), age: 0, reduced, mirror });
  }

  tick(dt: number, up: Vector3): void {
    for (let i = this.planted.length - 1; i >= 0; i--) {
      const item = this.planted[i];
      item.age += dt;
      if (item.age >= impactLife(item.reduced)) { this.free(item); continue; }
      item.mesh ??= this.art.acquire('impact');
      if (!item.mesh) continue;
      const pose = impactPose(item.age, item.reduced);
      item.mesh.position.copyFrom(billboardCenter(new Vector3(item.at.x, 0, item.at.z), IMPACT_SIZE, IMPACT_TIP_FROM_TOP, up, pose.lift));
      item.mesh.scaling.set(item.mirror ? -IMPACT_SIZE : IMPACT_SIZE, IMPACT_SIZE, IMPACT_SIZE);
      item.mesh.visibility = pose.alpha;
      this.art.frame(item.mesh, impactFrame(item.age, item.reduced), 3, IMPACT_FRAMES / 3);
    }
  }

  clear(): void { for (const item of [...this.planted]) this.free(item); }

  private free(item: Planted): void {
    this.art.release(item.mesh);
    const index = this.planted.indexOf(item);
    if (index >= 0) this.planted.splice(index, 1);
  }
}
