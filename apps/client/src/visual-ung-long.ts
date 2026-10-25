import type { Scene } from '@babylonjs/core/scene.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import type { HeroVfx, AbilityExtra } from './visual-kit-hero.js';
import { KitFxBank } from './visual-kit-fx-bank.js';
import { KitFlipbooks } from './visual-kit-flipbooks.js';
import { BlizzardArt } from './visual-ung-long-art.js';
import { BlizzardCharge } from './visual-ung-long-charge.js';
import { BlizzardBarrage } from './visual-ung-long-barrage.js';
import { UNG_LONG as U, UL_CAPS } from './visual-ung-long-timeline.js';
import { debug } from './debug.js';
const finite = (at: Vector3): boolean => [at.x, at.y, at.z].every(Number.isFinite);
function focus(event: GameEvent, fallback: Vector3): Vector3 | undefined {
  return event.x !== undefined && event.z !== undefined && Number.isFinite(event.x) && Number.isFinite(event.z)
    ? new Vector3(event.x, 0, event.z) : finite(fallback) ? fallback.clone() : undefined;
}
interface Preview { id: string; at: Vector3; age: number; pulse: number; reduced: boolean }
export class VisualUngLong implements HeroVfx {
  readonly heroId = U.id; private bank: KitFxBank; private art: BlizzardArt; private charge: BlizzardCharge; private barrage: BlizzardBarrage;
  private previews: Preview[] = []; private pending = 0; private serial = 0;
  constructor(scene: Scene) {
    this.bank = new KitFxBank(scene, new KitFlipbooks(scene)); this.art = new BlizzardArt(scene, this.bank);
    this.charge = new BlizzardCharge(scene, this.art); this.barrage = new BlizzardBarrage(scene, this.art);
    debug('visual.ung-long.layout', { radius: U.radius, ...UL_CAPS });
  }
  prepare(): void { this.art.prepare(); }
  cast(event: GameEvent, at: Vector3, reduced: boolean, origin?: Vector3): boolean {
    if (event.kind !== 'cast' || event.skillId !== U.skill) return false;
    this.prepare(); const aim = focus(event, at), windup = event.windup;
    if (event.source && aim && windup !== undefined && Number.isFinite(windup) && windup > 0)
      this.charge.begin(event.source, aim, origin && finite(origin) ? origin : undefined, windup, reduced);
    debug('visual.ung-long.cast', { windup, reduced }); return true;
  }
  ability(event: GameEvent, origin: Vector3, at: Vector3, reduced: boolean, extra?: AbilityExtra): boolean {
    if (event.kind === 'ability' && event.skillId === U.skill) {
      this.prepare(); if (event.source) this.charge.cancel(event.source);
      if (extra?.hasOrigin === true && finite(origin)) this.art.gust(origin, reduced);
      // Actual barrage snapshot opens the continuing storm. Initial slow/sunder never creates a damage contact.
      debug('visual.ung-long.resolve', { reduced, hasOrigin: extra?.hasOrigin === true }); return true;
    }
    if (event.kind !== 'trait' || event.skillId !== U.pulse) return false;
    this.prepare(); const point = focus(event, at), area = event.areaCenter;
    const center = area && Number.isFinite(area.x) && Number.isFinite(area.z) ? new Vector3(area.x, 0, area.z) : undefined;
    const radius = event.radius !== undefined && Number.isFinite(event.radius) && event.radius > 0 && event.radius <= 64 ? event.radius : undefined;
    const targets = extra?.targets.filter(finite) ?? [];
    this.art.pulse(point, center, radius, targets, reduced);
    debug('visual.ung-long.pulse', { targets: targets.length, hasArea: Boolean(center && radius), reduced }); return true;
  }
  markBarrage(id: string, at: Vector3, radius: number, remaining: number, reduced: boolean): void { this.prepare(); this.barrage.mark(id, at, radius, remaining, reduced); }
  replay(origin: Vector3, aim: Vector3, reduced: boolean, kind = 'ultimate'): boolean {
    if (kind !== 'ultimate' || !finite(origin) || !finite(aim) || this.pending + this.previews.length >= UL_CAPS.previews) return false;
    const id = `blizzard-preview-${this.serial++}`, event: GameEvent = { id: -1, kind: 'ability', source: id, skillId: U.skill, x: aim.x, z: aim.z };
    this.cast({ ...event, kind: 'cast', windup: .25 }, aim, reduced, origin); this.pending++;
    this.bank.after(.25, () => { this.pending--; this.ability(event, origin, aim, reduced, { hasOrigin: true, targets: [] });
      this.previews.push({ id, at: aim.clone(), age: 0, pulse: 0, reduced }); });
    debug('visual.ung-long.replay', { syntheticTargets: true, reduced }); return true;
  }
  private tickReplay(dt: number): void {
    for (let i = this.previews.length - 1; i >= 0; i--) {
      const p = this.previews[i]; p.age += dt;
      if (p.age < U.life) this.barrage.mark(p.id, p.at, U.radius, U.life - p.age, p.reduced);
      // Synthetic pulse schedule belongs exclusively to explicit replay, never to a live marker.
      while (p.pulse < 8 && p.age >= (p.pulse + 1) * .5) {
        const targets = [0, 1, 2, 3].map(j => p.at.add(new Vector3(Math.cos(j * 1.9) * 3.5, 0, Math.sin(j * 1.9) * 3.5)));
        this.art.pulse(targets[p.pulse % targets.length], p.at, U.radius, targets, p.reduced); p.pulse++;
      }
      if (p.age >= U.life) this.previews.splice(i, 1);
    }
  }
  tick(dt: number, time: number): void { this.tickReplay(dt); this.charge.tick(dt, time); this.barrage.tick(dt, time); this.art.tick(dt); this.bank.tick(dt, time); }
  clear(): void { this.pending = 0; this.previews.length = 0; this.charge.clear(); this.barrage.clear(); this.art.clear(); this.bank.clear(); debug('visual.ung-long.clear', {}); }
}
