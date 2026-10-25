import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { MonkeyCharge } from './visual-ton-ngo-khong-charge.js';
import { MonkeyStaffs } from './visual-ton-ngo-khong-staff.js';
import { MonkeyArt } from './visual-ton-ngo-khong-art.js';
import { CONTACT, STAFF_LIFE, MONKEY_CAPS, raisedStaff, slamStaff, type Point } from './visual-ton-ngo-khong-timeline.js';
import { debug } from './debug.js';
interface Action { origin: Vector3; dir: Point; age: number; windup: number; reduced: boolean; mesh?: Mesh }
interface Strike extends Action { targets: readonly Vector3[]; hit: boolean }
/** Cast never schedules damage art: only an actual resolve can start the slam and confirmed impacts. */
export class MonkeyAction {
  private charge: MonkeyCharge; private staffs: MonkeyStaffs; private casts = new Map<string, Action>(); private strikes: Strike[] = [];
  constructor(scene: Scene, private art: MonkeyArt) { this.staffs = new MonkeyStaffs(scene); this.charge = new MonkeyCharge(scene); }
  begin(id: string, origin: Vector3, dir: Point, windup: number, reduced: boolean): void {
    this.cancel(id); if (this.casts.size >= MONKEY_CAPS.casts) return;
    this.charge.begin(id, origin, dir, windup, reduced);
    this.casts.set(id, { origin: origin.clone(), dir, windup, reduced, age: 0 });
  }
  cancel(id: string): void { this.charge.cancel(id); this.staffs.release(this.casts.get(id)?.mesh); this.casts.delete(id); }
  resolve(id: string | undefined, origin: Vector3 | undefined, dir: Point | undefined, targets: readonly Vector3[], reduced: boolean): void {
    const cast = id ? this.casts.get(id) : undefined; if (id) { this.casts.delete(id); this.charge.cancel(id); }
    if (this.strikes.length >= MONKEY_CAPS.strikes) { this.staffs.release(cast?.mesh); return; }
    // The caller withholds origin for dead/off-zone sources; never resurrect cached geometry.
    const at = origin, direction = dir;
    if (!at || !direction) {
      this.staffs.release(cast?.mesh); for (const target of targets.slice(0, MONKEY_CAPS.targets)) this.art.impact(target, reduced);
      return;
    }
    this.strikes.push({ origin: at.clone(), dir: direction, age: 0, windup: 0, reduced, targets: targets.slice(0, MONKEY_CAPS.targets).map(p => p.clone()), hit: false, mesh: cast?.mesh });
  }
  tick(dt: number, time = 0): void {
    this.charge.tick(dt, time);
    for (const [id, p] of this.casts) {
      p.age += dt;
      if (p.age > p.windup + .3) { this.cancel(id); continue; }
      p.mesh ??= this.staffs.acquire();
      const state = raisedStaff(p.age, p.windup, p.reduced);
      if (p.mesh) this.staffs.pose(p.mesh, p.origin, p.dir, state.angle, state.alpha);
    }
    for (let i = this.strikes.length - 1; i >= 0; i--) {
      const p = this.strikes[i]; p.age += dt;
      if (!p.hit && p.age >= (p.reduced ? 0 : CONTACT)) {
        p.hit = true; this.art.crack(p.origin, p.dir, p.reduced);
        for (const target of p.targets) this.art.impact(target, p.reduced);
        debug('visual.ton-ngo-khong.impact', { targets: p.targets.length, reduced: p.reduced });
      }
      if (p.age >= STAFF_LIFE) { this.staffs.release(p.mesh); this.strikes.splice(i, 1); continue; }
      p.mesh ??= this.staffs.acquire(); const state = slamStaff(p.age, p.reduced);
      if (p.mesh) this.staffs.pose(p.mesh, p.origin, p.dir, state.angle, state.alpha);
    }
  }
  clear(): void { this.charge.clear(); this.casts.clear(); this.strikes.length = 0; this.staffs.clear(); }
}

