import type { Scene } from '@babylonjs/core/scene.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Tier3Art } from './visual-tier3-art.js';
import type { KitFxBank } from './visual-kit-fx-bank.js';
import { PHAN_QUAN as P, PQ_CAPS, INK_SWEEP, INK_EXIT, LEDGER_SIZE, LEDGER_LIFT, inkYaw, inkReveal, inkAlpha, inkTargetDelay } from './visual-phan-quan-timeline.js';
import layout from './visual-phan-quan-layout.json';
export type PhanArt = 'ledger' | 'arc' | 'hit' | 'chain' | 'shackle';
type Sweep = { origin: Vector3; direction: Vector3; age: number; reduced: boolean; arc?: Mesh; ledger?: Mesh };
type Hit = { at: Vector3; age: number; delay: number; fired: boolean; reduced: boolean; mesh?: Mesh };
export class PhanQuanArt {
  readonly art: Tier3Art<PhanArt>; private sweeps: Sweep[] = []; private hits: Hit[] = [];
  constructor(_scene: Scene, private bank: KitFxBank) {
    this.art = new Tier3Art(_scene, 'phan-quan', layout, ['ledger', 'arc', 'hit'], PQ_CAPS.planes);
  }
  prepare(): void { this.art.prepare(); }
  sweep(origin: Vector3 | undefined, direction: Vector3 | undefined, targets: readonly Vector3[], reduced: boolean): void {
    if (origin && direction && this.sweeps.length < PQ_CAPS.sweeps)
      this.sweeps.push({ origin: origin.clone(), direction, age: 0, reduced });
    const yaw = direction ? inkYaw(direction) : 0, size = P.radius / layout.arc.radialEdge;
    for (const at of targets) {
      if (this.hits.length >= PQ_CAPS.hits) break;
      const side = origin ? (at.x - origin.x) * Math.sin(yaw) + (at.z - origin.z) * Math.cos(yaw) : 0;
      this.hits.push({ at: at.clone(), age: 0, delay: reduced || !origin || !direction ? 0 : inkTargetDelay(side, size), fired: false, reduced });
    }
  }
  /** Crop UV and geometry together: reveal a fixed half-disk, never grow beyond the server radius. */
  placeArc(mesh: Mesh, origin: Vector3, direction: Vector3, reveal: number, alpha: number): void {
    const yaw = inkYaw(direction), size = P.radius / layout.arc.radialEdge, q = Math.max(.001, Math.min(1, reveal));
    mesh.rotation.set(Math.PI / 2, yaw, 0); mesh.scaling.set(size, size * q, 1);
    mesh.position.set(origin.x + Math.sin(yaw) * size * (1 - q) / 2, .065,
      origin.z + Math.cos(yaw) * size * (1 - q) / 2);
    this.art.planes.mapUvs(mesh, base => base.map((v, k) => k % 2 === 0 ? v : 1 - q + v * q));
    mesh.visibility = reveal > 0 ? alpha : 0;
  }
  tick(dt: number): void {
    for (let i = this.sweeps.length - 1; i >= 0; i--) {
      const s = this.sweeps[i]; s.age += dt;
      if (s.age >= INK_SWEEP + INK_EXIT) {
        this.art.planes.release(s.arc); this.art.planes.release(s.ledger); this.sweeps.splice(i, 1); continue;
      }
      s.arc ??= this.art.planes.acquire('arc', true);
      if (s.arc) this.placeArc(s.arc, s.origin, s.direction, inkReveal(s.age, s.reduced), inkAlpha(s.age));
      s.ledger ??= this.art.planes.acquire('ledger'); if (s.ledger) {
        this.art.frame(s.ledger, 'ledger', s.reduced ? 2 : Math.min(7, 3 + Math.floor(s.age / (INK_SWEEP + INK_EXIT) * 5)));
        this.art.place(s.ledger, 'ledger', s.origin, LEDGER_SIZE, undefined, LEDGER_LIFT); s.ledger.visibility = inkAlpha(s.age);
      }
    }
    for (let i = this.hits.length - 1; i >= 0; i--) {
      const h = this.hits[i]; h.age += dt; const age = h.age - h.delay; if (age < 0) continue;
      if (age >= .55) { this.art.planes.release(h.mesh); this.hits.splice(i, 1); continue; }
      if (!h.fired) {
        h.fired = true; this.bank.ring(h.at, .8, 'phanquan', { life: .8, hold: true, fill: .6, rim: .2, reduced: h.reduced });
        if (!h.reduced) this.bank.spray('phanquan').ring(h.at, .2, 12, .1, 1.3, 2.8);
      }
      h.mesh ??= this.art.planes.acquire('hit'); if (h.mesh) {
        this.art.frame(h.mesh, 'hit', h.reduced ? 2 : Math.floor(age / .55 * 8));
        this.art.place(h.mesh, 'hit', h.at, 3.2); h.mesh.visibility = Math.min(1, (.55 - age) / .15);
      }
    }
  }
  clear(): void { this.sweeps.length = 0; this.hits.length = 0; this.art.clear(); }
}
