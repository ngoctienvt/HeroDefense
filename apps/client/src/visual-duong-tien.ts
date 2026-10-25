import type { Scene } from '@babylonjs/core/scene.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import type { HeroVfx, AbilityExtra } from './visual-kit-hero.js';
import { KitFxBank } from './visual-kit-fx-bank.js';
import { KitFlipbooks } from './visual-kit-flipbooks.js';
import { HeavenArt } from './visual-duong-tien-art.js';
import { HeavenCharge } from './visual-duong-tien-charge.js';
import { WarGodForm } from './visual-duong-tien-form.js';
import { DUONG_TIEN as D, DTN_CAPS, heavenDirection } from './visual-duong-tien-timeline.js';
import { debug } from './debug.js';
const finite = (p: Vector3): boolean => [p.x, p.y, p.z].every(Number.isFinite);
const lockedAim = (event: GameEvent, at: Vector3): Vector3 => event.x !== undefined && event.z !== undefined && Number.isFinite(event.x) && Number.isFinite(event.z)
  ? new Vector3(event.x, 0, event.z) : at;
export class VisualDuongTien implements HeroVfx {
  readonly heroId = D.id; private bank: KitFxBank; private art: HeavenArt; private charge: HeavenCharge; private form: WarGodForm;
  private previews: { id: string; at: Vector3; remaining: number; reduced: boolean }[] = []; private pending = 0; private serial = 0;
  constructor(scene: Scene) {
    this.bank = new KitFxBank(scene, new KitFlipbooks(scene)); this.art = new HeavenArt(scene, this.bank);
    this.charge = new HeavenCharge(scene, this.art); this.form = new WarGodForm(this.art);
    debug('visual.duong-tien.layout', { length: D.length, width: D.width, ...DTN_CAPS });
  }
  prepare(): void { this.art.prepare(); }
  cast(event: GameEvent, at: Vector3, reduced: boolean, origin?: Vector3): boolean {
    if (event.kind !== 'cast' || event.skillId !== D.skill) return false;
    this.prepare(); const dir = heavenDirection(event.direction, origin, lockedAim(event, at)), windup = event.windup;
    if (event.source && origin && finite(origin) && dir && windup !== undefined && Number.isFinite(windup) && windup > 0)
      this.charge.begin(event.source, origin, dir, windup, reduced);
    debug('visual.duong-tien.cast', { windup, directional: Boolean(dir), reduced }); return true;
  }
  ability(event: GameEvent, origin: Vector3, at: Vector3, reduced: boolean, extra?: AbilityExtra): boolean {
    if (event.kind !== 'ability' || event.skillId !== D.skill) return false;
    this.prepare(); if (event.source) this.charge.cancel(event.source);
    const from = extra?.hasOrigin === true && finite(origin) ? origin : undefined;
    const dir = heavenDirection(event.direction, from, lockedAim(event, at)), targets = extra?.targets.filter(finite) ?? [];
    this.art.strike(from, dir, targets, reduced);
    debug('visual.duong-tien.resolve', { targets: targets.length, hasOrigin: Boolean(from), directional: Boolean(dir), reduced }); return true;
  }
  /** Root calls only for own h00U berserk sourceSkillId, passing real remaining; other-source buffs never count. */
  markForm(id: string, at: Vector3, remaining: number, reduced: boolean): void { this.prepare(); this.form.mark(id, at, remaining, reduced); }
  replay(origin: Vector3, aim: Vector3, reduced: boolean, kind = 'ultimate'): boolean {
    if (kind !== 'ultimate' || !finite(origin) || !finite(aim) || this.pending + this.previews.length >= DTN_CAPS.previews) return false;
    const dir = heavenDirection(undefined, origin, aim); if (!dir) return false;
    this.prepare(); const id = `heaven-preview-${this.serial++}`;
    const event: GameEvent = { id: -1, kind: 'ability', source: id, skillId: D.skill, direction: dir, x: aim.x, z: aim.z };
    this.cast({ ...event, kind: 'cast', windup: .25 }, aim, reduced, origin); this.pending++;
    this.bank.after(.25, () => {
      this.pending--; this.ability(event, origin, aim, reduced, { hasOrigin: true, targets: [3, 7, 11.5].map(n => origin.add(new Vector3(dir.x * n, 0, dir.z * n))) });
      this.previews.push({ id, at: origin.clone(), remaining: D.formLife, reduced });
    });
    debug('visual.duong-tien.replay', { syntheticTargets: true, reduced }); return true;
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

