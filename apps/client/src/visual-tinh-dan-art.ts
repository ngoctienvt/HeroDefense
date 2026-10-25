import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { Tier3Art } from './visual-tier3-art.js';
import type { KitFxBank } from './visual-kit-fx-bank.js';
import { TINH as T, TD_CAPS, LOTUS_CONTACT, LOTUS_LIFE, lotusExit } from './visual-tinh-dan-timeline.js';
import { motion } from './visual-kit-timeline.js';
import { debug } from './debug.js';
import layout from './visual-tinh-dan-layout.json';
interface Flow { from: Vector3; to: Vector3; mesh?: Mesh }
interface Action { origin?: Vector3; flows: Flow[]; contacts: Vector3[]; age: number; hit: boolean; reduced: boolean; yaw: number; ground?: Mesh; hits: (Mesh | undefined)[]; aura?: Mesh }
export class LotusArt {
  readonly paint: Tier3Art<keyof typeof layout>; private actions: Action[] = [];
  constructor(scene: Scene, private bank: KitFxBank) { this.paint = new Tier3Art(scene, 'tinh-dan', layout, ['pull', 'hit'], TD_CAPS.planes); }
  prepare(): void { this.paint.prepare(); }
  resolve(origin: Vector3 | undefined, displacements: readonly { from: Vector3; to: Vector3 }[], allies: readonly Vector3[], reduced: boolean): void {
    if (this.actions.length >= TD_CAPS.actions) return;
    const flows = displacements.slice(0, TD_CAPS.flows).map(p => ({ from: p.from.clone(), to: p.to.clone() }));
    for (const flow of flows) if (!reduced && Vector3.DistanceSquared(flow.from, flow.to) > .001)
      this.bank.ribbon(flow.from, flow.to, 'gold', { life: LOTUS_CONTACT, width: .24, wave: .12, taper: .55, height: .18, maxSpan: 2.5, reduced });
    const contacts: Vector3[] = []; for (const p of flows) if (!contacts.some(q => Vector3.DistanceSquared(q, p.to) < .001)) contacts.push(p.to.clone());
    const delta = origin && contacts[0] ? contacts[0].subtract(origin) : undefined;
    this.actions.push({ origin: origin?.clone(), flows, contacts, age: 0, hit: false, reduced, yaw: delta && delta.lengthSquared() > .001 ? Math.atan2(delta.x, delta.z) : 0, hits: [] });
    for (const ally of allies.slice(0, 24)) this.bank.ring(ally, .46, 'gold', { life: .36, fill: .04, rim: .35, hold: true, reduced, alpha: .5 });
  }
  tick(dt: number): void {
    for (let i = this.actions.length - 1; i >= 0; i--) {
      const p = this.actions[i]; p.age += dt; const s = lotusExit(p.age, p.reduced);
      if (!p.hit && p.age >= (p.reduced ? 0 : LOTUS_CONTACT)) {
        p.hit = true;
        for (const at of p.contacts) { this.bank.ring(at, 1.35, 'gold', { life: .62, fill: .12, rim: .4, hold: true, reduced: p.reduced, alpha: .65 });
          if (!p.reduced) { this.bank.spray('longvuong').ring(at, .45, 10, .15, 1.5, 2.5); this.bank.spray('gold').ring(at, .25, 5, .2, 1.4, 1.8); } }
        debug('visual.tinh-dan.contact', { points: p.contacts.length, flows: p.flows.length, reduced: p.reduced });
      }
      if (p.age >= LOTUS_LIFE) { this.release(p); this.actions.splice(i, 1); continue; }
      for (const [index, flow] of p.flows.entries()) {
        if (p.hit && p.flows.slice(0, index).some(q => Vector3.DistanceSquared(q.to, flow.to) < .001)) { this.paint.planes.release(flow.mesh); flow.mesh = undefined; continue; }
        flow.mesh ??= this.paint.planes.acquire('pull'); if (!flow.mesh) continue;
        const t = p.reduced ? 1 : motion.launch(Math.min(1, p.age / LOTUS_CONTACT)), at = Vector3.Lerp(flow.from, flow.to, t);
        // Middle source frames contain crystal columns. Only clean water opening and loose-water exit are used.
        this.paint.frame(flow.mesh, 'pull', p.reduced ? 1 : p.hit ? 12 + Math.min(3, Math.floor((p.age - LOTUS_CONTACT) / (LOTUS_LIFE - LOTUS_CONTACT) * 4)) : Math.min(2, Math.floor(p.age / LOTUS_CONTACT * 3)));
        const size = (p.hit ? 1.7 : 1.4) * s.scale; this.paint.place(flow.mesh, 'pull', at, size, size, .05); flow.mesh.visibility = s.alpha * .8; }
      if (p.origin) { p.ground ??= this.paint.planes.acquire('ground', true);
        if (p.ground) { this.paint.ground(p.ground, 'ground', p.origin, T.radius * s.scale, p.yaw + s.turn); p.ground.visibility = s.alpha * .5; }
        p.aura ??= this.paint.planes.acquire('aura'); if (p.aura) { this.paint.frame(p.aura, 'aura', p.reduced ? 3 : Math.min(7, 4 + Math.floor(p.age / LOTUS_LIFE * 4))); this.paint.place(p.aura, 'aura', p.origin, 3.4 * s.scale, 3.4 * s.scale, 1.2); p.aura.visibility = s.alpha * .65; } }
      if (p.hit) p.contacts.forEach((at, j) => { p.hits[j] ??= this.paint.planes.acquire('hit'); const mesh = p.hits[j]; if (!mesh) return;
        this.paint.frame(mesh, 'hit', p.reduced ? 2 : Math.min(7, Math.floor(Math.max(0, p.age - LOTUS_CONTACT) / .6 * 8)));
        this.paint.place(mesh, 'hit', at, 3 * s.scale, 3 * s.scale, .05); mesh.visibility = s.alpha; });
    }
  }
  private release(p: Action): void { for (const f of p.flows) this.paint.planes.release(f.mesh); for (const mesh of p.hits) this.paint.planes.release(mesh); this.paint.planes.release(p.ground); this.paint.planes.release(p.aura); }
  clear(): void { this.actions.length = 0; this.paint.clear(); }
}
