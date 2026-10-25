import type { Scene } from '@babylonjs/core/scene.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { debug } from './debug.js';
import type { HeroVfx, AbilityExtra } from './visual-kit-hero.js';
import { KitFxBank } from './visual-kit-fx-bank.js';
import { KitFlipbooks } from './visual-kit-flipbooks.js';
import { TieuBachLongArt } from './visual-tieu-bach-long-art.js';
import { TieuBachLongCharge } from './visual-tieu-bach-long-charge.js';
import { TIEU_BACH_LONG as L, GALE_CAPS, galeDirection, galeReplayDirection, galeStrikeDelay, galeTargets } from './visual-tieu-bach-long-timeline.js';

const finite = (at: Vector3): boolean => [at.x, at.y, at.z].every(Number.isFinite);
export class VisualTieuBachLong implements HeroVfx {
  readonly heroId = L.id;
  private bank: KitFxBank; private pieces: TieuBachLongArt; private charge: TieuBachLongCharge;
  constructor(scene: Scene) {
    this.bank = new KitFxBank(scene, new KitFlipbooks(scene));
    this.pieces = new TieuBachLongArt(scene, this.bank); this.charge = new TieuBachLongCharge(scene, this.pieces, this.bank);
    debug('visual.tieu-bach-long.layout', { length: L.length, width: L.width, ...GALE_CAPS });
  }
  prepare(): void { this.pieces.prepare(); }
  cast(event: GameEvent, _at: Vector3, reduced: boolean, origin?: Vector3): boolean {
    if (event.kind !== 'cast' || event.skillId !== L.skill) return false;
    this.prepare(); const windup = event.windup;
    if (!event.source || !origin || !finite(origin) || windup === undefined || !Number.isFinite(windup) || windup <= 0) return true;
    this.charge.begin(event.source, origin, windup, reduced);
    debug('visual.tieu-bach-long.cast', { windup, reduced }); return true;
  }
  ability(event: GameEvent, origin: Vector3, _at: Vector3, reduced: boolean, extra?: AbilityExtra): boolean {
    if (event.kind !== 'ability' || event.skillId !== L.skill) return false;
    this.prepare(); if (event.source) this.charge.cancel(event.source);
    const from = extra?.hasOrigin === true && finite(origin) ? origin : undefined;
    const direction = from ? galeDirection(event, from) : undefined;
    if (from) this.pieces.launch(from, direction, reduced);
    for (const at of galeTargets(extra?.targets ?? []))
      this.pieces.hit(at, from ? galeStrikeDelay(from, at, direction, reduced) : 0, reduced);
    debug('visual.tieu-bach-long.impact', { targets: extra?.targets.length ?? 0, direction, hasOrigin: Boolean(from), reduced });
    return true;
  }
  replay(origin: Vector3, at: Vector3, reduced: boolean, kind = 'ultimate'): boolean {
    if (kind !== 'ultimate' || !finite(origin) || !finite(at)) return false;
    const direction = galeReplayDirection(origin, at); if (!direction) return false;
    this.prepare();
    // Debug-only target positions, never gameplay state or a slow/root event.
    const targets = [3, 6, 10].map(n => origin.add(new Vector3(direction.x * n, 0, direction.z * n)));
    const event: GameEvent = { id: -1, kind: 'ability', source: 'tieu-bach-long-preview', skillId: L.skill, direction };
    this.cast({ ...event, kind: 'cast', windup: .25 }, origin, reduced, origin);
    this.bank.after(.25, () => this.ability(event, origin, at, reduced, { targets, hasOrigin: true }));
    debug('visual.tieu-bach-long.replay', { previewTargets: true, direction, reduced }); return true;
  }
  tick(dt: number, time: number): void { this.charge.tick(dt, time); this.pieces.tick(dt); this.bank.tick(dt, time); }
  clear(): void { this.charge.clear(); this.pieces.clear(); this.bank.clear(); }
}
