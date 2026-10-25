import type { Scene } from '@babylonjs/core/scene.js';
import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { CHUCDUNG as C } from '../../../content/chucdung-design.js';
import { ChucdungEruption } from './visual-chucdung-eruption.js';
import { ChucdungGround } from './visual-chucdung-ground.js';
import type { HeroVfx } from './visual-kit-hero.js';
import { KitSpray } from './visual-kit-spray.js';

/** Generic fire accents (flipbook explosion) owned by VisualFire; passed in so the hero module stays kit-only. */
export type FireAccent = (at: Vector3, full: boolean, radius: number) => void;

/** Server windup for generic abilities (combat.ts WINDUP_SECONDS) when the cast event omits it. */
const DEFAULT_WINDUP = .25;

/**
 * Chúc Dung VFX on the kit (HeroVfx, palette `lava`). Ultimate `skill-h01H`: windup telegraph → volcano +
 * molten plume + shock ring → lava sea (snapshot ground) with sparks. Basic `trait-h01H`: shock ring, sparks,
 * embers underfoot (snapshot ground). Death burst `burst-h01H`: bigger ring + sparks. The fire flipbook
 * explosion is still delegated to VisualFire through `fire`. All timing follows server events/snapshots.
 */
export class VisualChucdung implements HeroVfx {
  readonly heroId = C.id;
  private spray: KitSpray;
  private eruption: ChucdungEruption;
  private ground: ChucdungGround;

  constructor(scene: Scene, private fire: FireAccent) {
    this.spray = new KitSpray(scene, 'lava');
    this.eruption = new ChucdungEruption(scene, this.spray);
    this.ground = new ChucdungGround(scene, this.spray);
  }

  /** No atlases: everything is shader + spray. */
  prepare(): void { /* nothing to load */ }

  cast(event: GameEvent, at: Vector3, reduced: boolean): boolean {
    if (event.skillId !== `skill-${C.id}`) return false;
    this.eruption.cast(at, event.windup ?? DEFAULT_WINDUP, reduced, event.id);
    return true;
  }

  /** `at` is the event point (blast / splash centre); the caster `origin` is not used. */
  ability(event: GameEvent, _origin: Vector3, at: Vector3, reduced: boolean): boolean {
    if (event.kind === 'ability' && event.skillId === `skill-${C.id}`) {
      this.eruption.erupt(at, reduced, event.id, event.targets?.length ?? 0);
      if (!reduced) this.fire(at.clone(), true, C.lavaRadius);
      return true;
    }
    if (event.skillId === `trait-${C.id}` || event.skillId === `burst-${C.id}`) {
      const burst = event.skillId === `burst-${C.id}`;
      this.eruption.strike(at, burst, reduced);
      if (!reduced) this.fire(at.clone(), burst, C.splashRadius);
      return true;
    }
    return false;
  }

  /** Snapshot markers `lava` (chucdung-lava) and `ember` (chucdung-ember). */
  mark(kind: string, id: string, at: Vector3, reduced: boolean): void {
    this.ground.mark(kind, id, at, reduced);
  }

  tick(dt: number, time: number): void {
    this.eruption.tick(dt, time);
    this.ground.tick(dt, time);
  }

  clear(): void {
    this.eruption.clear();
    this.ground.clear();
    this.spray.clear();
  }
}
