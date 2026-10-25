import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { debug } from './debug.js';
import { cameraLook, resetStrip } from './visual-de-tuan-strip.js';
import type { KitFxBank } from './visual-kit-fx-bank.js';
import type { KitPainted } from './visual-kit-painted.js';
import { placeSilk } from './visual-hangnga-strip.js';
import { dropDelay, dropPose, MAX_FREEZE_SILKS, MAX_REDUCED_FREEZE, SILK_ASPECT } from './visual-hangnga-timeline.js';

type Drop = { mesh?: Mesh; at: Vector3; age: number; delay: number; arrived: boolean };
const DROP_LENGTH = 3.4;
const DOWN = new Vector3(0, -1, 0);

/**
 * The independent `freeze-h018` branch: one silk falls from the sky onto every monster the server listed (the event
 * has no radius: it is the whole zone, never limited by the R9,5 heal ring, and draws no area marker), landing with
 * a frost ring and ice dust. The frozen state itself, held while the snapshot shows it for 2 s and shattering when it
 * ends, is the shared freeze sheet; this layer only shows the onset.
 */
export class HangngaFreeze {
  private drops: Drop[] = [];

  constructor(private scene: Scene, private art: KitPainted, private bank: KitFxBank) {}

  strike(targets: readonly Vector3[], reduced: boolean): void {
    const hits = targets.slice(0, reduced ? MAX_REDUCED_FREEZE : MAX_FREEZE_SILKS);
    hits.forEach((at, index) => {
      if (reduced || this.drops.length >= MAX_FREEZE_SILKS * 2) { this.land(at, reduced); return; }
      this.drops.push({ at: at.clone(), age: 0, delay: dropDelay(index), arrived: false });
    });
    debug('visual.hangnga.freeze.drop', { listed: targets.length, shown: hits.length, reduced });
  }

  tick(dt: number): void {
    const look = cameraLook(this.scene);
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const drop = this.drops[i];
      drop.age += dt;
      if (drop.age < drop.delay) continue;
      const pose = dropPose(drop.age - drop.delay);
      if (pose.done) { this.free(drop); continue; }
      if (!drop.arrived && pose.arrived) { drop.arrived = true; this.land(drop.at, false); }
      drop.mesh ??= this.art.acquire('silk');
      const mesh = drop.mesh;
      if (!mesh) continue;
      if (!placeSilk(mesh, new Vector3(drop.at.x, pose.height, drop.at.z), DOWN, look, DROP_LENGTH, DROP_LENGTH / SILK_ASPECT)) { this.free(drop); continue; }
      mesh.visibility = pose.alpha;
    }
  }

  clear(): void {
    for (const drop of [...this.drops]) this.free(drop);
  }

  private land(at: Vector3, reduced: boolean): void {
    this.bank.ring(at, 1.5, 'ice', { life: .35, fill: 0, rim: 1, alpha: .9, reduced, order: 5 });
    if (reduced) return;
    this.bank.spray('frost').ring(new Vector3(at.x, 0, at.z), .4, 14, .5, 1.6, 2.8);
  }

  private free(drop: Drop): void {
    resetStrip(drop.mesh);
    this.art.release(drop.mesh);
    const index = this.drops.indexOf(drop);
    if (index >= 0) this.drops.splice(index, 1);
  }
}
