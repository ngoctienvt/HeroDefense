import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { CHUCLONG as C } from '../../../content/chuclong-design.js';
import { debug } from './debug.js';
import { screenUp } from './visual-kit-billboard.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import { createGroundLayer, LayerPool, type Layer } from './visual-kit-layers.js';
import type { KitPainted } from './visual-kit-painted.js';
import type { KitSpray } from './visual-kit-spray.js';
import { artMeta, billboardScale, type ChuclongArtId } from './visual-chuclong-assets.js';
import { dayAlpha, dayFrame, daySeconds, dayScale, dissolveAlpha, dissolveFrame, dissolveSeconds, EYE_FOREGROUND_UNTIL,
  EYE_LIFT, EYE_SIZE, gatherAlpha, gatherDiameter, nightFrame, openAlpha, openFrame, openScale, SUMMER_GRACE, WINTER_GRACE }
  from './visual-chuclong-timeline.js';

type Phase = 'open' | 'night' | 'day' | 'lost';
type Slot = {
  source: string; at: Vector3; phase: Phase; reduced: boolean; windup: number;
  /** Seconds since the cast / the winter event / the summer event / the moment the night eye started to dissolve. */
  castAge: number; nightAge: number; dayAge: number; dissolveAge: number; dissolving: boolean;
  eye?: Mesh; eyeId?: ChuclongArtId; day?: Mesh; gather?: Layer; gatherAge: number; resolved?: number;
};
const MAX_SLOTS = 3;

/**
 * The sky eye of Chúc Long Khai Mục, one slot per caster, always from a server event:
 * `cast` (0.25 s windup): the eye opens over the real caster (frames 0–3) while a cold gather ring tightens under his feet;
 * `skill-h01K`: it narrows to a star and holds as a dark disc (frames 4–10) through the ~1.5 s of night;
 * `summer-h01K`: the disc shatters (frames 12–15) as the daybreak eye opens, cracks and bursts (16 frames).
 * The eye uses the foreground pass while it is bright and small, then the world pass for the dark hold so no monster or hero
 * is ever veiled by the night disc. Missing events never leave it hanging: a cast without `skill-h01K` drops after
 * windup + WINTER_GRACE, a night without `summer-h01K` (caster died, phase dropped) after phaseDelay + SUMMER_GRACE.
 * Lobby (no cast, summer in the same tick) compresses the night to the dissolve frames.
 */
export class ChuclongEye {
  private slots: Slot[] = [];
  private gathers: LayerPool;

  constructor(private scene: Scene, private art: KitPainted, private frost: KitSpray, private embers: KitSpray) {
    let serial = 0;
    this.gathers = new LayerPool(() => {
      const layer = createGroundLayer(scene, 'kitGround', 'ice', `chuclong-gather-${serial++}`);
      layer.mesh.alphaIndex = GROUND_ALPHA_INDEX + 1;
      layer.material.setFloat('uSpiral', 0);
      return layer;
    }, MAX_SLOTS, 'chuclong-gather');
  }

  cast(source: string, at: Vector3, windup: number, reduced: boolean): void {
    const slot = this.start(source, at, 'open', reduced);
    if (!slot) return;
    slot.windup = Math.max(.05, windup);
    slot.gather = this.gathers.acquire();
    debug('visual.chuclong.cast', { windup: slot.windup, reduced, eye: Boolean(slot.eye) });
  }

  /** `skill-h01K` resolved: the eye closes. Without a cast (lobby, reconnect) the slot starts here. */
  winter(source: string, at: Vector3, reduced: boolean): void {
    let slot = this.slots.find(s => s.source === source && s.phase === 'open');
    const lateCast = !slot;
    slot ??= this.start(source, at, 'night', reduced);
    if (!slot) return;
    slot.at.copyFrom(at); slot.phase = 'night'; slot.nightAge = 0; slot.reduced = reduced; slot.resolved = 0;
    debug('visual.chuclong.eye.night', { lateCast, reduced });
  }

  /** `summer-h01K` resolved: the night eye shatters and the daybreak eye opens (also when the night never reached us). */
  summer(source: string, at: Vector3, reduced: boolean): void {
    let slot = this.slots.find(s => s.source === source && s.phase !== 'day');
    const orphan = !slot;
    slot ??= this.start(source, at, 'night', reduced);
    if (!slot) return;
    slot.at.copyFrom(at); slot.reduced = reduced; slot.phase = 'day'; slot.dayAge = 0;
    slot.dissolving = true; slot.dissolveAge = 0;
    slot.day = this.art.acquire('dayEye');
    if (!reduced) {
      this.embers.rise(at, 3.4, 18);
      this.embers.ring(at.add(screenUp(this.scene).scale(EYE_LIFT)), 2.4, 26, .5, 4.5, 3.2);
    }
    debug('visual.chuclong.eye.day', { orphan, reduced, day: Boolean(slot.day) });
  }

  tick(dt: number, time: number): void {
    const up = screenUp(this.scene);
    for (let i = this.slots.length - 1; i >= 0; i--) {
      const slot = this.slots[i];
      this.advance(slot, dt);
      if (this.finished(slot)) { this.free(slot); this.slots.splice(i, 1); continue; }
      this.place(slot, up, time);
    }
  }

  clear(): void {
    for (const slot of this.slots) this.free(slot);
    this.slots.length = 0;
    this.gathers.releaseAll();
  }

  private start(source: string, at: Vector3, phase: Phase, reduced: boolean): Slot | undefined {
    this.drop(source);
    if (this.slots.length >= MAX_SLOTS) { debug('visual.chuclong.cap', { layer: 'eye' }); return undefined; }
    const slot: Slot = { source, at: at.clone(), phase, reduced, windup: .25, castAge: 0, nightAge: 0, dayAge: 0,
      dissolveAge: 0, dissolving: false, gatherAge: 0 };
    slot.eye = this.art.acquire(this.eyeFor(slot));
    slot.eyeId = this.eyeFor(slot);
    this.slots.push(slot);
    return slot;
  }

