import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { debug } from './debug.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import type { HeroVfx, AbilityExtra } from './visual-kit-hero.js';
import { KitFxBank } from './visual-kit-fx-bank.js';
import { KitFlipbooks } from './visual-kit-flipbooks.js';
import { createGroundLayer, LayerPool, type Layer } from './visual-kit-layers.js';
import { LongVuongArt } from './visual-long-vuong-art.js';
import { LongVuongGround } from './visual-long-vuong-ground.js';
import { LongVuongWave } from './visual-long-vuong-wave.js';
import { LONG_VUONG as L, waterCharge, waterDirection, waterStrikeDelay, waterTargetSample } from './visual-long-vuong-timeline.js';

type Charge = { source: string; at: Vector3; age: number; windup: number; reduced: boolean; lane?: Layer; pearl?: Mesh };
type Hit = { at: Vector3; age: number; reduced: boolean; fired: boolean; mesh?: Mesh };
type Preview = { origin: Vector3; at: Vector3; age: number; fired: boolean; reduced: boolean };

/** h00Q ultimate only. Damage, conditional freeze and knockback remain entirely on the server. */
export class VisualLongVuong implements HeroVfx {
  readonly heroId = L.id;
  private art: LongVuongArt;
  private bank: KitFxBank;
  private wave: LongVuongWave;
  private ground: LongVuongGround;
  private chargePool: LayerPool;
  private charges: Charge[] = [];
  private hits: Hit[] = [];
  private preview?: Preview;
  constructor(scene: Scene) {
    this.art = new LongVuongArt(scene); this.bank = new KitFxBank(scene, new KitFlipbooks(scene));
    this.wave = new LongVuongWave(scene, this.art, this.bank); this.ground = new LongVuongGround(scene, this.art);
    let serial = 0;
    this.chargePool = new LayerPool(() => createGroundLayer(scene, 'kitLink', 'longvuong', `long-vuong-charge-${serial++}`), 8, 'long-vuong-charge');
    debug('visual.long-vuong.layout', { length: L.length, width: L.width, waveCap: 4, targetCap: 24, planeCap: 112 });
  }
  prepare(): void { this.art.prepare(); }
  cast(event: GameEvent, at: Vector3, reduced: boolean, origin?: Vector3): boolean {
    if (event.kind !== 'cast' || event.skillId !== L.skill) return false;
    this.prepare();
    if (!event.source || typeof event.windup !== 'number' || !Number.isFinite(event.windup) || event.windup <= 0 || !origin) {
      debug('visual.long-vuong.cast.skip', { reason: 'missing-source-origin-or-windup' }); return true;
    }
    this.cancel(event.source);
    if (this.charges.length >= 8) return true;
    const dir = waterDirection(event, origin), lane = dir ? this.chargePool.acquire() : undefined;
    if (lane && dir) {
      lane.mesh.alphaIndex = GROUND_ALPHA_INDEX + 4;
      lane.mesh.position.set(origin.x + dir.x * L.length / 2, .06, origin.z + dir.z * L.length / 2);
      lane.mesh.rotation.y = -Math.atan2(dir.z, dir.x); lane.mesh.scaling.set(L.length, 1, L.width);
    }
    this.charges.push({ source: event.source, at: origin.clone(), age: 0, windup: event.windup, reduced, lane });
    debug('visual.long-vuong.cast', { eventId: event.id, windup: event.windup, direction: dir, reduced }); return true;
  }
  ability(event: GameEvent, origin: Vector3, at: Vector3, reduced: boolean, extra?: AbilityExtra): boolean {
    if (event.kind !== 'ability' || event.skillId !== L.skill) return false;
    this.prepare(); if (event.source) this.cancel(event.source);
    const dir = waterDirection(event, origin);
    if (dir && extra?.hasOrigin !== false) this.wave.start(origin, dir, reduced);
    else debug('visual.long-vuong.direction.skip', { eventId: event.id });
    for (const target of waterTargetSample(extra?.targets ?? [])) {
      if (this.hits.length >= 48) { debug('visual.long-vuong.cap', { layer: 'hit' }); break; }
      const delay = waterStrikeDelay(origin, target, extra?.hasOrigin === false ? undefined : dir, reduced);
      this.hits.push({ at: target.clone(), age: -delay, reduced, fired: false });
    }
    debug('visual.long-vuong.impact', { eventId: event.id, targets: extra?.targets.length ?? 0, direction: dir, reduced });
    return true;
  }
  markPool(id: string, at: Vector3, radius: number, remaining: number, reduced: boolean): void {
    this.prepare(); this.ground.mark(id, at, radius, remaining, reduced);
  }
  replay(origin: Vector3, at: Vector3, reduced: boolean): boolean {
    if (![origin.x, origin.z, at.x, at.z].every(Number.isFinite) || Vector3.Distance(origin, at) < .1) return false;
    this.prepare(); this.preview = { origin: origin.clone(), at: at.clone(), age: 0, fired: false, reduced };
    this.cast({ id: -1, kind: 'cast', source: 'long-vuong-preview', skillId: L.skill, x: at.x, z: at.z, windup: .25 }, at, reduced, origin);
    debug('visual.long-vuong.replay', { previewTargets: true }); return true;
  }
  tick(dt: number, time: number): void {
    this.tickPreview(dt);
    for (const charge of [...this.charges]) {
      charge.age += dt;
      if (charge.age > charge.windup + .3) { this.cancel(charge.source); continue; }
      const pose = waterCharge(charge.age, charge.windup, charge.reduced);
      charge.pearl ??= this.art.planes.acquire('pearl');
      if (charge.pearl) {
        this.art.frame(charge.pearl, 'pearl', pose.frame);
        this.art.place(charge.pearl, 'pearl', charge.at, 4.6 * pose.size, 4.6 * pose.size, charge.reduced ? 1.7 : 1.2 + pose.power);
        charge.pearl.visibility = pose.alpha;
      }
      if (charge.lane) {
        const m = charge.lane.material;
        m.setFloat('uTime', charge.reduced ? 0 : time); m.setFloat('uAlpha', pose.alpha * .6);
        m.setFloat('uHead', 1); m.setFloat('uTail', 0); m.setFloat('uTaper', 0);
        m.setFloat('uWave', charge.reduced ? 0 : .12 * pose.power);
      }
    }
    for (let i = this.hits.length - 1; i >= 0; i--) {
      const hit = this.hits[i]; hit.age += dt;
      if (hit.age < 0) continue;
      if (hit.age >= .5) { this.art.planes.release(hit.mesh); this.hits.splice(i, 1); continue; }
      if (!hit.fired) {
        hit.fired = true;
        if (!hit.reduced) this.bank.spray('longvuong').ring(hit.at, .25, 7, .4, 2, 3.5);
        this.bank.ring(hit.at, 1.1, 'longvuong', { life: .4, fill: .35, rim: .65, alpha: .5, reduced: hit.reduced });
      }
      hit.mesh ??= this.art.planes.acquire('hit');
      if (hit.mesh) {
        this.art.frame(hit.mesh, 'hit', hit.reduced ? 2 : Math.min(7, Math.floor(hit.age * 16)));
        this.art.place(hit.mesh, 'hit', hit.at, 3.2, 3.2); hit.mesh.visibility = Math.min(1, (.5 - hit.age) / .12);
      }
    }
    this.wave.tick(dt, time); this.ground.tick(dt, time); this.bank.tick(dt, time);
  }
  private tickPreview(dt: number): void {
    const p = this.preview; if (!p) return;
    p.age += dt;
    if (p.age >= .25 && !p.fired) {
      p.fired = true;
      const dir = waterDirection({ x: p.at.x, z: p.at.z }, p.origin);
      const targets = dir ? [2, 5, 8].map(d => p.origin.add(new Vector3(dir.x * d, 0, dir.z * d))) : [];
      this.ability({ id: -2, kind: 'ability', source: 'long-vuong-preview', skillId: L.skill, x: p.at.x, z: p.at.z },
        p.origin, p.at, p.reduced, { targets, hasOrigin: true });
    }
    // Synthetic preview only: mirrors tier3-combat's R5/4s. Live markers always use the snapshot.
    if (p.fired && p.age < 4.25) this.markPool('long-vuong-preview', p.at, 5, 4.25 - p.age, p.reduced);
    if (p.age >= 4.25) this.preview = undefined;
  }
  private cancel(source: string): void {
    this.charges = this.charges.filter(charge => {
      if (charge.source !== source) return true;
      if (charge.lane) this.chargePool.release(charge.lane); this.art.planes.release(charge.pearl); return false;
    });
  }
  clear(): void {
    this.preview = undefined; for (const charge of [...this.charges]) this.cancel(charge.source);
    this.hits.length = 0; this.wave.clear(); this.ground.clear(); this.art.clear(); this.bank.clear();
  }
}
