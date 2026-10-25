import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { debug } from './debug.js';
import type { KitFlipbooks } from './visual-kit-flipbooks.js';
import type { AbilityExtra, HeroVfx } from './visual-kit-hero.js';
import { KitSpray } from './visual-kit-spray.js';
import { LadongtanArray } from './visual-ladongtan-array.js';
import { LadongtanFall } from './visual-ladongtan-fall.js';
import { DEFAULT_WINDUP, LADONGTAN_ARRAY_MARK, LADONGTAN_ATLAS, LADONGTAN_ID, LADONGTAN_SKILL } from './visual-ladongtan-timeline.js';

/**
 * Lã Động Tân (h00D) skill VFX on the kit. "Thuần Dương Thiên Kiếm Trận": the glint and the giant sword falling
 * onto the cluster during the windup (`cast`), the bite + shock wave on the ability, then the burning sword array
 * for as long as the snapshot holds the server ground effect. His basic shot (`trait-h00D`, piercing flying sword)
 * is not claimed: those events go to `fallback` (the tier recipe painter), as does any marker this module does not own.
 */
export class VisualLadongtan implements HeroVfx {
  readonly heroId = LADONGTAN_ID;
  private sparks: KitSpray;
  private embers: KitSpray;
  private fall: LadongtanFall;
  private array: LadongtanArray;

  constructor(scene: Scene, private flipbooks: KitFlipbooks, private fallback?: HeroVfx) {
    this.sparks = new KitSpray(scene, 'gold');
    this.embers = new KitSpray(scene, 'lava');
    this.fall = new LadongtanFall(flipbooks, this.sparks);
    this.array = new LadongtanArray(scene, flipbooks, this.embers);
  }

  prepare(): void {
    for (const id of Object.values(LADONGTAN_ATLAS)) this.flipbooks.ensure(id);
    this.fallback?.prepare();
  }

  /** `cast skill-h00D` (server windup) at the targeted cluster. */
  cast(event: GameEvent, at: Vector3, reduced: boolean): boolean {
    if (event.skillId !== LADONGTAN_SKILL) return this.fallback?.cast?.(event, at, reduced) ?? false;
    this.fall.cast(event.source ?? 'unknown', at, event.windup ?? DEFAULT_WINDUP, reduced);
    debug('visual.ladongtan.cast', { eventId: event.id, windup: event.windup ?? DEFAULT_WINDUP, reduced });
    return true;
  }

  /** `ability skill-h00D` (`origin` = caster, `at` = the cluster the sword lands on). */
  ability(event: GameEvent, origin: Vector3, at: Vector3, reduced: boolean, extra?: AbilityExtra): boolean {
    if (event.kind !== 'ability' || event.skillId !== LADONGTAN_SKILL) return this.fallback?.ability?.(event, origin, at, reduced, extra) ?? false;
    this.fall.impact(event.source ?? 'unknown', at, reduced);
    this.array.strike(at, reduced);
    debug('visual.ladongtan.ability', { eventId: event.id, targets: extra?.targets.length ?? 0, reduced });
    return true;
  }

  /** Snapshot marker `array` for a live h00D ground effect; anything else belongs to the recipe painter. */
  mark(kind: string, id: string, at: Vector3, reduced: boolean): void {
    if (kind === LADONGTAN_ARRAY_MARK) this.array.mark(id, at, reduced);
    else this.fallback?.mark?.(kind, id, at, reduced);
  }

  tick(dt: number, time: number): void {
    this.fall.tick(dt);
    this.array.tick(dt, time);
  }

  clear(): void {
    this.fall.clear();
    this.array.clear();
    this.sparks.clear();
    this.embers.clear();
  }
}
