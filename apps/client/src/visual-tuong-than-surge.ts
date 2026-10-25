import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { debug } from './debug.js';
import { screenUp } from './visual-kit-billboard.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import { createGroundLayer, LayerPool, type Layer } from './visual-kit-layers.js';
import type { KitPainted } from './visual-kit-painted.js';
import type { KitSpray } from './visual-kit-spray.js';
import { groundScale, placeBillboard, setFrame } from './visual-tuong-than-assets.js';
import type { TuongThanFlow } from './visual-tuong-than-flow.js';
import type { TuongThanPieces } from './visual-tuong-than-pieces.js';
import { CAST_GRACE, CREST_WIDTH, gatherAlpha, gatherCharge, gatherFrame, gatherScale, GATHER_CHANNELS, GATHER_SIZE,
  IMPACT_SECONDS, impactAlpha, rimAlpha, RING_CREST_STAGGER, RING_CREST_WIDTH, RING_CRESTS, ringCrestPoint,
  SEA_RADIUS, shockScale, surgeAlpha, surgeFrame, surgeScale, surgeSeconds } from './visual-tuong-than-timeline.js';

type Slot = { source: string; at: Vector3; age: number; windup: number; reduced: boolean; landedAge?: number;
  ripple?: Mesh; decal?: Mesh; rim?: Layer };
const MAX_SLOTS = 3;

/**
 * Huyết Hải Vạn Thi Trận, in server order:
 * `cast` (0.25 s windup, on the caster): the blood ripples (awakening frames 0–3) gather under him, the true R8.5 rim and a
 * dark pool tighten while thin blood channels run in from the rim (held on the last frame if the resolve is late).
 * `ability`: the real crest (frames 4–15) rises in the foreground, five side crests ring the sea, the rim sweeps out to
 * the real radius and a transient pool holds the ground until the snapshot's sea marker takes over (lobby has none).
 * A lost resolve frees the charge after windup + grace. Lobby casts (no cast event) start at the resolve.
 */
export class TuongThanSurge {
  private slots: Slot[] = [];
  private rims: LayerPool;

  constructor(private scene: Scene, private art: KitPainted, private pieces: TuongThanPieces, private spray: KitSpray,
    private flow: TuongThanFlow) {
    let serial = 0;
    this.rims = new LayerPool(() => {
      const layer = createGroundLayer(scene, 'kitGround', 'blood', `tuongthan-rim-${serial++}`);
      layer.mesh.alphaIndex = GROUND_ALPHA_INDEX + 2;
      layer.material.setFloat('uSpiral', 0);
      return layer;
    }, MAX_SLOTS, 'tuongthan-rims');
  }

  cast(source: string, at: Vector3, windup: number, reduced: boolean): void {
    const slot = this.start(source, at, windup, reduced);
    if (slot && !reduced) this.flow.inward(at, SEA_RADIUS, GATHER_CHANNELS, slot.windup + .15, false);
  }

  private start(source: string, at: Vector3, windup: number, reduced: boolean): Slot | undefined {
    this.drop(source);
    if (this.slots.length >= MAX_SLOTS) { debug('visual.tuongthan.cap', { layer: 'surge' }); return undefined; }
    const slot: Slot = { source, at: at.clone(), age: 0, windup: Math.max(.05, windup), reduced,
      ripple: this.art.acquire('ripple'), decal: this.art.acquire('ground', true), rim: this.rims.acquire() };
    this.slots.push(slot);
    this.place(slot, screenUp(this.scene), 0);
    debug('visual.tuongthan.cast', { windup: slot.windup, reduced, ripple: Boolean(slot.ripple), decal: Boolean(slot.decal) });
    return slot;
  }

  /** The resolve. `caster` is the real caster; every point comes from the event, none is invented. */
  impact(source: string, caster: Vector3, reduced: boolean): void {
    let slot = this.slots.find(s => s.source === source && s.landedAge === undefined);
    const lateCast = !slot;
    if (!slot) {
      slot = this.start(source, caster, .25, reduced);
      if (slot) slot.age = slot.windup;
    }
    if (slot) {
      slot.at.copyFrom(caster); slot.landedAge = 0; slot.reduced = reduced;
      this.art.release(slot.ripple); slot.ripple = undefined;
    }
    this.crests(caster, reduced);
    if (!reduced) {
      this.spray.ring(caster, SEA_RADIUS * .55, 40, 1.2, 5.5, 7);
      this.spray.ring(caster, SEA_RADIUS * .9, 26, .8, 4, 5);
      this.spray.rise(caster, 1.6, 12);
    }
    debug('visual.tuongthan.impact', { lateCast, reduced, slot: Boolean(slot) });
  }

