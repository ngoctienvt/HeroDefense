import type { Scene } from '@babylonjs/core/scene.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import type { HeroVfx, AbilityExtra } from './visual-kit-hero.js';
import { debug } from './debug.js';
import { KitFxBank } from './visual-kit-fx-bank.js';
import { KitFlipbooks } from './visual-kit-flipbooks.js';
import { unitDirection } from './visual-kit-timeline.js';
import { ChungQuyArt } from './visual-chung-quy-art.js';
import { ChungQuyCharge } from './visual-chung-quy-charge.js';
import { CHUNG_QUY as C, CQ_CAPS } from './visual-chung-quy-timeline.js';
const finite = (p: Vector3): boolean => [p.x, p.y, p.z].every(Number.isFinite);
export class VisualChungQuy implements HeroVfx {
  readonly heroId = C.id; private bank: KitFxBank; private pieces: ChungQuyArt; private charge: ChungQuyCharge;
  private preview?: { at: Vector3; age: number; reduced: boolean };
  constructor(scene: Scene) {
    this.bank = new KitFxBank(scene, new KitFlipbooks(scene)); this.pieces = new ChungQuyArt(scene, this.bank);
    this.charge = new ChungQuyCharge(scene, this.pieces);
    debug('visual.chung-quy.layout', { radius: C.radius, seconds: C.seconds, ...CQ_CAPS });
  }
  prepare(): void { this.pieces.prepare(); }
  cast(event: GameEvent, _at: Vector3, reduced: boolean, origin?: Vector3): boolean {
    if (event.kind !== 'cast' || event.skillId !== C.skill) return false;
    this.prepare(); const { x, z, windup } = event;
    if (!event.source || !origin || !finite(origin) || x === undefined || z === undefined || windup === undefined
      || ![x, z, windup].every(Number.isFinite) || windup <= 0) return true;
    this.charge.begin(event.source, origin, new Vector3(x, 0, z), windup, reduced);
    debug('visual.chung-quy.cast', { windup, radius: C.radius, reduced }); return true;
  }
  ability(event: GameEvent, origin: Vector3, _at: Vector3, reduced: boolean, extra?: AbilityExtra): boolean {
    if (event.kind !== 'ability' || event.skillId !== C.skill) return false;
    this.prepare(); if (event.source) this.charge.cancel(event.source);
    const { x, z } = event;
    if (x === undefined || z === undefined || ![x, z].every(Number.isFinite)) {
      debug('visual.chung-quy.skip', { reason: 'missing-confirmed-aim' }); return true;
    }
    const from = extra?.hasOrigin === true && finite(origin) ? origin : undefined;
    const direction = from ? unitDirection(event, from) : undefined;
    const vector = direction && [direction.x, direction.z].every(Number.isFinite) ? new Vector3(direction.x, 0, direction.z) : undefined;
    const targets = extra?.targets.filter(finite) ?? [];
    this.pieces.launch(from, new Vector3(x, 0, z), vector, targets, reduced);
    debug('visual.chung-quy.resolve', { targets: targets.length, hasDirection: Boolean(vector), reduced }); return true;
  }
  markGround(id: string, at: Vector3, radius: number, remaining: number, reduced: boolean): void {
    if (!finite(at) || ![radius, remaining].every(Number.isFinite) || radius <= 0 || remaining <= 0) return;
    this.prepare(); this.pieces.mark(id, at, radius, remaining, reduced);
  }
  replay(origin: Vector3, at: Vector3, reduced: boolean, kind = 'ultimate'): boolean {
    if (kind !== 'ultimate' || !finite(origin) || !finite(at)) return false;
    this.prepare(); const event: GameEvent = { id: -1, source: 'chung-quy-preview', skillId: C.skill, kind: 'ability', x: at.x, z: at.z };
    this.cast({ ...event, kind: 'cast', windup: .25 }, at, reduced, origin);
    this.bank.after(.25, () => {
      // Client-only synthetic victim positions; never written to the server or snapshot.
      const targets = [at.add(new Vector3(-1, 0, .4)), at.add(new Vector3(1.2, 0, -.7))];
      this.ability(event, origin, at, reduced, { targets, hasOrigin: true }); this.preview = { at: at.clone(), age: 0, reduced };
    });
    debug('visual.chung-quy.replay', { syntheticTargets: true, syntheticGround: true, reduced }); return true;
  }
  tick(dt: number, time: number): void {
    if (this.preview) {
      const p = this.preview; p.age += dt;
      if (p.age < C.seconds) this.markGround('chung-quy-preview', p.at, C.radius, C.seconds - p.age, p.reduced);
      else this.preview = undefined;
    }
    this.charge.tick(dt, time); this.pieces.tick(dt); this.bank.tick(dt, time);
  }
  clear(): void { this.preview = undefined; this.charge.clear(); this.pieces.clear(); this.bank.clear(); }
}
