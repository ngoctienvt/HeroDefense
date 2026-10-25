import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { debug } from './debug.js';
import type { KitFlipbooks } from './visual-kit-flipbooks.js';
import type { AbilityExtra, HeroVfx } from './visual-kit-hero.js';
import { KitSpray } from './visual-kit-spray.js';
import { CulinhBulwark } from './visual-culinh-bulwark.js';
import { CulinhQuake } from './visual-culinh-quake.js';
import { CULINH_ATLAS, CULINH_ID, CULINH_SKILL, DEFAULT_WINDUP, DUST_GATE, QUAKE_SKILL } from './visual-culinh-timeline.js';

/**
 * Cự Linh Thần (h00E) skill VFX on the kit. "Tuyên Hoa Thiết Bích Trấn": gold runes and the ghost hammer on the
 * windup (`cast`), the slam with the iron wall ring bursting up at the 3.0 quake radius, and iron plates
 * settling around every protected ally (`ability`), then the bulwark ring under each ally while the snapshot
 * holds their `ward` (dimmer once the shield is gone, ringing when it absorbs a blow). The server's `quake-h00E`
 * event marks the enemies the hammer slowed. The basic attack (single-target hammer blow) keeps its painter.
 */
export class VisualCulinh implements HeroVfx {
  readonly heroId = CULINH_ID;
  private spray: KitSpray;
  private quake: CulinhQuake;
  private bulwark: CulinhBulwark;
  private dust = new Map<string, number>();
  private time = 0;

  constructor(scene: Scene, private flipbooks: KitFlipbooks) {
    this.spray = new KitSpray(scene, 'gold');
    this.quake = new CulinhQuake(flipbooks, this.spray);
    this.bulwark = new CulinhBulwark(scene, flipbooks, this.spray);
  }

  prepare(): void {
    for (const id of Object.values(CULINH_ATLAS)) this.flipbooks.ensure(id);
  }

  /** `cast skill-h00E` (server windup) at Cự Linh. */
  cast(event: GameEvent, at: Vector3, reduced: boolean): boolean {
    if (event.skillId !== CULINH_SKILL) return false;
    this.quake.cast(event.source ?? 'unknown', at, event.windup ?? DEFAULT_WINDUP, reduced);
    debug('visual.culinh.cast', { eventId: event.id, windup: event.windup ?? DEFAULT_WINDUP, reduced });
    return true;
  }

  /** `ability skill-h00E`: `origin` = Cự Linh, `extra.targets` = every protected ally in range. */
  ability(event: GameEvent, origin: Vector3, _at: Vector3, reduced: boolean, extra?: AbilityExtra): boolean {
    if (event.skillId === QUAKE_SKILL) { this.slowPuff(event, extra?.targets ?? [], reduced); return true; }
    if (event.kind !== 'ability' || event.skillId !== CULINH_SKILL) return false;
    this.quake.slam(event.source ?? 'unknown', origin, reduced);
    this.bulwark.raise(extra?.targets.length ? extra.targets : [origin], reduced);
    return true;
  }

  /**
   * Snapshot markers: `bulwark` / `bulwark-worn` (ward held, shield up / shield gone), `bulwark-hit` (the shield
   * just absorbed a blow), `slowed` (an enemy the hammer quake slowed, 1.2 s).
   */
  mark(kind: string, id: string, at: Vector3, reduced: boolean): void {
    if (kind === 'bulwark' || kind === 'bulwark-worn') this.bulwark.mark(id, at, kind === 'bulwark-worn');
    else if (kind === 'bulwark-hit') this.bulwark.hit(id, reduced);
    else if (kind === 'slowed' && !reduced) this.dustUp(id, at);
  }

  tick(dt: number, time: number): void {
    this.time = time;
    this.quake.tick(dt);
    this.bulwark.tick(dt);
  }

  clear(): void {
    this.dust.clear();
    this.quake.clear();
    this.bulwark.clear();
    this.spray.clear();
  }

  /** `trait quake-h00E`: a gold dust puff on every enemy the server says the quake slowed. */
  private slowPuff(event: GameEvent, hits: readonly Vector3[], reduced: boolean): void {
    if (!reduced) for (const hit of hits.slice(0, 16)) this.spray.ring(new Vector3(hit.x, .2, hit.z), .5, 4, .2, 1.4, 1.8);
    debug('visual.culinh.quake', { eventId: event.id, slowed: event.targets?.length ?? 0, reduced, radius: event.value ?? 0 });
  }

  /** While the slow lasts the enemy keeps shedding dust, gated so a crowd stays cheap. */
  private dustUp(id: string, at: Vector3): void {
    if (this.time - (this.dust.get(id) ?? -Infinity) < DUST_GATE) return;
    this.dust.set(id, this.time);
    this.spray.trail(new Vector3(at.x, .4, at.z), new Vector3(0, 1.1, 0), 2);
    if (this.dust.size > 64) for (const [key, last] of this.dust) if (this.time - last > DUST_GATE * 4) this.dust.delete(key);
  }
}
