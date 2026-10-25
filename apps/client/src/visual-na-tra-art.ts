import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { TargetCamera } from '@babylonjs/core/Cameras/targetCamera.js';
import { Tier3Art } from './visual-tier3-art.js';
import type { KitFxBank } from './visual-kit-fx-bank.js';
import { farDirection, screenUp } from './visual-kit-billboard.js';
import { arcHeight } from './visual-kit-timeline.js';
import { NA_TRA as N, NT_CAPS, ringLegLife, ringLegProgress } from './visual-na-tra-timeline.js';
import { debug } from './debug.js';
import layout from './visual-na-tra-layout.json';
export type NaTraArtKey = keyof typeof layout;
interface Chain { targets: readonly Vector3[]; index: number; from: Vector3; current: Vector3; legAge: number; legLife: number; age: number; recover: number; reduced: boolean; ring?: Mesh; trail?: Mesh }
interface Hit { at: Vector3; age: number; reduced: boolean; mesh?: Mesh }
/** One painted thick gold/red ring. Every confirmed record is retained, including repeated positions. */
export class NaTraArt {
  readonly paint: Tier3Art<NaTraArtKey>; private chains: Chain[] = []; private hits: Hit[] = [];
  constructor(private scene: Scene, private bank: KitFxBank) { this.paint = new Tier3Art(scene, 'na-tra', layout, ['ring', 'trail', 'hit'], NT_CAPS.planes); }
  prepare(): void { this.paint.prepare(); }
  castPoint(at: Vector3): Vector3 {
    const up = screenUp(this.scene), right = Vector3.Cross(up, farDirection(this.scene)).normalize(); return at.add(right.scale(1.2)).add(up.scale(2.15));
  }
  chain(origin: Vector3 | undefined, targets: readonly Vector3[], reduced: boolean): void {
    if (!targets.length || this.chains.length >= NT_CAPS.chains) return;
    const records = targets.slice(0, N.records).map(p => p.clone()), from = origin ? this.castPoint(origin) : records[0].add(new Vector3(0, .7, 0));
    this.chains.push({ targets: records, index: 0, from, current: from.clone(), legAge: 0, legLife: ringLegLife(Vector3.Distance(from, records[0])), age: 0, recover: 0, reduced });
  }
  private impact(at: Vector3, reduced: boolean, record: number): void {
    if (this.hits.length < NT_CAPS.hits) this.hits.push({ at: at.clone(), age: 0, reduced });
    this.bank.ring(at, .55, 'lava', { life: .38, fill: .12, rim: .4, reduced, hold: true, alpha: .65 });
    this.bank.ring(at, .4, 'earth', { life: .6, fill: .24, rim: .15, reduced, hold: true, alpha: .6 });
    if (!reduced) this.bank.spray('lava').ring(at, .2, 8, .3, 1.8, 2.2);
    debug('visual.na-tra.contact', { record, reduced });
  }
  tick(dt: number): void {
    for (let i = this.chains.length - 1; i >= 0; i--) {
      const p = this.chains[i]; p.age += dt; let left = dt;
      if (p.reduced && p.index < p.targets.length) {
        while (p.index < p.targets.length) { this.impact(p.targets[p.index], true, p.index); p.current.copyFrom(p.targets[p.index]).addInPlace(new Vector3(0, .7, 0)); p.index++; }
      }
      while (!p.reduced && left > 0 && p.index < p.targets.length) {
        const step = Math.min(left, p.legLife - p.legAge); p.legAge += step; left -= step;
        const to = p.targets[p.index].add(new Vector3(0, .7, 0)), t = ringLegProgress(p.legAge, p.legLife);
        p.current.copyFrom(Vector3.Lerp(p.from, to, t)); p.current.y += arcHeight(t, .38);
        if (p.legAge >= p.legLife - 1e-6) {
          this.impact(p.targets[p.index], false, p.index); p.index++; p.from.copyFrom(to); p.legAge = 0;
          if (p.index < p.targets.length) p.legLife = ringLegLife(Vector3.Distance(p.from, p.targets[p.index]));
        }
      }
      if (p.index >= p.targets.length) p.recover += dt;
      if (p.recover >= .2) { this.paint.planes.release(p.ring); this.paint.planes.release(p.trail); this.chains.splice(i, 1); continue; }
      p.ring ??= this.paint.planes.acquire('ring');
      if (p.ring) {
        this.paint.frame(p.ring, 'ring', p.reduced ? 0 : Math.floor(p.age / .055) % 8);
        this.paint.place(p.ring, 'ring', p.current, p.reduced ? 1.9 : 1.9 * (1 - p.recover * 2)); p.ring.visibility = 1 - p.recover / .2;
      }
      if (!p.reduced && p.index < p.targets.length && Vector3.DistanceSquared(p.from, p.current) > .02) {
        p.trail ??= this.paint.planes.acquire('trail'); if (p.trail) this.placeTrail(p.trail, p.from, p.current);
      } else { this.paint.planes.release(p.trail); p.trail = undefined; }
    }
    for (let i = this.hits.length - 1; i >= 0; i--) {
      const p = this.hits[i]; p.age += dt;
      if (p.age >= .42) { this.paint.planes.release(p.mesh); this.hits.splice(i, 1); continue; }
      p.mesh ??= this.paint.planes.acquire('hit'); if (!p.mesh) continue;
      this.paint.frame(p.mesh, 'hit', p.reduced ? 2 : Math.min(7, Math.floor(p.age / .42 * 8)));
      this.paint.place(p.mesh, 'hit', p.at, 2.1, undefined, .55); p.mesh.visibility = Math.min(.85, (.42 - p.age) / .13);
    }
  }
  private placeTrail(mesh: Mesh, from: Vector3, to: Vector3): void {
    const delta = to.subtract(from), distance = delta.length();
    if (!Number.isFinite(distance) || distance <= 1e-5) { mesh.visibility = 0; return; }
    const length = Math.min(2.5, distance), x = delta.normalize();
    const camera = this.scene.activeCamera as TargetCamera | null;
    const look = camera && typeof camera.getTarget === 'function' ? camera.getTarget().subtract(camera.position).normalize() : new Vector3(0, -.669, -.743);
    let z = look.subtract(x.scale(Vector3.Dot(x, look)));
    if (z.lengthSquared() < 1e-6) { mesh.visibility = 0; return; } z.normalize();
    const y = Vector3.Cross(z, x).normalize(); mesh.billboardMode = Mesh.BILLBOARDMODE_NONE; mesh.rotationQuaternion = null;
    mesh.rotation.copyFrom(Vector3.RotationFromAxis(x, y, z)); mesh.position.copyFrom(to.subtract(x.scale(length / 2))); mesh.scaling.set(length, .65, 1); mesh.visibility = .75;
    const reveal = Math.min(1, length / (layout.trail.aspect * .65));
    this.paint.planes.mapUvs(mesh, base => base.map((v, k) => k % 2 === 0 ? 1 - reveal + v * reveal : v));
  }
  clear(): void { this.chains.length = 0; this.hits.length = 0; this.paint.clear(); }
}

