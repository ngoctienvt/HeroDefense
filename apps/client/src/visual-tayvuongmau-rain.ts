import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { TAYVUONGMAU as T } from '../../../content/tayvuongmau-design.js';
import { debug } from './debug.js';
import { cameraLook, resetStrip } from './visual-de-tuan-strip.js';
import type { KitFxBank } from './visual-kit-fx-bank.js';
import type { KitPainted } from './visual-kit-painted.js';
import type { TayvuongmauImpacts } from './visual-tayvuongmau-impacts.js';
import { placePin } from './visual-tayvuongmau-pin-strip.js';
import { CAST_GRACE, dropProgress, hoverDirection, hoverOffset, hoverPose, landingPoints, landTime, PIN_COUNT, PIN_LENGTH,
  PIN_WIDTH, type Point2 } from './visual-tayvuongmau-timeline.js';

const MAX_SLOTS = 3;

type Slot = {
  source?: string; center: Vector3; windup: number; reduced: boolean; age: number; phase: 'hover' | 'drop'; dropAge: number;
  meshes: (Mesh | undefined)[]; start: Vector3[]; end: Vector3[]; landed: boolean[]; shocked: boolean;
};

/**
 * Côn Lôn Vạn Kim Vũ. Windup (`cast`, at the locked point): the R7 edge lights and eleven golden hairpins pop in a
 * crown high above the point, tips down, and hang there until the server resolves. Resolve (`ability skill-h01A`): they
 * fan out and fall tip-first, accelerating, onto the monsters the server listed and the rest of the area; each
 * lands as a planted pin (impact sheet), the first landing sends the R7 shock ring. An unconfirmed cast fades after
 * its windup + CAST_GRACE with no impact. Foreground pass: over monsters, under heroes.
 */
export class TayvuongmauRain {
  private slots: Slot[] = [];

  constructor(private scene: Scene, private art: KitPainted, private bank: KitFxBank, private impacts: TayvuongmauImpacts) {}

  begin(center: Vector3, windup: number, reduced: boolean, source?: string): void {
    this.drop(source);
    if (this.slots.length >= MAX_SLOTS) { debug('visual.tayvuongmau.cap', { layer: 'rain' }); return; }
    this.slots.push(this.slot(center, source, reduced, Math.max(.05, windup)));
    this.bank.ring(center, T.rainRadius, 'kunlun', { life: windup + CAST_GRACE, fill: .05, rim: 1, alpha: .8, hold: true, reduced, order: 5 });
  }

  /** Server resolve. True when a cast was hovering; the pins fall at once. */
  resolve(source: string | undefined, center: Vector3, targets: readonly Vector3[], reduced: boolean): boolean {
    const found = this.slots.find(s => s.source === source && s.phase === 'hover');
    const hadCast = Boolean(found);
    const points = landingPoints(center, targets);
    if (reduced) {
      if (found) this.free(found);
      this.shock(center, true);
      for (const p of points) this.impacts.plant(new Vector3(p.x, 0, p.z), true);
      return hadCast;
    }
    let slot = found;
    if (!slot) {
      if (this.slots.length >= MAX_SLOTS) { debug('visual.tayvuongmau.cap', { layer: 'rain' }); this.shock(center, false); return false; }
      slot = this.slot(center, source, reduced, .05);
      this.slots.push(slot);
    }
    slot.center.copyFrom(center);
    for (let i = 0; i < PIN_COUNT; i++) {
      const p: Point2 = points[i % points.length];
      slot.end[i].set(p.x, .12, p.z);
      slot.start[i].set(center.x + hoverOffset(i).x, hoverOffset(i).y, center.z + hoverOffset(i).z);
    }
    slot.phase = 'drop'; slot.dropAge = 0;
    return hadCast;
  }

  tick(dt: number, time: number): void {
    if (!this.slots.length) return;
    const look = cameraLook(this.scene);
    for (let i = this.slots.length - 1; i >= 0; i--) {
      const slot = this.slots[i];
      if (slot.phase === 'hover') this.hover(slot, dt, time, look); else this.fall(slot, dt, look);
    }
  }

  clear(): void { for (const slot of [...this.slots]) this.free(slot); }