  private advance(slot: Slot, dt: number): void {
    slot.gatherAge += dt;
    if (slot.resolved !== undefined) slot.resolved += dt;
    if (slot.phase === 'open') {
      slot.castAge += dt;
      if (slot.castAge >= slot.windup + WINTER_GRACE) {
        debug('visual.chuclong.charge.cancel', { reason: 'resolve-not-received' });
        slot.phase = 'lost'; slot.dissolving = true; slot.dissolveAge = 0;
      }
    } else if (slot.phase === 'night') {
      slot.nightAge += dt;
      if (slot.nightAge >= C.phaseDelay + SUMMER_GRACE) {
        debug('visual.chuclong.eye.lost', { reason: 'summer-not-received' });
        slot.phase = 'lost'; slot.dissolving = true; slot.dissolveAge = 0;
      }
    } else if (slot.phase === 'day') slot.dayAge += dt;
    if (slot.dissolving) slot.dissolveAge += dt;
  }

  private finished(slot: Slot): boolean {
    if (slot.phase === 'lost') return slot.dissolveAge >= dissolveSeconds(slot.reduced);
    return slot.phase === 'day' && slot.dayAge >= daySeconds(slot.reduced)
      && slot.dissolveAge >= dissolveSeconds(slot.reduced);
  }

  /** Foreground while the eye is bright and still opening/closing, world (behind every actor) for the dark hold. */
  private eyeFor(slot: Slot): ChuclongArtId {
    if (slot.dissolving) return 'eyeWorld';
    if (slot.phase === 'open') return 'eyeFg';
    return nightFrame(slot.nightAge, slot.reduced) < EYE_FOREGROUND_UNTIL ? 'eyeFg' : 'eyeWorld';
  }

  private place(slot: Slot, up: Vector3, time: number): void {
    const wanted = this.eyeFor(slot);
    if (slot.eyeId !== wanted || (!slot.eye && !slot.dissolving)) {
      this.art.release(slot.eye);
      slot.eye = this.art.acquire(wanted);
      slot.eyeId = wanted;
    }
    const centre = slot.at.add(up.scale(EYE_LIFT));
    const meta = artMeta('eyeFg');
    const { eye } = slot;
    if (eye && meta) {
      let frame: number, alpha: number, scale: number;
      if (slot.dissolving) {
        frame = dissolveFrame(slot.dissolveAge, slot.reduced);
        alpha = dissolveAlpha(slot.dissolveAge, slot.reduced); scale = 1;
      } else if (slot.phase === 'open') {
        frame = openFrame(slot.castAge, slot.windup, slot.reduced);
        alpha = openAlpha(slot.castAge, slot.windup); scale = openScale(slot.castAge, slot.windup, slot.reduced);
      } else { frame = nightFrame(slot.nightAge, slot.reduced); alpha = .96; scale = 1; }
      const size = billboardScale('eyeFg', EYE_SIZE * scale);
      eye.scaling.set(size.x, size.y, 1);
      eye.position.copyFrom(centre);
      this.art.frame(eye, frame, meta.columns, meta.rows);
      eye.visibility = alpha;
    }
    const dayMeta = artMeta('dayEye');
    if (slot.phase === 'day') {
      slot.day ??= this.art.acquire('dayEye');
      if (slot.day && dayMeta) {
        const size = billboardScale('dayEye', EYE_SIZE * 1.1 * dayScale(slot.dayAge, slot.reduced));
        slot.day.scaling.set(size.x, size.y, 1);
        slot.day.position.copyFrom(centre);
        this.art.frame(slot.day, dayFrame(slot.dayAge, slot.reduced), dayMeta.columns, dayMeta.rows);
        slot.day.visibility = Math.min(dayAlpha(slot.dayAge, slot.reduced), 1);
      }
    }
    this.placeGather(slot, time);
    if (!slot.reduced && slot.phase === 'open' && Math.random() < .5)
      this.frost.ring(slot.at, 4.6, 2, .5, -2.2, 2.6);
  }

  /** Cold gather ring under the caster: tightens during the windup, cools out when the night starts. */
  private placeGather(slot: Slot, time: number): void {
    const layer = slot.gather;
    if (!layer) return;
    if (slot.phase !== 'open' && (slot.resolved ?? 0) >= .3) { this.gathers.release(layer); slot.gather = undefined; return; }
    const age = slot.phase === 'open' ? slot.castAge : slot.windup;
    const diameter = gatherDiameter(age, slot.windup, slot.reduced);
    layer.mesh.position.set(slot.at.x, .05, slot.at.z);
    layer.mesh.scaling.set(diameter, 1, diameter);
    const m = layer.material;
    m.setFloat('uTime', slot.reduced ? 0 : time); m.setFloat('uAlpha', gatherAlpha(age, slot.windup, slot.resolved));
    m.setFloat('uFill', .18); m.setFloat('uRim', .9); m.setFloat('uBand', 0);
    m.setFloat('uRings', slot.reduced ? 0 : .6); m.setFloat('uSwirl', slot.reduced ? 0 : -1.6);
  }

  private drop(source: string): void {
    for (let i = this.slots.length - 1; i >= 0; i--) if (this.slots[i].source === source) {
      this.free(this.slots[i]); this.slots.splice(i, 1);
    }
  }

  private free(slot: Slot): void {
    this.art.release(slot.eye); this.art.release(slot.day);
    if (slot.gather) this.gathers.release(slot.gather);
    slot.eye = slot.day = slot.gather = undefined;
  }
}

