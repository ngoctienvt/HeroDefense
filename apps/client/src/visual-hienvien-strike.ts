import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { HIENVIEN as H } from '../../../content/hienvien-design.js';
import { debug } from './debug.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import { billboardCenter } from './visual-kit-billboard.js';
import { createGroundLayer, LayerPool, type Layer } from './visual-kit-layers.js';
import type { KitPainted } from './visual-kit-painted.js';
import type { HienvienAccents } from './visual-hienvien-accents.js';
import { ARRAY_SIZE, arrayPose, CAULDRON_ANCHOR_Y, CAULDRON_COUNT, CAULDRON_HEIGHT, CAULDRON_WIDTH, cauldronPose,
  castFrame, castLift, charge, EXIT, FALLBACK_HOLD, FOREGROUND_SECONDS, GIANT_ANCHOR_Y, GIANT_SIZE, padOffsets,
  strikeAlpha, strikeFrame, strikeLift, ZONE_GRACE, zoneStartAge } from './visual-hienvien-timeline.js';

/**
 * One cast: windup (`castAge`) → server impact (`impactAge`) → zone hold (`remaining`, from the
 * `xuanyuan-sword` snapshot when present) → dissolve. A zone stops being reported → the exit plays out.
 */
type Slot = {
  at: Vector3; source?: string; windup: number; reduced: boolean;
  castAge?: number; impactAge?: number; remaining: number;
  zoneId?: string; zoneSeen: boolean; zoneTouched: boolean;
  giant?: Mesh; giantHeld: boolean; array?: Mesh; rim?: Layer; cauldrons: (Mesh | undefined)[]; landed: boolean[];
};
const MAX_SLOTS = 4;
const PADS = padOffsets();

/**
 * Hiên Viên kiếm trấn Cửu Châu: the giant imperial sword gathers above the locked point, plunges on the
 * server impact, stays planted on the central pad while the nine-pad array holds the R8.5 zone, eight
 * bronze cauldrons drop onto the outer pads (dust under each), then everything dissolves with the zone.
 */
export class HienvienStrike {
  private rims: LayerPool;
  private slots: Slot[] = [];

  constructor(scene: Scene, private art: KitPainted, private accents: HienvienAccents) {
    let serial = 0;
    this.rims = new LayerPool(() => {
      const layer = createGroundLayer(scene, 'kitGround', 'xuanyuan', `hienvien-rim-${serial++}`);
      layer.mesh.alphaIndex = GROUND_ALPHA_INDEX;
      layer.material.setFloat('uSpiral', 0); layer.material.setFloat('uBand', 0); layer.material.setFloat('uRings', 0);
      return layer;
    }, MAX_SLOTS, 'hienvien-rims');
  }

  cast(at: Vector3, windup: number, reduced: boolean, source?: string): void {
    for (const slot of this.slots.filter(s => s.source === source && s.impactAge === undefined)) this.free(slot);
    if (!this.room()) return;
    this.slots.push(this.slot(at, reduced, source, { castAge: 0, windup: Math.max(.05, windup) }));
  }

  /** Server impact at the event point; a missing cast (lobby, reconnect) starts straight at the plunge. */
  impact(at: Vector3, reduced: boolean, source?: string): void {
    let slot = this.slots.find(s => s.source === source && s.impactAge === undefined);
    if (!slot) {
      if (!this.room()) return;
      slot = this.slot(at, reduced, source, {});
      this.slots.push(slot);
    }
    slot.at.copyFrom(at); slot.castAge = undefined; slot.impactAge = 0; slot.remaining = H.rainSeconds;
    this.accents.shock(at, reduced);
  }

  /** `xuanyuan-sword` ground snapshot: binds to the impact at that point, or joins late at the hold. */
  markZone(id: string, at: Vector3, remaining: number, reduced: boolean): void {
    let slot = this.slots.find(s => s.zoneId === id)
      ?? this.slots.find(s => !s.zoneId && s.impactAge !== undefined && Vector3.Distance(s.at, at) < 1);
    if (!slot) {
      if (!this.room()) return;
      slot = this.slot(at, reduced, undefined, { impactAge: zoneStartAge(remaining) });
      slot.landed.fill(true);
      this.slots.push(slot);
      debug('visual.hienvien.zone.late', { remaining: +remaining.toFixed(2) });
    }
    if (!slot.zoneId) debug('visual.hienvien.zone', { remaining: +remaining.toFixed(2), reduced });
    slot.zoneId = id; slot.zoneSeen = slot.zoneTouched = true;
    slot.remaining = remaining;
  }

  tick(dt: number, time: number): void {
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
    this.rims.releaseAll();
  }

