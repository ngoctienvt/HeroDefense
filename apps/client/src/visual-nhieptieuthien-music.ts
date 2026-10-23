import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Sprite } from '@babylonjs/core/Sprites/sprite.js';
import { debug } from './debug.js';
import type { KitFlipbooks } from './visual-kit-flipbooks.js';
import type { KitSpray } from './visual-kit-spray.js';
import { MUSIC_AFTER_SECONDS, MUSIC_RELEASE_DELAY, musicFormingFrame, musicOpenFrame, NHIEP_ATLAS, ORPHAN_SECONDS } from './visual-nhieptieuthien-timeline.js';

/** The authored music cell is the atlas ortho (6 units): the open wreath rings her at ~2x her body width, centre empty. */
const MUSIC_SCALE = 1;
const MAX_WREATHS = 6;
/** Reduced motion keeps the telegraph and the activation as still frames: forming (3), then the open wreath (7). */
const STILL_FORMING = 3;
const STILL_OPEN = 7;
const STILL_SECONDS = .35;
const FLECK_RADIUS = 2.2;

type Wreath = { key: string; at: Vector3; sprite?: Sprite; age: number; windup: number; openAge?: number; released: boolean; reduced: boolean };

/**
 * Lan Nhược U Hồn Khúc on Tiểu Thiến herself. Cast (server windup): the orchid wreath of sound forms
 * (flipbook 0-3). Ability: it opens and its notes scatter (4-15). Pure presentation.
 */
export class NhiepMusic {
  private wreaths: Wreath[] = [];

  constructor(private flipbooks: KitFlipbooks, private flecks: KitSpray) {}

  /** `cast skill-h03O` at Tiểu Thiến: the wreath holds on frame 3 until the ability. */
  cast(source: string, at: Vector3, windup: number, reduced: boolean): void {
    this.drop(source);
    if (this.wreaths.length >= MAX_WREATHS) { debug('visual.kit.pool.cap', { pool: 'nhieptieuthien-music' }); return; }
    this.wreaths.push({ key: source, at: at.clone(), age: 0, windup, released: false, reduced,
      sprite: this.flipbooks.spawn(NHIEP_ATLAS.music, at, MUSIC_SCALE) });
  }

  /** `ability skill-h03O`: centred on Tiểu Thiến (`origin`), never on a recipient. */
  open(source: string, origin: Vector3, reduced: boolean): void {
    let wreath = this.wreaths.find(item => item.key === source && item.openAge === undefined);
    if (!wreath) {
      if (this.wreaths.length >= MAX_WREATHS) return;
      wreath = { key: source, at: origin.clone(), age: 0, windup: 0, released: false, reduced,
        sprite: this.flipbooks.spawn(NHIEP_ATLAS.music, origin, MUSIC_SCALE) };
      this.wreaths.push(wreath);
    }
    wreath.at.copyFrom(origin);
    wreath.openAge = 0;
    if (wreath.sprite) this.flipbooks.place(NHIEP_ATLAS.music, wreath.sprite, origin, MUSIC_SCALE);
    debug('visual.nhieptieuthien.wreath', { reduced, sprite: Boolean(wreath.sprite) });
  }

  tick(dt: number): void {
    for (let i = this.wreaths.length - 1; i >= 0; i--) {
      const wreath = this.wreaths[i];
      wreath.age += dt;
      if (wreath.openAge !== undefined) wreath.openAge += dt;
      if (wreath.sprite && wreath.reduced) wreath.sprite.cellIndex = wreath.openAge === undefined ? STILL_FORMING : STILL_OPEN;
      else if (wreath.sprite) {
        wreath.sprite.cellIndex = wreath.openAge === undefined ? musicFormingFrame(wreath.age, wreath.windup || .12) : musicOpenFrame(wreath.openAge);
      }
      if (wreath.openAge !== undefined && !wreath.released && wreath.openAge >= MUSIC_RELEASE_DELAY) {
        wreath.released = true;
        if (!wreath.reduced) this.flecks.ring(wreath.at, FLECK_RADIUS, 18, 1, 3.6, 2.2);
      }
      const after = wreath.reduced ? STILL_SECONDS : MUSIC_AFTER_SECONDS;
      const done = wreath.openAge !== undefined ? wreath.openAge >= after : wreath.age >= ORPHAN_SECONDS;
      if (done) { this.flipbooks.release(NHIEP_ATLAS.music, wreath.sprite); this.wreaths.splice(i, 1); }
    }
  }

  clear(): void {
    for (const wreath of this.wreaths) this.flipbooks.release(NHIEP_ATLAS.music, wreath.sprite);
    this.wreaths.length = 0;
  }

  /** A new cast from the same Tiểu Thiến replaces a slot still waiting for its ability. */
  private drop(source: string): void {
    const index = this.wreaths.findIndex(item => item.key === source && item.openAge === undefined);
    if (index < 0) return;
    this.flipbooks.release(NHIEP_ATLAS.music, this.wreaths[index].sprite);
    this.wreaths.splice(index, 1);
  }
}
