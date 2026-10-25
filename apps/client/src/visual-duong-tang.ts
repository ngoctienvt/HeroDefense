import type { Scene } from '@babylonjs/core/scene.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import type { AbilityExtra, HeroVfx } from './visual-kit-hero.js';
import { KitFxBank } from './visual-kit-fx-bank.js';
import { KitFlipbooks } from './visual-kit-flipbooks.js';
import { DharmaArt } from './visual-duong-tang-art.js';
import { DharmaCharge } from './visual-duong-tang-charge.js';
import { DharmaGround } from './visual-duong-tang-ground.js';
import { DUONG_TANG as D, DT_CAPS } from './visual-duong-tang-timeline.js';
import { debug } from './debug.js';
const finite = (p: Vector3): boolean => [p.x, p.y, p.z].every(Number.isFinite);
/** Server event coordinates own the locked aim, even if the cast adapter is currently passing caster position. */
export function dharmaAim(event: GameEvent, fallback: Vector3): Vector3 | undefined {
  if (event.x !== undefined && event.z !== undefined && Number.isFinite(event.x) && Number.isFinite(event.z)) return new Vector3(event.x, 0, event.z);
  return finite(fallback) ? fallback.clone() : undefined;
}
export class VisualDuongTang implements HeroVfx {
  readonly heroId = D.id; private bank: KitFxBank; private art: DharmaArt; private charge: DharmaCharge; private ground: DharmaGround;
  private previews: { id: string; at: Vector3; remaining: number; reduced: boolean }[] = []; private serial = 0; private replayPending = 0;
  constructor(scene: Scene) {
    this.bank = new KitFxBank(scene, new KitFlipbooks(scene)); this.art = new DharmaArt(scene, this.bank);
    this.charge = new DharmaCharge(scene, this.art); this.ground = new DharmaGround(scene, this.art);
    debug('visual.duong-tang.layout', { radius: D.radius, groundLife: D.groundLife, ...DT_CAPS });
  }
  prepare(): void { this.art.prepare(); }
  cast(event: GameEvent, at: Vector3, reduced: boolean, origin?: Vector3): boolean {
    if (event.kind !== 'cast' || event.skillId !== D.skill) return false;
    this.prepare(); const aim = dharmaAim(event, at), windup = event.windup;
    if (!event.source || !aim || windup === undefined || !Number.isFinite(windup) || windup <= 0) return true;
    this.charge.begin(event.source, origin && finite(origin) ? origin : undefined, aim, windup, reduced);
    debug('visual.duong-tang.cast', { windup, hasOrigin: Boolean(origin && finite(origin)), reduced }); return true;
  }
  ability(event: GameEvent, _origin: Vector3, at: Vector3, reduced: boolean, extra?: AbilityExtra): boolean {
    if (event.kind !== 'ability' || event.skillId !== D.skill) return false;
    this.prepare(); if (event.source) this.charge.cancel(event.source);
    const aim = dharmaAim(event, at), targets = extra?.targets.filter(finite) ?? [];
    if (aim) this.art.fillet(aim, targets, reduced);
    debug('visual.duong-tang.resolve', { targets: targets.length, hasOrigin: extra?.hasOrigin === true, reduced }); return true;
  }
  /** Exact source-owned tier-gold snapshot marker; call before tick, do not synthesize it from resolve. */
  markGround(id: string, at: Vector3, radius: number, remaining: number, reduced: boolean): void {
    this.prepare(); this.ground.mark(id, at, radius, remaining, reduced);
  }
  replay(origin: Vector3, aim: Vector3, reduced: boolean, kind = 'ultimate'): boolean {
    if (kind !== 'ultimate' || !finite(origin) || !finite(aim) || this.previews.length + this.replayPending >= DT_CAPS.grounds) return false;
    this.prepare(); const id = `sutra-preview-${this.serial++}`;
    const event: GameEvent = { id: -1, source: id, kind: 'ability', skillId: D.skill, x: aim.x, z: aim.z };
    this.cast({ ...event, kind: 'cast', windup: .25 }, aim, reduced, origin);
    this.replayPending++;
    this.bank.after(.25, () => {
      this.replayPending--;
      this.ability(event, origin, aim, reduced, { hasOrigin: true, targets: [aim.add(new Vector3(-2, 0, .6)), aim.add(new Vector3(2, 0, -1.2))] });
      this.previews.push({ id, at: aim.clone(), remaining: D.groundLife, reduced });
    });
    debug('visual.duong-tang.replay', { syntheticTargets: true, reduced }); return true;
  }
  tick(dt: number, time: number): void {
    for (let i = this.previews.length - 1; i >= 0; i--) {
      const p = this.previews[i]; p.remaining -= dt;
      if (p.remaining <= 0) this.previews.splice(i, 1); else this.ground.mark(p.id, p.at, D.radius, p.remaining, p.reduced);
    }
    this.charge.tick(dt, time); this.ground.tick(dt, time); this.art.tick(dt); this.bank.tick(dt, time);
  }
  clear(): void { this.replayPending = 0; this.previews.length = 0; this.charge.clear(); this.ground.clear(); this.art.clear(); this.bank.clear(); }
}

