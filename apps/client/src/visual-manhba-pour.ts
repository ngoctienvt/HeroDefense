import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { Sprite } from '@babylonjs/core/Sprites/sprite.js';
import { debug } from './debug.js';
import type { KitFlipbooks } from './visual-kit-flipbooks.js';
import type { KitSpray } from './visual-kit-spray.js';
import { DEFAULT_WINDUP, FAN_DELAY, FAN_SECONDS, fanFrame, MANHBA_ATLAS, POUR_AFTER_SECONDS, POUR_ORPHAN_SECONDS,
  pourFormingFrame, pourFrame } from './visual-manhba-timeline.js';

const MAX_POURS = 6;
const MAX_FANS = 6;
/** Reduced motion keeps the telegraph and the activation as still frames: wisps (3), pour (7), fan (3). */
const STILL_FORMING = 3;
const STILL_POUR = 7;
const STILL_FAN = 3;
const STILL_SECONDS = .4;
/** The painted strand fan has its origin this far (in atlas ortho units) left of the cell centre; see FAN_CENTER in process-codex-art.py. */
const FAN_ORIGIN_SHIFT = (208 - 160) / 416 * 4.4;
const BUBBLE_RADIUS = 1.6;

type Pour = { key: string; at: Vector3; sprite?: Sprite; age: number; windup: number; openAge?: number; reduced: boolean };
type Fan = { sprite: Sprite; age: number; reduced: boolean; delay: number; flip: boolean };

/**
 * The cast on Mạnh Bà herself: `pour` frames 0-3 rise during the server windup (held on 3), `ability` pours the
 * Vong Xuyên soup (4-7) and bursts the painted strand fan toward the first target. The fan sprite is flipped to
 * whichever side of the SCREEN the first target is on (not world x) and placed so its painted origin sits at her hand.
 */
export class ManhbaPour {
  private pours: Pour[] = [];
  private fans: Fan[] = [];
  private pending: { key: string; origin: Vector3; first: Vector3; reduced: boolean; delay: number }[] = [];

  constructor(private scene: Scene, private flipbooks: KitFlipbooks, private spray: KitSpray) {}

  cast(source: string, at: Vector3, windup: number, reduced: boolean): void {
    this.drop(source);
    if (this.pours.length >= MAX_POURS) { debug('visual.kit.pool.cap', { pool: 'manhba-pour' }); return; }
    this.pours.push({ key: source, at: at.clone(), age: 0, windup, reduced, sprite: this.flipbooks.spawn(MANHBA_ATLAS.pour, at, 1) });
  }

  /** `ability skill-h00I`: pour on her, fan toward the first target (`first`), bubbles around her feet. */
  open(source: string, origin: Vector3, first: Vector3 | undefined, reduced: boolean): void {
    let pour = this.pours.find(item => item.key === source && item.openAge === undefined);
    if (!pour) {
      if (this.pours.length >= MAX_POURS) return;
      pour = { key: source, at: origin.clone(), age: 0, windup: 0, reduced, sprite: this.flipbooks.spawn(MANHBA_ATLAS.pour, origin, 1) };
      this.pours.push(pour);
    }
    pour.at.copyFrom(origin);
    pour.openAge = 0;
    if (pour.sprite) this.flipbooks.place(MANHBA_ATLAS.pour, pour.sprite, origin, 1);
    if (!reduced) this.spray.ring(origin, BUBBLE_RADIUS, 12, .4, 1.6, 2.2);
    if (first) this.pending.push({ key: source, origin: origin.clone(), first: first.clone(), reduced, delay: reduced ? 0 : FAN_DELAY });
    debug('visual.manhba.pour', { reduced, sprite: Boolean(pour.sprite) });
  }

  tick(dt: number): void {
    for (let i = this.pours.length - 1; i >= 0; i--) {
      const pour = this.pours[i];
      pour.age += dt;
      if (pour.openAge !== undefined) pour.openAge += dt;
      if (pour.sprite && pour.reduced) pour.sprite.cellIndex = pour.openAge === undefined ? STILL_FORMING : STILL_POUR;
      else if (pour.sprite) pour.sprite.cellIndex = pour.openAge === undefined ? pourFormingFrame(pour.age, pour.windup || DEFAULT_WINDUP) : pourFrame(pour.openAge);
      const after = pour.reduced ? STILL_SECONDS : POUR_AFTER_SECONDS;
      const done = pour.openAge !== undefined ? pour.openAge >= after : pour.age >= POUR_ORPHAN_SECONDS;
      if (done) { this.flipbooks.release(MANHBA_ATLAS.pour, pour.sprite); this.pours.splice(i, 1); }
    }
    for (let i = this.pending.length - 1; i >= 0; i--) {
      const item = this.pending[i];
      item.delay -= dt;
      if (item.delay > 0) continue;
      this.pending.splice(i, 1);
      this.startFan(item.origin, item.first, item.reduced);
    }
    for (let i = this.fans.length - 1; i >= 0; i--) {
      const fan = this.fans[i];
      fan.age += dt;
      if (fan.age >= (fan.reduced ? STILL_SECONDS : FAN_SECONDS)) { this.flipbooks.release(MANHBA_ATLAS.fan, fan.sprite); this.fans.splice(i, 1); continue; }
      fan.sprite.cellIndex = fan.reduced ? STILL_FAN : fanFrame(fan.age);
    }
  }

  clear(): void {
    for (const pour of this.pours) this.flipbooks.release(MANHBA_ATLAS.pour, pour.sprite);
    for (const fan of this.fans) this.flipbooks.release(MANHBA_ATLAS.fan, fan.sprite);
    this.pours.length = 0;
    this.fans.length = 0;
    this.pending.length = 0;
  }

  private startFan(origin: Vector3, first: Vector3, reduced: boolean): void {
    if (this.fans.length >= MAX_FANS) { debug('visual.kit.pool.cap', { pool: 'manhba-fan' }); return; }
    const right = this.screenRight();
    const side = (first.x - origin.x) * right.x + (first.z - origin.z) * right.z >= 0 ? 1 : -1;
    const at = new Vector3(origin.x + right.x * side * FAN_ORIGIN_SHIFT, 0, origin.z + right.z * side * FAN_ORIGIN_SHIFT);
    const sprite = this.flipbooks.spawn(MANHBA_ATLAS.fan, at, 1);
    if (!sprite) return;
    sprite.invertU = side < 0;
    this.fans.push({ sprite, age: 0, reduced, delay: 0, flip: side < 0 });
    debug('visual.manhba.fan', { side });
  }

  /** Ground-plane unit vector pointing to the right of the screen (the camera can be turned). */
  private screenRight(): { x: number; z: number } {
    const camera = this.scene.activeCamera;
    const raw = camera ? camera.getDirection(new Vector3(1, 0, 0)) : new Vector3(-1, 0, 0);
    const length = Math.hypot(raw.x, raw.z) || 1;
    return { x: raw.x / length, z: raw.z / length };
  }

  /** A new cast from the same Mạnh Bà replaces a slot still waiting for its ability. */
  private drop(source: string): void {
    const index = this.pours.findIndex(item => item.key === source && item.openAge === undefined);
    if (index < 0) return;
    this.flipbooks.release(MANHBA_ATLAS.pour, this.pours[index].sprite);
    this.pours.splice(index, 1);
  }
}
