import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { TargetCamera } from '@babylonjs/core/Cameras/targetCamera.js';
import { Tier3Art } from './visual-tier3-art.js';
import type { KitFxBank } from './visual-kit-fx-bank.js';
import { DAT_KY as D, DK_CAPS, FOX_EXIT, foxLegLife, foxFlight, foxExit, foxTailsExit } from './visual-dat-ky-timeline.js';
import { motion } from './visual-kit-timeline.js';
import { debug } from './debug.js';
import layout from './visual-dat-ky-layout.json';
export type FoxArtKey = keyof typeof layout;
interface Chain { origin: Vector3; targets: readonly Vector3[]; index: number; from: Vector3; current: Vector3; previous: Vector3; tangent?: Vector3; legAge: number; legLife: number; age: number; exit: number; reduced: boolean; orb?: Mesh; trail?: Mesh }
interface Hit { at: Vector3; direction?: Vector3; age: number; reduced: boolean; mesh?: Mesh }
interface Tails { at: Vector3; age: number; reduced: boolean; mesh?: Mesh }
export class FoxArt {
  readonly paint: Tier3Art<FoxArtKey>; private chains: Chain[] = []; private hits: Hit[] = []; private tails: Tails[] = [];
  constructor(private scene: Scene, private bank: KitFxBank) { this.paint = new Tier3Art(scene, 'dat-ky', layout, ['orb', 'trail', 'hit'], DK_CAPS.planes); }
  prepare(): void { this.paint.prepare(); }
  chain(origin: Vector3 | undefined, targets: readonly Vector3[], reduced: boolean): void {
    const records = targets.slice(0, D.records).map(at => at.clone());
    if (!origin) { for (const target of records) this.impact(target, undefined, reduced); return; }
    if (this.tails.length < DK_CAPS.tails) this.tails.push({ at: origin.clone(), age: 0, reduced });
    if (!records.length || this.chains.length >= DK_CAPS.chains) return;
    const from = origin.add(new Vector3(0, 1.25, 0));
    this.chains.push({ origin: origin.clone(), targets: records, index: 0, from, current: from.clone(), previous: from.clone(), legAge: 0, legLife: foxLegLife(Vector3.Distance(from, records[0])), age: 0, exit: 0, reduced });
  }
  private impact(at: Vector3, origin: Vector3 | undefined, reduced: boolean): void {
    const raw = origin ? at.subtract(origin) : undefined; if (raw) raw.y = 0;
    const direction = raw && raw.lengthSquared() > .001 ? raw.normalize() : undefined;
    if (this.hits.length < DK_CAPS.hits) this.hits.push({ at: at.clone(), direction, age: 0, reduced });
    this.bank.ring(at, .5, 'netherfire', { life: .58, fill: .14, rim: .28, reduced, hold: true, alpha: .6 });
    if (!reduced) { this.bank.spray('petal').ring(at, .18, 6, .3, 1.6, 1.7); this.bank.spray('nether').ring(at, .1, 3, .3, .9, 1.1); }
    debug('visual.dat-ky.contact', { directional: Boolean(direction), reduced });
  }
  tick(dt: number): void {
    for (let i = this.chains.length - 1; i >= 0; i--) {
      const p = this.chains[i]; p.age += dt; p.previous.copyFrom(p.current); let left = dt;
      if (p.reduced && p.index < p.targets.length) {
        while (p.index < p.targets.length) { this.impact(p.targets[p.index], p.origin, true); p.current.copyFrom(p.targets[p.index]).addInPlace(new Vector3(0, .8, 0)); p.index++; }
      }
      while (!p.reduced && left > 0 && p.index < p.targets.length) {
        const step = Math.min(left, p.legLife - p.legAge); p.legAge += step; left -= step;
        const to = p.targets[p.index].add(new Vector3(0, .8, 0)), s = foxFlight(p.legAge, p.legLife), delta = to.subtract(p.from), horizontal = Math.hypot(delta.x, delta.z);
        p.current.copyFrom(Vector3.Lerp(p.from, to, s.t));
        if (horizontal > .001) { p.current.x -= delta.z / horizontal * s.zig; p.current.z += delta.x / horizontal * s.zig; }
        p.current.y += s.rise;
        if (p.legAge >= p.legLife - 1e-6) {
          this.impact(p.targets[p.index], p.origin, false); p.index++; p.from.copyFrom(to); p.legAge = 0;
          if (p.index < p.targets.length) p.legLife = foxLegLife(Vector3.Distance(p.from, p.targets[p.index]));
        }
      }
      const velocity = p.current.subtract(p.previous); if (velocity.lengthSquared() > .001) p.tangent = velocity.normalize();
      if (p.index >= p.targets.length) p.exit += dt;
      if (p.exit >= FOX_EXIT) { this.paint.planes.release(p.orb); this.paint.planes.release(p.trail); this.chains.splice(i, 1); continue; }
      const end = foxExit(p.exit, p.reduced); p.orb ??= this.paint.planes.acquire('orb');
      if (p.orb) { this.paint.frame(p.orb, 'orb', p.reduced ? 2 : Math.floor(p.age / .065) % 8); this.paint.place(p.orb, 'orb', p.current, 1.5 * end.scale); p.orb.visibility = end.alpha; }
      if (!p.reduced && p.tangent) { p.trail ??= this.paint.planes.acquire('trail'); if (p.trail) this.trail(p.trail, p.current, p.tangent, 2 * end.scale, end.width, end.alpha); }
    }
    for (let i = this.hits.length - 1; i >= 0; i--) {
      const p = this.hits[i]; p.age += dt;
      if (p.age >= .5) { this.paint.planes.release(p.mesh); this.hits.splice(i, 1); continue; }
      p.mesh ??= this.paint.planes.acquire('hit'); if (!p.mesh) continue;
      const at = !p.reduced && p.direction ? p.at.add(p.direction.scale(motion.settle(p.age / .5) * .35)) : p.at;
      this.paint.frame(p.mesh, 'hit', p.reduced ? 2 : Math.min(7, Math.floor(p.age / .5 * 8))); this.paint.place(p.mesh, 'hit', at, 2.1, undefined, .55); p.mesh.visibility = Math.min(.9, (.5 - p.age) / .14);
    }
    for (let i = this.tails.length - 1; i >= 0; i--) {
      const p = this.tails[i]; p.age += dt;
      if (p.age >= .45) { this.paint.planes.release(p.mesh); this.tails.splice(i, 1); continue; }
      p.mesh ??= this.paint.planes.acquire('tails'); if (!p.mesh) continue;
      const s = foxTailsExit(p.age, p.reduced); this.paint.frame(p.mesh, 'tails', s.frame); this.paint.place(p.mesh, 'tails', p.at, 4.8 * s.width, 4.8, .5); p.mesh.visibility = s.alpha * .85;
    }
  }
  private trail(mesh: Mesh, head: Vector3, direction: Vector3, length: number, width: number, alpha: number): void {
    const x = direction, camera = this.scene.activeCamera as TargetCamera | null;
    const look = camera && typeof camera.getTarget === 'function' ? camera.getTarget().subtract(camera.position).normalize() : new Vector3(0, -.669, -.743);
    const z = look.subtract(x.scale(Vector3.Dot(x, look))); if (z.lengthSquared() < 1e-6 || length < .001) { mesh.visibility = 0; return; } z.normalize();
    const y = Vector3.Cross(z, x).normalize(); mesh.billboardMode = Mesh.BILLBOARDMODE_NONE; mesh.rotationQuaternion = null;
    mesh.rotation.copyFrom(Vector3.RotationFromAxis(x, y, z)); mesh.position.copyFrom(head.subtract(x.scale(length / 2))); mesh.scaling.set(length, .65 * width, 1); mesh.visibility = alpha * .8;
    const reveal = Math.min(1, length / (layout.trail.aspect * .65)); this.paint.planes.mapUvs(mesh, base => base.map((v, k) => k % 2 === 0 ? 1 - reveal + v * reveal : v));
  }
  clear(): void { this.chains.length = 0; this.hits.length = 0; this.tails.length = 0; this.paint.clear(); }
}
