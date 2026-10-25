import type { Scene } from '@babylonjs/core/scene.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import type { AbilityExtra, HeroVfx } from './visual-kit-hero.js';
import { KitFxBank } from './visual-kit-fx-bank.js';
import { KitFlipbooks } from './visual-kit-flipbooks.js';
import { SamsaraArt } from './visual-ngu-dao-art.js';
import { SamsaraCharge } from './visual-ngu-dao-charge.js';
import { SoulMarks } from './visual-ngu-dao-marks.js';
import { SoulPairs } from './visual-ngu-dao-pairs.js';
import { NGU_DAO as N, ND_CAPS } from './visual-ngu-dao-timeline.js';
import { debug } from './debug.js';
const finite = (p: Vector3): boolean => [p.x, p.y, p.z].every(Number.isFinite);
interface Preview { id: string; age: number; enemies: Vector3[]; allies: Vector3[]; reduced: boolean; pulse: boolean }
export class VisualNguDao implements HeroVfx {
  readonly heroId = N.id;
  private bank: KitFxBank; private art: SamsaraArt; private charge: SamsaraCharge; private marks: SoulMarks; private pairs: SoulPairs;
  private pending = 0; private serial = 0; private previews: Preview[] = [];
  constructor(scene: Scene) {
    this.bank = new KitFxBank(scene, new KitFlipbooks(scene)); this.art = new SamsaraArt(scene, this.bank);
    this.charge = new SamsaraCharge(scene, this.art); this.marks = new SoulMarks(scene, this.art); this.pairs = new SoulPairs(scene, this.art);
    debug('visual.ngu-dao.layout', { radius: N.radius, targets: N.targets, ...ND_CAPS });
  }
  prepare(): void { this.art.prepare(); this.pairs.prepare(); }
  cast(event: GameEvent, at: Vector3, reduced: boolean, origin?: Vector3): boolean {
    if (event.kind !== 'cast' || event.skillId !== N.skill) return false;
    this.prepare(); const aim = this.aim(event, at), windup = event.windup;
    if (event.source && aim && windup !== undefined && Number.isFinite(windup) && windup > 0)
      this.charge.begin(event.source, origin && finite(origin) ? origin : undefined, aim, windup, reduced);
    debug('visual.ngu-dao.cast', { windup, hasOrigin: Boolean(origin && finite(origin)), reduced }); return true;
  }
  ability(event: GameEvent, _origin: Vector3, at: Vector3, reduced: boolean, extra?: AbilityExtra): boolean {
    if (event.kind !== 'ability' || event.skillId !== N.skill) return false;
    this.prepare(); if (event.source) this.charge.cancel(event.source);
    const aim = this.aim(event, at), targets = extra?.targets.filter(finite).slice(0, N.targets) ?? [], allies = extra?.supportTargets?.filter(finite) ?? [];
    if (aim) this.art.resolve(aim, targets, allies, reduced);
    else { for (const target of targets) this.art.contact(target, reduced); this.art.support(allies, reduced); }
    debug('visual.ngu-dao.resolve', { targets: targets.length, allies: allies.length, reduced }); return true;
  }
  private aim(event: GameEvent, at: Vector3): Vector3 | undefined {
    return Number.isFinite(event.x) && Number.isFinite(event.z) ? new Vector3(event.x!, 0, event.z!) : finite(at) ? at : undefined;
  }
  markShackle(id: string, at: Vector3, remaining: number, reduced: boolean): void { this.prepare(); this.marks.mark('shackle', id, at, remaining, reduced); }
  markPair(id: string, from: Vector3, to: Vector3, remaining: number, reduced: boolean): void { this.prepare(); this.pairs.mark(id, from, to, remaining, reduced); }
  markFrenzy(id: string, at: Vector3, remaining: number, reduced: boolean): void { this.prepare(); this.marks.mark('frenzy', id, at, remaining, reduced); }
  pulsePair(id: string, reduced: boolean): boolean { return this.pairs.pulse(id, reduced); }
  replay(origin: Vector3, aim: Vector3, reduced: boolean, kind = 'ultimate'): boolean {
    if (kind !== 'ultimate' || !finite(origin) || !finite(aim) || this.pending + this.previews.length >= ND_CAPS.casts) return false;
    const id = `samsara-preview-${this.serial++}`, enemies = [0, 1, 2, 3].map(i => aim.add(new Vector3(Math.cos(i * 1.8) * 3, 0, Math.sin(i * 1.8) * 3)));
    const allies = [origin.clone(), origin.add(new Vector3(2, 0, 1))];
    const event: GameEvent = { id: -1, source: id, kind: 'ability', skillId: N.skill, x: aim.x, z: aim.z };
    this.cast({ ...event, kind: 'cast', windup: .25 }, aim, reduced, origin); this.pending++;
    this.bank.after(.25, () => { this.pending--; this.ability(event, origin, aim, reduced, { hasOrigin: true, targets: enemies, supportTargets: allies });
      this.previews.push({ id, age: 0, enemies, allies, reduced, pulse: false }); });
    debug('visual.ngu-dao.replay', { syntheticTargets: true, reduced }); return true;
  }
  tick(dt: number, time: number): void {
    for (let i = this.previews.length - 1; i >= 0; i--) {
      const p = this.previews[i]; p.age += dt; if (p.age >= 5) { this.previews.splice(i, 1); continue; }
      p.enemies.forEach((at, j) => this.markShackle(`${p.id}:${j}`, at, 5 - p.age, p.reduced));
      for (let j = 0; j < p.enemies.length - 1; j++) this.markPair(`${p.id}:pair:${j}`, p.enemies[j], p.enemies[j + 1], 5 - p.age, p.reduced);
      p.allies.forEach((at, j) => this.markFrenzy(`${p.id}:ally:${j}`, at, 5 - p.age, p.reduced));
      if (!p.pulse && p.age >= 1) { p.pulse = true; this.pulsePair(`${p.id}:pair:0`, p.reduced); }
    }
    this.charge.tick(dt, time); this.marks.tick(dt); this.pairs.tick(dt, time); this.art.tick(dt); this.bank.tick(dt, time);
  }
  clear(): void { this.pending = 0; this.previews.length = 0; this.charge.clear(); this.marks.clear(); this.pairs.clear(); this.art.clear(); this.bank.clear(); debug('visual.ngu-dao.clear', {}); }
}
