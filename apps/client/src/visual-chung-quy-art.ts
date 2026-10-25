import type { Scene } from '@babylonjs/core/scene.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Tier3Art } from './visual-tier3-art.js';
import { cameraLook, placeStrip, resetStrip } from './visual-de-tuan-strip.js';
import type { KitFxBank } from './visual-kit-fx-bank.js';
import { CHUNG_QUY as C, CQ_CAPS, FLIGHT, SLAM, sealFlight, fireHold, talismanShape } from './visual-chung-quy-timeline.js';
import layout from './visual-chung-quy-layout.json';
import { debug } from './debug.js';
type Key = 'talisman' | 'slam' | 'sigil' | 'flame' | 'hit';
type Strike = { origin?: Vector3; at: Vector3; direction?: Vector3; targets: Vector3[]; age: number;
  reduced: boolean; fired: boolean; flight?: Mesh; slam?: Mesh };
type Hit = { at: Vector3; age: number; mesh?: Mesh; reduced: boolean };
type Ground = { at: Vector3; radius: number; remaining: number; age: number; missing: number; touched: boolean;
  reduced: boolean; sigil?: Mesh; flames: (Mesh | undefined)[] };
export class ChungQuyArt {
  readonly art: Tier3Art<Key>; private strikes: Strike[] = []; private hits: Hit[] = [];
  private grounds = new Map<string, Ground>();
  constructor(private scene: Scene, private bank: KitFxBank) {
    this.art = new Tier3Art(scene, 'chung-quy', layout, ['talisman', 'slam', 'hit'], CQ_CAPS.planes);
  }
  prepare(): void { this.art.prepare(); }
  launch(origin: Vector3 | undefined, at: Vector3, direction: Vector3 | undefined, targets: readonly Vector3[], reduced: boolean): void {
    if (this.strikes.length >= CQ_CAPS.strikes) return;
    this.strikes.push({ origin: origin?.clone(), at: at.clone(), direction, targets: targets.map(p => p.clone()),
      age: reduced || !origin || !direction ? FLIGHT : 0, reduced, fired: false });
  }
  mark(id: string, at: Vector3, radius: number, remaining: number, reduced: boolean): void {
    let ground = this.grounds.get(id);
    if (!ground) {
      if (this.grounds.size >= CQ_CAPS.grounds) return;
      ground = { at: at.clone(), radius, remaining, age: 0, missing: 0, touched: true, reduced, flames: [] };
      this.grounds.set(id, ground);
      debug('visual.chung-quy.ground.enter', { radius, remaining, reduced, nativeHold: true });
    }
    ground.at.copyFrom(at); Object.assign(ground, { radius, remaining, reduced, touched: true, missing: 0 });
  }
  tick(dt: number): void {
    for (let i = this.strikes.length - 1; i >= 0; i--) {
      const s = this.strikes[i]; s.age += dt; const age = s.age - FLIGHT;
      if (age >= SLAM) { this.releaseStrike(s); this.strikes.splice(i, 1); continue; }
      if (age < 0 && s.origin && s.direction) {
        const p = sealFlight(s.age), head = Vector3.Lerp(s.origin, s.at, p).add(new Vector3(0, .9, 0));
        // The six suspended-seal poses precede arrival; floor contact starts at frame six.
        s.slam ??= this.art.planes.acquire('slam'); if (s.slam) {
          this.art.frame(s.slam, 'slam', Math.min(5, Math.floor(s.age / FLIGHT * 6)));
          this.art.place(s.slam, 'slam', s.at, 7.2, undefined, 3.5 * (1 - p)); s.slam.visibility = .3 + .7 * p;
        }
        s.flight ??= this.art.planes.acquire('talisman');
        if (s.flight) {
          const b = layout.talisman.bounds, reveal = Math.max(.01, Math.min(1, p * 3));
          const shape = talismanShape(reveal, b);
          this.art.planes.mapUvs(s.flight, base => base.map((v, k) => k % 2 === 0
            ? b.right - (1 - v) * reveal * (b.right - b.left) : 1 - b.bottom + v * (b.bottom - b.top)));
          s.flight.visibility = placeStrip(s.flight, head, s.direction, cameraLook(this.scene), shape.length, shape.height) ? 1 : 0;
        }
        continue;
      }
      resetStrip(s.flight); this.art.planes.release(s.flight); s.flight = undefined;
      if (!s.fired) {
        s.fired = true; this.bank.ring(s.at, C.radius, 'chungquy', { life: .4, reduced: s.reduced, fill: 0, rim: .9 });
        if (!s.reduced) this.bank.spray('chungquy').ring(s.at, 1.1, 14, .2, 2, 3.4);
        for (const at of s.targets) {
          if (this.hits.length < CQ_CAPS.hits) this.hits.push({ at, age: 0, reduced: s.reduced });
          this.bank.ring(at, .7, 'chungquy', { life: .65, reduced: s.reduced, hold: true, fill: .45, rim: .3 });
          if (!s.reduced) this.bank.spray('chungquy').ring(at, .3, 9, .15, 1.4, 2.7);
        }
      }
      s.slam ??= this.art.planes.acquire('slam'); if (s.slam) {
        this.art.frame(s.slam, 'slam', s.reduced ? 6 : 6 + Math.floor(age / SLAM * 10));
        this.art.place(s.slam, 'slam', s.at, 7.2); s.slam.visibility = Math.min(1, (SLAM - age) / .18);
      }
    }
    for (let i = this.hits.length - 1; i >= 0; i--) {
      const h = this.hits[i]; h.age += dt;
      if (h.age >= .5) { this.art.planes.release(h.mesh); this.hits.splice(i, 1); continue; }
      h.mesh ??= this.art.planes.acquire('hit'); if (h.mesh) {
        this.art.frame(h.mesh, 'hit', h.reduced ? 2 : Math.floor(h.age / .5 * 8));
        this.art.place(h.mesh, 'hit', h.at, 2.5); h.mesh.visibility = Math.min(1, (.5 - h.age) / .15);
      }
    }
    for (const [id, g] of this.grounds) {
      g.age += dt;
      if (!g.touched) { g.missing += dt; this.art.planes.release(g.sigil); g.sigil = undefined; }
      const pose = fireHold(g.remaining, g.missing);
      if (pose.alpha <= 0) {
        this.releaseGround(g); this.grounds.delete(id);
        debug('visual.chung-quy.ground.exit', { missing: g.missing > 0 }); continue;
      }
      if (g.touched) {
        g.sigil ??= this.art.planes.acquire('sigil', true); if (g.sigil) {
          this.art.ground(g.sigil, 'sigil', g.at, g.radius); g.sigil.visibility = .86 * pose.alpha;
        }
      }
      const count = g.reduced ? 1 : 6;
      for (let i = 0; i < count; i++) {
        const angle = i * Math.PI * 2 / count, at = g.at.add(new Vector3(Math.cos(angle) * g.radius * .48, 0, Math.sin(angle) * g.radius * .48));
        g.flames[i] ??= this.art.planes.acquire('flame'); const mesh = g.flames[i]; if (!mesh) continue;
        this.art.frame(mesh, 'flame', g.reduced ? 3 : Math.floor(g.age * 10 + i) % 8);
        this.art.place(mesh, 'flame', at, 2.1 * (g.reduced ? 1 : pose.scale)); mesh.visibility = .8 * pose.alpha;
      }
      for (let i = count; i < g.flames.length; i++) { this.art.planes.release(g.flames[i]); g.flames[i] = undefined; }
      g.touched = false;
    }
  }
  private releaseStrike(s: Strike): void { resetStrip(s.flight); this.art.planes.release(s.flight); this.art.planes.release(s.slam); }
  private releaseGround(g: Ground): void { this.art.planes.release(g.sigil); for (const mesh of g.flames) this.art.planes.release(mesh); }
  clear(): void {
    for (const s of this.strikes) this.releaseStrike(s); for (const g of this.grounds.values()) this.releaseGround(g);
    this.strikes.length = 0; this.hits.length = 0; this.grounds.clear(); this.art.clear();
  }
}
