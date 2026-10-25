import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { SHENNONG } from '../../../content/shennong-design.js';
import { debug } from './debug.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import { screenUp } from './visual-kit-billboard.js';
import { createGroundLayer, LayerPool, type Layer } from './visual-kit-layers.js';
import type { KitPainted } from './visual-kit-painted.js';
import type { KitSpray } from './visual-kit-spray.js';
import { frameSn, GROVE_RADIUS_FACTOR, placeSn, snId } from './visual-shennong-art.js';
import { castPose, charge, EXIT, FALLBACK_HOLD, FOREGROUND_SECONDS, groveSpread, MIST_COUNT, MIST_WIDTH, mistPose,
  POT_WIDTH, potAlpha, potFrame, potScale, shock, zoneStartAge, ZONE_GRACE } from './visual-shennong-timeline.js';

/**
 * One cast: windup (`castAge`) → server impact (`impactAge`) → grove hold (`remaining`, from the `shennong-grove`
 * snapshot when present) → closing. A grove that stops being reported plays its exit.
 */
type Slot = {
  at: Vector3; source?: string; windup: number; reduced: boolean; radius: number;
  castAge?: number; impactAge?: number; remaining: number;
  zoneId?: string; zoneSeen: boolean; zoneTouched: boolean;
  pot?: Mesh; potHeld: boolean; grove?: Mesh; mists: (Mesh | undefined)[];
  fill?: Layer; rim?: Layer; wave?: Layer; leaves: number;
  /** True once an impact event (not only a snapshot) drove this slot, so a late event never opens a second zone. */
  eventSeen: boolean;
};
const MAX_SLOTS = 4;

/**
 * Thần Nông's vessel and grove: the bronze vessel drops on the locked point, erupts (foreground, over monsters), the
 * medicine wave races to R8.5 and the root-and-leaf decal spreads with it, mist columns hold the ring while the
 * vessel steams in the centre, and everything is drawn back into the vessel with the closing. Presentation only.
 */
export class ShennongZone {
  private slots: Slot[] = [];
  private fills: LayerPool;
  private rims: LayerPool;
  private waves: LayerPool;
  private up = Vector3.Up();

  constructor(private scene: Scene, private art: KitPainted, private spray: KitSpray) {
    let serial = 0;
    const make = (kind: string, index: number) => () => {
      const layer = createGroundLayer(scene, 'kitGround', 'herbal', `shennong-${kind}-${serial++}`);
      layer.mesh.alphaIndex = GROUND_ALPHA_INDEX + index;
      for (const name of ['uBand', 'uRings', 'uSpiral']) layer.material.setFloat(name, 0);
      return layer;
    };
    this.fills = new LayerPool(make('fill', 1), MAX_SLOTS, 'shennong-fill');
    this.rims = new LayerPool(make('rim', 6), MAX_SLOTS, 'shennong-rim');
    this.waves = new LayerPool(make('wave', 7), MAX_SLOTS, 'shennong-wave');
  }

  cast(at: Vector3, windup: number, reduced: boolean, source?: string): void {
    for (const slot of this.slots.filter(s => s.source === source && s.impactAge === undefined)) this.free(slot);
    if (!this.room()) return;
    this.slots.push(this.slot(at, reduced, source, { castAge: 0, windup: Math.max(.05, windup) }));
  }

  /** Server impact at the event point; a missing cast (lobby, reconnect) starts straight at the burst. */
  impact(at: Vector3, reduced: boolean, source?: string): void {
    let slot = this.slots.find(s => s.source === source && s.impactAge === undefined)
      // The grove snapshot can beat the event by a frame: adopt that slot instead of opening a second zone.
      ?? this.slots.find(s => !s.eventSeen && s.zoneSeen && s.impactAge !== undefined && s.impactAge < .5 && Vector3.Distance(s.at, at) < 1);
    if (!slot) {
      if (!this.room()) return;
      slot = this.slot(at, reduced, source, {});
      this.slots.push(slot);
    }
    slot.eventSeen = true; slot.source = source;
    slot.at.copyFrom(at); slot.castAge = undefined; slot.impactAge = 0; slot.remaining = SHENNONG.zoneSeconds;
    if (!reduced) {
      this.spray.ring(at, 1.3, 26, 1.4, 4.5, 8);
      this.spray.ring(at, 2.6, 18, .4, 8, 4);
    }
  }

