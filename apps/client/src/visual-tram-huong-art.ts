import type { Scene } from '@babylonjs/core/scene.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Tier3Art } from './visual-tier3-art.js';
import type { KitFxBank } from './visual-kit-fx-bank.js';
import { debug } from './debug.js';
import { TRAM_HUONG as T, TH_CAPS, AXE_CONTACT, AXE_LIFE, FISSURE_LIFE, HIT_LIFE, LOTUS_LIFE,
  axePose, fissurePose, lotusPose } from './visual-tram-huong-timeline.js';
import layout from './visual-tram-huong-layout.json';

type Key = 'lamp' | 'axe' | 'fissure' | 'lotus' | 'hit';
type Strike = { at: Vector3; direction?: { x: number; z: number }; targets: Vector3[]; age: number;
  reduced: boolean; fired: boolean; axe?: Mesh; fissure?: Mesh };
type Hit = { at: Vector3; age: number; reduced: boolean; fired: boolean; mesh?: Mesh };
type Receipt = { at: Vector3; age: number; reduced: boolean; mesh?: Mesh };

/** One descending axe, one contact; snapshot status marks remain shared. */
export class TramHuongArt {
  readonly art: Tier3Art<Key>; private strikes: Strike[] = []; private hits: Hit[] = []; private receipts: Receipt[] = [];
  constructor(_scene: Scene, private bank: KitFxBank) {
    this.art = new Tier3Art(_scene, 'tram-huong', layout, ['lamp', 'axe', 'hit'], TH_CAPS.planes);
  }
  prepare(): void { this.art.prepare(); }
  strike(at: Vector3, direction: Strike['direction'], targets: readonly Vector3[], reduced: boolean): void {
    if (this.strikes.length >= TH_CAPS.strikes) { debug('visual.tram-huong.cap', { phase: 'strike' }); return; }
    this.strikes.push({ at: at.clone(), direction, targets: targets.slice(0, TH_CAPS.hits).map(p => p.clone()),
      age: reduced ? AXE_CONTACT : 0, reduced, fired: false });
  }
  receipt(targets: readonly Vector3[], reduced: boolean): void {
    for (const at of targets) {
      if (this.receipts.length >= TH_CAPS.receipts) break;
      this.receipts.push({ at: at.clone(), age: 0, reduced });
    }
  }
  tick(dt: number): void { this.tickStrikes(dt); this.tickHits(dt); this.tickReceipts(dt); }
  private tickStrikes(dt: number): void {
    for (let i = this.strikes.length - 1; i >= 0; i--) {
      const s = this.strikes[i]; s.age += dt;
      if (s.age >= AXE_CONTACT + FISSURE_LIFE) {
        this.art.planes.release(s.axe); this.art.planes.release(s.fissure); this.strikes.splice(i, 1); continue;
      }
      const pose = axePose(s.age, s.reduced);
      if (s.age < AXE_LIFE) {
        s.axe ??= this.art.planes.acquire('axe'); if (s.axe) {
          this.art.frame(s.axe, 'axe', pose.frame);
          this.art.place(s.axe, 'axe', s.at, 7.4, 7.4, pose.lift - pose.settle);
          s.axe.visibility = pose.alpha;
        }
      } else { this.art.planes.release(s.axe); s.axe = undefined; }
      if (s.age < AXE_CONTACT) continue;
      const age = s.age - AXE_CONTACT;
      if (!s.fired) {
        s.fired = true;
        this.bank.ring(s.at, T.radius, 'tramhuong', { life: .32, fill: 0, rim: .85, reduced: s.reduced });
        if (!s.reduced) {
          this.bank.spray('tramhuong').ring(s.at, .7, 18, .1, 2.4, 4.3);
          this.bank.spray('gold').ring(s.at, .35, 9, .1, 1.1, 2.5);
        }
        for (const at of s.targets) {
          if (this.hits.length >= TH_CAPS.hits) break;
          this.hits.push({ at, age: 0, reduced: s.reduced, fired: false });
        }
        debug('visual.tram-huong.contact', { targets: s.targets.length, directional: Boolean(s.direction), reduced: s.reduced });
      }
      // A zero direction keeps the truthful stationary impact, without a fabricated split axis.
      if (!s.direction) continue;
      const fissure = fissurePose(age, s.reduced);
      s.fissure ??= this.art.planes.acquire('fissure', true); if (s.fissure) {
        this.art.ground(s.fissure, 'fissure', s.at, T.radius, Math.atan2(-s.direction.z, s.direction.x));
        s.fissure.scaling.y *= fissure.width; s.fissure.visibility = fissure.alpha * .85;
      }
    }
  }
  private tickHits(dt: number): void {
    for (let i = this.hits.length - 1; i >= 0; i--) {
      const h = this.hits[i]; h.age += dt;
      if (h.age >= HIT_LIFE) { this.art.planes.release(h.mesh); this.hits.splice(i, 1); continue; }
      if (!h.fired) {
        h.fired = true;
        this.bank.ring(h.at, .7, 'tramhuong', { life: .65, hold: true, fill: .35, rim: .2, reduced: h.reduced });
        if (!h.reduced) {
          this.bank.spray('tramhuong').ring(h.at, .15, 8, .1, 1.5, 2.5);
          this.bank.spray('gold').ring(h.at, .1, 4, .1, .8, 1.7);
        }
      }
      h.mesh ??= this.art.planes.acquire('hit'); if (h.mesh) {
        this.art.frame(h.mesh, 'hit', h.reduced ? 1 : Math.min(7, Math.floor(h.age / HIT_LIFE * 8)));
        this.art.place(h.mesh, 'hit', h.at, 2.8); h.mesh.visibility = Math.min(1, (HIT_LIFE - h.age) / .12);
      }
    }
  }
  private tickReceipts(dt: number): void {
    for (let i = this.receipts.length - 1; i >= 0; i--) {
      const r = this.receipts[i]; r.age += dt;
      if (r.age >= LOTUS_LIFE) { this.art.planes.release(r.mesh); this.receipts.splice(i, 1); continue; }
      const pose = lotusPose(r.age, r.reduced);
      r.mesh ??= this.art.planes.acquire('lotus', true); if (r.mesh) {
        this.art.ground(r.mesh, 'lotus', r.at, 1.25 * pose.scale); r.mesh.visibility = .85 * pose.alpha;
      }
    }
  }
  clear(): void {
    for (const s of this.strikes) { this.art.planes.release(s.axe); this.art.planes.release(s.fissure); }
    for (const h of this.hits) this.art.planes.release(h.mesh);
    for (const r of this.receipts) this.art.planes.release(r.mesh);
    this.strikes.length = this.hits.length = this.receipts.length = 0; this.art.clear();
  }
}
