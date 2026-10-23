import type { Scene } from '@babylonjs/core/scene.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import type { HeroVfx, AbilityExtra } from './visual-kit-hero.js';
import { debug } from './debug.js';
import { KitFxBank } from './visual-kit-fx-bank.js';
import { KitFlipbooks } from './visual-kit-flipbooks.js';
import { NguuMaVuongArt } from './visual-nguu-ma-vuong-art.js';
import { NguuMaVuongCharge } from './visual-nguu-ma-vuong-charge.js';
import { NGUU_MA_VUONG as N, NM_CAPS } from './visual-nguu-ma-vuong-timeline.js';
const finite = (at: Vector3): boolean => [at.x, at.y, at.z].every(Number.isFinite);
export class VisualNguuMaVuong implements HeroVfx {
  readonly heroId = N.id; private bank: KitFxBank; private pieces: NguuMaVuongArt; private charge: NguuMaVuongCharge;
  constructor(scene: Scene) {
    this.bank = new KitFxBank(scene, new KitFlipbooks(scene)); this.pieces = new NguuMaVuongArt(scene, this.bank);
    this.charge = new NguuMaVuongCharge(scene, this.pieces);
    debug('visual.nguu-ma-vuong.layout', { radius: N.radius, ...NM_CAPS });
  }
  prepare(): void { this.pieces.prepare(); }
  cast(event: GameEvent, _at: Vector3, reduced: boolean, origin?: Vector3): boolean {
    if (event.kind !== 'cast' || event.skillId !== N.skill) return false;
    this.prepare(); const windup = event.windup;
    if (!event.source || !origin || !finite(origin) || windup === undefined || !Number.isFinite(windup) || windup <= 0) return true;
    this.charge.begin(event.source, origin, windup, reduced);
    debug('visual.nguu-ma-vuong.cast', { windup, reduced }); return true;
  }
  ability(event: GameEvent, origin: Vector3, _at: Vector3, reduced: boolean, extra?: AbilityExtra): boolean {
    if (event.kind !== 'ability' || event.skillId !== N.skill) return false;
    this.prepare(); if (event.source) this.charge.cancel(event.source);
    const from = extra?.hasOrigin === true && finite(origin) ? origin : undefined, targets = extra?.targets.filter(finite) ?? [];
    this.pieces.strike(from, targets, reduced);
    debug('visual.nguu-ma-vuong.resolve', { targets: targets.length, hasOrigin: Boolean(from), reduced }); return true;
  }
  replay(origin: Vector3, reduced: boolean, kind = 'ultimate'): boolean {
    if (kind !== 'ultimate' || !finite(origin)) return false;
    this.prepare(); const event: GameEvent = { id: -1, kind: 'ability', source: 'nguu-ma-vuong-preview', skillId: N.skill };
    this.cast({ ...event, kind: 'cast', windup: .25 }, origin, reduced, origin);
    this.bank.after(.25, () => {
      // Preview positions imitate post-knockback victims; synthetic targets stay client-only.
      const targets = [new Vector3(-3.2, 0, 1.8), new Vector3(4.1, 0, -.7), new Vector3(.6, 0, -3.8)].map(p => origin.add(p));
      this.ability(event, origin, origin, reduced, { targets, hasOrigin: true });
    });
    debug('visual.nguu-ma-vuong.replay', { syntheticTargets: true, reduced }); return true;
  }
  tick(dt: number, time: number): void { this.charge.tick(dt, time); this.pieces.tick(dt); this.bank.tick(dt, time); }
  clear(): void { this.charge.clear(); this.pieces.clear(); this.bank.clear(); }
}
