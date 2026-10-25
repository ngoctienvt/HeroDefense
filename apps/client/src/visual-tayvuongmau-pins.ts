import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { debug } from './debug.js';
import { cameraLook, resetStrip } from './visual-de-tuan-strip.js';
import type { KitPainted } from './visual-kit-painted.js';
import { placePin } from './visual-tayvuongmau-pin-strip.js';
import { BASIC_LIFE, BASIC_PIN_LENGTH, BASIC_PIN_WIDTH, basicPose } from './visual-tayvuongmau-timeline.js';

type Shot = { mesh?: Mesh; from: Vector3; to: Vector3; age: number; arrive: () => void; arrived: boolean };
const MAX_SHOTS = 30;

/**
 * Basic multishot: one painted hairpin per monster the server listed (the target plus the four nearest), flying tip-first
 * from the caster, accelerating, then staying stuck in the monster for a beat and fading. `arrive` fires on the frame
 * the pin lands (contact ring and dust). Foreground pass.
 */
export class TayvuongmauPins {
  private shots: Shot[] = [];

  constructor(private scene: Scene, private art: KitPainted) {}

  /** The caller guarantees `from !== to` horizontally. A cap hit lands the pin at once so the contact still plays. */
  fire(from: Vector3, to: Vector3, arrive: () => void): void {
    if (this.shots.length >= MAX_SHOTS) { debug('visual.tayvuongmau.cap', { layer: 'pin' }); arrive(); return; }
    this.shots.push({ from: from.clone(), to: to.clone(), age: 0, arrive, arrived: false });
  }

  tick(dt: number): void {
    if (!this.shots.length) return;
    const look = cameraLook(this.scene);
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const shot = this.shots[i];
      shot.age += dt;
      const pose = basicPose(shot.age);
      if (!shot.arrived && pose.t >= 1) { shot.arrived = true; shot.arrive(); }
      if (shot.age >= BASIC_LIFE) { this.free(shot); continue; }
      shot.mesh ??= this.art.acquire('pin');
      if (!shot.mesh) continue;
      const head = Vector3.Lerp(shot.from, shot.to, pose.t);
      if (!placePin(shot.mesh, head, shot.to.subtract(shot.from), look, BASIC_PIN_LENGTH, BASIC_PIN_WIDTH)) { this.free(shot); continue; }
      shot.mesh.visibility = pose.alpha;
    }
  }

  clear(): void { for (const shot of [...this.shots]) this.free(shot); }

  private free(shot: Shot): void {
    resetStrip(shot.mesh);
    this.art.release(shot.mesh);
    const index = this.shots.indexOf(shot);
    if (index >= 0) this.shots.splice(index, 1);
  }
}
