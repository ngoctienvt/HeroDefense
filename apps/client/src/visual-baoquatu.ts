import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { debug } from './debug.js';
import type { KitFlipbooks } from './visual-kit-flipbooks.js';
import type { HeroVfx } from './visual-kit-hero.js';
import { KitSpray } from './visual-kit-spray.js';
import { BaoquatuBlast } from './visual-baoquatu-blast.js';
import { BaoquatuPlants } from './visual-baoquatu-plant.js';
import { BAOQUATU_ATLAS, BAOQUATU_ID, BAOQUATU_SKILL, DEFAULT_WINDUP } from './visual-baoquatu-timeline.js';

/**
 * Bảo Quả Tử (h03P) skill VFX on the kit. "Thần Mộc Bá Vương Hoa": the `cast` windup puts a tightening spore
 * ring over the target, `ability skill-h03P` throws the golden thorny seed from the caster and bursts it at
 * the target (radius from the catalog), and the summoned Hoa Ăn Thịt (snapshot `summon_plant`, marker
 * `plant`) grows, chomps and withers inside a spore mist of its 3.0 sunder radius. The basic attack
 * (`trait-h03P`) is not claimed here.
 */
export class VisualBaoquatu implements HeroVfx {
  readonly heroId = BAOQUATU_ID;
  private spores: KitSpray;
  private blast: BaoquatuBlast;
  private plants: BaoquatuPlants;

  constructor(scene: Scene, private flipbooks: KitFlipbooks) {
    this.spores = new KitSpray(scene, 'toxin');
    this.blast = new BaoquatuBlast(scene, flipbooks, this.spores);
    this.plants = new BaoquatuPlants(scene, flipbooks, this.spores);
  }

  prepare(): void {
    for (const id of Object.values(BAOQUATU_ATLAS)) this.flipbooks.ensure(id);
  }

  /** `cast skill-h03P` (server windup). battlefield passes the caster as `at`; the event x/z is the target enemy. */
  cast(event: GameEvent, at: Vector3, reduced: boolean): boolean {
    if (event.skillId !== BAOQUATU_SKILL) return false;
    const target = event.x !== undefined && event.z !== undefined ? new Vector3(event.x, 0, event.z) : at;
    this.blast.cast(event.source ?? 'unknown', target, event.windup ?? DEFAULT_WINDUP, reduced);
    debug('visual.baoquatu.cast', { eventId: event.id, windup: event.windup ?? DEFAULT_WINDUP, reduced });
    return true;
  }

  /** `ability skill-h03P`: `origin` = Bảo Quả Tử, `at` = the enemy at the blast centre. */
  ability(event: GameEvent, origin: Vector3, at: Vector3, reduced: boolean): boolean {
    if (event.kind !== 'ability' || event.skillId !== BAOQUATU_SKILL) return false;
    this.blast.detonate(event.source ?? 'unknown', origin, at, reduced);
    debug('visual.baoquatu.ability', { eventId: event.id, targets: event.targets?.length ?? 0, reduced });
    return true;
  }

  /** Snapshot marker `plant` for each live `summon_plant` unit. */
  mark(kind: string, id: string, at: Vector3, reduced: boolean): void {
    if (kind === 'plant') this.plants.mark(id, at, reduced);
  }

  tick(dt: number): void {
    this.blast.tick(dt);
    this.plants.tick(dt);
  }

  clear(): void {
    this.blast.clear();
    this.plants.clear();
    this.spores.clear();
  }
}
