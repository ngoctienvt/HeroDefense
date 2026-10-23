import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { FUXI } from '../../../content/fuxi-design.js';
import { debug } from './debug.js';
import { billboardCenter, screenUp } from './visual-kit-billboard.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import type { KitFxBank } from './visual-kit-fx-bank.js';
import { createGroundLayer, LayerPool, type Layer } from './visual-kit-layers.js';
import type { KitPainted } from './visual-kit-painted.js';
import { artMeta, billboardScale } from './visual-fuxi-assets.js';
import { CAST_GRACE, DEFAULT_WINDUP, compressAlpha, compressScale, COMPRESS_SECONDS, rimCharge, WAKE_DISC_FILL, wakeAlpha,
  wakeChargeFrame, wakeImpactFrame, wakeSeconds } from './visual-fuxi-timeline.js';

type Slot = { source: string; at: Vector3; age: number; windup: number; reduced: boolean; landedAge?: number;
  sheet?: Mesh; rim?: Layer };
const MAX_SLOTS = 3, MAX_TARGET_HITS = 12;

/**
 * The opening of Tiên Thiên Bát Quái Càn Khôn Trận, in server order:
 * `cast` (0.25 s windup, at the locked point): jade pillars and the eight trigram plaques rise out of the crystals (awakening
 * frames 0–3, held if the event is late) while the R9.5 rim tightens inward under shader time. `ability`: the plaques lift
 * and lower onto the ring (frames 4–15) as the rim compresses toward the centre and qi threads are drawn inward; each real
 * target gets a small jade pulse + shards. The pillar sheet is drawn at the battlefield camera angle, so it stands up as a
 * billboard (laid flat it would be squashed twice). A lost ability event frees the charge after windup + grace.
 */
export class FuxiWake {
  private slots: Slot[] = [];
  private rims: LayerPool;

  constructor(private scene: Scene, private art: KitPainted, private bank: KitFxBank) {
    let serial = 0;
    this.rims = new LayerPool(() => {
      const layer = createGroundLayer(scene, 'kitGround', 'bagua', `fuxi-rim-${serial++}`);
      layer.mesh.alphaIndex = GROUND_ALPHA_INDEX + 1;
      layer.material.setFloat('uSpiral', .6);
      layer.material.setFloat('uBand', 0);
      return layer;
    }, MAX_SLOTS, 'fuxi-rims');
  }

  cast(source: string, at: Vector3, windup: number, reduced: boolean): void { this.start(source, at, windup, reduced); }

  private start(source: string, at: Vector3, windup: number, reduced: boolean): Slot | undefined {
    this.drop(source);
    if (this.slots.length >= MAX_SLOTS) { debug('visual.fuxi.cap', { layer: 'wake' }); return undefined; }
    const slot: Slot = { source, at: at.clone(), age: 0, windup: Math.max(.05, windup), reduced,
      sheet: this.art.acquire('wake'), rim: this.rims.acquire() };
    this.slots.push(slot);
    this.place(slot, screenUp(this.scene), 0);
    debug('visual.fuxi.cast', { windup: slot.windup, reduced, sheet: Boolean(slot.sheet) });
    return slot;
  }

  impact(source: string, at: Vector3, targets: readonly Vector3[], reduced: boolean): void {
    let slot = this.slots.find(s => s.source === source && s.landedAge === undefined);
    const lateCast = !slot;
    if (!slot) {
      slot = this.start(source, at, DEFAULT_WINDUP, reduced);
      if (slot) slot.age = slot.windup;
    }
    if (slot) { slot.at.copyFrom(at); slot.landedAge = 0; slot.reduced = reduced; }
    this.pulse(at, targets, reduced);
    debug('visual.fuxi.impact', { targets: targets.length, lateCast, reduced, radius: FUXI.radius });
  }

