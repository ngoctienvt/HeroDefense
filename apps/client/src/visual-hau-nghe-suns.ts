import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { debug } from './debug.js';
import { cameraLook } from './visual-de-tuan-strip.js';
import type { KitFxBank } from './visual-kit-fx-bank.js';
import type { KitPainted } from './visual-kit-painted.js';
import { arcOffset, CAST_GRACE, DIVE_BLAST_DELAY, diveProgress, diveScale, HOVER_HEIGHT, hoverPose, landingOffset,
  LANDING_HEIGHT, SKY_HEIGHT, SUN_COUNT, SUN_SIZE } from './visual-hau-nghe-timeline.js';

const MAX_SLOTS = 4;

type Slot = {
  source?: string; origin: Vector3; windup: number; reduced: boolean; age: number;
  phase: 'hover' | 'dive'; diveAge: number; target: Vector3; blasted: boolean; onBlast?: () => void;
  meshes: (Mesh | undefined)[]; pos: Vector3[]; start: Vector3[];
};

/**
 * Seven suns called by the hero. Windup (`cast`): they pop in one after another in an arc above the caster and
 * follow him (position fed every frame by the `caster` marker) for as long as the server takes to resolve.
 * Resolve (`ability`): they dive one after another onto the confirmed point, accelerating and swelling with an ember
 * trail, and the blast plays as the last one lands. No origin (lobby, reconnect): they fall from the sky over the point.
 * An unconfirmed cast fades after its windup + `CAST_GRACE`; no fake impact. Foreground pass: over monsters, under heroes.
 */
export class HauNgheSuns {
  private slots: Slot[] = [];
  private right = new Vector3(1, 0, 0);

  constructor(private scene: Scene, private art: KitPainted, private bank: KitFxBank) {}

  begin(origin: Vector3, windup: number, reduced: boolean, source?: string): void {
    this.drop(source);
    if (this.slots.length >= MAX_SLOTS) { debug('visual.haunghe.cap', { layer: 'suns' }); return; }
    this.slots.push(this.slot(origin, source, reduced, { windup: Math.max(.05, windup) }));
  }

  /** The caster moved: the hovering arc moves with him. */
  follow(source: string, at: Vector3): void {
    const slot = this.slots.find(s => s.source === source && s.phase === 'hover');
    if (slot) slot.origin.copyFrom(at);
  }

  /** Server resolve. Returns true when a cast was running (its hovering suns now dive); `onBlast` fires as they land. */
  dive(source: string | undefined, target: Vector3, origin: Vector3 | undefined, reduced: boolean, onBlast: () => void): boolean {
    let slot = this.slots.find(s => s.source === source && s.phase === 'hover');
    const hadCast = Boolean(slot);
    if (reduced) { if (slot) this.free(slot); onBlast(); return hadCast; }
    if (!slot) {
      if (this.slots.length >= MAX_SLOTS) { debug('visual.haunghe.cap', { layer: 'suns' }); onBlast(); return false; }
      slot = this.slot(origin ?? target, source, reduced, {});
      this.slots.push(slot);
      this.arrange(slot, origin ? HOVER_HEIGHT : SKY_HEIGHT);
    }
    slot.phase = 'dive'; slot.diveAge = 0; slot.target.copyFrom(target); slot.onBlast = onBlast;
    for (let i = 0; i < SUN_COUNT; i++) slot.start[i].copyFrom(slot.pos[i]);
    return hadCast;
  }

  tick(dt: number, time: number): void {
    if (!this.slots.length) return;
    const look = cameraLook(this.scene);
    this.right = Vector3.Cross(Vector3.Up(), look);
    if (this.right.lengthSquared() < 1e-4) this.right.set(1, 0, 0); else this.right.normalize();
    for (let i = this.slots.length - 1; i >= 0; i--) {
      const slot = this.slots[i];
      if (slot.phase === 'hover') this.hover(slot, dt, time); else this.diveTick(slot, dt);
    }
  }

  clear(): void { for (const slot of [...this.slots]) this.free(slot); }

  private hover(slot: Slot, dt: number, time: number): void {
    slot.age += dt;
    if (slot.age >= slot.windup + CAST_GRACE) {
      debug('visual.haunghe.cast.timeout', { windup: +slot.windup.toFixed(2) });
      this.free(slot);
      return;
    }
    for (let i = 0; i < SUN_COUNT; i++) {
      const pose = hoverPose(i, slot.age, time, slot.reduced);
      this.arrange(slot, HOVER_HEIGHT + pose.bob, i);
      this.draw(slot, i, SUN_SIZE * pose.scale, pose.alpha);
      if (!slot.reduced && Math.random() < .08) this.bank.spray('solar').rise(slot.pos[i], .35, 1);
    }
  }

  private diveTick(slot: Slot, dt: number): void {
    slot.diveAge += dt;
    let airborne = 0;
    for (let i = 0; i < SUN_COUNT; i++) {
      const progress = diveProgress(i, slot.diveAge);
      if (progress >= 1) { this.art.release(slot.meshes[i]); slot.meshes[i] = undefined; continue; }
      airborne++;
      if (progress > 0) {
        const land = landingOffset(i), end = new Vector3(slot.target.x + land.x, LANDING_HEIGHT, slot.target.z + land.z);
        const previous = slot.pos[i].clone();
        Vector3.LerpToRef(slot.start[i], end, progress, slot.pos[i]);
        this.bank.spray('solar').trail(slot.pos[i], previous.subtract(slot.pos[i]).scale(1.5), 2);
      }
      this.draw(slot, i, SUN_SIZE * diveScale(progress), 1);
    }
    if (!slot.blasted && slot.diveAge >= DIVE_BLAST_DELAY) {
      slot.blasted = true;
      slot.onBlast?.();
    }
    if (!airborne && slot.blasted) this.free(slot);
  }

  /** Writes the arc positions (centre over the caster, camera-right sideways); one sun or all of them. */
  private arrange(slot: Slot, height: number, only?: number): void {
    for (let i = only ?? 0; i < (only === undefined ? SUN_COUNT : only + 1); i++) {
      const { side, rise } = arcOffset(i);
      slot.pos[i].set(slot.origin.x + this.right.x * side, height + rise, slot.origin.z + this.right.z * side);
    }
  }

  private draw(slot: Slot, i: number, size: number, alpha: number): void {
    slot.meshes[i] ??= this.art.acquire('sun');
    const mesh = slot.meshes[i];
    if (!mesh) return;
    mesh.position.copyFrom(slot.pos[i]);
    mesh.scaling.setAll(size);
    mesh.visibility = alpha;
  }

  private drop(source?: string): void {
    const slot = this.slots.find(s => s.source === source && s.phase === 'hover');
    if (slot) this.free(slot);
  }

  private slot(origin: Vector3, source: string | undefined, reduced: boolean, init: Partial<Slot>): Slot {
    return { source, origin: origin.clone(), windup: .25, reduced, age: 0, phase: 'hover', diveAge: 0, target: Vector3.Zero(),
      blasted: false, meshes: Array<Mesh | undefined>(SUN_COUNT).fill(undefined),
      pos: Array.from({ length: SUN_COUNT }, () => Vector3.Zero()), start: Array.from({ length: SUN_COUNT }, () => Vector3.Zero()),
      ...init };
  }

  private free(slot: Slot): void {
    for (const mesh of slot.meshes) this.art.release(mesh);
    const index = this.slots.indexOf(slot);
    if (index >= 0) this.slots.splice(index, 1);
  }
}
