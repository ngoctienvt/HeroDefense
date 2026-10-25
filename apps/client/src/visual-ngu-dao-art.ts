import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { Tier3Art } from './visual-tier3-art.js';
import type { KitFxBank } from './visual-kit-fx-bank.js';
import { NGU_DAO as N, ND_CAPS, WHEEL_CONTACT, WHEEL_LIFE, samsaraWheel } from './visual-ngu-dao-timeline.js';
import { motion } from './visual-kit-timeline.js';
import { debug } from './debug.js';
import layout from './visual-ngu-dao-layout.json';
export type SoulArtKey = keyof typeof layout | 'wheelAction';
interface Wheel { at: Vector3; targets: readonly Vector3[]; age: number; reduced: boolean; hit: boolean; mesh?: Mesh; ground?: Mesh }
interface Receipt { at: Vector3; age: number; reduced: boolean; ally: boolean; mesh?: Mesh }
export class SamsaraArt {
  readonly paint: Tier3Art<SoulArtKey>; private wheels: Wheel[] = []; private receipts: Receipt[] = [];
  constructor(scene: Scene, private bank: KitFxBank) { this.paint = new Tier3Art(scene, 'ngu-dao', { ...layout, wheelAction: layout.wheel }, ['chain', 'pulse', 'wheelAction'], ND_CAPS.planes); }
  prepare(): void {
    for (const key of Object.keys(layout) as (keyof typeof layout)[]) this.paint.planes.prepare(key, `/assets/vfx-ngu-dao-${key}.webp`,
      { foreground: key === 'chain' || key === 'pulse', depthAlways: key !== 'chain' && key !== 'pulse' });
    this.paint.planes.prepare('wheelAction', '/assets/vfx-ngu-dao-wheel.webp', { foreground: true });
  }
  resolve(at: Vector3, enemies: readonly Vector3[], allies: readonly Vector3[], reduced: boolean): void {
    if (this.wheels.length < ND_CAPS.wheels) this.wheels.push({ at: at.clone(), targets: enemies.slice(0, N.targets).map(p => p.clone()), age: 0, reduced, hit: false });
    this.support(allies, reduced);
  }
  support(allies: readonly Vector3[], reduced: boolean): void { for (const ally of allies.slice(0, 24)) this.receipt(ally, true, reduced); }
  contact(at: Vector3, reduced: boolean): void {
    this.receipt(at, false, reduced); this.bank.ring(at, .62, 'jade', { life: .52, fill: .18, rim: .4, hold: true, reduced, alpha: .65 });
    if (!reduced) this.bank.spray('jade').ring(at, .22, 8, .3, 1.5, 1.7);
  }
  private receipt(at: Vector3, ally: boolean, reduced: boolean): void { if (this.receipts.length < ND_CAPS.contacts) this.receipts.push({ at: at.clone(), age: 0, reduced, ally }); }
  tick(dt: number): void {
    for (let i = this.wheels.length - 1; i >= 0; i--) {
      const p = this.wheels[i]; p.age += dt;
      if (!p.hit && p.age >= (p.reduced ? 0 : WHEEL_CONTACT)) { p.hit = true; for (const target of p.targets) this.contact(target, p.reduced); debug('visual.ngu-dao.contact', { enemies: p.targets.length, reduced: p.reduced }); }
      if (p.age >= WHEEL_LIFE) { this.paint.planes.release(p.mesh); this.paint.planes.release(p.ground); this.wheels.splice(i, 1); continue; }
      const state = samsaraWheel(p.age, p.reduced); p.mesh ??= this.paint.planes.acquire('wheelAction');
      if (p.mesh) { this.paint.frame(p.mesh, 'wheelAction', state.frame); this.paint.place(p.mesh, 'wheelAction', p.at, 6.6 * state.scale, 6.6 * state.scale, .2); p.mesh.rotation.z = state.turn; p.mesh.visibility = state.alpha * .82; }
      if (p.hit) { p.ground ??= this.paint.planes.acquire('ground', true);
        if (p.ground) { this.paint.ground(p.ground, 'ground', p.at, N.radius * state.scale, state.turn); p.ground.visibility = state.alpha * .52; } }
    }
    for (let i = this.receipts.length - 1; i >= 0; i--) {
      const p = this.receipts[i]; p.age += dt;
      if (p.age >= .34) { this.paint.planes.release(p.mesh); this.receipts.splice(i, 1); continue; }
      const key = p.ally ? 'frenzy' : 'pulse'; p.mesh ??= this.paint.planes.acquire(key); if (!p.mesh) continue;
      const scale = p.reduced ? 1 : 1 - motion.settle(p.age / .34) * .4;
      this.paint.place(p.mesh, key, p.at, (p.ally ? .85 : 1.3) * scale, p.ally ? .85 : .75, p.ally ? 1.3 : .75);
      if (p.ally) this.paint.frame(p.mesh, 'frenzy', p.reduced ? 3 : Math.min(15, 4 + Math.floor(p.age / .34 * 12)));
      else this.paint.planes.mapUvs(p.mesh, base => base.map((v, k) => k % 2 === 0 ? .6 + v * .4 : v));
      p.mesh.visibility = Math.max(0, 1 - p.age / .34);
    }
  }
  clear(): void { this.wheels.length = 0; this.receipts.length = 0; this.paint.clear(); }
}
