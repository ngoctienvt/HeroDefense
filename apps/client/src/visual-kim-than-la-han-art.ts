import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { TargetCamera } from '@babylonjs/core/Cameras/targetCamera.js';
import { Tier3Art } from './visual-tier3-art.js';
import type { KitFxBank } from './visual-kit-fx-bank.js';
import { KH_CAPS, RECEIVE_LIFE } from './visual-kim-than-la-han-timeline.js';
import { motion } from './visual-kit-timeline.js';
import { debug } from './debug.js';
import layout from './visual-kim-than-la-han-layout.json';
type Key = keyof typeof layout;
interface Ray { from?: Vector3; at: Vector3; age: number; travel: number; reduced: boolean; resource: boolean; received: boolean; mesh?: Mesh; receipt?: Mesh }
interface Accent { at: Vector3; age: number; reduced: boolean; mesh?: Mesh }
export class CompassionArt {
  readonly paint: Tier3Art<Key>; private rays: Ray[] = []; private accents: Accent[] = [];
  constructor(private scene: Scene, private bank: KitFxBank) { this.paint = new Tier3Art(scene, 'kim-than-la-han', layout, ['ray', 'body'], KH_CAPS.planes); }
  prepare(): void {
    for (const key of Object.keys(layout) as Key[]) this.paint.planes.prepare(key, `/assets/vfx-kim-than-la-han-${key}.webp`,
      { foreground: key === 'ray' || key === 'body', overlay: key === 'front', depthAlways: key === 'cast' || key === 'back' });
  }
  receive(from: Vector3 | undefined, allies: readonly Vector3[], resource: Vector3 | undefined, reduced: boolean): void {
    for (const at of allies.slice(0, 4)) this.ray(from, at, false, reduced); if (resource) this.ray(from, resource, true, reduced);
  }
  private ray(from: Vector3 | undefined, at: Vector3, resource: boolean, reduced: boolean): void {
    if (this.rays.length >= KH_CAPS.rays) return;
    this.rays.push({ from: from?.clone(), at: at.clone(), age: 0, travel: !from || reduced ? 0 : Math.min(.42, .13 + Vector3.Distance(from, at) * .03), reduced, resource, received: false });
  }
  activate(at: Vector3, reduced: boolean): void {
    if (this.accents.length >= KH_CAPS.accents) return;
    this.accents.push({ at: at.clone(), age: 0, reduced });
    this.bank.ring(at, .68, 'gold', { life: .36, fill: .04, rim: .45, hold: true, reduced, alpha: .65 });
    if (!reduced) this.bank.spray('gold').ring(at, .25, 8, .15, .8, 1.8);
  }
  tick(dt: number): void {
    for (let i = this.rays.length - 1; i >= 0; i--) {
      const p = this.rays[i]; p.age += dt; const age = p.age - p.travel;
      if (!p.received && age >= 0) { p.received = true;
        this.bank.ring(p.at, p.resource ? .32 : .55, 'gold', { life: .48, fill: .04, rim: .35, hold: true, alpha: .5, reduced: p.reduced });
        if (!p.reduced) this.bank.spray('gold').ring(p.at, .2, p.resource ? 3 : 7, .15, .65, 1.6);
        debug('visual.kim-than-la-han.receipt', { resource: p.resource, reduced: p.reduced }); }
      if (age >= RECEIVE_LIFE) { this.paint.planes.release(p.mesh); this.paint.planes.release(p.receipt); this.rays.splice(i, 1); continue; }
      if (p.from && !p.reduced && p.travel > 0 && age < .16) { p.mesh ??= this.paint.planes.acquire('ray');
        if (p.mesh) this.placeRay(p.mesh, p.from, p.at, motion.launch(Math.min(1, p.age / p.travel)), Math.max(0, age) / .16, p.resource); }
      else { this.paint.planes.release(p.mesh); p.mesh = undefined; }
      if (age >= 0) { const key = p.resource ? 'ray' : 'cast'; p.receipt ??= this.paint.planes.acquire(key); if (!p.receipt) continue;
        this.paint.place(p.receipt, key, p.at, p.resource ? .65 : 1.5, p.resource ? .65 : 1.5, p.resource ? 1.7 : .75);
        if (p.resource) this.paint.planes.mapUvs(p.receipt, base => base.map((v, k) => k % 2 === 0 ? .83 + v * .17 : v));
        else this.paint.frame(p.receipt, 'cast', p.reduced ? 2 : Math.min(7, Math.floor(age / RECEIVE_LIFE * 8)));
        p.receipt.visibility = .7 * (1 - age / RECEIVE_LIFE); }
    }
    for (let i = this.accents.length - 1; i >= 0; i--) { const p = this.accents[i]; p.age += dt;
      if (p.age >= .36) { this.paint.planes.release(p.mesh); this.accents.splice(i, 1); continue; }
      p.mesh ??= this.paint.planes.acquire('cast'); if (!p.mesh) continue;
      this.paint.frame(p.mesh, 'cast', p.reduced ? 3 : Math.min(7, 4 + Math.floor(p.age / .36 * 4)));
      this.paint.place(p.mesh, 'cast', p.at, 1.35, 1.35, .35); p.mesh.visibility = .7 * (1 - p.age / .36); }
  }
  private placeRay(mesh: Mesh, from: Vector3, to: Vector3, t: number, fold: number, resource: boolean): void {
    const start = from.add(new Vector3(0, 1.7, 0)), end = to.add(new Vector3(0, resource ? 1.7 : 1.1, 0)), delta = end.subtract(start), distance = delta.length();
    if (distance < .02) { mesh.visibility = 0; return; }
    const x = delta.scale(1 / distance), camera = this.scene.activeCamera as TargetCamera | null, look = camera && typeof camera.getTarget === 'function' ? camera.getTarget().subtract(camera.position).normalize() : new Vector3(0, -.669, -.743);
    const z = look.subtract(x.scale(Vector3.Dot(x, look))); if (z.lengthSquared() < 1e-6) { mesh.visibility = 0; return; } z.normalize();
    const length = Math.min(resource ? 1.6 : 2.5, distance * t) * (1 - fold), native = resource ? 1.6 : 2.5;
    mesh.billboardMode = Mesh.BILLBOARDMODE_NONE; mesh.rotationQuaternion = null; mesh.rotation.copyFrom(Vector3.RotationFromAxis(x, Vector3.Cross(z, x).normalize(), z));
    mesh.position.copyFrom(Vector3.Lerp(start, end, t).subtract(x.scale(length / 2))); mesh.scaling.set(Math.max(.001, length), native / layout.ray.aspect, 1); mesh.visibility = .85 * (1 - fold);
    const reveal = length / native; this.paint.planes.mapUvs(mesh, base => base.map((v, k) => k % 2 === 0 ? 1 - reveal + v * reveal : v));
  }
  clear(): void { this.rays.length = this.accents.length = 0; this.paint.clear(); }
}
