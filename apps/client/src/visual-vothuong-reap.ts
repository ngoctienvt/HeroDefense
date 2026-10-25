import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Sprite } from '@babylonjs/core/Sprites/sprite.js';
import { debug } from './debug.js';
import type { KitFlipbooks } from './visual-kit-flipbooks.js';
import { ORPHAN_SECONDS, reapAlpha, reapFrame, reapSeconds, SOUL_RELEASE, STRIKE_DELAY, telegraphFrame, TELEGRAPH_FRAMES,
  VOTHUONG_ATLAS } from './visual-vothuong-timeline.js';

const REAP_SCALE = 1;
const MAX_REAPS = 6;
/** Reduced motion keeps the telegraph and the strike as still frames: the tightened ring (3), then the X cut (6). */
const STILL_STRIKE = 6;
const STILL_SECONDS = .35;

type Reap = {
  key: string; at: Vector3; origin?: Vector3; sprite?: Sprite; age: number; windup: number;
  /** Seconds since the ability event; undefined while the telegraph still waits for it. */
  since?: number; killed: boolean; souled: boolean; reduced: boolean;
};

/**
 * "Đoạt Mệnh" on the victim. Cast (server windup): the talisman ring tightens around the victim (flipbook 0-3, held
 * on 3). Ability: once the chain head lands (STRIKE_DELAY) the sickle cuts and bursts (4-8); a victim the server
 * killed keeps playing to 15 (the soul is pulled up) and `onSoul` fires when it leaves the ink, a survivor's ink
 * fades out after the burst. Pure presentation.
 */
export class VothuongReap {
  private reaps: Reap[] = [];

  constructor(private flipbooks: KitFlipbooks, private onSoul: (at: Vector3, origin: Vector3, reduced: boolean) => void) {}

  /** `cast skill-h00H`: `at` is the victim (event x/z), never the caster. */
  cast(key: string, at: Vector3, windup: number, reduced: boolean): void {
    this.drop(key);
    if (this.reaps.length >= MAX_REAPS) { debug('visual.kit.pool.cap', { pool: 'vothuong-reap' }); return; }
    this.reaps.push({ key, at: at.clone(), age: 0, windup, killed: false, souled: false, reduced,
      sprite: this.flipbooks.spawn(VOTHUONG_ATLAS.reap, at, REAP_SCALE) });
  }

  /** `ability skill-h00H`: re-aims the waiting telegraph at the final victim position and arms the strike. */
  strike(key: string, at: Vector3, origin: Vector3, killed: boolean, reduced: boolean): void {
    let reap = this.reaps.find(item => item.key === key && item.since === undefined);
    if (!reap) {
      if (this.reaps.length >= MAX_REAPS) return;
      reap = { key, at: at.clone(), age: 0, windup: 0, killed, souled: false, reduced,
        sprite: this.flipbooks.spawn(VOTHUONG_ATLAS.reap, at, REAP_SCALE) };
      this.reaps.push(reap);
    }
    reap.at.copyFrom(at);
    reap.origin = origin.clone();
    reap.since = 0;
    reap.killed = killed;
    reap.reduced = reduced;
    if (reap.sprite) this.flipbooks.place(VOTHUONG_ATLAS.reap, reap.sprite, at, REAP_SCALE);
    debug('visual.vothuong.reap', { killed, reduced, sprite: Boolean(reap.sprite) });
  }

  tick(dt: number): void {
    for (let i = this.reaps.length - 1; i >= 0; i--) {
      const reap = this.reaps[i];
      reap.age += dt;
      if (reap.since !== undefined) reap.since += dt;
      const sprite = reap.sprite;
      const strikeAge = reap.since === undefined ? -1 : reap.since - STRIKE_DELAY;
      if (sprite) {
        if (reap.reduced) sprite.cellIndex = strikeAge >= 0 ? STILL_STRIKE : TELEGRAPH_FRAMES - 1;
        else if (strikeAge >= 0) { sprite.cellIndex = reapFrame(strikeAge, reap.killed); sprite.color.a = reapAlpha(strikeAge, reap.killed); }
        else sprite.cellIndex = reap.since === undefined ? telegraphFrame(reap.age, reap.windup || .12) : TELEGRAPH_FRAMES - 1;
      }
      if (strikeAge >= SOUL_RELEASE && reap.killed && !reap.souled && !reap.reduced && reap.origin) {
        reap.souled = true;
        this.onSoul(reap.at, reap.origin, false);
      }
      if (reap.killed && !reap.souled && reap.reduced && strikeAge >= 0 && reap.origin) {
        reap.souled = true;
        this.onSoul(reap.at, reap.origin, true);
      }
      const total = reap.reduced ? STILL_SECONDS : reapSeconds(reap.killed);
      const done = reap.since !== undefined ? strikeAge >= total : reap.age >= ORPHAN_SECONDS;
      if (done) { this.release(reap); this.reaps.splice(i, 1); }
    }
  }

  clear(): void {
    for (const reap of this.reaps) this.release(reap);
    this.reaps.length = 0;
  }

  /** A new cast from the same Vô Thường replaces a slot still waiting for its ability. */
  private drop(key: string): void {
    const index = this.reaps.findIndex(item => item.key === key && item.since === undefined);
    if (index < 0) return;
    this.release(this.reaps[index]);
    this.reaps.splice(index, 1);
  }

  private release(reap: Reap): void {
    if (reap.sprite) reap.sprite.color.a = 1;
    this.flipbooks.release(VOTHUONG_ATLAS.reap, reap.sprite);
  }
}