  private hover(slot: Slot, dt: number, time: number, look: Vector3): void {
    slot.age += dt;
    if (slot.age >= slot.windup + CAST_GRACE) {
      debug('visual.tayvuongmau.cast.timeout', { windup: +slot.windup.toFixed(2) });
      this.free(slot);
      return;
    }
    for (let i = 0; i < PIN_COUNT; i++) {
      const pose = hoverPose(i, slot.age, time, slot.reduced), o = hoverOffset(i), d = hoverDirection(i);
      this.draw(slot, i, new Vector3(slot.center.x + o.x, o.y + pose.bob, slot.center.z + o.z), new Vector3(d.x, d.y, d.z),
        look, pose.scale, pose.alpha);
    }
  }

  private fall(slot: Slot, dt: number, look: Vector3): void {
    slot.dropAge += dt;
    let waiting = 0;
    for (let i = 0; i < PIN_COUNT; i++) {
      if (slot.landed[i]) continue;
      const progress = dropProgress(i, slot.dropAge);
      if (slot.dropAge >= landTime(i)) { this.land(slot, i); continue; }
      waiting++;
      if (progress <= 0) {
        const d = hoverDirection(i);
        this.draw(slot, i, slot.start[i], new Vector3(d.x, d.y, d.z), look, 1, 1);
        continue;
      }
      const tip = Vector3.Lerp(slot.start[i], slot.end[i], progress), direction = slot.end[i].subtract(slot.start[i]);
      this.draw(slot, i, tip, direction, look, 1, 1);
      this.bank.spray('kunlun').trail(tip, direction.normalize().scale(-2), 1);
    }
    if (!waiting) this.free(slot);
  }

  private land(slot: Slot, i: number): void {
    slot.landed[i] = true;
    resetStrip(slot.meshes[i]); this.art.release(slot.meshes[i]); slot.meshes[i] = undefined;
    const at = slot.end[i];
    // The sheet's pin leans toward screen-right: a pin that fell toward screen-left gets the mirrored sprite.
    const right = Vector3.Cross(Vector3.Up(), cameraLook(this.scene));
    this.impacts.plant(new Vector3(at.x, 0, at.z), false, Vector3.Dot(at.subtract(slot.start[i]), right) < 0);
    this.bank.spray('kunlun').ring(new Vector3(at.x, 0, at.z), .5, 10, .2, 1.8, 3.4);
    if (!slot.shocked) { slot.shocked = true; this.shock(slot.center, false); }
  }

  /** The R7 edge: one expanding ring at the first landing marks the exact gameplay area. */
  private shock(center: Vector3, reduced: boolean): void {
    this.bank.ring(center, T.rainRadius, 'kunlun', { life: .55, fill: .06, rim: 1, alpha: .95, reduced, order: 6 });
    this.bank.ring(center, 2.4, 'kunlun', { life: .4, fill: .35, rim: 1, alpha: .8, hold: true, reduced, order: 7 });
  }

  private draw(slot: Slot, i: number, tip: Vector3, direction: Vector3, look: Vector3, scale: number, alpha: number): void {
    slot.meshes[i] ??= this.art.acquire('pin');
    const mesh = slot.meshes[i];
    if (!mesh) return;
    if (!placePin(mesh, tip, direction, look, PIN_LENGTH, PIN_WIDTH, scale)) return;
    mesh.visibility = alpha;
  }

  private drop(source?: string): void {
    const slot = this.slots.find(s => s.source === source && s.phase === 'hover');
    if (slot) this.free(slot);
  }

  private slot(center: Vector3, source: string | undefined, reduced: boolean, windup: number): Slot {
    return { source, center: center.clone(), windup, reduced, age: 0, phase: 'hover', dropAge: 0,
      meshes: Array<Mesh | undefined>(PIN_COUNT).fill(undefined),
      start: Array.from({ length: PIN_COUNT }, () => Vector3.Zero()), end: Array.from({ length: PIN_COUNT }, () => Vector3.Zero()),
      landed: Array<boolean>(PIN_COUNT).fill(false), shocked: false };
  }

  private free(slot: Slot): void {
    for (const mesh of slot.meshes) { resetStrip(mesh); this.art.release(mesh); }
    const index = this.slots.indexOf(slot);
    if (index >= 0) this.slots.splice(index, 1);
  }
}
