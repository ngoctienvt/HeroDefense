import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Sprite } from '@babylonjs/core/Sprites/sprite.js';
import { debug } from './debug.js';
import type { KitFlipbooks } from './visual-kit-flipbooks.js';
import type { KitSpray } from './visual-kit-spray.js';
import { BURN_GAP, EMBER_GATE, HONGHAINHI_ATLAS, IGNITE_STILL_FRAME, igniteBurningFrame, igniteTailFrame, TAIL_SECONDS } from './visual-honghainhi-timeline.js';

type Burning = { sprite: Sprite; at: Vector3; age: number; sinceMark: number; reduced: boolean; lastEmber: number };

/**
 * The flame column on every enemy the snapshot shows burning from Hồng Hài Nhi (marker `burn`, every frame the server's
 * `burn` holds, 4 s after each hit): it climbs once, loops while the burn lasts, then plays out and is returned to the
 * pool. The flipbook leaves its centre column empty, so the enemy stays readable inside the fire. Pure presentation.
 */
export class HonghainhiBurn {
  private burning = new Map<string, Burning>();
  private time = 0;

  constructor(private flipbooks: KitFlipbooks, private embers: KitSpray) {}

  mark(id: string, at: Vector3, reduced: boolean): void {
    let burn = this.burning.get(id);
    if (!burn) {
      const sprite = this.flipbooks.spawn(HONGHAINHI_ATLAS.ignite, at, 1);
      if (!sprite) return;
      burn = { sprite, at: at.clone(), age: 0, sinceMark: 0, reduced, lastEmber: this.time };
      this.burning.set(id, burn);
      debug('visual.honghainhi.burn.start', { reduced });
    }
    burn.at.copyFrom(at);
    burn.sinceMark = 0;
  }

  tick(dt: number, time: number): void {
    this.time = time;
    for (const [id, burn] of this.burning) {
      burn.age += dt; burn.sinceMark += dt;
      const ended = Math.max(0, burn.sinceMark - BURN_GAP);
      if (burn.reduced ? ended > 0 : ended >= TAIL_SECONDS) { this.drop(id, burn); continue; }
      this.flipbooks.place(HONGHAINHI_ATLAS.ignite, burn.sprite, burn.at, 1);
      burn.sprite.cellIndex = burn.reduced ? IGNITE_STILL_FRAME : ended > 0 ? igniteTailFrame(ended) : igniteBurningFrame(burn.age);
      if (!burn.reduced && ended === 0 && time - burn.lastEmber >= EMBER_GATE) {
        burn.lastEmber = time;
        this.embers.trail(new Vector3(burn.at.x, 1.2, burn.at.z), new Vector3(0, 1.6, 0), 1);
      }
    }
  }

  clear(): void {
    for (const burn of this.burning.values()) this.flipbooks.release(HONGHAINHI_ATLAS.ignite, burn.sprite);
    this.burning.clear();
  }

  private drop(id: string, burn: Burning): void {
    this.flipbooks.release(HONGHAINHI_ATLAS.ignite, burn.sprite);
    this.burning.delete(id);
  }
}
