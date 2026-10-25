import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Tier3Art } from './visual-tier3-art.js';
import type { KitFxBank } from './visual-kit-fx-bank.js';
import { DT_CAPS, FILLET_CONTACT, FILLET_LIFE, filletState, hitFrame, closingFilletFrame, DUONG_TANG } from './visual-duong-tang-timeline.js';
import { debug } from './debug.js';
import layout from './visual-duong-tang-layout.json';
export type DharmaArtKey = keyof typeof layout;
interface Hit { at: Vector3; age: number; reduced: boolean; mesh?: Mesh }
interface Fillet { at: Vector3; age: number; reduced: boolean; targets: readonly Vector3[]; hit: boolean; mesh?: Mesh; closing: boolean; radius: number }
/** Physical fillet / hit art is foreground, beneath hero and health. Bell ellipses are world billboards. */
export class DharmaArt {
  readonly paint: Tier3Art<DharmaArtKey>; private hits: Hit[] = []; private fillets: Fillet[] = [];
  constructor(scene: Scene, private bank: KitFxBank) { this.paint = new Tier3Art(scene, 'duong-tang', layout, ['chant', 'fillet', 'hit'], DT_CAPS.painted); }
  prepare(): void { this.paint.prepare(); }
  fillet(at: Vector3, targets: readonly Vector3[], reduced: boolean): void {
    if (this.fillets.length >= DT_CAPS.strikes) return;
    this.fillets.push({ at: at.clone(), targets: targets.slice(0, DT_CAPS.targets).map(p => p.clone()), age: 0, reduced, hit: false, closing: false, radius: DUONG_TANG.radius });
  }
  closeFillet(at: Vector3, reduced: boolean, radius: number): void {
    if (this.fillets.length >= DT_CAPS.strikes) return;
    this.fillets.push({ at: at.clone(), targets: [], age: 0, reduced, hit: true, closing: true, radius });
  }
  private impact(at: Vector3, reduced: boolean): void {
    if (this.hits.length < DT_CAPS.painted) this.hits.push({ at: at.clone(), age: 0, reduced });
    this.bank.ring(at, .68, 'gold', { life: .52, fill: .08, rim: .5, hold: true, reduced, alpha: .6 });
    if (!reduced) this.bank.spray('gold').ring(at, .3, 8, .2, 1.9, 2.1);
  }
  tick(dt: number): void {
    for (let i = this.fillets.length - 1; i >= 0; i--) {
      const p = this.fillets[i]; p.age += dt; const life = p.closing ? .36 : FILLET_LIFE;
      if (!p.hit && p.age >= (p.reduced ? 0 : FILLET_CONTACT)) {
        p.hit = true; for (const target of p.targets) this.impact(target, p.reduced);
        debug('visual.duong-tang.impact', { targets: p.targets.length, reduced: p.reduced });
      }
      if (p.age >= life) { this.paint.planes.release(p.mesh); this.fillets.splice(i, 1); continue; }
      p.mesh ??= this.paint.planes.acquire('fillet'); if (!p.mesh) continue;
      const state = filletState(p.age, p.reduced), frame = p.closing ? closingFilletFrame(p.age, p.reduced) : state.frame;
      this.paint.frame(p.mesh, 'fillet', frame);
      this.paint.place(p.mesh, 'fillet', p.at, p.radius / layout.fillet.firstHalfWidth, undefined, p.closing ? 0 : state.lift);
      p.mesh.visibility = p.closing ? Math.max(0, 1 - p.age / life) * .5 : state.alpha * .83;
    }
    for (let i = this.hits.length - 1; i >= 0; i--) {
      const p = this.hits[i]; p.age += dt;
      if (p.age >= .48) { this.paint.planes.release(p.mesh); this.hits.splice(i, 1); continue; }
      p.mesh ??= this.paint.planes.acquire('hit'); if (!p.mesh) continue;
      this.paint.frame(p.mesh, 'hit', hitFrame(p.age, p.reduced)); this.paint.place(p.mesh, 'hit', p.at, 2.25, undefined, .25);
      p.mesh.visibility = Math.min(1, (.48 - p.age) / .12);
    }
  }
  clear(): void { this.fillets.length = 0; this.hits.length = 0; this.paint.clear(); }
}