  tick(dt: number, time: number): void {
    const up = screenUp(this.scene);
    for (let i = this.slots.length - 1; i >= 0; i--) {
      const slot = this.slots[i];
      slot.age += dt;
      if (slot.landedAge !== undefined) slot.landedAge += dt;
      const lost = slot.landedAge === undefined && slot.age >= slot.windup + CAST_GRACE;
      if (lost) debug('visual.tuongthan.charge.cancel', { reason: 'resolve-not-received' });
      if (lost || (slot.landedAge ?? 0) >= IMPACT_SECONDS) { this.free(slot); this.slots.splice(i, 1); continue; }
      this.place(slot, up, time);
      if (!slot.reduced && slot.landedAge === undefined && Math.random() < .5) this.spray.rise(slot.at, SEA_RADIUS * .5, 2);
    }
  }

  clear(): void {
    for (const slot of this.slots) this.free(slot);
    this.slots.length = 0;
    this.rims.releaseAll();
  }

  /** Central crest on the caster + five side crests ringing the sea, each staggered along the ring. */
  private crests(caster: Vector3, reduced: boolean): void {
    const life = surgeSeconds(reduced);
    const raise = (at: Vector3, width: number, delay: number): void => {
      this.pieces.add('crest', false, life + delay, -delay, (mesh, age) => {
        placeBillboard(mesh, 'crest', at, width * surgeScale(age, reduced), screenUp(this.scene));
        setFrame(this.art, mesh, 'crest', surgeFrame(age, reduced));
        mesh.visibility = .96 * surgeAlpha(age, reduced);
      });
    };
    raise(caster, CREST_WIDTH, 0);
    if (reduced) return;
    for (let i = 0; i < RING_CRESTS; i++) {
      const offset = ringCrestPoint(i);
      raise(new Vector3(caster.x + offset.x, caster.y, caster.z + offset.z), RING_CREST_WIDTH, (i + 1) * RING_CREST_STAGGER);
    }
  }

  private place(slot: Slot, up: Vector3, time: number): void {
    const landed = slot.landedAge !== undefined;
    if (!landed) slot.ripple ??= this.art.acquire('ripple');
    slot.decal ??= this.art.acquire('ground', true);
    const { ripple, decal, rim } = slot;
    const charge = gatherCharge(slot.age, slot.windup);
    if (ripple) {
      placeBillboard(ripple, 'ripple', slot.at, GATHER_SIZE * gatherScale(slot.age, slot.windup, slot.reduced), up);
      setFrame(this.art, ripple, 'ripple', gatherFrame(slot.age, slot.windup, slot.reduced));
      ripple.visibility = gatherAlpha(slot.age, slot.windup);
    }
    const alpha = rimAlpha(slot.age, slot.windup, slot.landedAge);
    if (decal) {
      // Charge: the dark pool swells toward the sea; after the resolve it holds R and cools until the snapshot pool takes over.
      const scale = groundScale('ground', 2 * SEA_RADIUS * (landed ? 1 : .25 + .45 * charge));
      decal.scaling.set(scale.x, scale.y, 1);
      decal.position.set(slot.at.x, .05, slot.at.z);
      decal.visibility = landed ? .55 * impactAlpha(slot.landedAge ?? 0) : .5 * charge;
    }
    if (rim) {
      const diameter = 2 * SEA_RADIUS * (landed ? shockScale(slot.landedAge ?? 0) : 1);
      rim.mesh.position.set(slot.at.x, .045, slot.at.z);
      rim.mesh.scaling.set(diameter, 1, diameter);
      const m = rim.material;
      m.setFloat('uTime', slot.reduced ? 0 : time); m.setFloat('uAlpha', alpha);
      m.setFloat('uFill', landed ? .1 : .08 + .3 * charge); m.setFloat('uRim', .6 + .4 * charge);
      m.setFloat('uBand', 0); m.setFloat('uRings', slot.reduced ? 0 : .25 + .5 * charge);
      m.setFloat('uSwirl', slot.reduced ? 0 : -.6 - charge);
    }
  }

  private drop(source: string): void {
    for (let i = this.slots.length - 1; i >= 0; i--) if (this.slots[i].source === source) {
      this.free(this.slots[i]); this.slots.splice(i, 1);
    }
  }

  private free(slot: Slot): void {
    this.art.release(slot.ripple); this.art.release(slot.decal);
    if (slot.rim) this.rims.release(slot.rim);
    slot.ripple = slot.decal = undefined; slot.rim = undefined;
  }
}
