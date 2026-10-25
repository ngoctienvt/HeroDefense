import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { Sprite } from '@babylonjs/core/Sprites/sprite.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { debug } from './debug.js';
import type { KitFlipbooks } from './visual-kit-flipbooks.js';
import type { AbilityExtra, HeroVfx } from './visual-kit-hero.js';
import { KitSpray } from './visual-kit-spray.js';
import { ThietphienGust } from './visual-thietphien-gust.js';
import { ThietphienStorm } from './visual-thietphien-storm.js';
import { DEFAULT_WINDUP, EMBER_GATE, IGNITE_SECONDS, igniteFrame, skillZone, THIETPHIEN_ATLAS, THIETPHIEN_ID,
  THIETPHIEN_SKILL } from './visual-thietphien-timeline.js';

const MAX_IGNITES = 16;

type Ignite = { sprite: Sprite; age: number };

/**
 * Thiết Phiến (h00B) skill VFX on the kit. "Ba Tiêu Cuồng Phong Toàn": sand gathers during the windup
 * (`cast`), the banana-leaf fan sweeps, a sand gust crosses the area and a cyclone ring blooms over the zone
 * the server computed (`ability`, with blow-back puffs on every listed target), and enemies the detonation
 * set alight flare once (snapshot `burn` from an h00B caster, marker `ignite`) then shed embers (`ember`).
 * The steady flames come from the shared fire painter. Basic attacks (`trait-h00B`, ...) and any marker this
 * module does not own go to `fallback` (the tier recipe painter).
 */
export class VisualThietphien implements HeroVfx {
  readonly heroId = THIETPHIEN_ID;
  private grit: KitSpray;
  private embers: KitSpray;
  private storm: ThietphienStorm;
  private gust: ThietphienGust;
  private ignites: Ignite[] = [];
  private emberAt = new Map<string, number>();
  private time = 0;

  constructor(scene: Scene, private flipbooks: KitFlipbooks, private fallback?: HeroVfx) {
    this.grit = new KitSpray(scene, 'earth');
    this.embers = new KitSpray(scene, 'lava');
    this.storm = new ThietphienStorm(scene, flipbooks, this.grit);
    this.gust = new ThietphienGust(scene, flipbooks, this.grit);
  }

  prepare(): void {
    for (const id of Object.values(THIETPHIEN_ATLAS)) this.flipbooks.ensure(id);
    this.fallback?.prepare();
  }

  /** `cast skill-h00B` (server windup); `at` is the target point. */
  cast(event: GameEvent, at: Vector3, reduced: boolean): boolean {
    if (event.skillId !== THIETPHIEN_SKILL) return this.fallback?.cast?.(event, at, reduced) ?? false;
    this.storm.cast(event.source ?? 'unknown', at, event.windup ?? DEFAULT_WINDUP, reduced);
    debug('visual.thietphien.cast', { eventId: event.id, windup: event.windup ?? DEFAULT_WINDUP, reduced });
    return true;
  }

  /** `ability skill-h00B`: `origin` = Thiết Phiến, `at` = the target point, `extra.targets` = every enemy hit. */
  ability(event: GameEvent, origin: Vector3, at: Vector3, reduced: boolean, extra?: AbilityExtra): boolean {
    if (event.kind !== 'ability' || event.skillId !== THIETPHIEN_SKILL)
      return this.fallback?.ability?.(event, origin, at, reduced, extra) ?? false;
    const zone = skillZone(origin, at);
    this.storm.blow(event.source ?? 'unknown', origin, zone, reduced);
    this.gust.throw(origin, zone, extra?.targets ?? [], reduced);
    debug('visual.thietphien.ability', { eventId: event.id, kind: zone.kind, targets: extra?.targets.length ?? 0, reduced });
    return true;
  }

  /** `ignite`: first frame an enemy burns from her detonation; `ember`: every frame it keeps burning. */
  mark(kind: string, id: string, at: Vector3, reduced: boolean): void {
    if (kind === 'ignite') { this.flare(at, reduced); return; }
    if (kind !== 'ember') { this.fallback?.mark?.(kind, id, at, reduced); return; }
    if (reduced) return;
    if (this.time - (this.emberAt.get(id) ?? -Infinity) < EMBER_GATE) return;
    this.emberAt.set(id, this.time);
    this.embers.trail(new Vector3(at.x, 1, at.z), new Vector3(.4, 1.5, 0), 2);
  }

  tick(dt: number, time: number): void {
    this.time = time;
    this.storm.tick(dt);
    this.gust.tick(dt);
    for (let i = this.ignites.length - 1; i >= 0; i--) {
      const flare = this.ignites[i];
      flare.age += dt;
      if (flare.age >= IGNITE_SECONDS) { this.flipbooks.release(THIETPHIEN_ATLAS.ignite, flare.sprite); this.ignites.splice(i, 1); }
      else flare.sprite.cellIndex = igniteFrame(flare.age);
    }
    if (this.emberAt.size > 64) {
      for (const [id, last] of this.emberAt) if (time - last > EMBER_GATE * 4) this.emberAt.delete(id);
    }
  }

  clear(): void {
    this.storm.clear();
    this.gust.clear();
    for (const flare of this.ignites) this.flipbooks.release(THIETPHIEN_ATLAS.ignite, flare.sprite);
    this.ignites.length = 0;
    this.grit.clear();
    this.embers.clear();
    this.emberAt.clear();
  }

  private flare(at: Vector3, reduced: boolean): void {
    if (reduced || this.ignites.length >= MAX_IGNITES) return;
    const sprite = this.flipbooks.spawn(THIETPHIEN_ATLAS.ignite, at, 1);
    if (!sprite) return;
    sprite.cellIndex = 0;
    this.ignites.push({ sprite, age: 0 });
    debug('visual.thietphien.ignite', { live: this.ignites.length });
  }
}
