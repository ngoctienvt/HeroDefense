import type { Scene } from '@babylonjs/core/scene.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import type { AbilityExtra, HeroVfx } from './visual-kit-hero.js';
import { KitFxBank } from './visual-kit-fx-bank.js';
import { KitFlipbooks } from './visual-kit-flipbooks.js';
import { FoxArt } from './visual-dat-ky-art.js';
import { FoxCharge } from './visual-dat-ky-charge.js';
import { DAT_KY as D, DK_CAPS } from './visual-dat-ky-timeline.js';
import { debug } from './debug.js';
const finite = (at: Vector3): boolean => [at.x, at.y, at.z].every(Number.isFinite);
export class VisualDatKy implements HeroVfx {
  readonly heroId = D.id; private bank: KitFxBank; private art: FoxArt; private charge: FoxCharge; private pending = 0; private serial = 0;
  constructor(scene: Scene) {
    this.bank = new KitFxBank(scene, new KitFlipbooks(scene)); this.art = new FoxArt(scene, this.bank); this.charge = new FoxCharge(scene, this.art);
    debug('visual.dat-ky.layout', { records: D.records, ...DK_CAPS });
  }
  prepare(): void { this.art.prepare(); }
  cast(event: GameEvent, _at: Vector3, reduced: boolean, origin?: Vector3): boolean {
    if (event.kind !== 'cast' || event.skillId !== D.skill) return false;
    this.prepare(); const windup = event.windup;
    if (event.source && origin && finite(origin) && windup !== undefined && Number.isFinite(windup) && windup > 0) this.charge.begin(event.source, origin, windup, reduced);
    debug('visual.dat-ky.cast', { windup, hasOrigin: Boolean(origin && finite(origin)), reduced }); return true;
  }
  ability(event: GameEvent, origin: Vector3, _at: Vector3, reduced: boolean, extra?: AbilityExtra): boolean {
    if (event.kind !== 'ability' || event.skillId !== D.skill) return false;
    this.prepare(); if (event.source) this.charge.cancel(event.source);
    const from = extra?.hasOrigin === true && finite(origin) ? origin : undefined, targets = extra?.targets.filter(finite) ?? [];
    this.art.chain(from, targets, reduced);
    debug('visual.dat-ky.resolve', { targets: targets.length, hasOrigin: Boolean(from), reduced }); return true;
  }
  replay(origin: Vector3, aim: Vector3, reduced: boolean, kind = 'ultimate'): boolean {
    if (kind !== 'ultimate' || !finite(origin) || !finite(aim) || this.pending >= DK_CAPS.casts) return false;
    this.prepare(); const event: GameEvent = { id: -1, kind: 'ability', source: `fox-preview-${this.serial++}`, skillId: D.skill, x: aim.x, z: aim.z };
    this.cast({ ...event, kind: 'cast', windup: .25 }, aim, reduced, origin); this.pending++;
    this.bank.after(.25, () => {
      this.pending--; this.ability(event, origin, aim, reduced, { hasOrigin: true,
        targets: Array.from({ length: D.records }, (_, i) => aim.add(new Vector3(Math.cos(i * 2.1) * 3.4, 0, Math.sin(i * 2.1) * 2.8))) });
    });
    debug('visual.dat-ky.replay', { syntheticTargets: true, reduced }); return true;
  }
  tick(dt: number, time: number): void { this.charge.tick(dt, time); this.art.tick(dt); this.bank.tick(dt, time); }
  clear(): void { this.pending = 0; this.charge.clear(); this.art.clear(); this.bank.clear(); }
}
