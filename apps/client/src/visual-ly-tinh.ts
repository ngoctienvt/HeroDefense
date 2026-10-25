import type { Scene } from '@babylonjs/core/scene.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import type { HeroVfx, AbilityExtra } from './visual-kit-hero.js';
import { KitFxBank } from './visual-kit-fx-bank.js';
import { KitFlipbooks } from './visual-kit-flipbooks.js';
import { PagodaArt } from './visual-ly-tinh-art.js';
import { PagodaCharge } from './visual-ly-tinh-charge.js';
import { PagodaGuard } from './visual-ly-tinh-guard.js';
import { LY_TINH as L, LT_CAPS } from './visual-ly-tinh-timeline.js';
import { debug } from './debug.js';
const finite = (p: Vector3): boolean => [p.x, p.y, p.z].every(Number.isFinite);
const aimPoint = (event: GameEvent, fallback: Vector3): Vector3 | undefined => event.x !== undefined && event.z !== undefined && Number.isFinite(event.x) && Number.isFinite(event.z)
  ? new Vector3(event.x, 0, event.z) : finite(fallback) ? fallback.clone() : undefined;
export class VisualLyTinh implements HeroVfx {
  readonly heroId = L.id; private bank: KitFxBank; private art: PagodaArt; private charge: PagodaCharge; private guard: PagodaGuard; private pending = 0; private serial = 0;
  constructor(scene: Scene) {
    this.bank = new KitFxBank(scene, new KitFlipbooks(scene)); this.art = new PagodaArt(scene, this.bank);
    this.charge = new PagodaCharge(scene, this.art); this.guard = new PagodaGuard(scene, this.art, this.bank);
    debug('visual.ly-tinh.layout', { radius: L.radius, allyRange: L.allyRange, ...LT_CAPS });
  }
  prepare(): void { this.art.prepare(); }
  cast(event: GameEvent, at: Vector3, reduced: boolean, origin?: Vector3): boolean {
    if (event.kind !== 'cast' || event.skillId !== L.skill) return false;
    this.prepare(); const aim = aimPoint(event, at), windup = event.windup;
    if (event.source && aim && windup !== undefined && Number.isFinite(windup) && windup > 0)
      this.charge.begin(event.source, origin && finite(origin) ? origin : undefined, aim, windup, reduced);
    debug('visual.ly-tinh.cast', { windup, hasOrigin: Boolean(origin && finite(origin)), reduced }); return true;
  }
  ability(event: GameEvent, origin: Vector3, at: Vector3, reduced: boolean, extra?: AbilityExtra): boolean {
    if (event.kind !== 'ability' || event.skillId !== L.skill) return false;
    this.prepare(); if (event.source) this.charge.cancel(event.source);
    const from = extra?.hasOrigin === true && finite(origin) ? origin : undefined, aim = aimPoint(event, at);
    const enemies = extra?.targets.filter(finite) ?? [], allies = extra?.supportTargets?.filter(finite) ?? [];
    if (aim) this.art.descend(aim, enemies, reduced); this.guard.receive(from, allies, reduced);
    debug('visual.ly-tinh.resolve', { enemies: enemies.length, allies: allies.length, hasOrigin: Boolean(from), reduced }); return true;
  }
  replay(origin: Vector3, aim: Vector3, reduced: boolean, kind = 'ultimate'): boolean {
    if (kind !== 'ultimate' || !finite(origin) || !finite(aim) || this.pending >= LT_CAPS.casts) return false;
    this.prepare(); const event: GameEvent = { id: -1, kind: 'ability', source: `pagoda-preview-${this.serial++}`, skillId: L.skill, x: aim.x, z: aim.z };
    this.cast({ ...event, kind: 'cast', windup: .25 }, aim, reduced, origin); this.pending++;
    this.bank.after(.25, () => {
      this.pending--; this.ability(event, origin, aim, reduced, { hasOrigin: true,
        targets: [aim.add(new Vector3(-2, 0, .5)), aim.add(new Vector3(2, 0, -1))],
        supportTargets: [origin.add(new Vector3(-2, 0, 1)), origin.add(new Vector3(1.5, 0, -1.8))] });
    });
    debug('visual.ly-tinh.replay', { syntheticTargets: true, reduced }); return true;
  }
  tick(dt: number, time: number): void { this.charge.tick(dt, time); this.guard.tick(dt); this.art.tick(dt); this.bank.tick(dt, time); }
  clear(): void { this.pending = 0; this.charge.clear(); this.guard.clear(); this.art.clear(); this.bank.clear(); }
}
