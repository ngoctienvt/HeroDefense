import type { Scene } from '@babylonjs/core/scene.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import type { HeroVfx, AbilityExtra } from './visual-kit-hero.js';
import { KitFxBank } from './visual-kit-fx-bank.js';
import { KitFlipbooks } from './visual-kit-flipbooks.js';
import { unitDirection } from './visual-kit-timeline.js';
import { DragonArt } from './visual-bat-bo-thien-long-art.js';
import { DragonCharge } from './visual-bat-bo-thien-long-charge.js';
import { DragonHaste } from './visual-bat-bo-thien-long-haste.js';
import { THIEN_LONG as T, BT_CAPS, type DragonDirection } from './visual-bat-bo-thien-long-timeline.js';
import { debug } from './debug.js';
const finite = (p: Vector3): boolean => [p.x, p.y, p.z].every(Number.isFinite);
function direction(event: GameEvent, origin: Vector3): DragonDirection | undefined {
  const d = unitDirection(event, origin); return d && Number.isFinite(d.x) && Number.isFinite(d.z) ? d : undefined;
}
interface Preview { id: string; at: Vector3; age: number; reduced: boolean }
export class VisualBatBoThienLong implements HeroVfx {
  readonly heroId = T.id; private bank: KitFxBank; private art: DragonArt; private charge: DragonCharge; private haste: DragonHaste;
  private pending = 0; private serial = 0; private previews: Preview[] = [];
  constructor(scene: Scene) {
    this.bank = new KitFxBank(scene, new KitFlipbooks(scene)); this.art = new DragonArt(scene, this.bank); this.charge = new DragonCharge(scene, this.art); this.haste = new DragonHaste(scene, this.art);
    debug('visual.bat-bo-thien-long.layout', { length: T.length, width: T.width, ...BT_CAPS });
  }
  prepare(): void { this.art.prepare(); }
  cast(event: GameEvent, _at: Vector3, reduced: boolean, origin?: Vector3): boolean {
    if (event.kind !== 'cast' || event.skillId !== T.skill) return false;
    this.prepare(); const windup = event.windup, d = origin && finite(origin) ? direction(event, origin) : undefined;
    if (event.source && origin && d && windup !== undefined && Number.isFinite(windup) && windup > 0) this.charge.begin(event.source, origin, d, windup, reduced);
    debug('visual.bat-bo-thien-long.cast', { windup, hasDirection: Boolean(d), reduced }); return true;
  }
  ability(event: GameEvent, origin: Vector3, _at: Vector3, reduced: boolean, extra?: AbilityExtra): boolean {
    if (event.kind !== 'ability' || event.skillId !== T.skill) return false;
    this.prepare(); if (event.source) this.charge.cancel(event.source);
    const from = extra?.hasOrigin === true && finite(origin) ? origin : undefined, d = from ? direction(event, from) : undefined;
    const targets = extra?.targets.filter(finite) ?? []; this.art.fire(from, d, targets, reduced);
    debug('visual.bat-bo-thien-long.resolve', { targets: targets.length, hasOrigin: Boolean(from), hasDirection: Boolean(d), reduced }); return true;
  }
  markHaste(id: string, at: Vector3, remaining: number, reduced: boolean): void { this.prepare(); this.haste.mark(id, at, remaining, reduced); }
  replay(origin: Vector3, aim: Vector3, reduced: boolean, kind = 'ultimate'): boolean {
    if (kind !== 'ultimate' || !finite(origin) || !finite(aim) || this.pending + this.previews.length >= BT_CAPS.casts) return false;
    const id = `heavenly-dragon-preview-${this.serial++}`, event: GameEvent = { id: -1, kind: 'ability', source: id, skillId: T.skill, x: aim.x, z: aim.z }, d = direction(event, origin); if (!d) return false;
    const targets = [2.5, 5.5, 8.5, 12].map((distance, i) => origin.add(new Vector3(d.x * distance - d.z * (i % 2 ? .8 : -.8), 0, d.z * distance + d.x * (i % 2 ? .8 : -.8))));
    this.cast({ ...event, kind: 'cast', windup: .25 }, aim, reduced, origin); this.pending++;
    this.bank.after(.25, () => { this.pending--; this.ability(event, origin, aim, reduced, { hasOrigin: true, targets }); this.previews.push({ id, at: origin.clone(), age: 0, reduced }); });
    debug('visual.bat-bo-thien-long.replay', { syntheticTargets: true, reduced }); return true;
  }
  tick(dt: number, time: number): void {
    for (let i = this.previews.length - 1; i >= 0; i--) { const p = this.previews[i]; p.age += dt; if (p.age >= 4) { this.previews.splice(i, 1); continue; } this.markHaste(p.id, p.at, 4 - p.age, p.reduced); }
    this.charge.tick(dt, time); this.haste.tick(dt); this.art.tick(dt, time); this.bank.tick(dt, time);
  }
  clear(): void { this.pending = 0; this.previews.length = 0; this.charge.clear(); this.haste.clear(); this.art.clear(); this.bank.clear(); debug('visual.bat-bo-thien-long.clear', {}); }
}