  /** `shennong-grove` ground snapshot: binds to the impact at that point, or joins late at the hold. */
  markGrove(id: string, at: Vector3, radius: number, remaining: number, reduced: boolean): void {
    let slot = this.slots.find(s => s.zoneId === id)
      ?? this.slots.find(s => !s.zoneId && s.impactAge !== undefined && Vector3.Distance(s.at, at) < 1);
    if (!slot) {
      if (!this.room()) return;
      slot = this.slot(at, reduced, undefined, { impactAge: zoneStartAge(remaining) });
      this.slots.push(slot);
      debug('visual.shennong.zone.late', { remaining: +remaining.toFixed(2) });
    }
    if (!slot.zoneId) debug('visual.shennong.zone', { remaining: +remaining.toFixed(2), radius, reduced });
    slot.zoneId = id; slot.zoneSeen = slot.zoneTouched = true;
    slot.remaining = remaining; slot.radius = radius; slot.reduced = reduced;
  }

  tick(dt: number, time: number): void {
    this.up = screenUp(this.scene);
    for (let i = this.slots.length - 1; i >= 0; i--) {
      const slot = this.slots[i];
      if (slot.castAge !== undefined) {
        slot.castAge += dt;
        // Lost impact (cancelled cast, caster died): never leave the telegraph behind.
        if (slot.castAge >= slot.windup + .6) { this.free(slot); continue; }
        this.drawCast(slot, slot.castAge, time);
        continue;
      }
      const age = (slot.impactAge ?? 0) + dt;
      slot.impactAge = age;
      if (slot.zoneTouched) slot.zoneTouched = false;
      else {
        if (slot.zoneSeen) slot.remaining = Math.min(slot.remaining, EXIT);
        else if (age >= ZONE_GRACE && age - dt < ZONE_GRACE) slot.remaining = Math.min(slot.remaining, FALLBACK_HOLD);
        slot.remaining -= dt;
      }
      if (slot.remaining <= 0) { this.free(slot); continue; }
      this.drawStrike(slot, age, time);
    }
  }

  clear(): void {
    for (const slot of [...this.slots]) this.free(slot);
    this.fills.releaseAll(); this.rims.releaseAll(); this.waves.releaseAll();
  }

  private drawCast(slot: Slot, age: number, time: number): void {
    const c = charge(age, slot.windup), pose = castPose(age, slot.windup, slot.reduced);
    this.pot(slot, 'potFg', pose.frame, 1, pose.lift, pose.alpha);
    this.ground(slot, slot.radius * (slot.reduced ? 1 : .35 + .65 * c * c * c), time, .3 + .5 * c, .15 + .35 * c,
      .35 + .4 * c, slot.reduced ? 0 : -1.4 - c, 1);
    if (!slot.reduced && Math.random() < .55) this.spray.rise(slot.at, slot.radius * .8, 2);
  }

  private drawStrike(slot: Slot, age: number, time: number): void {
    const { remaining, reduced } = slot;
    if (!slot.potHeld && age >= FOREGROUND_SECONDS) {
      // The 5 s hold sits behind monsters (world pass): whatever stands at the centre stays readable.
      this.art.release(slot.pot); slot.pot = undefined; slot.potHeld = true;
    }
    this.pot(slot, slot.potHeld ? 'pot' : 'potFg', potFrame(age, remaining, reduced), potScale(age, reduced), 0, potAlpha(remaining));
    const spread = groveSpread(age, remaining, reduced), wave = shock(age, reduced);
    this.ground(slot, slot.radius * spread.scale, time, spread.alpha * .55, .2, .4 * Math.min(1, remaining / EXIT), reduced ? 0 : .5, 0);
    slot.grove ??= this.art.acquire(snId('grove'), true);
    if (slot.grove) {
      slot.grove.position.set(slot.at.x, .07, slot.at.z);
      slot.grove.scaling.setAll(slot.radius * 2 * spread.scale / GROVE_RADIUS_FACTOR);
      slot.grove.visibility = spread.alpha;
    }
    this.shockRing(slot, wave, time);
    this.mist(slot, age);
    if (!reduced && remaining > EXIT) {
      slot.leaves -= 1;
      if (slot.leaves <= 0) { slot.leaves = 14; this.spray.ring(slot.at, .8, 3, 1.6, 1.2, 1.5); }
    }
  }

