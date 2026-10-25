import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { Tier3Art } from './visual-tier3-art.js';
import type { KitFxBank } from './visual-kit-fx-bank.js';
import { screenUp, farDirection } from './visual-kit-billboard.js';
import { LT_CAPS, LY_TINH as L, PAGODA_CONTACT, PAGODA_LIFE, SEAL_LIFE, pagodaPose, pagodaSeal } from './visual-ly-tinh-timeline.js';
import { debug } from './debug.js';
import layout from './visual-ly-tinh-layout.json';
export type PagodaArtKey = keyof typeof layout;
interface Tower { at: Vector3; targets: readonly Vector3[]; age: number; reduced: boolean; hit: boolean; mesh?: Mesh; seal?: Mesh }
interface Hit { at: Vector3; age: number; reduced: boolean; mesh?: Mesh }
export class PagodaArt {
  readonly paint: Tier3Art<PagodaArtKey>; private towers: Tower[] = []; private hits: Hit[] = [];
  constructor(private scene: Scene, private bank: KitFxBank) { this.paint = new Tier3Art(scene, 'ly-tinh', layout, ['toss', 'tower', 'hit', 'guard'], LT_CAPS.planes); }
  prepare(): void { this.paint.prepare(); }
  palm(at: Vector3): Vector3 { return at.add(Vector3.Cross(screenUp(this.scene), farDirection(this.scene)).normalize().scale(.9)); }
  descend(at: Vector3, targets: readonly Vector3[], reduced: boolean): void {
    if (this.towers.length >= LT_CAPS.towers) return;
    this.towers.push({ at: at.clone(), targets: targets.slice(0, LT_CAPS.targets).map(p => p.clone()), age: 0, reduced, hit: false });
  }
  private impact(at: Vector3, reduced: boolean): void {
    if (this.hits.length < LT_CAPS.planes) this.hits.push({ at: at.clone(), age: 0, reduced });
    this.bank.ring(at, .58, 'earth', { life: .6, hold: true, fill: .2, rim: .3, reduced, alpha: .65 });
    if (!reduced) { this.bank.spray('earth').ring(at, .3, 8, .1, 1.8, 2.5); this.bank.spray('gold').ring(at, .15, 4, .4, 1.1, 1.6); }
  }
  tick(dt: number): void {
    for (let i = this.towers.length - 1; i >= 0; i--) {
      const p = this.towers[i]; p.age += dt; const contact = p.reduced ? 0 : PAGODA_CONTACT;
      if (!p.hit && p.age >= contact) { p.hit = true; for (const target of p.targets) this.impact(target, p.reduced);
        this.bank.ring(p.at, L.radius, 'gold', { life: .55, fill: 0, rim: .45, reduced: p.reduced, hold: true, alpha: .5 });
        debug('visual.ly-tinh.contact', { targets: p.targets.length, reduced: p.reduced }); }
      if (p.age >= contact + SEAL_LIFE) { this.paint.planes.release(p.mesh); this.paint.planes.release(p.seal); this.towers.splice(i, 1); continue; }
      if (p.age < PAGODA_LIFE) {
        p.mesh ??= this.paint.planes.acquire('tower'); if (p.mesh) {
          const state = pagodaPose(p.age, p.reduced); this.paint.frame(p.mesh, 'tower', state.frame);
          this.paint.place(p.mesh, 'tower', p.at, 7.2 * state.width, 7.2, state.lift); p.mesh.visibility = state.alpha * .75;
        }
      } else { this.paint.planes.release(p.mesh); p.mesh = undefined; }
      if (p.hit) {
        p.seal ??= this.paint.planes.acquire('seal', true); if (!p.seal) continue;
        const state = pagodaSeal(Math.max(0, p.age - contact), p.reduced);
        this.paint.ground(p.seal, 'seal', p.at, L.radius * state.scale); p.seal.visibility = state.alpha * .62;
      }
    }
    for (let i = this.hits.length - 1; i >= 0; i--) {
      const p = this.hits[i]; p.age += dt;
      if (p.age >= .58) { this.paint.planes.release(p.mesh); this.hits.splice(i, 1); continue; }
      p.mesh ??= this.paint.planes.acquire('hit'); if (!p.mesh) continue;
      this.paint.frame(p.mesh, 'hit', p.reduced ? 2 : Math.min(7, Math.floor(p.age / .58 * 8)));
      this.paint.place(p.mesh, 'hit', p.at, 2.6); p.mesh.visibility = Math.min(.9, (.58 - p.age) / .14);
    }
  }
  clear(): void { this.towers.length = 0; this.hits.length = 0; this.paint.clear(); }
}
