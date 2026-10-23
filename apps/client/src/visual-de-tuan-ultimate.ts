import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { DE_TUAN as D } from '../../../content/new-divine-design.js';
import { debug } from './debug.js';
import { screenUp } from './visual-kit-billboard.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import { createGroundLayer, LayerPool, type Layer } from './visual-kit-layers.js';
import type { KitPainted } from './visual-kit-painted.js';
import type { KitSpray } from './visual-kit-spray.js';
import { artMeta, billboardScale, groundScale } from './visual-de-tuan-assets.js';
import type { DeTuanBlast } from './visual-de-tuan-blast.js';
import type { DeTuanSword } from './visual-de-tuan-sword.js';
import { CAST_GRACE, CONVERGE_SIZE, convergeAlpha, convergeFrame, convergeLift, dissolveFrame, dissolveSeconds,
  rimAlpha, SWORD_HIT_HEIGHT } from './visual-de-tuan-timeline.js';

type Slot = { source: string; at: Vector3; age: number; windup: number; reduced: boolean; landedAge?: number;
  crows?: Mesh; decal?: Mesh; rim?: Layer };
const MAX_SLOTS = 3;

/**
 * Đế Tuấn Thập Nhật Đồng Thăng, in server order:
 * `cast` (0.5 s windup): the R8.5 rim and feather decal tighten under the caster while the ten Kim Ô spiral together in the
 * sky above him into one blade (frames 0–9, held if the event is late). `ability`: the blade leaves the flock, dives onto
 * the main target the server chose, and its landing opens the sunburst, shock ring and scorch (DeTuanBlast). A lost
 * ability event frees the telegraph after windup + grace. Lobby casts (no cast event) start at the impact.
 */
export class DeTuanUltimate {
  private slots: Slot[] = [];
  private rims: LayerPool;

  constructor(private scene: Scene, private art: KitPainted, private spray: KitSpray, private sword: DeTuanSword,
    private blast: DeTuanBlast) {
    let serial = 0;
    this.rims = new LayerPool(() => {
      const layer = createGroundLayer(scene, 'kitGround', 'solar', `detuan-rim-${serial++}`);
      layer.mesh.alphaIndex = GROUND_ALPHA_INDEX + 1;
      layer.material.setFloat('uSpiral', 0);
      return layer;
    }, MAX_SLOTS, 'detuan-rims');
  }

  cast(source: string, at: Vector3, windup: number, reduced: boolean): void { this.start(source, at, windup, reduced); }

  private start(source: string, at: Vector3, windup: number, reduced: boolean): Slot | undefined {
    this.drop(source);
    if (this.slots.length >= MAX_SLOTS) { debug('visual.detuan.cap', { layer: 'ultimate' }); return undefined; }
    const slot: Slot = { source, at: at.clone(), age: 0, windup: Math.max(.05, windup), reduced,
      crows: this.art.acquire('converge'), decal: this.art.acquire('ground', true), rim: this.rims.acquire() };
    this.slots.push(slot);
    this.place(slot, screenUp(this.scene), 0);
    debug('visual.detuan.cast', { windup: slot.windup, reduced, crows: Boolean(slot.crows), decal: Boolean(slot.decal) });
    return slot;
  }

  impact(source: string, caster: Vector3, targets: readonly Vector3[], main: Vector3 | undefined, reduced: boolean): void {
    let slot = this.slots.find(s => s.source === source && s.landedAge === undefined);
    const lateCast = !slot;
    if (!slot) {
      slot = this.start(source, caster, D.windup, reduced);
      if (slot) slot.age = slot.windup;
    }
    const up = screenUp(this.scene);
    if (slot) { slot.at.copyFrom(caster); slot.landedAge = 0; slot.reduced = reduced; }
    // The landing runs ~0.16 s later: keep the positions as they were at the event (actors keep moving or die).
    const origin = caster.clone(), strike = main?.clone(), field = targets.map(point => point.clone());
    const land = (): void => {
      if (strike) this.blast.hit(strike, reduced);
      this.blast.field(origin, field, strike, reduced);
    };
    if (strike) {
      const from = caster.add(up.scale(convergeLift(slot?.age ?? D.windup, slot?.windup ?? D.windup, reduced)));
      this.sword.launch(from, new Vector3(strike.x, SWORD_HIT_HEIGHT, strike.z), reduced, land);
    } else land();
    debug('visual.detuan.impact', { targets: targets.length, main: Boolean(main), lateCast, reduced });
  }

  tick(dt: number, time: number): void {
    const up = screenUp(this.scene);
    for (let i = this.slots.length - 1; i >= 0; i--) {
      const slot = this.slots[i];
      slot.age += dt;
      if (slot.landedAge !== undefined) slot.landedAge += dt;
      const lost = slot.landedAge === undefined && slot.age >= slot.windup + CAST_GRACE;
      if (lost) debug('visual.detuan.charge.cancel', { reason: 'resolve-not-received' });
      if (lost || (slot.landedAge ?? 0) >= dissolveSeconds(slot.reduced)) { this.free(slot); this.slots.splice(i, 1); continue; }
      this.place(slot, up, time);
      if (!slot.reduced && slot.landedAge === undefined && Math.random() < .4) this.spray.ring(slot.at, 5.5, 2, .6, -1.4, 3.5);
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
    if (!landed) { slot.crows ??= this.art.acquire('converge'); slot.decal ??= this.art.acquire('ground', true); }
    const { crows, decal, rim } = slot;
    if (crows) {
      const meta = artMeta('converge');
      const scale = billboardScale('converge', CONVERGE_SIZE);
      crows.scaling.set(scale.x, scale.y, 1);
      crows.position.copyFrom(slot.at.add(up.scale(convergeLift(slot.age, slot.windup, slot.reduced))));
      if (meta) this.art.frame(crows, landed ? dissolveFrame(slot.landedAge ?? 0, slot.reduced)
        : convergeFrame(slot.age, slot.windup, slot.reduced), meta.columns, meta.rows);
      crows.visibility = landed ? 1 : convergeAlpha(slot.age, slot.windup);
    }
    const alpha = rimAlpha(slot.age, slot.windup, slot.landedAge);
    if (decal) {
      const scale = groundScale('ground', 2 * D.skillRadius);
      decal.scaling.set(scale.x, scale.y, 1);
      decal.position.set(slot.at.x, .05, slot.at.z);
      decal.visibility = alpha * .6;
    }
    if (rim) {
      rim.mesh.position.set(slot.at.x, .045, slot.at.z);
      rim.mesh.scaling.set(2 * D.skillRadius, 1, 2 * D.skillRadius);
      const m = rim.material, charge = Math.min(1, slot.age / slot.windup);
      m.setFloat('uTime', slot.reduced ? 0 : time); m.setFloat('uAlpha', alpha);
      m.setFloat('uFill', .06 + .16 * charge); m.setFloat('uRim', .5 + .5 * charge); m.setFloat('uBand', 0);
      m.setFloat('uRings', slot.reduced ? 0 : .3 + .5 * charge); m.setFloat('uSwirl', slot.reduced ? 0 : -1.4);
    }
  }

  private free(slot: Slot): void {
    this.art.release(slot.crows); this.art.release(slot.decal);
    if (slot.rim) this.rims.release(slot.rim);
    slot.crows = slot.decal = slot.rim = undefined;
  }
}
