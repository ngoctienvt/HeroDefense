import type { Scene } from '@babylonjs/core/scene.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import type { AbilityExtra, HeroVfx } from './visual-kit-hero.js';
import { KitFxBank } from './visual-kit-fx-bank.js';
import { KitFlipbooks } from './visual-kit-flipbooks.js';
import { DewArt } from './visual-xich-tung-tu-art.js';
import { DewGourd } from './visual-xich-tung-tu-gourd.js';
import { DewCharge } from './visual-xich-tung-tu-charge.js';
import { DewFire } from './visual-xich-tung-tu-fire.js';
import { XICH as X, XT_CAPS } from './visual-xich-tung-tu-timeline.js';
import { debug } from './debug.js';
const finite = (at: Vector3): boolean => [at.x, at.y, at.z].every(Number.isFinite);
interface Preview { id: string; age: number; targets: Vector3[]; reduced: boolean }
export class VisualXichTungTu implements HeroVfx {
  readonly heroId = X.id; private bank: KitFxBank; private art: DewArt; private gourd: DewGourd; private charge: DewCharge; private fire: DewFire;
  private pending = 0; private serial = 0; private previews: Preview[] = [];
  constructor(scene: Scene) {
    this.bank = new KitFxBank(scene, new KitFlipbooks(scene)); this.art = new DewArt(scene, this.bank); this.gourd = new DewGourd(scene);
    this.charge = new DewCharge(scene, this.gourd); this.fire = new DewFire(scene, this.art); debug('visual.xich-tung-tu.layout', { recipients: X.recipients, ...XT_CAPS });
  }
  prepare(): void { this.art.prepare(); this.gourd.prepare(); }
  cast(event: GameEvent, _at: Vector3, reduced: boolean, origin?: Vector3): boolean {
    if (event.kind !== 'cast' || event.skillId !== X.skill) return false;
    this.prepare(); const windup = event.windup;
    if (event.source && origin && finite(origin) && windup !== undefined && Number.isFinite(windup) && windup > 0) this.charge.begin(event.source, origin, windup, reduced);
    debug('visual.xich-tung-tu.cast', { windup, hasOrigin: Boolean(origin && finite(origin)), reduced }); return true;
  }
  ability(event: GameEvent, origin: Vector3, _at: Vector3, reduced: boolean, extra?: AbilityExtra): boolean {
    if (event.kind !== 'ability' || event.skillId !== X.skill) return false;
    this.prepare(); const from = extra?.hasOrigin === true && finite(origin) ? origin : undefined;
    if (event.source) this.charge.resolve(event.source, from, reduced);
    const recipients = extra?.supportTargets?.filter(finite).slice(0, X.recipients) ?? [];
    this.art.receive(from, recipients, reduced); debug('visual.xich-tung-tu.resolve', { recipients: recipients.length, hasOrigin: Boolean(from), reduced }); return true;
  }
  markFire(id: string, at: Vector3, remaining: number, reduced: boolean): void { this.prepare(); this.fire.mark(id, at, remaining, reduced); }
  replay(origin: Vector3, aim: Vector3, reduced: boolean, kind = 'ultimate'): boolean {
    if (kind !== 'ultimate' || !finite(origin) || !finite(aim) || this.pending + this.previews.length >= XT_CAPS.casts) return false;
    const id = `dew-preview-${this.serial++}`, targets = [0, 1, 2, 3].map(i => aim.add(new Vector3(Math.cos(i * 1.7) * 2.1, 0, Math.sin(i * 1.7) * 2.1)));
    const event: GameEvent = { id: -1, source: id, kind: 'ability', skillId: X.skill, x: aim.x, z: aim.z };
    this.cast({ ...event, kind: 'cast', windup: .25 }, aim, reduced, origin); this.pending++;
    this.bank.after(.25, () => { this.pending--; this.ability(event, origin, aim, reduced, { hasOrigin: true, targets: [], supportTargets: targets }); this.previews.push({ id, targets, age: 0, reduced }); });
    debug('visual.xich-tung-tu.replay', { syntheticTargets: true, reduced }); return true;
  }
  tick(dt: number, time: number): void {
    for (let i = this.previews.length - 1; i >= 0; i--) { const p = this.previews[i]; p.age += dt; if (p.age >= 5) { this.previews.splice(i, 1); continue; }
      p.targets.forEach((at, j) => this.markFire(`${p.id}:${j}`, at, 5 - p.age, p.reduced)); }
    this.charge.tick(dt, time); this.fire.tick(dt); this.art.tick(dt); this.bank.tick(dt, time);
  }
  clear(): void { this.pending = 0; this.previews.length = 0; this.charge.clear(); this.fire.clear(); this.art.clear(); this.bank.clear(); debug('visual.xich-tung-tu.clear', {}); }
}
