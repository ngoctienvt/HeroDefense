import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { debug } from './debug.js';
import { billboardCenter } from './visual-kit-billboard.js';
import type { KitFxBank } from './visual-kit-fx-bank.js';
import type { KitPainted } from './visual-kit-painted.js';
import { GIFT_END_LIFT, GIFT_FLIGHT, GIFT_SIZE, giftPose, PEARL_ASPECT } from './visual-nhien-dang-timeline.js';

type Gift = { mesh?: Mesh; from: Vector3; feet: Vector3; age: number; arrived: boolean; reduced: boolean };
const MAX_GIFTS = 12;
/** Height the pearl leaves the caster from when no cage pearl is available. */
const CASTER_CHEST = 2.3;

/**
 * Shield hand-off: one `shield-h03W` server event per recipient sends one small pearl from the cage (the pearl nearest
 * that ally, else the caster's chest) in an arc to the ally's chest; when it lands a gold ring and motes mark the
 * hand-over. The bubble itself is the shared shield, drawn from the snapshot; this layer only shows who was handed it.
 */
export class NhienDangGifts {
  private gifts: Gift[] = [];

  constructor(private art: KitPainted, private bank: KitFxBank) {}

  /** `from` = the cage pearl nearest the ally (a screen-space centre) or undefined to leave from `origin`'s chest. */
  send(from: Vector3 | undefined, origin: Vector3, ally: Vector3, up: Vector3, reduced: boolean): void {
    const start = from?.clone() ?? billboardCenter(origin, 0, .5, up, CASTER_CHEST);
    const feet = ally.clone();
    if (reduced || Vector3.DistanceSquared(start, billboardCenter(feet, 0, .5, up, GIFT_END_LIFT)) < .25) { this.arrive(feet, reduced); return; }
    if (this.gifts.length >= MAX_GIFTS) { debug('visual.nhiendang.cap', { layer: 'gift' }); this.arrive(feet, reduced); return; }
    this.gifts.push({ from: start, feet, age: 0, arrived: false, reduced });
  }

  tick(dt: number, up: Vector3): void {
    for (let i = this.gifts.length - 1; i >= 0; i--) {
      const gift = this.gifts[i];
      gift.age += dt;
      const pose = giftPose(gift.age);
      if (!gift.arrived && gift.age >= GIFT_FLIGHT) { gift.arrived = true; this.arrive(gift.feet, gift.reduced); }
      if (gift.age >= GIFT_FLIGHT + .08) { this.free(gift); continue; }
      gift.mesh ??= this.art.acquire('pearl');
      if (!gift.mesh) continue;
      const to = billboardCenter(gift.feet, 0, .5, up, GIFT_END_LIFT);
      const at = Vector3.Lerp(gift.from, to, pose.t).addInPlace(up.scale(pose.arc));
      const height = GIFT_SIZE * pose.scale;
      gift.mesh.position.copyFrom(at);
      gift.mesh.scaling.set(height * PEARL_ASPECT, height, 1);
      gift.mesh.visibility = pose.alpha;
    }
  }

  clear(): void { for (const gift of [...this.gifts]) this.free(gift); }

  private arrive(feet: Vector3, reduced: boolean): void {
    this.bank.ring(feet, 1.7, 'lantern', { life: .4, fill: .18, rim: 1, alpha: .85, reduced, order: 6 });
    if (!reduced) this.bank.spray('lantern').ring(feet, .5, 10, .4, 1.2, 2.6);
  }

  private free(gift: Gift): void {
    this.art.release(gift.mesh);
    const index = this.gifts.indexOf(gift);
    if (index >= 0) this.gifts.splice(index, 1);
  }
}
