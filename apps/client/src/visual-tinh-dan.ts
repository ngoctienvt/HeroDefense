import type { Scene } from '@babylonjs/core/scene.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import type { HeroVfx, AbilityExtra } from './visual-kit-hero.js';
import { KitFxBank } from './visual-kit-fx-bank.js';
import { KitFlipbooks } from './visual-kit-flipbooks.js';
import { LotusArt } from './visual-tinh-dan-art.js';
import { LotusCharge } from './visual-tinh-dan-charge.js';
import { LotusEcho } from './visual-tinh-dan-echo.js';
import { TINH as T, TD_CAPS } from './visual-tinh-dan-timeline.js';
import { debug } from './debug.js';
const finite = (p: Vector3): boolean => [p.x, p.y, p.z].every(Number.isFinite);
interface Preview { id: string; age: number; allies: Vector3[]; reduced: boolean }
export class VisualTinhDan implements HeroVfx {
  readonly heroId = T.id; private bank: KitFxBank; private art: LotusArt; private charge: LotusCharge; private echo: LotusEcho;
  private previews: Preview[] = []; private pending = 0; private serial = 0;
  constructor(scene: Scene) {
    this.bank = new KitFxBank(scene, new KitFlipbooks(scene)); this.art = new LotusArt(scene, this.bank); this.charge = new LotusCharge(scene, this.art); this.echo = new LotusEcho(this.art);
    debug('visual.tinh-dan.layout', { radius: T.radius, ...TD_CAPS });
  }
  prepare(): void { this.art.prepare(); }
  cast(event: GameEvent, _at: Vector3, reduced: boolean, origin?: Vector3): boolean {
    if (event.kind !== 'cast' || event.skillId !== T.skill) return false;
    this.prepare(); const windup = event.windup;
    if (event.source && origin && finite(origin) && windup !== undefined && Number.isFinite(windup) && windup > 0) this.charge.begin(event.source, origin, windup, reduced);
    debug('visual.tinh-dan.cast', { windup, hasOrigin: Boolean(origin && finite(origin)), reduced }); return true;
  }
  ability(event: GameEvent, origin: Vector3, _at: Vector3, reduced: boolean, extra?: AbilityExtra): boolean {
    if (event.kind !== 'ability' || event.skillId !== T.skill) return false;
    this.prepare(); if (event.source) this.charge.cancel(event.source);
    const from = extra?.hasOrigin === true && finite(origin) ? origin : undefined;
    const displacements = extra?.displacements?.filter(p => finite(p.from) && finite(p.to)) ?? [], allies = extra?.supportTargets?.filter(finite) ?? [];
    // Metadata precedes the server teleport; rendered actor positions are deliberately not substituted.
    this.art.resolve(from, displacements, allies, reduced);
    debug('visual.tinh-dan.resolve', { displacements: displacements.length, allies: allies.length, hasOrigin: Boolean(from), reduced }); return true;
  }
  markEcho(id: string, at: Vector3, remaining: number, reduced: boolean): void { this.prepare(); this.echo.mark(id, at, remaining, reduced); }
  replay(origin: Vector3, aim: Vector3, reduced: boolean, kind = 'ultimate'): boolean {
    if (kind !== 'ultimate' || !finite(origin) || !finite(aim) || this.pending + this.previews.length >= TD_CAPS.casts) return false;
    const delta = aim.subtract(origin); delta.y = 0; if (delta.lengthSquared() < 1e-6) return false;
    const to = origin.add(delta.normalize().scale(1.8)), id = `lotus-preview-${this.serial++}`;
    const moves = [0, 1, 2, 3].map(i => ({ from: origin.add(new Vector3(Math.cos(i * 1.8) * 4, 0, Math.sin(i * 1.8) * 4)), to }));
    const allies = [origin.clone(), origin.add(new Vector3(-2, 0, 1))], event: GameEvent = { id: -1, kind: 'ability', source: id, skillId: T.skill, x: aim.x, z: aim.z };
    this.cast({ ...event, kind: 'cast', windup: .25 }, aim, reduced, origin); this.pending++;
    this.bank.after(.25, () => { this.pending--; this.ability(event, origin, aim, reduced, { hasOrigin: true, targets: [], displacements: moves, supportTargets: allies });
      this.previews.push({ id, age: 0, allies, reduced }); });
    debug('visual.tinh-dan.replay', { syntheticTargets: true, reduced }); return true;
  }
  tick(dt: number, time: number): void {
    for (let i = this.previews.length - 1; i >= 0; i--) { const p = this.previews[i]; p.age += dt; if (p.age >= 5) { this.previews.splice(i, 1); continue; }
      p.allies.forEach((at, j) => this.markEcho(`${p.id}:${j}`, at, 5 - p.age, p.reduced)); }
    this.charge.tick(dt, time); this.echo.tick(dt); this.art.tick(dt); this.bank.tick(dt, time);
  }
  clear(): void { this.pending = 0; this.previews.length = 0; this.charge.clear(); this.echo.clear(); this.art.clear(); this.bank.clear(); debug('visual.tinh-dan.clear', {}); }
}
