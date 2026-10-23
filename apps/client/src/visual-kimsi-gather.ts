import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { debug } from './debug.js';
import type { KitPainted } from './visual-kit-painted.js';
import { CAST_GRACE, FEATHER_ASPECT, FEATHER_COUNT, FEATHER_HEIGHT, FEATHER_LENGTH, gatherAlpha, gatherFeather, gatherFrame,
  gatherScale, STORM_SIZE, tangentYaw, THROW_SECONDS, throwFeather } from './visual-kimsi-timeline.js';

type Slot = { source?: string; origin: Vector3; windup: number; reduced: boolean; age: number; phase: 'gather' | 'throw';
  throwAge: number; feathers: Array<Mesh | undefined>; bud?: Mesh };
const MAX_SLOTS = 4;

/**
 * Windup of Kim Sí's storm. `cast`: the gather frames of the storm sheet (a feather bud closing into a pinwheel, laid
 * flat under the caster) grow over the windup while fourteen golden feathers swirl in from the R6.5 rim; the slot
 * follows the caster (`caster` marker, every frame) until the server resolves. `ability`: the same feathers are thrown
 * back out to just inside the edge (the cut itself is `KimsiStorm`). No cast (lobby, reconnect): no gather. An
 * unconfirmed cast fades after windup + `CAST_GRACE`, never a fake impact. Foreground pass: over monsters, under heroes.
 * Nothing here lifts the actor: the feathers stay flat around it.
 */
export class KimsiGather {
  private slots: Slot[] = [];

  constructor(private art: KitPainted) {}

  begin(origin: Vector3, windup: number, reduced: boolean, source?: string): void {
    this.drop(source);
    if (this.slots.length >= MAX_SLOTS) { debug('visual.kimsi.cap', { layer: 'gather' }); return; }
    this.slots.push({ source, origin: origin.clone(), windup: Math.max(.05, windup), reduced, age: 0, phase: 'gather',
      throwAge: 0, feathers: Array<Mesh | undefined>(FEATHER_COUNT).fill(undefined) });
  }

  follow(source: string, at: Vector3): void {
    for (const slot of this.slots) if (slot.source === source) slot.origin.copyFrom(at);
  }

  /** Server resolve: the gathered feathers are thrown out. True when a cast was running. */
  release(source: string | undefined): boolean {
    const slot = this.slots.find(s => s.source === source && s.phase === 'gather');
    if (!slot) return false;
    slot.phase = 'throw'; slot.throwAge = 0;
    this.art.release(slot.bud); slot.bud = undefined;
    if (slot.reduced) this.free(slot);
    return true;
  }

  tick(dt: number): void {
    for (let i = this.slots.length - 1; i >= 0; i--) {
      const slot = this.slots[i];
      if (slot.phase === 'gather') this.gather(slot, dt); else this.throwOut(slot, dt);
    }
  }

  clear(): void { for (const slot of [...this.slots]) this.free(slot); }

  private gather(slot: Slot, dt: number): void {
    slot.age += dt;
    if (slot.age >= slot.windup + CAST_GRACE) {
      debug('visual.kimsi.cast.timeout', { windup: +slot.windup.toFixed(2) });
      this.free(slot);
      return;
    }
    slot.bud ??= this.art.acquire('storm', true);
    if (slot.bud) {
      this.art.frame(slot.bud, gatherFrame(slot.age, slot.windup), 4, 4);
      slot.bud.position.set(slot.origin.x, .07, slot.origin.z);
      slot.bud.scaling.setAll(STORM_SIZE * gatherScale(slot.age, slot.windup, slot.reduced));
      slot.bud.visibility = gatherAlpha(slot.age, slot.windup);
    }
    if (slot.reduced) return;
    for (let i = 0; i < FEATHER_COUNT; i++) {
      const pose = gatherFeather(i, slot.age, slot.windup);
      this.place(slot, i, pose.angle, pose.radius, gatherAlpha(slot.age, slot.windup));
    }
  }

  private throwOut(slot: Slot, dt: number): void {
    slot.throwAge += dt;
    if (slot.throwAge >= THROW_SECONDS) { this.free(slot); return; }
    for (let i = 0; i < FEATHER_COUNT; i++) {
      const pose = throwFeather(i, slot.throwAge);
      this.place(slot, i, pose.angle, pose.radius, pose.alpha);
    }
  }

  private place(slot: Slot, i: number, angle: number, radius: number, alpha: number): void {
    slot.feathers[i] ??= this.art.acquire('feather', true);
    const mesh = slot.feathers[i];
    if (!mesh) return;
    mesh.position.set(slot.origin.x + Math.cos(angle) * radius, FEATHER_HEIGHT, slot.origin.z + Math.sin(angle) * radius);
    mesh.rotation.set(Math.PI / 2, tangentYaw(angle), 0);
    mesh.scaling.set(FEATHER_LENGTH, FEATHER_LENGTH / FEATHER_ASPECT, 1);
    mesh.visibility = alpha;
  }

  private drop(source?: string): void {
    const slot = this.slots.find(s => s.source === source && s.phase === 'gather');
    if (slot) this.free(slot);
  }

  private free(slot: Slot): void {
    for (const mesh of slot.feathers) this.art.release(mesh);
    this.art.release(slot.bud);
    const index = this.slots.indexOf(slot);
    if (index >= 0) this.slots.splice(index, 1);
  }
}
