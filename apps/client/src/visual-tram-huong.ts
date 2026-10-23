import type { Scene } from '@babylonjs/core/scene.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import type { HeroVfx, AbilityExtra } from './visual-kit-hero.js';
import { debug } from './debug.js';
import { KitFxBank } from './visual-kit-fx-bank.js';
import { KitFlipbooks } from './visual-kit-flipbooks.js';
import { TramHuongArt } from './visual-tram-huong-art.js';
import { TramHuongCharge } from './visual-tram-huong-charge.js';
import { TRAM_HUONG as T, TH_CAPS, splitDirection } from './visual-tram-huong-timeline.js';
const finite = (at: Vector3): boolean => [at.x, at.y, at.z].every(Number.isFinite);

export class VisualTramHuong implements HeroVfx {
  readonly heroId = T.id; private bank: KitFxBank; private pieces: TramHuongArt; private charge: TramHuongCharge;
  constructor(scene: Scene) {
    this.bank = new KitFxBank(scene, new KitFlipbooks(scene)); this.pieces = new TramHuongArt(scene, this.bank);
    this.charge = new TramHuongCharge(scene, this.pieces);
    debug('visual.tram-huong.layout', { radius: T.radius, ...TH_CAPS });
  }
  prepare(): void { this.pieces.prepare(); }
  cast(event: GameEvent, at: Vector3, reduced: boolean, origin?: Vector3): boolean {
    if (event.kind !== 'cast' || event.skillId !== T.skill) return false;
    this.prepare(); const windup = event.windup;
    if (!event.source || !origin || !finite(origin) || !finite(at) || windup === undefined || !Number.isFinite(windup) || windup <= 0) return true;
    this.charge.begin(event.source, origin, at, windup, reduced);
    debug('visual.tram-huong.cast', { windup, reduced }); return true;
  }
  ability(event: GameEvent, origin: Vector3, at: Vector3, reduced: boolean, extra?: AbilityExtra): boolean {
    if (event.kind !== 'ability' || event.skillId !== T.skill) return false;
    this.prepare(); if (event.source) this.charge.cancel(event.source);
    const from = extra?.hasOrigin === true && finite(origin) ? origin : undefined;
    const targets = extra?.targets.filter(finite) ?? [], support = extra?.supportTargets?.filter(finite) ?? [];
    const direction = splitDirection(event.direction, from, at);
    if (finite(at)) this.pieces.strike(at, direction, targets, reduced);
    this.pieces.receipt(support, reduced);
    debug('visual.tram-huong.resolve', { targets: targets.length, support: support.length,
      directional: Boolean(direction), reduced }); return true;
  }
  replay(origin: Vector3, reduced: boolean, kind = 'ultimate'): boolean {
    if (kind !== 'ultimate' || !finite(origin)) return false;
    this.prepare(); const aim = origin.add(new Vector3(4, 0, 1));
    const event: GameEvent = { id: -1, kind: 'ability', source: 'tram-huong-preview', skillId: T.skill, direction: { x: 4, z: 1 } };
    this.cast({ ...event, kind: 'cast', windup: .25 }, aim, reduced, origin);
    this.bank.after(.25, () => this.ability(event, origin, aim, reduced, {
      hasOrigin: true, targets: [aim.add(new Vector3(1, 0, 1)), aim.add(new Vector3(-2, 0, -.5))],
      supportTargets: [origin.clone(), origin.add(new Vector3(-2, 0, 1))],
    }));
    debug('visual.tram-huong.replay', { syntheticTargets: true, reduced }); return true;
  }
  tick(dt: number, time: number): void { this.charge.tick(dt, time); this.pieces.tick(dt); this.bank.tick(dt, time); }
  clear(): void { this.charge.clear(); this.pieces.clear(); this.bank.clear(); }
}
