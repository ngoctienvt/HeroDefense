import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Sprite } from '@babylonjs/core/Sprites/sprite.js';
import { debug } from './debug.js';
import type { KitFlipbooks } from './visual-kit-flipbooks.js';
import type { KitSpray } from './visual-kit-spray.js';
import { fallFormingFrame, fallImpactFrame, FALL_AFTER_SECONDS, LADONGTAN_ATLAS, ORPHAN_SECONDS, STILL_FALLING,
  STILL_IMPACT, STILL_SECONDS } from './visual-ladongtan-timeline.js';

const MAX_FALLS = 6;
/** Sparks and stone chips thrown from the bite (gold spray, one burst per impact). */
const SPARKS = 16;
const SPARK_RADIUS = 1.1;

type Fall = { key: string; at: Vector3; sprite?: Sprite; age: number; windup: number; impactAge?: number; reduced: boolean };

/**
 * The giant sword on the cluster. Cast (server windup): the glint and the blade falling (flipbook 0-5, held until
 * the ability). Ability: it bites the ground and dissolves into light (6-15); `onImpact` lets the caller start the
 * array. The sprite is a depth-less billboard, so every actor draws over it: the blade never veils a monster or a bar.
 */
export class LadongtanFall {
  private falls: Fall[] = [];

  constructor(private flipbooks: KitFlipbooks, private sparks: KitSpray) {}

  /** `cast skill-h00D` at the targeted cluster centre. */
  cast(source: string, at: Vector3, windup: number, reduced: boolean): void {
    this.drop(source);
    if (this.falls.length >= MAX_FALLS) { debug('visual.kit.pool.cap', { pool: 'ladongtan-fall' }); return; }
    this.falls.push({ key: source, at: at.clone(), age: 0, windup, reduced,
      sprite: this.flipbooks.spawn(LADONGTAN_ATLAS.fall, at, 1) });
  }

  /** `ability skill-h00D`: the bite. A missing cast (late join, replay) spawns the sprite here. */
  impact(source: string, at: Vector3, reduced: boolean): void {
    let fall = this.falls.find(item => item.key === source && item.impactAge === undefined);
    if (!fall) {
      if (this.falls.length >= MAX_FALLS) return;
      fall = { key: source, at: at.clone(), age: 0, windup: 0, reduced, sprite: this.flipbooks.spawn(LADONGTAN_ATLAS.fall, at, 1) };
      this.falls.push(fall);
    }
    fall.at.copyFrom(at);
    fall.impactAge = 0;
    if (fall.sprite) this.flipbooks.place(LADONGTAN_ATLAS.fall, fall.sprite, at, 1);
    if (!reduced) this.sparks.ring(at, SPARK_RADIUS, SPARKS, .2, 4.4, 3.2);
    debug('visual.ladongtan.fall', { reduced, sprite: Boolean(fall.sprite) });
  }

  tick(dt: number): void {
    for (let i = this.falls.length - 1; i >= 0; i--) {
      const fall = this.falls[i];
      fall.age += dt;
      if (fall.impactAge !== undefined) fall.impactAge += dt;
      if (fall.sprite) {
        fall.sprite.cellIndex = fall.reduced
          ? (fall.impactAge === undefined ? STILL_FALLING : STILL_IMPACT)
          : (fall.impactAge === undefined ? fallFormingFrame(fall.age, fall.windup || .12) : fallImpactFrame(fall.impactAge));
      }
      const after = fall.reduced ? STILL_SECONDS : FALL_AFTER_SECONDS;
      const done = fall.impactAge !== undefined ? fall.impactAge >= after : fall.age >= ORPHAN_SECONDS;
      if (done) { this.flipbooks.release(LADONGTAN_ATLAS.fall, fall.sprite); this.falls.splice(i, 1); }
    }
  }

  clear(): void {
    for (const fall of this.falls) this.flipbooks.release(LADONGTAN_ATLAS.fall, fall.sprite);
    this.falls.length = 0;
  }

  /** A new cast from the same caster replaces a slot still waiting for its ability. */
  private drop(source: string): void {
    const index = this.falls.findIndex(item => item.key === source && item.impactAge === undefined);
    if (index < 0) return;
    this.flipbooks.release(LADONGTAN_ATLAS.fall, this.falls[index].sprite);
    this.falls.splice(index, 1);
  }
}
