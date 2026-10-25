import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { Tier3Art } from './visual-tier3-art.js';
import type { KitFxBank } from './visual-kit-fx-bank.js';
import { screenUp } from './visual-kit-billboard.js';
import { UL_CAPS, LANCE_CONTACT, ICE_HIT_LIFE, lancePose } from './visual-ung-long-timeline.js';
import { debug } from './debug.js';
import layout from './visual-ung-long-layout.json';
type IceKey = keyof typeof layout;
interface Strike { at?: Vector3; center?: Vector3; radius?: number; targets: Vector3[]; age: number; reduced: boolean; hit: boolean; lance?: Mesh }
interface Contact { at: Vector3; age: number; reduced: boolean; mesh?: Mesh }
interface Gust { at: Vector3; age: number; reduced: boolean; mesh?: Mesh }
/** A real pulse sweeps its true area once; local crystal hits never become a full-radius blast per enemy. */
export class BlizzardArt {
  readonly paint: Tier3Art<IceKey>; private strikes: Strike[] = []; private contacts: Contact[] = []; private gusts: Gust[] = [];
  constructor(private scene: Scene, private bank: KitFxBank) { this.paint = new Tier3Art(scene, 'ung-long', layout, ['vortex', 'lance', 'hit'], UL_CAPS.planes); }
  prepare(): void { this.paint.prepare(); }
  gust(at: Vector3, reduced: boolean): void { if (this.gusts.length < UL_CAPS.casts) this.gusts.push({ at: at.clone(), age: 0, reduced }); }
  pulse(at: Vector3 | undefined, center: Vector3 | undefined, radius: number | undefined, targets: readonly Vector3[], reduced: boolean): void {
    if (this.strikes.length >= UL_CAPS.strikes) return;
    this.strikes.push({ at: at?.clone(), center: center?.clone(), radius, targets: targets.slice(0, UL_CAPS.targets).map(p => p.clone()), age: 0, reduced, hit: false });
  }
  tick(dt: number): void {
    for (let i = this.strikes.length - 1; i >= 0; i--) {
      const p = this.strikes[i]; p.age += dt; const s = lancePose(p.age, p.reduced);
      if (!p.hit && p.age >= (p.reduced ? 0 : LANCE_CONTACT)) {
        p.hit = true;
        if (p.center && p.radius) this.bank.ring(p.center, p.radius, 'ice', { life: .38, fill: .035, rim: .28, hold: true, alpha: .4, reduced: p.reduced });
        for (const target of p.targets) {
          if (this.contacts.length < UL_CAPS.contacts) this.contacts.push({ at: target.clone(), age: 0, reduced: p.reduced });
          this.bank.ring(target, .52, 'ice', { life: .5, fill: .16, rim: .24, hold: true, reduced: p.reduced, alpha: .52 });
          if (!p.reduced) this.bank.spray('frost').ring(target, .18, 5, .12, 1.5, 2.3);
        }
        debug('visual.ung-long.pulse.contact', { targets: p.targets.length, area: Boolean(p.center && p.radius), reduced: p.reduced });
      }
      if (p.age >= LANCE_CONTACT + ICE_HIT_LIFE) { this.paint.planes.release(p.lance); this.strikes.splice(i, 1); continue; }
      if (s.visible && p.at) { p.lance ??= this.paint.planes.acquire('lance'); if (p.lance) this.placeLance(p.lance, p.at, s.head); }
      else { this.paint.planes.release(p.lance); p.lance = undefined; }
    }
    for (let i = this.contacts.length - 1; i >= 0; i--) {
      const p = this.contacts[i]; p.age += dt;
      if (p.age >= ICE_HIT_LIFE) { this.paint.planes.release(p.mesh); this.contacts.splice(i, 1); continue; }
      p.mesh ??= this.paint.planes.acquire('hit'); if (!p.mesh) continue;
      this.paint.frame(p.mesh, 'hit', p.reduced ? 2 : Math.min(7, Math.floor(p.age / ICE_HIT_LIFE * 8)));
      const scale = p.reduced ? 1 : 1 - Math.max(0, p.age - .36) / .26 * .35;
      this.paint.place(p.mesh, 'hit', p.at, 1.7 * scale, 1.7 * scale, .04); p.mesh.visibility = Math.max(0, 1 - Math.max(0, p.age - .4) / .22);
    }
    for (let i = this.gusts.length - 1; i >= 0; i--) {
      const p = this.gusts[i]; p.age += dt;
      if (p.age >= .36) { this.paint.planes.release(p.mesh); this.gusts.splice(i, 1); continue; }
      p.mesh ??= this.paint.planes.acquire('wings'); if (!p.mesh) continue;
      this.paint.frame(p.mesh, 'wings', p.reduced ? 2 : Math.min(7, 4 + Math.floor(p.age / .36 * 4)));
      const scale = p.reduced ? 1 : 1 - p.age / .36 * .25;
      this.paint.place(p.mesh, 'wings', p.at, 5.2 * scale, 5.2 * scale, .2); p.mesh.visibility = .8 * (1 - p.age / .36);
    }
  }
  private placeLance(mesh: Mesh, at: Vector3, head: number): void {
    const x = new Vector3(0, -1, 0), across = Vector3.Cross(x, screenUp(this.scene));
    if (across.lengthSquared() < 1e-6) { mesh.visibility = 0; return; } across.normalize();
    mesh.billboardMode = Mesh.BILLBOARDMODE_NONE; mesh.rotationQuaternion = null;
    mesh.rotation.copyFrom(Vector3.RotationFromAxis(x, across, Vector3.Cross(x, across)));
    // Source head is +U. Tip falls toward the actual focus; native cross-section is never stretched.
    const length = 3.4; mesh.position.copyFrom(at).addInPlace(new Vector3(0, head + length / 2, 0));
    mesh.scaling.set(length, length / layout.lance.aspect, 1); mesh.visibility = .94;
  }
  clear(): void { this.strikes.length = this.contacts.length = this.gusts.length = 0; this.paint.clear(); }
}
