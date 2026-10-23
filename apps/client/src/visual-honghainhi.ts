import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { debug } from './debug.js';
import { HonghainhiBurn } from './visual-honghainhi-burn.js';
import { HonghainhiSweep } from './visual-honghainhi-sweep.js';
import { DEFAULT_WINDUP, HONGHAINHI_ATLAS, HONGHAINHI_ID, HONGHAINHI_SKILL } from './visual-honghainhi-timeline.js';
import type { KitFlipbooks } from './visual-kit-flipbooks.js';
import type { AbilityExtra, HeroVfx } from './visual-kit-hero.js';
import { KitSpray } from './visual-kit-spray.js';

/**
 * Hồng Hài Nhi (h00C) skill VFX on the kit. "Tam Muội Chân Hỏa Liên Kích": the fire gathers around him during the
 * windup (`cast`), the spear sweeps a full 360 degree circle to the 4.2 radius and leaves a scorched ring (`ability`,
 * centred on him, not on the nearest enemy), and every enemy the snapshot shows burning from him carries a flame
 * column for the 4 s burn (marker `burn`). His basic attack (`trait-h00C`, piercing thrust) is not claimed: those events
 * and the markers this module does not own go to `fallback` (the tier recipe painter).
 */
export class VisualHonghainhi implements HeroVfx {
  readonly heroId = HONGHAINHI_ID;
  private embers: KitSpray;
  private sweep: HonghainhiSweep;
  private burn: HonghainhiBurn;

  constructor(scene: Scene, private flipbooks: KitFlipbooks, private fallback?: HeroVfx) {
    this.embers = new KitSpray(scene, 'lava');
    this.sweep = new HonghainhiSweep(scene, this.embers);
    this.burn = new HonghainhiBurn(flipbooks, this.embers);
  }

  prepare(): void {
    this.flipbooks.ensure(HONGHAINHI_ATLAS.ignite);
    this.fallback?.prepare();
  }

  /** `cast skill-h00C` (server windup) at Hồng Hài Nhi. */
  cast(event: GameEvent, at: Vector3, reduced: boolean): boolean {
    if (event.skillId !== HONGHAINHI_SKILL) return this.fallback?.cast?.(event, at, reduced) ?? false;
    this.sweep.cast(event.source ?? 'unknown', at, event.windup ?? DEFAULT_WINDUP, reduced);
    debug('visual.honghainhi.cast', { eventId: event.id, windup: event.windup ?? DEFAULT_WINDUP, reduced });
    return true;
  }

  /** `ability skill-h00C`: `origin` = Hồng Hài Nhi, `extra.targets` = every enemy within 4.2 (the burn marks follow from the snapshot). */
  ability(event: GameEvent, origin: Vector3, at: Vector3, reduced: boolean, extra?: AbilityExtra): boolean {
    if (event.kind !== 'ability' || event.skillId !== HONGHAINHI_SKILL) return this.fallback?.ability?.(event, origin, at, reduced, extra) ?? false;
    this.sweep.open(event.source ?? 'unknown', origin, reduced);
    debug('visual.honghainhi.ability', { eventId: event.id, targets: extra?.targets.length ?? 0, reduced });
    return true;
  }

  /** Snapshot marker `burn` on an enemy burning from him; anything else belongs to the recipe painter. */
  mark(kind: string, id: string, at: Vector3, reduced: boolean): void {
    if (kind === 'burn') this.burn.mark(id, at, reduced);
    else this.fallback?.mark?.(kind, id, at, reduced);
  }

  tick(dt: number, time: number): void {
    this.sweep.tick(dt);
    this.burn.tick(dt, time);
  }

  clear(): void {
    this.sweep.clear();
    this.burn.clear();
    this.embers.clear();
  }
}
