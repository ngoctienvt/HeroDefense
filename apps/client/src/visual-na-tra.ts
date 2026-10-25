import type { Scene } from '@babylonjs/core/scene.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import type { AbilityExtra, HeroVfx } from './visual-kit-hero.js';
import { KitFxBank } from './visual-kit-fx-bank.js';
import { KitFlipbooks } from './visual-kit-flipbooks.js';
import { NaTraArt } from './visual-na-tra-art.js';
import { NaTraCharge } from './visual-na-tra-charge.js';
import { NaTraForm } from './visual-na-tra-form.js';
import { NA_TRA as N, NT_CAPS } from './visual-na-tra-timeline.js';
import { debug } from './debug.js';
const finite = (at: Vector3): boolean => [at.x, at.y, at.z].every(Number.isFinite);
export class VisualNaTra implements HeroVfx {
  readonly heroId = N.id; private bank: KitFxBank; private art: NaTraArt; private charge: NaTraCharge; private form: NaTraForm;
  private previews: { id: string; at: Vector3; remaining: number; reduced: boolean }[] = []; private pending = 0; private serial = 0;
  constructor(scene: Scene) {
    this.bank = new KitFxBank(scene, new KitFlipbooks(scene)); this.art = new NaTraArt(scene, this.bank);
    this.charge = new NaTraCharge(scene, this.art); this.form = new NaTraForm(scene);
    debug('visual.na-tra.layout', { records: N.records, candidateRadius: N.candidateRadius, ...NT_CAPS });
  }
  prepare(): void { this.art.prepare(); this.form.prepare(); }
  cast(event: GameEvent, _at: Vector3, reduced: boolean, origin?: Vector3): boolean {
    if (event.kind !== 'cast' || event.skillId !== N.skill) return false;
    this.prepare(); const windup = event.windup;
    if (event.source && origin && finite(origin) && windup !== undefined && Number.isFinite(windup) && windup > 0) this.charge.begin(event.source, origin, windup, reduced);
    debug('visual.na-tra.cast', { windup, hasOrigin: Boolean(origin && finite(origin)), reduced }); return true;
  }
  ability(event: GameEvent, origin: Vector3, _at: Vector3, reduced: boolean, extra?: AbilityExtra): boolean {
    if (event.kind !== 'ability' || event.skillId !== N.skill) return false;
    this.prepare(); if (event.source) this.charge.cancel(event.source);
    const from = extra?.hasOrigin === true && finite(origin) ? origin : undefined;
    // Preserve ordered records, including repeated positions; there is no visual-only recipient or aim blast.
    const records = extra?.targets.filter(finite) ?? []; this.art.chain(from, records, reduced);
    debug('visual.na-tra.resolve', { records: records.length, hasOrigin: Boolean(from), reduced }); return true;
  }
  markForm(id: string, at: Vector3, remaining: number, reduced: boolean): void { this.prepare(); this.form.mark(id, at, remaining, reduced); }
  replay(origin: Vector3, aim: Vector3, reduced: boolean, kind = 'ultimate'): boolean {
    if (kind !== 'ultimate' || !finite(origin) || !finite(aim) || this.pending + this.previews.length >= NT_CAPS.previews) return false;
    this.prepare(); const id = `nezha-preview-${this.serial++}`, event: GameEvent = { id: -1, kind: 'ability', source: id, skillId: N.skill, x: aim.x, z: aim.z };
    this.cast({ ...event, kind: 'cast', windup: .25 }, aim, reduced, origin); this.pending++;
    this.bank.after(.25, () => {
      this.pending--; const points = [aim.add(new Vector3(-1.5, 0, -.5)), aim.add(new Vector3(1.7, 0, .7)), aim.add(new Vector3(.5, 0, -1.8))];
      this.ability(event, origin, aim, reduced, { hasOrigin: true, targets: Array.from({ length: N.records }, (_, i) => points[i % points.length]) });
      this.previews.push({ id, at: origin.clone(), remaining: N.formLife, reduced });
    });
    debug('visual.na-tra.replay', { syntheticTargets: true, repeatedRecords: true, reduced }); return true;
  }
  tick(dt: number, time: number): void {
    for (let i = this.previews.length - 1; i >= 0; i--) {
      const p = this.previews[i]; p.remaining -= dt;
      if (p.remaining <= 0) this.previews.splice(i, 1); else this.form.mark(p.id, p.at, p.remaining, p.reduced);
    }
    this.charge.tick(dt, time); this.form.tick(dt); this.art.tick(dt); this.bank.tick(dt, time);
  }
  clear(): void { this.pending = 0; this.previews.length = 0; this.charge.clear(); this.form.clear(); this.art.clear(); this.bank.clear(); }
}
