import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { TargetCamera } from '@babylonjs/core/Cameras/targetCamera.js';
import { Tier3Art } from './visual-tier3-art.js';
import type { KitFxBank } from './visual-kit-fx-bank.js';
import { LayerPool, createGroundLayer, type Layer } from './visual-kit-layers.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import { screenUp } from './visual-kit-billboard.js';
import { THIEN_LONG as T, BT_CAPS, DRAGON_LIFE, PILLAR_LIFE, dragonFlight, dragonContactDelay, type DragonDirection } from './visual-bat-bo-thien-long-timeline.js';
import { debug } from './debug.js';
import layout from './visual-bat-bo-thien-long-layout.json';
interface Target { at: Vector3; delay: number; done: boolean }
interface Lane { origin?: Vector3; dir?: DragonDirection; age: number; reduced: boolean; targets: Target[]; dragons: (Mesh | undefined)[]; lane?: Mesh; bow?: Mesh; region?: Layer }
interface Hit { at: Vector3; age: number; reduced: boolean; mesh?: Mesh }
export class DragonArt {
  readonly paint: Tier3Art<keyof typeof layout | 'haste'>; private lanes: Lane[] = []; private hits: Hit[] = []; private regions: LayerPool;
  constructor(private scene: Scene, private bank: KitFxBank) {
    this.paint = new Tier3Art(scene, 'bat-bo-thien-long', { ...layout, haste: layout.bow }, ['bow', 'dragon', 'pillar'], BT_CAPS.planes);
    let i = 0; this.regions = new LayerPool(() => createGroundLayer(scene, 'kitLink', 'jade', `dragon-actual-lane-${i++}`), BT_CAPS.lanes, 'dragon-actual-lane');
  }
  prepare(): void {
    for (const key of Object.keys(layout) as (keyof typeof layout)[]) this.paint.planes.prepare(key, `/assets/vfx-bat-bo-thien-long-${key}.webp`, { foreground: key !== 'lane', depthAlways: key === 'lane' });
    this.paint.planes.prepare('haste', '/assets/vfx-bat-bo-thien-long-bow.webp', { depthAlways: true });
  }
  fire(origin: Vector3 | undefined, dir: DragonDirection | undefined, targets: readonly Vector3[], reduced: boolean): void {
    if (this.lanes.length >= BT_CAPS.lanes) return;
    this.lanes.push({ origin: origin?.clone(), dir, age: 0, reduced, dragons: [], targets: targets.slice(0, BT_CAPS.targets).map(at => ({ at: at.clone(), delay: dragonContactDelay(origin, dir, at, reduced), done: false })) });
  }
  private contact(at: Vector3, reduced: boolean): void {
    if (this.hits.length < BT_CAPS.hits) this.hits.push({ at: at.clone(), age: 0, reduced });
    this.bank.ring(at, .65, 'jade', { life: .48, fill: .1, rim: .4, hold: true, reduced, alpha: .6 });
    this.bank.ring(at, .5, 'earth', { life: .6, fill: .2, rim: .15, hold: true, reduced, alpha: .5 });
    if (!reduced) { this.bank.spray('gold').ring(at, .18, 7, .2, 1.5, 2); this.bank.spray('earth').ring(at, .2, 4, .1, 1.1, 1.7); }
    debug('visual.bat-bo-thien-long.contact', { reduced });
  }
  tick(dt: number, time: number): void {
    for (let i = this.lanes.length - 1; i >= 0; i--) {
      const p = this.lanes[i]; p.age += dt;
      for (const target of p.targets) if (!target.done && p.age >= target.delay) { target.done = true; this.contact(target.at, p.reduced); }
      if (p.age >= DRAGON_LIFE) { this.release(p); this.lanes.splice(i, 1); continue; }
      if (!p.origin || !p.dir) continue; const s = dragonFlight(p.age, p.reduced), dir = p.dir;
      if (p.age < .52) { p.region ??= this.regions.acquire(); if (p.region) {
        const { mesh, material: m } = p.region; mesh.position.set(p.origin.x + dir.x * T.length / 2, .047, p.origin.z + dir.z * T.length / 2);
        mesh.rotation.y = -Math.atan2(dir.z, dir.x); mesh.scaling.set(T.length, 1, T.width); mesh.alphaIndex = GROUND_ALPHA_INDEX + 2;
        m.setFloat('uTime', p.reduced ? 0 : time); m.setFloat('uAlpha', .14); m.setFloat('uHead', 1); m.setFloat('uTail', 0); m.setFloat('uWave', 0); m.setFloat('uTaper', 0);
      } } else { if (p.region) this.regions.release(p.region); p.region = undefined; }
      const head = T.length * s.head, side = new Vector3(-dir.z, 0, dir.x);
      for (let j = 0; j < 3; j++) { p.dragons[j] ??= this.paint.planes.acquire('dragon'); const mesh = p.dragons[j]; if (!mesh) continue;
        const angle = j * Math.PI * 2 / 3 + (p.reduced ? 0 : p.age * 8), offset = Math.cos(angle) * .65 * s.coil;
        const length = Math.min(3.8, head), at = p.origin.add(new Vector3(dir.x * (head - length / 2), 1.1 + Math.sin(angle) * .3 * s.coil + s.lift, dir.z * (head - length / 2))).add(side.scale(offset));
        const visible = this.facing(mesh, dir); mesh.position.copyFrom(at); mesh.scaling.set(Math.max(.001, length), 3.8 / layout.dragon.aspect, 1); mesh.visibility = visible ? s.alpha * .88 : 0;
        const reveal = length / 3.8; this.paint.planes.mapUvs(mesh, base => base.map((v, k) => k % 2 === 0 ? 1 - reveal + v * reveal : v)); }
      p.lane ??= this.paint.planes.acquire('lane', true);
      if (p.lane) {
        const tail = Math.min(s.tail, s.head), span = Math.max(.001, s.head - tail), center = T.length * (s.head + tail) / 2;
        p.lane.position.set(p.origin.x + dir.x * center, .055, p.origin.z + dir.z * center); p.lane.rotation.set(Math.PI / 2, Math.atan2(-dir.z, dir.x), 0);
        p.lane.scaling.set(T.length * span, T.length / layout.lane.aspect * s.coil, 1); p.lane.visibility = s.alpha * .68;
        this.paint.planes.mapUvs(p.lane, base => base.map((v, k) => k % 2 === 0 ? 1 - span + v * span : v));
      }
      if (p.age < .28) { p.bow ??= this.paint.planes.acquire('bow'); if (p.bow) { this.placeBow(p.bow, p.origin, dir, 2 * (p.reduced ? 1 : 1 - p.age)); this.paint.frame(p.bow, 'bow', p.reduced ? 2 : Math.min(7, 4 + Math.floor(p.age / .28 * 4))); p.bow.visibility *= 1 - p.age / .28; } }
      else { this.paint.planes.release(p.bow); p.bow = undefined; }
    }
    for (let i = this.hits.length - 1; i >= 0; i--) { const p = this.hits[i]; p.age += dt;
      if (p.age >= PILLAR_LIFE) { this.paint.planes.release(p.mesh); this.hits.splice(i, 1); continue; }
      p.mesh ??= this.paint.planes.acquire('pillar'); if (!p.mesh) continue;
      this.paint.frame(p.mesh, 'pillar', p.reduced ? 2 : Math.min(7, Math.floor(p.age / PILLAR_LIFE * 8)));
      this.paint.place(p.mesh, 'pillar', p.at, 2, 2, .02); p.mesh.visibility = Math.max(0, 1 - Math.max(0, p.age - .32) / .18); }
  }
  /** Camera-facing strip with its +U axis locked to true travel; no fixed fallback attack axis. */
  private facing(mesh: Mesh, dir: DragonDirection): boolean {
    const x = new Vector3(dir.x, 0, dir.z), camera = this.scene.activeCamera as TargetCamera | null;
    const look = camera && typeof camera.getTarget === 'function' ? camera.getTarget().subtract(camera.position).normalize() : new Vector3(0, -.669, -.743);
    const z = look.subtract(x.scale(Vector3.Dot(look, x))); if (z.lengthSquared() < 1e-6) return false; z.normalize();
    let y = Vector3.Cross(z, x).normalize(); if (Vector3.Dot(y, screenUp(this.scene)) < 0) { y.scaleInPlace(-1); z.scaleInPlace(-1); }
    mesh.billboardMode = Mesh.BILLBOARDMODE_NONE; mesh.rotationQuaternion = null; mesh.rotation.copyFrom(Vector3.RotationFromAxis(x, y, z)); return true;
  }
  placeBow(mesh: Mesh, at: Vector3, dir: DragonDirection, scale: number): void {
    const visible = this.facing(mesh, dir); mesh.position.set(at.x + dir.x * .85, 1.55, at.z + dir.z * .85); mesh.scaling.set(scale, scale, 1); mesh.visibility = visible ? .85 : 0;
  }
  private release(p: Lane): void { for (const mesh of p.dragons) this.paint.planes.release(mesh); this.paint.planes.release(p.lane); this.paint.planes.release(p.bow); if (p.region) this.regions.release(p.region); }
  clear(): void { this.lanes.length = this.hits.length = 0; this.paint.clear(); this.regions.releaseAll(); }
}
