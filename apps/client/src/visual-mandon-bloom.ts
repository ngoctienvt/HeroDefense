import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Sprite } from '@babylonjs/core/Sprites/sprite.js';
import { debug } from './debug.js';
import type { KitFlipbooks } from './visual-kit-flipbooks.js';
import type { KitSpray } from './visual-kit-spray.js';
import { BLOOM_AFTER_SECONDS, BLOOM_RELEASE_DELAY, bloomFormingFrame, bloomOpenFrame, MANDON_ATLAS, ORPHAN_SECONDS } from './visual-mandon-timeline.js';

/** One authored bloom cell covers ~6.4 world units: the open peony wraps her at roughly twice her body width. */
const BLOOM_SCALE = 1;
const MAX_BLOOMS = 6;
/** Reduced motion keeps the telegraph and the activation as still frames: buds (3), then the open peony (7). */
const STILL_BUDS = 3;
const STILL_OPEN = 7;
const STILL_SECONDS = .35;
const PETAL_BURST_RADIUS = 2.4;

type Bloom = { key: string; at: Vector3; sprite?: Sprite; age: number; windup: number; openAge?: number; released: boolean; reduced: boolean };

/**
 * Bách Hoa Hồi Xuân Khúc on Mẫu Đơn herself. Cast (server windup): the petal glyph ring and buds rise
 * (flipbook 0-3). Ability: the giant peony opens around her and fans its petals out (4-15); `onRelease`
 * fires when it is fully open so the caller can send the ground petal wave. Pure presentation.
 */
export class MandonBloom {
  private blooms: Bloom[] = [];

  constructor(private flipbooks: KitFlipbooks, private petals: KitSpray, private onRelease: (at: Vector3) => void) {}

  /** `cast skill-h00F` at Mẫu Đơn: the buds hold on frame 3 until the ability. */
  cast(source: string, at: Vector3, windup: number, reduced: boolean): void {
    this.drop(source);
    if (this.blooms.length >= MAX_BLOOMS) { debug('visual.kit.pool.cap', { pool: 'mandon-bloom' }); return; }
    this.blooms.push({ key: source, at: at.clone(), age: 0, windup, released: false, reduced,
      sprite: this.flipbooks.spawn(MANDON_ATLAS.bloom, at, BLOOM_SCALE) });
  }

  /** `ability skill-h00F`: centred on Mẫu Đơn (`origin`), never on a recipient. */
  open(source: string, origin: Vector3, reduced: boolean): void {
    let bloom = this.blooms.find(item => item.key === source && item.openAge === undefined);
    if (!bloom) {
      if (this.blooms.length >= MAX_BLOOMS) return;
      bloom = { key: source, at: origin.clone(), age: 0, windup: 0, released: false, reduced,
        sprite: this.flipbooks.spawn(MANDON_ATLAS.bloom, origin, BLOOM_SCALE) };
      this.blooms.push(bloom);
    }
    bloom.at.copyFrom(origin);
    bloom.openAge = 0;
    if (bloom.sprite) this.flipbooks.place(MANDON_ATLAS.bloom, bloom.sprite, origin, BLOOM_SCALE);
    debug('visual.mandon.bloom', { reduced, sprite: Boolean(bloom.sprite) });
  }

  tick(dt: number): void {
    for (let i = this.blooms.length - 1; i >= 0; i--) {
      const bloom = this.blooms[i];
      bloom.age += dt;
      if (bloom.openAge !== undefined) bloom.openAge += dt;
      if (bloom.sprite && bloom.reduced) bloom.sprite.cellIndex = bloom.openAge === undefined ? STILL_BUDS : STILL_OPEN;
      else if (bloom.sprite) {
        bloom.sprite.cellIndex = bloom.openAge === undefined ? bloomFormingFrame(bloom.age, bloom.windup || .12) : bloomOpenFrame(bloom.openAge);
      }
      if (bloom.openAge !== undefined && !bloom.released && bloom.openAge >= BLOOM_RELEASE_DELAY) {
        bloom.released = true;
        if (!bloom.reduced) {
          this.petals.ring(bloom.at, PETAL_BURST_RADIUS, 20, 1, 4.2, 2.4);
          this.onRelease(bloom.at);
        }
      }
      const after = bloom.reduced ? STILL_SECONDS : BLOOM_AFTER_SECONDS;
      const done = bloom.openAge !== undefined ? bloom.openAge >= after : bloom.age >= ORPHAN_SECONDS;
      if (done) { this.flipbooks.release(MANDON_ATLAS.bloom, bloom.sprite); this.blooms.splice(i, 1); }
    }
  }

  clear(): void {
    for (const bloom of this.blooms) this.flipbooks.release(MANDON_ATLAS.bloom, bloom.sprite);
    this.blooms.length = 0;
  }

  /** A new cast from the same Mẫu Đơn replaces a slot still waiting for its ability. */
  private drop(source: string): void {
    const index = this.blooms.findIndex(item => item.key === source && item.openAge === undefined);
    if (index < 0) return;
    this.flipbooks.release(MANDON_ATLAS.bloom, this.blooms[index].sprite);
    this.blooms.splice(index, 1);
  }
}