  /** Compression pulse: qi drawn inward around the point, a jade pulse and shards on every real target. */
  private pulse(at: Vector3, targets: readonly Vector3[], reduced: boolean): void {
    this.bank.dome(at, 'bagua', { x: 6.5, y: 4.6 }, .5, reduced);
    const hits = targets.slice(0, MAX_TARGET_HITS);
    if (targets.length > MAX_TARGET_HITS) debug('visual.fuxi.cap', { layer: 'hits', targets: targets.length });
    for (const point of hits) this.bank.ring(point, 1.7, 'bagua', { life: .4, fill: .22, rim: 1, alpha: .85, reduced, order: 6 });
    if (reduced) return;
    const spray = this.bank.spray('bagua');
    spray.ring(at, FUXI.radius * .8, 34, .3, -3.4, 2.2);
    spray.ring(at, FUXI.radius * .45, 20, .5, -2, 3.2);
    for (const point of hits) spray.rise(point, .9, 6);
  }

  tick(dt: number, time: number): void {
    const up = screenUp(this.scene);
    for (let i = this.slots.length - 1; i >= 0; i--) {
      const slot = this.slots[i];
      slot.age += dt;
      if (slot.landedAge !== undefined) slot.landedAge += dt;
      const lost = slot.landedAge === undefined && slot.age >= slot.windup + CAST_GRACE;
      if (lost) debug('visual.fuxi.charge.cancel', { reason: 'resolve-not-received' });
      const end = Math.max(wakeSeconds(slot.reduced), COMPRESS_SECONDS);
      if (lost || (slot.landedAge ?? 0) >= end) { this.free(slot); this.slots.splice(i, 1); continue; }
      this.place(slot, up, time);
      if (!slot.reduced && slot.landedAge === undefined && Math.random() < dt * 14)
        this.bank.spray('bagua').rise(slot.at, FUXI.radius * .85, 2);
    }
  }

  clear(): void {
    for (const slot of this.slots) this.free(slot);
    this.slots.length = 0;
    this.rims.releaseAll();
  }

  private drop(source: string): void {
    for (let i = this.slots.length - 1; i >= 0; i--) if (this.slots[i].source === source) {
      this.free(this.slots[i]); this.slots.splice(i, 1);
    }
  }

  private place(slot: Slot, up: Vector3, time: number): void {
    const landed = slot.landedAge !== undefined;
    if (!landed) slot.sheet ??= this.art.acquire('wake');
    const { sheet, rim } = slot;
    if (sheet) {
      const meta = artMeta('wake');
      const scale = billboardScale('wake', 2 * FUXI.radius / WAKE_DISC_FILL);
      sheet.scaling.set(scale.x, scale.y, 1);
      sheet.position.copyFrom(billboardCenter(slot.at, scale.y, meta?.anchorY ?? .66, up));
      if (meta) this.art.frame(sheet, landed ? wakeImpactFrame(slot.landedAge ?? 0, slot.reduced)
        : wakeChargeFrame(slot.age, slot.windup, slot.reduced), meta.columns, meta.rows);
      sheet.visibility = wakeAlpha(slot.age, slot.windup, slot.landedAge, slot.reduced);
    }
    if (rim) {
      const charge = rimCharge(slot.age, slot.windup);
      const sink = landed ? compressScale(slot.landedAge ?? 0) : 1;
      const alpha = landed ? compressAlpha(slot.landedAge ?? 0) : .25 + .65 * charge;
      rim.mesh.position.set(slot.at.x, .045, slot.at.z);
      rim.mesh.scaling.set(2 * FUXI.radius * sink, 1, 2 * FUXI.radius * sink);
      const m = rim.material;
      m.setFloat('uTime', slot.reduced ? 0 : time); m.setFloat('uAlpha', alpha);
      m.setFloat('uFill', .05 + .15 * charge); m.setFloat('uRim', .55 + .45 * charge);
      m.setFloat('uRings', slot.reduced ? 0 : .3 + .5 * charge); m.setFloat('uSwirl', slot.reduced ? 0 : -1.5);
    }
  }

  private free(slot: Slot): void {
    this.art.release(slot.sheet);
    if (slot.rim) this.rims.release(slot.rim);
    slot.sheet = slot.rim = undefined;
  }
}
