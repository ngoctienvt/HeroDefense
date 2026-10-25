import type { Scene } from '@babylonjs/core/scene.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import type { HeroVfx, AbilityExtra } from './visual-kit-hero.js';
import { KitFxBank } from './visual-kit-fx-bank.js';
import { KitFlipbooks } from './visual-kit-flipbooks.js';
import { MonkeyArt } from './visual-ton-ngo-khong-art.js';
import { MonkeyAction } from './visual-ton-ngo-khong-action.js';
import { MonkeyClones } from './visual-ton-ngo-khong-clones.js';
import { MONKEY as M, MONKEY_CAPS, monkeyDirection } from './visual-ton-ngo-khong-timeline.js';
import { debug } from './debug.js';
const finite = (p: Vector3): boolean => [p.x, p.y, p.z].every(Number.isFinite);
export class VisualTonNgoKhong implements HeroVfx {
  readonly heroId = M.id; private bank: KitFxBank; private art: MonkeyArt; private action: MonkeyAction; private clones: MonkeyClones;
  constructor(scene: Scene) {
    this.bank = new KitFxBank(scene, new KitFlipbooks(scene)); this.art = new MonkeyArt(scene, this.bank);
    this.action = new MonkeyAction(scene, this.art); this.clones = new MonkeyClones(this.art);
    debug('visual.ton-ngo-khong.layout', { length: M.length, width: M.width, ...MONKEY_CAPS });
  }
  prepare(): void { this.art.prepare(); }
  cast(event: GameEvent, at: Vector3, reduced: boolean, origin?: Vector3): boolean {
    if (event.kind !== 'cast' || event.skillId !== M.skill) return false;
    this.prepare(); const dir = monkeyDirection(event.direction, origin, at), windup = event.windup;
    if (!event.source || !origin || !finite(origin) || !dir || windup === undefined || !Number.isFinite(windup) || windup <= 0) return true;
    this.action.begin(event.source, origin, dir, windup, reduced);
    debug('visual.ton-ngo-khong.cast', { windup, reduced }); return true;
  }
  ability(event: GameEvent, origin: Vector3, at: Vector3, reduced: boolean, extra?: AbilityExtra): boolean {
    if (event.kind !== 'ability' || event.skillId !== M.skill) return false;
    this.prepare(); const from = extra?.hasOrigin === true && finite(origin) ? origin : undefined;
    const targets = extra?.targets.filter(finite) ?? [], dir = monkeyDirection(event.direction, from, at);
    this.action.resolve(event.source, from, dir, targets, reduced);
    debug('visual.ton-ngo-khong.resolve', { targets: targets.length, directional: Boolean(dir), hasOrigin: Boolean(from), reduced }); return true;
  }
  /** Call for the actual h00R monkey-clone unit, with its current summonDuration, before tick. */
  markClone(id: string, at: Vector3, remaining: number, reduced: boolean): void {
    this.prepare(); this.clones.mark(id, at, remaining, reduced);
  }
  cloneSweep(event: GameEvent, origin: Vector3 | undefined, targets: readonly Vector3[], reduced: boolean, aim: Vector3): boolean {
    if (event.kind !== 'attack' || event.skillId !== M.cloneSkill) return false;
    this.prepare(); const from = origin && finite(origin) ? origin : undefined, dir = monkeyDirection(event.direction, from, aim);
    if (from && dir) this.art.play('sweep', from, 3.2, .34, reduced, dir);
    for (const target of targets.filter(finite).slice(0, MONKEY_CAPS.targets)) this.art.impact(target, reduced, true);
    debug('visual.ton-ngo-khong.clone.sweep', { targets: targets.length, directional: Boolean(dir), reduced }); return true;
  }
  replay(origin: Vector3, aim: Vector3, reduced: boolean, kind = 'ultimate'): boolean {
    if (kind !== 'ultimate' || !finite(origin) || !finite(aim)) return false;
    const dir = monkeyDirection(undefined, origin, aim); if (!dir) return false;
    this.prepare(); const event: GameEvent = { id: -1, kind: 'ability', source: 'monkey-preview', skillId: M.skill, direction: dir };
    this.cast({ ...event, kind: 'cast', windup: .25 }, aim, reduced, origin);
    const victims = [3, 6, 8.5].map(n => origin.add(new Vector3(dir.x * n, 0, dir.z * n)));
    this.bank.after(.25, () => {
      this.ability(event, origin, aim, reduced, { hasOrigin: true, targets: victims });
      // Replay effects only: the live route requires actual units and never synthesizes bodies.
      for (const side of [-1, 1]) {
        const at = aim.add(new Vector3(-dir.z * side, 0, dir.x * side)); this.art.play('puff', at, 2.4, .48, reduced);
        this.bank.after(.8, () => this.cloneSweep({ ...event, kind: 'attack', skillId: M.cloneSkill }, at, [victims[2]], reduced, victims[2]));
        this.bank.after(6, () => this.art.play('unravel', at, 2.2, .48, reduced));
      }
    });
    debug('visual.ton-ngo-khong.replay', { syntheticTargets: true, reduced }); return true;
  }
  tick(dt: number, time: number): void {
    this.clones.endFrame(); this.action.tick(dt, time); this.art.tick(dt); this.bank.tick(dt, time);
  }
  clear(): void { this.clones.clear(); this.action.clear(); this.art.clear(); this.bank.clear(); }
}

