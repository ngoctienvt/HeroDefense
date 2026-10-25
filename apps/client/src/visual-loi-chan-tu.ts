import type { Scene } from '@babylonjs/core/scene.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import type { HeroVfx, AbilityExtra } from './visual-kit-hero.js';
import { KitFxBank } from './visual-kit-fx-bank.js';
import { KitFlipbooks } from './visual-kit-flipbooks.js';
import { StormArt } from './visual-loi-chan-tu-art.js';
import { StormCharge } from './visual-loi-chan-tu-charge.js';
import { StormBarrage } from './visual-loi-chan-tu-barrage.js';
import { StormBurn } from './visual-loi-chan-tu-burn.js';
import { LOI as L, LC_CAPS } from './visual-loi-chan-tu-timeline.js';
import { debug } from './debug.js';
const finite = (at: Vector3): boolean => [at.x, at.y, at.z].every(Number.isFinite);
export function stormFocus(event: GameEvent, fallback: Vector3): Vector3 | undefined {
  if (event.x !== undefined && event.z !== undefined && Number.isFinite(event.x) && Number.isFinite(event.z)) return new Vector3(event.x, 0, event.z);
  return finite(fallback) ? fallback.clone() : undefined;
}
interface Preview { id: string; at: Vector3; age: number; pulse: number; reduced: boolean }
export class VisualLoiChanTu implements HeroVfx {
  readonly heroId = L.id; private bank: KitFxBank; private art: StormArt; private charge: StormCharge; private barrage: StormBarrage; private burn: StormBurn;
  private previews: Preview[] = []; private pending = 0; private serial = 0;
  constructor(scene: Scene) {
    this.bank = new KitFxBank(scene, new KitFlipbooks(scene)); this.art = new StormArt(scene, this.bank);
    this.charge = new StormCharge(scene, this.art); this.barrage = new StormBarrage(scene, this.art); this.burn = new StormBurn(this.art);
    debug('visual.loi-chan-tu.layout', { radius: L.radius, hitRadius: L.hitRadius, ...LC_CAPS });
  }
  prepare(): void { this.art.prepare(); }
  cast(event: GameEvent, at: Vector3, reduced: boolean, _origin?: Vector3): boolean {
    if (event.kind !== 'cast' || event.skillId !== L.skill) return false;
    this.prepare(); const aim = stormFocus(event, at), windup = event.windup;
    if (event.source && aim && windup !== undefined && Number.isFinite(windup) && windup > 0) this.charge.begin(event.source, aim, windup, reduced);
    debug('visual.loi-chan-tu.cast', { windup, reduced }); return true;
  }
  ability(event: GameEvent, _origin: Vector3, at: Vector3, reduced: boolean, extra?: AbilityExtra): boolean {
    if (event.kind === 'ability' && event.skillId === L.skill) {
      this.prepare(); if (event.source) this.charge.cancel(event.source);
      // Barrage marker owns the continuing cloud. Initial ability has no contact and no synthetic pulse schedule.
      debug('visual.loi-chan-tu.resolve', { reduced }); return true;
    }
    if (event.kind !== 'trait' || event.skillId !== L.pulse) return false;
    this.prepare(); const focus = stormFocus(event, at), targets = extra?.targets.filter(finite) ?? [];
    if (focus) this.art.pulse(focus, targets, reduced);
    debug('visual.loi-chan-tu.pulse', { targets: targets.length, hasOrigin: extra?.hasOrigin === true, reduced }); return true;
  }
  markBarrage(id: string, at: Vector3, radius: number, remaining: number, reduced: boolean): void { this.prepare(); this.barrage.mark(id, at, radius, remaining, reduced); }
  markBurn(id: string, at: Vector3, remaining: number, reduced: boolean): void { this.prepare(); this.burn.mark(id, at, remaining, reduced); }
  replay(origin: Vector3, aim: Vector3, reduced: boolean, kind = 'ultimate'): boolean {
    if (kind !== 'ultimate' || !finite(origin) || !finite(aim) || this.pending + this.previews.length >= LC_CAPS.previews) return false;
    this.prepare(); const id = `storm-preview-${this.serial++}`;
    const event: GameEvent = { id: -1, source: id, kind: 'ability', skillId: L.skill, x: aim.x, z: aim.z };
    this.cast({ ...event, kind: 'cast', windup: .25 }, aim, reduced, origin); this.pending++;
    this.bank.after(.25, () => { this.pending--; this.ability(event, origin, aim, reduced, { hasOrigin: true, targets: [] });
      this.previews.push({ id, at: aim.clone(), age: 0, pulse: 0, reduced }); });
    debug('visual.loi-chan-tu.replay', { syntheticTargets: true, reduced }); return true;
  }
  private tickReplay(dt: number): void {
    for (let i = this.previews.length - 1; i >= 0; i--) {
      const p = this.previews[i]; p.age += dt;
      if (p.age < L.barrageLife) this.barrage.mark(p.id, p.at, L.radius, L.barrageLife - p.age, p.reduced);
      // This schedule exists only in an explicit client replay; live strikes exclusively enter via trait events.
      while (p.pulse < 10 && p.age >= (p.pulse + 1) * .25) {
        const angle = p.pulse * 2.4, focus = p.at.add(new Vector3(Math.cos(angle) * 3.8, 0, Math.sin(angle) * 3.8)); p.pulse++;
        this.art.pulse(focus, [focus], p.reduced);
      }
      if (p.age < L.barrageLife + L.burnLife && p.pulse > 0)
        this.burn.mark(`${p.id}:burn`, p.at.add(new Vector3(2, 0, 1)), Math.min(L.burnLife, L.barrageLife + L.burnLife - p.age), p.reduced);
      if (p.age >= L.barrageLife + L.burnLife) this.previews.splice(i, 1);
    }
  }
  tick(dt: number, time: number): void { this.tickReplay(dt); this.charge.tick(dt, time); this.barrage.tick(dt, time); this.burn.tick(dt); this.art.tick(dt); this.bank.tick(dt, time); }
  clear(): void { this.pending = 0; this.previews.length = 0; this.charge.clear(); this.barrage.clear(); this.burn.clear(); this.art.clear(); this.bank.clear(); }
}
