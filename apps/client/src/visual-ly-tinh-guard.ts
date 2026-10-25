import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { TargetCamera } from '@babylonjs/core/Cameras/targetCamera.js';
import type { PagodaArt } from './visual-ly-tinh-art.js';
import type { KitFxBank } from './visual-kit-fx-bank.js';
import { LT_CAPS, guardDelay, guardPose } from './visual-ly-tinh-timeline.js';
import { debug } from './debug.js';
import layout from './visual-ly-tinh-layout.json';
interface Ray { from?: Vector3; at: Vector3; age: number; travel: number; reduced: boolean; received: boolean; mesh?: Mesh }
/** One delivery per actual support recipient. This never creates or times the server/shared shield. */
export class PagodaGuard {
  private rays: Ray[] = [];
  constructor(private scene: Scene, private art: PagodaArt, private bank: KitFxBank) {}
  receive(origin: Vector3 | undefined, targets: readonly Vector3[], reduced: boolean): void {
    for (const target of targets.slice(0, LT_CAPS.support)) {
      if (this.rays.length >= LT_CAPS.rays) break;
      const distance = origin ? Vector3.Distance(origin, target) : 0;
      this.rays.push({ from: origin?.clone(), at: target.clone(), age: 0, travel: guardDelay(distance, Boolean(origin), reduced), reduced, received: false });
    }
  }
  tick(dt: number): void {
    for (let i = this.rays.length - 1; i >= 0; i--) {
      const p = this.rays[i]; p.age += dt; const state = guardPose(p.age, p.travel, p.reduced);
      if (state.receipt && !p.received) {
        p.received = true; this.bank.ring(p.at, .4, 'gold', { life: .3, fill: .08, rim: .45, hold: true, reduced: p.reduced, alpha: .6 });
        debug('visual.ly-tinh.guard.receive', { hasOrigin: Boolean(p.from), reduced: p.reduced });
      }
      if (p.age >= p.travel + .32) { this.art.paint.planes.release(p.mesh); this.rays.splice(i, 1); continue; }
      p.mesh ??= this.art.paint.planes.acquire('guard'); if (!p.mesh) continue;
      if (state.receipt) {
        p.mesh.billboardMode = Mesh.BILLBOARDMODE_ALL; p.mesh.rotationQuaternion = null; p.mesh.rotation.set(0, 0, 0);
        this.art.paint.place(p.mesh, 'guard', p.at, .95 * state.fold, .9, 1.1);
        this.art.paint.planes.mapUvs(p.mesh, base => base.map((v, k) => k % 2 === 0 ? .76 + v * .24 : v)); p.mesh.visibility = state.alpha;
      } else if (p.from) this.placeRay(p.mesh, p.from, p.at, state.head);
    }
  }
  private placeRay(mesh: Mesh, origin: Vector3, target: Vector3, progress: number): void {
    const from = origin.add(new Vector3(0, 1.3, 0)), to = target.add(new Vector3(0, 1.1, 0)), delta = to.subtract(from), distance = delta.length();
    if (distance < .001) { mesh.visibility = 0; return; }
    const x = delta.scale(1 / distance), head = Vector3.Lerp(from, to, progress), length = Math.min(2.4, distance * progress);
    const camera = this.scene.activeCamera as TargetCamera | null;
    const look = camera && typeof camera.getTarget === 'function' ? camera.getTarget().subtract(camera.position).normalize() : new Vector3(0, -.669, -.743);
    const z = look.subtract(x.scale(Vector3.Dot(x, look))); if (z.lengthSquared() < 1e-6) { mesh.visibility = 0; return; } z.normalize();
    const y = Vector3.Cross(z, x).normalize(); mesh.billboardMode = Mesh.BILLBOARDMODE_NONE; mesh.rotationQuaternion = null;
    mesh.rotation.copyFrom(Vector3.RotationFromAxis(x, y, z)); mesh.position.copyFrom(head.subtract(x.scale(length / 2)));
    mesh.scaling.set(Math.max(.001, length), 2.4 / layout.guard.aspect, 1); mesh.visibility = .9;
    const reveal = length / 2.4; this.art.paint.planes.mapUvs(mesh, base => base.map((v, k) => k % 2 === 0 ? 1 - reveal + v * reveal : v));
  }
  clear(): void { for (const p of this.rays) this.art.paint.planes.release(p.mesh); this.rays.length = 0; }
}

