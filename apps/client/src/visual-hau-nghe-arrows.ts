import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { debug } from './debug.js';
import { cameraLook, placeStrip, resetStrip } from './visual-de-tuan-strip.js';
import type { KitPainted } from './visual-kit-painted.js';
import { ARROW_FADE, arrowAlpha, flightProgress } from './visual-hau-nghe-timeline.js';

/** One flying Sunpiercer arrow: head path `from → to`, `arrive` fires on the frame it lands (the blast starts there). */
type Shot = { mesh?: Mesh; from: Vector3; to: Vector3; age: number; flight: number; length: number; width: number;
  arrive: () => void; arrived: boolean };
const MAX_SHOTS = 24;

/**
 * The painted arrow in flight (ultimate strike and basic pierce). The art is side-on, so the plane is built
 * with `placeStrip`: texture +X along the 3D flight direction while still facing the camera (never mirrored).
 * The arrow accelerates (`motion.launch`), lands, then dissolves into the blast for `ARROW_FADE`.
 */
export class HauNgheArrows {
  private shots: Shot[] = [];

  constructor(private scene: Scene, private art: KitPainted) {}

  /** Starts a flight; the caller guarantees `from !== to`. A cap hit lands the arrow at once so the blast still plays. */
  launch(from: Vector3, to: Vector3, flight: number, length: number, width: number, arrive: () => void): void {
    if (this.shots.length >= MAX_SHOTS) {
      debug('visual.haunghe.cap', { layer: 'arrow' });
      arrive();
      return;
    }
    this.shots.push({ from: from.clone(), to: to.clone(), age: 0, flight, length, width, arrive, arrived: false });
  }

  tick(dt: number): void {
    if (!this.shots.length) return;
    const look = cameraLook(this.scene);
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const shot = this.shots[i];
      shot.age += dt;
      if (!shot.arrived && shot.age >= shot.flight) { shot.arrived = true; shot.arrive(); }
      if (shot.age >= shot.flight + ARROW_FADE) { this.free(shot); continue; }
      shot.mesh ??= this.art.acquire('arrow');
      if (!shot.mesh) continue;
      const head = Vector3.Lerp(shot.from, shot.to, flightProgress(shot.age, shot.flight));
      const direction = shot.to.subtract(shot.from);
      if (!placeStrip(shot.mesh, head, direction, look, shot.length, shot.width)) { this.free(shot); continue; }
      shot.mesh.visibility = arrowAlpha(shot.age, shot.flight);
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
