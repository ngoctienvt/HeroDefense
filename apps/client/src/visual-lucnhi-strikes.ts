import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { debug } from './debug.js';
import { cameraLook, placeStrip, resetStrip } from './visual-de-tuan-strip.js';
import { billboardCenter } from './visual-kit-billboard.js';
import type { KitFxBank } from './visual-kit-fx-bank.js';
import type { KitPainted } from './visual-kit-painted.js';
import { basicAlpha, basicArrival, basicProgress, BASIC_FADE, BASIC_FLIGHT, HIT_ANCHOR, HIT_LIFE, HIT_LIFT, HIT_SIZE, hitAlpha,
  hitFrame, MAX_PULSE_TARGETS, SHEET_COLUMNS, SHEET_ROWS, STAFF_FADE, STAFF_FLIGHT, STAFF_HEIGHT, STAFF_LENGTH, STAFF_RUN_UP,
  STAFF_WIDTH, staffAlpha, staffProgress, strikeDirection } from './visual-lucnhi-timeline.js';

/** One cudgel in flight: head path `from → to`, landing a hit flipbook at each `landings[i].at` once `delay` has run. */
type Landing = { delay: number; at: Vector3; done: boolean };
type Staff = { from: Vector3; to: Vector3; age: number; basic: boolean; length: number; width: number; landings: Landing[];
  mesh?: Mesh };
type Hit = { at: Vector3; age: number; reduced: boolean; mesh?: Mesh };
const MAX_STAFFS = 48, MAX_HITS = 96;

/**
 * What the server confirmed per pulse (`shadow-hit-h03Y`, strikeIndex 1..6): ONE cudgel streak + hit sheet + ground mark +
 * dark-gold shards at each enemy in that pulse's target list, and nothing anywhere else. No target list, no pulse art: the
 * client never invents a target, a pulse or a hit. The streak comes in along the pulse's own 60° direction (strikeDirection),
 * so six pulses trace the six points of the seal. The basic wave (`trait-h03Y`) is one longer cudgel along the pierce line.
 */
export class LucnhiStrikes {
  private staffs: Staff[] = [];
  private hits: Hit[] = [];

  constructor(private scene: Scene, private art: KitPainted, private bank: KitFxBank) {}

  pulse(index: number, targets: readonly Vector3[], reduced: boolean): void {
    const direction = strikeDirection(index);
    const listed = targets.slice(0, MAX_PULSE_TARGETS);
    for (const target of listed) {
      const to = new Vector3(target.x, STAFF_HEIGHT, target.z);
      const from = new Vector3(to.x - direction.x * STAFF_RUN_UP, STAFF_HEIGHT, to.z - direction.z * STAFF_RUN_UP);
      this.launch({ from, to, age: 0, basic: false, length: STAFF_LENGTH, width: STAFF_WIDTH,
        landings: [{ delay: STAFF_FLIGHT, at: target.clone(), done: false }] }, reduced);
    }
    debug('visual.lucnhi.pulse', { strike: index, targets: targets.length, drawn: listed.length, reduced });
  }

  /** One cudgel along `direction` (unit XZ) for `reach` units; a hit where its head passes each target. */
  basic(origin: Vector3, direction: { x: number; z: number }, reach: number, targets: readonly Vector3[], crit: boolean, reduced: boolean): void {
    const from = new Vector3(origin.x + direction.x * 1.2, STAFF_HEIGHT, origin.z + direction.z * 1.2);
    const to = new Vector3(origin.x + direction.x * reach, STAFF_HEIGHT, origin.z + direction.z * reach);
    const length = STAFF_LENGTH * 1.4;
    const landings = targets.slice(0, MAX_PULSE_TARGETS).map(at => ({
      delay: basicArrival(Math.hypot(at.x - origin.x, at.z - origin.z)), at: at.clone(), done: false }));
    this.launch({ from, to, age: 0, basic: true, length, width: length / (STAFF_LENGTH / STAFF_WIDTH), landings }, reduced);
    debug('visual.lucnhi.basic', { targets: targets.length, crit, reduced });
  }

  tick(dt: number, up: Vector3): void {
    const look = this.staffs.length ? cameraLook(this.scene) : undefined;
    for (let i = this.staffs.length - 1; i >= 0; i--) {
      const staff = this.staffs[i];
      staff.age += dt;
      for (const landing of staff.landings) if (!landing.done && staff.age >= landing.delay) this.land(landing);
      const flight = staff.basic ? BASIC_FLIGHT : STAFF_FLIGHT, fade = staff.basic ? BASIC_FADE : STAFF_FADE;
      if (staff.age >= flight + fade) { this.freeStaff(staff, i); continue; }
      staff.mesh ??= this.art.acquire('staff');
      if (!staff.mesh || !look) continue;
      const progress = staff.basic ? basicProgress(staff.age) : staffProgress(staff.age);
      const head = Vector3.Lerp(staff.from, staff.to, progress);
      if (!placeStrip(staff.mesh, head, staff.to.subtract(staff.from), look, staff.length, staff.width)) { this.freeStaff(staff, i); continue; }
      staff.mesh.visibility = staff.basic ? basicAlpha(staff.age) : staffAlpha(staff.age);
    }
    for (let i = this.hits.length - 1; i >= 0; i--) {
      const hit = this.hits[i];
      hit.age += dt;
      if (hit.age >= HIT_LIFE) { this.art.release(hit.mesh); this.hits.splice(i, 1); continue; }
      hit.mesh ??= this.art.acquire('hit');
      if (!hit.mesh) continue;
      hit.mesh.position.copyFrom(billboardCenter(new Vector3(hit.at.x, 0, hit.at.z), HIT_SIZE, HIT_ANCHOR, up, HIT_LIFT));
      hit.mesh.scaling.setAll(HIT_SIZE);
      hit.mesh.visibility = hitAlpha(hit.age, hit.reduced);
      this.art.frame(hit.mesh, hitFrame(hit.age, hit.reduced), SHEET_COLUMNS, SHEET_ROWS);
    }
  }

  clear(): void {
    for (let i = this.staffs.length - 1; i >= 0; i--) this.freeStaff(this.staffs[i], i);
    for (const hit of this.hits) this.art.release(hit.mesh);
    this.hits.length = 0;
  }

  /** Reduced motion keeps the hit (one still frame + ground mark) and drops the streak and shards. */
  private launch(staff: Staff, reduced: boolean): void {
    if (reduced) { for (const landing of staff.landings) this.land(landing, true); return; }
    if (this.staffs.length >= MAX_STAFFS) {
      debug('visual.lucnhi.cap', { layer: 'staff' });
      for (const landing of staff.landings) this.land(landing);
      return;
    }
    this.staffs.push(staff);
  }

  private land(landing: Landing, reduced = false): void {
    landing.done = true;
    if (this.hits.length < MAX_HITS) this.hits.push({ at: landing.at, age: 0, reduced });
    else debug('visual.lucnhi.cap', { layer: 'hit' });
    // Small cudgel crater: a dark-gold rim that cools out where the head struck.
    this.bank.ring(landing.at, 1, 'lucnhi', { life: .5, fill: .35, rim: 1, alpha: .8, hold: true, reduced, order: 5 });
    if (!reduced) this.bank.spray('lucnhi').ring(landing.at, .3, 8, .25, 2.4, 3.4);
  }

  private freeStaff(staff: Staff, index: number): void {
    resetStrip(staff.mesh);
    this.art.release(staff.mesh);
    this.staffs.splice(index, 1);
  }
}