  private drawCast(slot: Slot, age: number, time: number): void {
    const c = charge(age, slot.windup);
    this.sword(slot, 'giant', castFrame(age, slot.windup, slot.reduced), castLift(age, slot.windup, slot.reduced), .35 + .65 * c);
    this.ground(slot, arrayPose(age, slot.windup, 0), time, .3 + .6 * c, .12 + .15 * c, c, slot.reduced ? 0 : .8);
    if (!slot.reduced && Math.random() < .5) this.accents.bank.spray('gold').rise(slot.at, H.giantRadius * .85, 2);
  }

  private drawStrike(slot: Slot, age: number, time: number): void {
    const { remaining, reduced } = slot;
    if (!slot.giantHeld && age >= FOREGROUND_SECONDS) {
      // The 5 s hold sits behind monsters (world pass): the boss locked under the sword stays readable.
      this.art.release(slot.giant); slot.giant = undefined; slot.giantHeld = true;
    }
    this.sword(slot, slot.giantHeld ? 'giant-hold' : 'giant', strikeFrame(age, remaining, reduced),
      strikeLift(age, reduced), strikeAlpha(age, remaining, reduced));
    const exitFade = Math.min(1, remaining / EXIT);
    this.ground(slot, arrayPose(undefined, slot.windup, remaining), time, .5 * exitFade, .05, .8, reduced ? 0 : .2);
    for (let k = 0; k < CAULDRON_COUNT; k++) {
      const pose = cauldronPose(age, k, remaining, reduced);
      if (pose.alpha <= 0) continue;
      const mesh = slot.cauldrons[k] ??= this.art.acquire('cauldron');
      const pad = PADS[k];
      if (mesh) {
        mesh.position.copyFrom(billboardCenter(new Vector3(slot.at.x + pad.x, 0, slot.at.z + pad.z),
          CAULDRON_HEIGHT, CAULDRON_ANCHOR_Y, this.accents.screenUp, pose.lift));
        mesh.scaling.set(CAULDRON_WIDTH, CAULDRON_HEIGHT, 1);
        mesh.visibility = pose.alpha;
      }
      if (pose.landed && !slot.landed[k]) {
        slot.landed[k] = true;
        this.accents.arrival(new Vector3(slot.at.x + pad.x, 0, slot.at.z + pad.z), reduced);
      }
    }
  }

  private sword(slot: Slot, id: 'giant' | 'giant-hold', frame: number, lift: number, alpha: number): void {
    slot.giant ??= this.art.acquire(id);
    if (!slot.giant) return;
    slot.giant.position.copyFrom(billboardCenter(new Vector3(slot.at.x, 0, slot.at.z), GIANT_SIZE, GIANT_ANCHOR_Y,
      this.accents.screenUp, lift));
    slot.giant.scaling.setAll(GIANT_SIZE);
    slot.giant.visibility = alpha;
    this.art.frame(slot.giant, frame, 4, 4);
  }

  private ground(slot: Slot, pose: { scale: number; alpha: number }, time: number,
    rimAlpha: number, fill: number, rim: number, swirl: number): void {
    slot.array ??= this.art.acquire('array', true);
    if (slot.array) {
      slot.array.position.set(slot.at.x, .07, slot.at.z);
      slot.array.scaling.setAll(ARRAY_SIZE * pose.scale);
      slot.array.visibility = pose.alpha;
    }
    slot.rim ??= this.rims.acquire();
    if (!slot.rim) return;
    const { mesh, material: m } = slot.rim;
    mesh.position.set(slot.at.x, .045, slot.at.z);
    mesh.scaling.set(H.giantRadius * 2, 1, H.giantRadius * 2);
    mesh.setEnabled(true);
    m.setFloat('uTime', time); m.setFloat('uAlpha', rimAlpha); m.setFloat('uFill', fill);
    m.setFloat('uRim', rim); m.setFloat('uSwirl', swirl);
  }

  private room(): boolean {
    if (this.slots.length < MAX_SLOTS) return true;
    debug('visual.hienvien.cap', { layer: 'strike' });
    return false;
  }

  private slot(at: Vector3, reduced: boolean, source: string | undefined, init: Partial<Slot>): Slot {
    return { at: at.clone(), source, windup: .25, reduced, remaining: H.rainSeconds, zoneSeen: false, zoneTouched: false,
      giantHeld: false, cauldrons: [], landed: Array<boolean>(CAULDRON_COUNT).fill(false), ...init };
  }

  private free(slot: Slot): void {
    this.art.release(slot.giant); this.art.release(slot.array);
    for (const mesh of slot.cauldrons) this.art.release(mesh);
    if (slot.rim) this.rims.release(slot.rim);
    const index = this.slots.indexOf(slot);
    if (index >= 0) this.slots.splice(index, 1);
  }
}
