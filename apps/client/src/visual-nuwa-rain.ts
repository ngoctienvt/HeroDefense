import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { debug } from './debug.js';
import { billboardCenter, screenUp } from './visual-kit-billboard.js';
import type { KitFxBank } from './visual-kit-fx-bank.js';
import type { KitPainted } from './visual-kit-painted.js';
import type { KitSpray } from './visual-kit-spray.js';
import { artMeta, billboardScale, groundScale } from './visual-nuwa-assets.js';
import { FALL_SECONDS, HIT_WIDTH, hitFrame, hitSeconds, MARK_DIAMETER, MARK_FRAME, markAlpha, MARK_SECONDS, MAX_RIBBONS,
  nearestFirst, RAIN_WIDTH, rainDelay, rainLife, rainScale, rainState, targetBudget } from './visual-nuwa-timeline.js';

type Piece = { rain?: Mesh; hit?: Mesh; mark?: Mesh; at: Vector3; age: number; life: number; reduced: boolean;
  landed: boolean; tint: number; markSet: boolean };
/** Painted planes of one resolve: (rain + hit + mark) × MAX_TARGETS; two overlapping resolves still fit the pool. */
const MAX_PIECES = 36;

/**
 * Nữ Oa's stone rain on the monsters the server listed in `ability` (never a fabricated R99 field, never the caster as a
 * fallback). Per monster, three layers in the order of the art: the falling five-colour cluster drops out of the sky onto
 * its feet (`rain` frames 0–3, accelerating, delayed by the distance from the rift), then lands (`rain` 4–15, dust + shatter,
 * foreground pass so the pile reads over the monster) with a `hit` shatter pop and a flat stone mark under it, and a mixed
 * five-colour shard spray. A few mending ribbons run from the caster to the nearest monsters.
 */
export class NuwaRain {
  private pieces: Piece[] = [];

  constructor(private scene: Scene, private art: KitPainted, private bank: KitFxBank, private sprays: readonly KitSpray[]) {}

  /** Returns how many monsters were drawn in full (the rest of a crowd is logged as capped). */
  fall(caster: Vector3, targets: readonly Vector3[], reduced: boolean): number {
    const budget = Math.min(targetBudget(reduced), Math.max(0, MAX_PIECES - this.pieces.length));
    const picked = nearestFirst(targets, caster).slice(0, budget);
    for (const [index, point] of picked.entries()) {
      const delay = rainDelay(Math.hypot(point.x - caster.x, point.z - caster.z), reduced);
      const piece: Piece = { rain: this.art.acquire('rain'), at: point.clone(), age: -delay, life: rainLife(reduced) + .02,
        reduced, landed: false, tint: index % 4, markSet: false };
      if (!piece.rain) break;
      this.pieces.push(piece);
      this.draw(piece, screenUp(this.scene));
      if (!reduced && index < MAX_RIBBONS)
        this.bank.ribbon(caster, point, 'fivecolor', { life: .34, width: .9, wave: .5, taper: .45, height: 7, maxSpan: 6, reduced });
    }
    if (targets.length > picked.length) debug('visual.nuwa.impact.cap', {
      targets: targets.length, rendered: picked.length, reason: 'target-art-budget', reduced });
    return picked.length;
  }

  tick(dt: number): void {
    const up = screenUp(this.scene);
    for (let i = this.pieces.length - 1; i >= 0; i--) {
      const piece = this.pieces[i];
      piece.age += dt;
      if (piece.age >= piece.life + (piece.reduced ? .3 : MARK_SECONDS)) { this.free(piece); this.pieces.splice(i, 1); continue; }
      this.draw(piece, up);
    }
  }

  clear(): void {
    for (const piece of this.pieces) this.free(piece);
    this.pieces.length = 0;
  }

  private land(piece: Piece): void {
    piece.landed = true;
    piece.hit = this.art.acquire('hit');
    piece.mark = this.art.acquire('mark', true);
    if (piece.reduced) return;
    this.sprays[piece.tint].ring(piece.at, .5, 7, 1.4, 4, 6);
    this.sprays[(piece.tint + 2) % 4].ring(piece.at, .8, 4, .8, 3, 4);
    this.sprays[4].ring(piece.at, .7, 5, .5, 2.4, 2.2);
  }

  private draw(piece: Piece, up: Vector3): void {
    const { age, reduced } = piece;
    const rainMeta = artMeta('rain');
    if (piece.rain && rainMeta) {
      piece.rain.setEnabled(age >= 0 && age < rainLife(reduced));
      if (age >= 0) {
        const state = rainState(age, reduced);
        const scale = billboardScale('rain', RAIN_WIDTH * rainScale(age, reduced));
        piece.rain.scaling.set(scale.x, scale.y, 1);
        piece.rain.position.copyFrom(billboardCenter(piece.at, scale.y, rainMeta.anchorY, up, state.lift));
        this.art.frame(piece.rain, state.frame, rainMeta.columns, rainMeta.rows);
        piece.rain.visibility = 1;
      }
    }
    if (age < 0) return;
    if (!piece.landed && (reduced || age >= FALL_SECONDS)) this.land(piece);
    if (!piece.landed) return;
    const landAge = reduced ? age : age - FALL_SECONDS;
    const hitMeta = artMeta('hit');
    if (piece.hit && hitMeta) {
      piece.hit.setEnabled(landAge < hitSeconds(reduced));
      const scale = billboardScale('hit', HIT_WIDTH);
      piece.hit.scaling.set(scale.x, scale.y, 1);
      piece.hit.position.copyFrom(billboardCenter(piece.at, scale.y, hitMeta.anchorY, up, .1));
      this.art.frame(piece.hit, hitFrame(landAge, reduced), hitMeta.columns, hitMeta.rows);
      piece.hit.visibility = 1;
    }
    if (piece.mark && hitMeta) {
      const scale = groundScale('mark', MARK_DIAMETER);
      piece.mark.scaling.set(scale.x, scale.y, 1);
      piece.mark.position.set(piece.at.x, .055, piece.at.z);
      if (!piece.markSet) { this.art.frame(piece.mark, MARK_FRAME, hitMeta.columns, hitMeta.rows); piece.markSet = true; }
      piece.mark.visibility = markAlpha(landAge, reduced);
    }
  }

  private free(piece: Piece): void {
    this.art.release(piece.rain); this.art.release(piece.hit); this.art.release(piece.mark);
    piece.rain = piece.hit = piece.mark = undefined;
  }
}
