import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { debug } from './debug.js';
import { billboardCenter, screenUp } from './visual-kit-billboard.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import { createGroundLayer, LayerPool, type Layer } from './visual-kit-layers.js';
import type { KitPainted } from './visual-kit-painted.js';
import type { KitSpray } from './visual-kit-spray.js';
import { artMeta, billboardScale } from './visual-nuwa-assets.js';
import { CAST_GRACE, DEFAULT_WINDUP, releaseFrame, releaseSeconds, RIFT_LIFT, RIFT_WIDTH, riftAlpha, riftFrame, riftRise, SIGIL_DIAMETER,
  sigilAlpha } from './visual-nuwa-timeline.js';

type Slot = { source: string; at: Vector3; age: number; windup: number; reduced: boolean; landedAge?: number;
  rift?: Mesh; sigil?: Layer };
const MAX_SLOTS = 3;

/**
 * Nữ Oa Bổ Thiên, caster side: on `cast` (0.25 s windup) the sky rift opens behind and above the caster while a five-colour
 * sigil tightens under her feet and stones are drawn up from the ground; frame 10 is held if the `ability` event is late.
 * On the `ability` event the stones spin free and the rift mends shut (frames 11–15). A lost resolve frees everything after
 * windup + CAST_GRACE. A lobby/reconnect resolve with no cast starts at the release. The rift sits in the foreground pass:
 * over monsters, under heroes and health bars, so Nữ Oa and the allies around her stay crisp.
 */
export class NuwaRift {
  private slots: Slot[] = [];
  private sigils: LayerPool;

  constructor(private scene: Scene, private art: KitPainted, private sprays: readonly KitSpray[]) {
    let serial = 0;
    this.sigils = new LayerPool(() => {
      const layer = createGroundLayer(scene, 'kitGround', 'fivecolor', `nuwa-sigil-${serial++}`);
      layer.mesh.alphaIndex = GROUND_ALPHA_INDEX + 1;
      layer.material.setFloat('uSpiral', 1);
      return layer;
    }, MAX_SLOTS, 'nuwa-sigils');
  }

  cast(source: string, at: Vector3, windup: number, reduced: boolean): void { this.start(source, at, windup, reduced); }

  private start(source: string, at: Vector3, windup: number, reduced: boolean): Slot | undefined {
    this.drop(source);
    if (this.slots.length >= MAX_SLOTS) { debug('visual.nuwa.cap', { layer: 'rift' }); return undefined; }
    const slot: Slot = { source, at: at.clone(), age: 0, windup: Math.max(.05, windup), reduced,
      rift: this.art.acquire('rift'), sigil: this.sigils.acquire() };
    this.slots.push(slot);
    this.place(slot, screenUp(this.scene), 0);
    debug('visual.nuwa.cast', { windup: slot.windup, reduced, rift: Boolean(slot.rift) });
    return slot;
  }

  /** The `ability` event: the stones leave the rift. Returns whether a cast was already open (false = lobby start). */
  release(source: string, caster: Vector3, reduced: boolean): boolean {
    let slot = this.slots.find(s => s.source === source && s.landedAge === undefined);
    const lateCast = !slot;
    if (!slot) {
      slot = this.start(source, caster, DEFAULT_WINDUP, reduced);
      if (slot) slot.age = slot.windup;
    }
    if (slot) { slot.at.copyFrom(caster); slot.landedAge = 0; slot.reduced = reduced; }
    return !lateCast;
  }

  tick(dt: number, time: number): void {
    const up = screenUp(this.scene);
    for (let i = this.slots.length - 1; i >= 0; i--) {
      const slot = this.slots[i];
      slot.age += dt;
      if (slot.landedAge !== undefined) slot.landedAge += dt;
      const lost = slot.landedAge === undefined && slot.age >= slot.windup + CAST_GRACE;
      if (lost) debug('visual.nuwa.charge.cancel', { reason: 'resolve-not-received' });
      if (lost || (slot.landedAge ?? 0) >= releaseSeconds(slot.reduced)) { this.free(slot); this.slots.splice(i, 1); continue; }
      this.place(slot, up, time);
      if (slot.reduced) continue;
      const sprays = this.sprays;
      if (slot.landedAge === undefined && Math.random() < .5) {
        // Stones are drawn up toward the rift from the ground around her.
        sprays[Math.floor(Math.random() * sprays.length)].ring(slot.at, 3.4, 2, .4, -1.6, 4);
      } else if (slot.landedAge !== undefined && slot.landedAge < .2 && Math.random() < .7) {
        sprays[Math.floor(Math.random() * sprays.length)].ring(slot.at, .8, 3, 3, 3.5, 5);
      }
    }
  }

  clear(): void {
    for (const slot of this.slots) this.free(slot);
    this.slots.length = 0;
    this.sigils.releaseAll();
  }

  private drop(source: string): void {
    for (let i = this.slots.length - 1; i >= 0; i--) if (this.slots[i].source === source) {
      this.free(this.slots[i]); this.slots.splice(i, 1);
    }
  }

  private place(slot: Slot, up: Vector3, time: number): void {
    const landed = slot.landedAge !== undefined;
    // Art that was still loading when the cast arrived joins as soon as its texture is ready.
    if (!landed) slot.rift ??= this.art.acquire('rift');
    const { rift, sigil } = slot, meta = artMeta('rift');
    if (rift && meta) {
      const scale = billboardScale('rift', RIFT_WIDTH);
      rift.scaling.set(scale.x, scale.y, 1);
      rift.position.copyFrom(billboardCenter(slot.at, scale.y, meta.anchorY, up,
        RIFT_LIFT + riftRise(slot.age, slot.windup, slot.reduced)));
      this.art.frame(rift, landed ? releaseFrame(slot.landedAge ?? 0, slot.reduced) : riftFrame(slot.age, slot.windup, slot.reduced),
        meta.columns, meta.rows);
      rift.visibility = landed ? 1 : riftAlpha(slot.age, slot.windup);
    }
    if (sigil) {
      sigil.mesh.position.set(slot.at.x, .045, slot.at.z);
      sigil.mesh.scaling.set(SIGIL_DIAMETER, 1, SIGIL_DIAMETER);
      const m = sigil.material, charge = Math.min(1, slot.age / slot.windup);
      m.setFloat('uTime', slot.reduced ? 0 : time); m.setFloat('uAlpha', sigilAlpha(slot.age, slot.windup, slot.landedAge));
      m.setFloat('uFill', .05 + .13 * charge); m.setFloat('uRim', .55 + .45 * charge); m.setFloat('uBand', 0);
      m.setFloat('uRings', slot.reduced ? 0 : .25 + .5 * charge); m.setFloat('uSwirl', slot.reduced ? 0 : -1.2);
    }
  }

  private free(slot: Slot): void {
    this.art.release(slot.rift);
    if (slot.sigil) this.sigils.release(slot.sigil);
    slot.rift = slot.sigil = undefined;
  }
}
