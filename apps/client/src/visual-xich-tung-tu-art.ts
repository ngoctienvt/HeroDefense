import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { TargetCamera } from '@babylonjs/core/Cameras/targetCamera.js';
import { Tier3Art } from './visual-tier3-art.js';
import type { KitFxBank } from './visual-kit-fx-bank.js';
import { screenUp, farDirection } from './visual-kit-billboard.js';
import { XT_CAPS, RAIN_LIFE, dewTravel, dewHead } from './visual-xich-tung-tu-timeline.js';
import { debug } from './debug.js';
import layout from './visual-xich-tung-tu-layout.json';
interface Delivery { from?: Vector3; at: Vector3; age: number; travel: number; reduced: boolean; received: boolean; stream?: Mesh; rain?: Mesh }
export class DewArt {
  readonly paint: Tier3Art<'rain' | 'stream' | 'fire'>; private deliveries: Delivery[] = [];
  constructor(private scene: Scene, private bank: KitFxBank) { this.paint = new Tier3Art(scene, 'xich-tung-tu', { rain: layout.rain, stream: layout.stream, fire: layout.fire }, ['rain', 'stream', 'fire'], XT_CAPS.planes); }
  prepare(): void { this.paint.prepare(); }
  receive(from: Vector3 | undefined, targets: readonly Vector3[], reduced: boolean): void {
    for (const at of targets.slice(0, 4)) { if (this.deliveries.length >= XT_CAPS.streams) break;
      this.deliveries.push({ from: from?.clone(), at: at.clone(), age: 0, travel: dewTravel(from ? Vector3.Distance(from, at) : 0, Boolean(from), reduced), reduced, received: false }); }
  }
  tick(dt: number): void {
    for (let i = this.deliveries.length - 1; i >= 0; i--) {
      const p = this.deliveries[i]; p.age += dt; const age = p.age - p.travel;
      if (!p.received && age >= 0) { p.received = true;
        this.bank.ring(p.at, .58, 'gold', { life: .6, fill: .08, rim: .32, hold: true, alpha: .6, reduced: p.reduced });
        if (!p.reduced) this.bank.spray('gold').ring(p.at, .3, 7, .18, .6, 1.5);
        debug('visual.xich-tung-tu.receipt', { hasOrigin: Boolean(p.from), reduced: p.reduced }); }
      if (age >= RAIN_LIFE) { this.paint.planes.release(p.stream); this.paint.planes.release(p.rain); this.deliveries.splice(i, 1); continue; }
      if (p.from && !p.reduced && p.travel > 0 && age < .18) {
        p.stream ??= this.paint.planes.acquire('stream'); if (p.stream) this.placeStream(p.stream, p.from, p.at, dewHead(p.age, p.travel), Math.max(0, age) / .18);
      } else { this.paint.planes.release(p.stream); p.stream = undefined; }
      if (age >= 0) { p.rain ??= this.paint.planes.acquire('rain'); if (!p.rain) continue;
        this.paint.frame(p.rain, 'rain', p.reduced ? 3 : Math.min(7, Math.floor(age / RAIN_LIFE * 8)));
        this.paint.place(p.rain, 'rain', p.at, 2, 2, .1); p.rain.visibility = Math.max(0, 1 - Math.max(0, age - .45) / .2); }
    }
  }
  private placeStream(mesh: Mesh, from: Vector3, target: Vector3, progress: number, fold: number): void {
    const far = farDirection(this.scene), right = new Vector3(-far.z, 0, far.x);
    const start = from.add(right.scale(.95)).add(screenUp(this.scene).scale(1.95)), end = target.add(new Vector3(0, .9, 0)), delta = end.subtract(start), distance = delta.length();
    if (distance < .02) { mesh.visibility = 0; return; }
    const x = delta.scale(1 / distance), head = Vector3.Lerp(start, end, progress), length = Math.min(2.5, distance * progress) * (1 - Math.min(1, fold));
    const camera = this.scene.activeCamera as TargetCamera | null, look = camera && typeof camera.getTarget === 'function' ? camera.getTarget().subtract(camera.position).normalize() : new Vector3(0, -.669, -.743);
    const z = look.subtract(x.scale(Vector3.Dot(x, look))); if (z.lengthSquared() < 1e-6) { mesh.visibility = 0; return; } z.normalize();
    mesh.billboardMode = Mesh.BILLBOARDMODE_NONE; mesh.rotationQuaternion = null; mesh.rotation.copyFrom(Vector3.RotationFromAxis(x, Vector3.Cross(z, x).normalize(), z));
    mesh.position.copyFrom(head.subtract(x.scale(length / 2))); mesh.scaling.set(Math.max(.001, length), 2.5 / layout.stream.aspect, 1); mesh.visibility = .9 * (1 - fold);
    const reveal = length / 2.5; this.paint.planes.mapUvs(mesh, base => base.map((v, k) => k % 2 === 0 ? 1 - reveal + v * reveal : v));
  }
  clear(): void { this.deliveries.length = 0; this.paint.clear(); }
}
