import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { debug } from './debug.js';
import { billboardCenter, screenUp } from './visual-kit-billboard.js';
import type { KitPainted } from './visual-kit-painted.js';
import { artMeta, billboardScale } from './visual-chuclong-assets.js';
import { cameraLook, placeStrip, resetStrip } from './visual-de-tuan-strip.js';
import { GIFT_ARC, GIFT_FLIGHT_SECONDS, GIFT_HEIGHT, giftAlpha, giftProgress, GIFT_SHEET_SIZE, giftSheetFrame, giftSheetSeconds,
  GIFT_STRIP_LENGTH, GIFT_STRIP_WIDTH, MAX_GIFTS } from './visual-chuclong-timeline.js';

type Gift = { strip?: Mesh; sheet?: Mesh; from: Vector3; to: Vector3; age: number; reduced: boolean; landed: boolean };

/**
 * Quà thời gian: one two-tone sun/moon strip flies head first from the caster to each ally the tracker listed, then the
 * ally gets the closing arcs at the feet. The server only confirms the resolve (no per-ally event), so this is an accent on
 * eligible allies, not proof of the 3 s cooldown cut. The strip keeps its own 3:1 aspect (placeStrip, never mirrored); an
 * ally standing on the caster gets the arcs only. Reduced motion skips the flight.
 */
export class ChuclongGift {
  private gifts: Gift[] = [];

  constructor(private scene: Scene, private art: KitPainted) {}

  send(from: Vector3, to: Vector3, reduced: boolean): void {
    if (![from.x, from.z, to.x, to.z].every(Number.isFinite)) return;
    if (this.gifts.length >= MAX_GIFTS) { debug('visual.chuclong.cap', { layer: 'gift' }); return; }
    const strip = !reduced && Math.hypot(to.x - from.x, to.z - from.z) > 1 ? this.art.acquire('giftStrip') : undefined;
    // No flight (reduced motion, ally on the caster, pool empty): the closing arcs appear at once.
    const gift: Gift = { strip, from: from.clone(), to: to.clone(), age: 0, reduced, landed: !strip };
    if (gift.landed) gift.sheet = this.art.acquire('giftSheet');
    this.gifts.push(gift);
    this.place(gift, screenUp(this.scene));
  }

  tick(dt: number): void {
    const up = screenUp(this.scene);
    for (let i = this.gifts.length - 1; i >= 0; i--) {
      const gift = this.gifts[i];
      gift.age += dt;
      if (!gift.landed && gift.age >= GIFT_FLIGHT_SECONDS) {
        gift.landed = true; gift.age = 0;
        gift.sheet = this.art.acquire('giftSheet');
      }
      if (gift.landed && gift.age >= giftSheetSeconds(gift.reduced)) { this.free(gift); this.gifts.splice(i, 1); continue; }
      this.place(gift, up);
    }
  }

  clear(): void {
    for (const gift of this.gifts) this.free(gift);
    this.gifts.length = 0;
  }

  private place(gift: Gift, up: Vector3): void {
    if (gift.strip && !gift.landed) {
      const t = giftProgress(gift.age);
      const lift = GIFT_HEIGHT + Math.sin(Math.PI * t) * GIFT_ARC;
      const head = Vector3.Lerp(gift.from, gift.to, t).add(new Vector3(0, lift, 0));
      const ahead = Vector3.Lerp(gift.from, gift.to, Math.min(1, t + .05)).add(new Vector3(0, GIFT_HEIGHT + Math.sin(Math.PI * Math.min(1, t + .05)) * GIFT_ARC, 0));
      let direction = ahead.subtract(head);
      if (direction.lengthSquared() < 1e-6) direction = gift.to.subtract(gift.from);
      if (!placeStrip(gift.strip, head, direction, cameraLook(this.scene), GIFT_STRIP_LENGTH, GIFT_STRIP_WIDTH)) gift.strip.setEnabled(false);
      gift.strip.visibility = giftAlpha(gift.age);
    }
    const meta = artMeta('giftSheet');
    if (gift.sheet && meta && gift.landed) {
      const size = billboardScale('giftSheet', GIFT_SHEET_SIZE);
      gift.sheet.scaling.set(size.x, size.y, 1);
      gift.sheet.position.copyFrom(billboardCenter(gift.to, size.y, meta.anchorY, up, .1));
      this.art.frame(gift.sheet, giftSheetFrame(gift.age, gift.reduced), meta.columns, meta.rows);
      gift.sheet.visibility = 1;
    }
    if (gift.strip && gift.landed) { resetStrip(gift.strip); this.art.release(gift.strip); gift.strip = undefined; }
  }

  private free(gift: Gift): void {
    resetStrip(gift.strip); this.art.release(gift.strip); this.art.release(gift.sheet);
    gift.strip = gift.sheet = undefined;
  }
}
