import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Sprite } from '@babylonjs/core/Sprites/sprite.js';
import { debug } from './debug.js';
import type { KitFlipbooks } from './visual-kit-flipbooks.js';
import { arcHeight } from './visual-kit-timeline.js';
import { SOUL_ARC, SOUL_ARRIVE_SECONDS, SOUL_END_Y, SOUL_FLIGHT, SOUL_START_Y, soulAlpha, soulArriveFrame, soulFlightFrame,
  soulProgress, VOTHUONG_ATLAS } from './visual-vothuong-timeline.js';

const SOUL_SCALE = 1;
const MAX_SOULS = 6;
/** Reduced motion: no flight, one still frame of the wisp settling into him. */
const STILL_FRAME = 9;
const STILL_SECONDS = .35;

type Soul = { sprite: Sprite; from: Vector3; to: Vector3; age: number; reduced: boolean };

/**
 * The soul of a victim the server killed flying back to Vô Thường (flipbook `vothuong-soul`: wisp 0-7 in flight, 8-15
 * dissolving into him) on the beat the kill refunds his Nộ. The base of the wisp follows an arc from the victim's feet
 * to his chest height; the sprite draws after the ground layers and writes no depth, so he stays crisp.
 */
export class VothuongSoul {
  private souls: Soul[] = [];

  constructor(private flipbooks: KitFlipbooks) {}

  release(at: Vector3, origin: Vector3, reduced: boolean): void {
    if (this.souls.length >= MAX_SOULS) { debug('visual.kit.pool.cap', { pool: 'vothuong-soul' }); return; }
    const from = new Vector3(at.x, SOUL_START_Y, at.z);
    const to = new Vector3(origin.x, SOUL_END_Y, origin.z);
    const sprite = this.flipbooks.spawn(VOTHUONG_ATLAS.soul, reduced ? to : from, SOUL_SCALE);
    if (!sprite) return;
    this.souls.push({ sprite, from, to, age: 0, reduced });
    debug('visual.vothuong.soul', { reduced });
  }

  tick(dt: number): void {
    for (let i = this.souls.length - 1; i >= 0; i--) {
      const soul = this.souls[i];
      soul.age += dt;
      const total = soul.reduced ? STILL_SECONDS : SOUL_FLIGHT + SOUL_ARRIVE_SECONDS;
      if (soul.age >= total) { this.free(soul); this.souls.splice(i, 1); continue; }
      if (soul.reduced) { soul.sprite.cellIndex = STILL_FRAME; continue; }
      const flying = soul.age < SOUL_FLIGHT;
      soul.sprite.cellIndex = flying ? soulFlightFrame(soul.age) : soulArriveFrame(soul.age);
      const p = flying ? soulProgress(soul.age) : 1;
      const base = new Vector3(soul.from.x + (soul.to.x - soul.from.x) * p, 0, soul.from.z + (soul.to.z - soul.from.z) * p);
      base.y = soul.from.y + (soul.to.y - soul.from.y) * p + (flying ? arcHeight(p, SOUL_ARC) : 0);
      this.flipbooks.place(VOTHUONG_ATLAS.soul, soul.sprite, base, SOUL_SCALE);
      soul.sprite.color.a = soulAlpha(soul.age);
    }
  }

  clear(): void {
    for (const soul of this.souls) this.free(soul);
    this.souls.length = 0;
  }

  private free(soul: Soul): void {
    soul.sprite.color.a = 1;
    this.flipbooks.release(VOTHUONG_ATLAS.soul, soul.sprite);
  }
}