  /** The pot, bottom-anchored on the locked point; `lift` is the windup fall height. */
  private pot(slot: Slot, id: 'pot' | 'potFg', frame: number, scale: number, lift: number, alpha: number): void {
    slot.pot ??= this.art.acquire(snId(id));
    if (!slot.pot) return;
    placeSn(slot.pot, id, slot.at, POT_WIDTH * scale, this.up, lift);
    frameSn(this.art, slot.pot, id, frame);
    slot.pot.visibility = alpha;
  }

  private ground(slot: Slot, radius: number, time: number, fillAlpha: number, fill: number, rimAlpha: number, swirl: number, rim: number): void {
    slot.fill ??= this.fills.acquire();
    slot.rim ??= this.rims.acquire();
    if (slot.fill) {
      const { mesh, material: m } = slot.fill;
      mesh.position.set(slot.at.x, .05, slot.at.z); mesh.scaling.set(radius * 2, 1, radius * 2);
      m.setFloat('uTime', slot.reduced ? 0 : time); m.setFloat('uAlpha', fillAlpha); m.setFloat('uFill', fill);
      m.setFloat('uRim', .25); m.setFloat('uSwirl', swirl);
    }
    if (slot.rim) {
      // Gameplay border: fixed at the radius while the medicine inside spreads and closes.
      const { mesh, material: m } = slot.rim;
      mesh.position.set(slot.at.x, .055, slot.at.z); mesh.scaling.set(slot.radius * 2, 1, slot.radius * 2);
      m.setFloat('uTime', slot.reduced ? 0 : time); m.setFloat('uAlpha', rimAlpha); m.setFloat('uFill', 0);
      m.setFloat('uRim', Math.max(.9, rim)); m.setFloat('uSwirl', 0);
    }
  }

  private shockRing(slot: Slot, wave: { radius: number; alpha: number }, time: number): void {
    if (wave.alpha <= .01) {
      if (slot.wave) { this.waves.release(slot.wave); slot.wave = undefined; }
      return;
    }
    slot.wave ??= this.waves.acquire();
    if (!slot.wave) return;
    const { mesh, material: m } = slot.wave;
    mesh.position.set(slot.at.x, .06, slot.at.z); mesh.scaling.set(slot.radius * 2 * wave.radius, 1, slot.radius * 2 * wave.radius);
    m.setFloat('uTime', time); m.setFloat('uAlpha', wave.alpha); m.setFloat('uFill', .12);
    m.setFloat('uRim', 1); m.setFloat('uSwirl', 0);
  }

  private mist(slot: Slot, age: number): void {
    for (let k = 0; k < MIST_COUNT; k++) {
      const pose = mistPose(k, age, slot.remaining, slot.radius, slot.reduced);
      if (pose.alpha <= .01) { this.art.release(slot.mists[k]); slot.mists[k] = undefined; continue; }
      const mesh = slot.mists[k] ??= this.art.acquire(snId('mist'));
      if (!mesh) continue;
      placeSn(mesh, 'mist', new Vector3(slot.at.x + pose.x, 0, slot.at.z + pose.z), MIST_WIDTH, this.up);
      frameSn(this.art, mesh, 'mist', pose.frame);
      mesh.visibility = pose.alpha;
    }
  }

  private room(): boolean {
    if (this.slots.length < MAX_SLOTS) return true;
    debug('visual.shennong.cap', { layer: 'zone' });
    return false;
  }

  private slot(at: Vector3, reduced: boolean, source: string | undefined, init: Partial<Slot>): Slot {
    return { at: at.clone(), source, windup: .25, reduced, radius: SHENNONG.zoneRadius, remaining: SHENNONG.zoneSeconds,
      zoneSeen: false, zoneTouched: false, potHeld: false, mists: Array<Mesh | undefined>(MIST_COUNT).fill(undefined),
      leaves: 0, eventSeen: false, ...init };
  }

  private free(slot: Slot): void {
    this.art.release(slot.pot); this.art.release(slot.grove);
    for (const mesh of slot.mists) this.art.release(mesh);
    if (slot.fill) this.fills.release(slot.fill);
    if (slot.rim) this.rims.release(slot.rim);
    if (slot.wave) this.waves.release(slot.wave);
    const index = this.slots.indexOf(slot);
    if (index >= 0) this.slots.splice(index, 1);
  }
}
