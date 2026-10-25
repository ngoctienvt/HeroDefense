import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Sprite } from '@babylonjs/core/Sprites/sprite.js';
import { debug } from './debug.js';
import type { KitFlipbooks } from './visual-kit-flipbooks.js';
import type { KitSpray } from './visual-kit-spray.js';
import { CULINH_ATLAS, ORPHAN_SECONDS, QUAKE_AFTER_SECONDS, QUAKE_RADIUS, quakeFormingFrame, quakeImpactFrame,
  SLAM_DELAY, STILL_HAMMER, STILL_SECONDS, STILL_WALL } from './visual-culinh-timeline.js';

const MAX_QUAKES = 6;

type Quake = { key: string; at: Vector3; sprite?: Sprite; age: number; windup: number; impactAge?: number;
  slammed: boolean; reduced: boolean };

/**
 * The hammer half of Thiết Bích Trấn, on Cự Linh himself. Cast (server windup): gold runes light the ring and the
 * ghost hammer drops behind him (flipbook 0-3, held). Ability: the hammer lands, a gold shard ring leaves the
 * ground, and the iron wall ring bursts up around the 3.0 quake radius, stands, and sinks (4-15). The slow on
 * enemies inside that radius is gameplay; the marker for it is the shared slow marker.
 */
export class CulinhQuake {
  private quakes: Quake[] = [];

  constructor(private flipbooks: KitFlipbooks, private spray: KitSpray) {}

  /** `cast skill-h00E` at Cự Linh: the hammer holds overhead (frame 3) until the ability. */
  cast(source: string, at: Vector3, windup: number, reduced: boolean): void {
    this.drop(source);
    if (this.quakes.length >= MAX_QUAKES) { debug('visual.kit.pool.cap', { pool: 'culinh-quake' }); return; }
    const entry: Quake = { key: source, at: at.clone(), age: 0, windup, slammed: false, reduced };
    entry.sprite = this.flipbooks.spawn(CULINH_ATLAS.quake, at, 1);
    this.quakes.push(entry);
  }

  /** `ability skill-h00E`: centred on Cự Linh (`origin`), not on the ally the event lists first. */
  slam(source: string, origin: Vector3, reduced: boolean): void {
    let entry = this.quakes.find(item => item.key === source && item.impactAge === undefined);
    if (!entry) {
      if (this.quakes.length >= MAX_QUAKES) { debug('visual.kit.pool.cap', { pool: 'culinh-quake' }); return; }
      entry = { key: source, at: origin.clone(), age: 0, windup: 0, slammed: false, reduced };
      entry.sprite = this.flipbooks.spawn(CULINH_ATLAS.quake, origin, 1);
      this.quakes.push(entry);
    }
    entry.at.copyFrom(origin);
    entry.impactAge = 0;
    if (entry.sprite) this.flipbooks.place(CULINH_ATLAS.quake, entry.sprite, origin, 1);
    debug('visual.culinh.slam', { reduced, sprite: Boolean(entry.sprite) });
  }

  tick(dt: number): void {
    for (let i = this.quakes.length - 1; i >= 0; i--) {
      const entry = this.quakes[i];
      entry.age += dt;
      if (entry.impactAge !== undefined) entry.impactAge += dt;
      if (entry.sprite && entry.reduced) entry.sprite.cellIndex = entry.impactAge === undefined ? STILL_HAMMER : STILL_WALL;
      else if (entry.sprite) {
        entry.sprite.cellIndex = entry.impactAge === undefined
          ? quakeFormingFrame(entry.age, entry.windup || .12) : quakeImpactFrame(entry.impactAge);
      }
      if (entry.impactAge !== undefined && !entry.slammed && entry.impactAge >= SLAM_DELAY) {
        entry.slammed = true;
        if (!entry.reduced) {
          this.spray.ring(entry.at, QUAKE_RADIUS, 20, .35, 4, 2.4);
          this.spray.ring(entry.at, QUAKE_RADIUS * .55, 10, .3, 2.5, 3.2);
        }
      }
      const after = entry.reduced ? STILL_SECONDS : QUAKE_AFTER_SECONDS;
      const done = entry.impactAge !== undefined ? entry.impactAge >= after : entry.age >= ORPHAN_SECONDS;
      if (done) { this.flipbooks.release(CULINH_ATLAS.quake, entry.sprite); this.quakes.splice(i, 1); }
    }
  }

  clear(): void {
    for (const entry of this.quakes) this.flipbooks.release(CULINH_ATLAS.quake, entry.sprite);
    this.quakes.length = 0;
  }

  /** A new cast from the same Cự Linh replaces a slot still waiting for its ability. */
  private drop(source: string): void {
    const index = this.quakes.findIndex(entry => entry.key === source && entry.impactAge === undefined);
    if (index < 0) return;
    this.flipbooks.release(CULINH_ATLAS.quake, this.quakes[index].sprite);
    this.quakes.splice(index, 1);
  }
}
