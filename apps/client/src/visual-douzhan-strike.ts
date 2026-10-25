import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { debug } from './debug.js';
import { billboardCenter } from './visual-kit-billboard.js';
import type { KitFxBank } from './visual-kit-fx-bank.js';
import type { KitPainted } from './visual-kit-painted.js';
import { fadeOut } from './visual-kit-timeline.js';
import type { DouzhanLanes } from './visual-douzhan-lane.js';
import type { DouzhanStaffs } from './visual-douzhan-staff.js';
import { ARRIVAL_GROUND, CAST_GRACE, CLOUD_COUNT, CLOUD_SIZE, cloudPose, laneAlpha, PIVOT_OFFSET, raisePose, slamPose,
  STAFF_LIFE, type StaffPose } from './visual-douzhan-timeline.js';

type Dir = { x: number; z: number };
interface Strike {
  source: string; origin: Vector3; dir: Dir; windup: number; reduced: boolean; age: number;
  /** Seconds since the server resolved (undefined while the windup is pending). */
  resolved?: number; contact: boolean; targets: Vector3[];
  /** Seconds since a cast that never resolved was given up on. */
  cancelled?: number;
  staff?: Mesh; lane?: Mesh; clouds: (Mesh | undefined)[];
}
const MAX_STRIKES = 6;
const CANCEL_FADE = .15;

/**
 * Windup and slam of Pháp Thiên Tượng Địa. Cast (`cast skill-h012`, the server's locked direction): the lane telegraph
 * appears, three gold clouds spiral into the pivot and the Thiết Bổng grows from small while it lifts toward the strike
 * angle. Resolve (`ability skill-h012`): the staff slams down onto the lane, rebounds, lies there and fades; `onContact`
 * fires at touchdown so the lane fracture and the rock bursts start with the staff, not before it. A cast that never
 * resolves is fading out `CAST_GRACE` after its windup, with no impact.
 */
export class DouzhanStrikes {
  private strikes: Strike[] = [];

  constructor(private art: KitPainted, private bank: KitFxBank, private staffs: DouzhanStaffs, private lanes: DouzhanLanes) {}

  begin(source: string, origin: Vector3, dir: Dir, windup: number, reduced: boolean): void {
    this.drop(this.strikes.find(strike => strike.source === source));
    if (this.strikes.length >= MAX_STRIKES) this.drop(this.strikes[0]);
    this.strikes.push({ source, origin: origin.clone(), dir: { ...dir }, windup, reduced, age: 0, contact: false, targets: [],
      clouds: [] });
    if (!reduced) this.bank.spray('earth').rise(new Vector3(origin.x + dir.x * PIVOT_OFFSET, 0, origin.z + dir.z * PIVOT_OFFSET), 1.6, 10);
  }

  /** Resolve the strike of `source`; without a cast (lobby, reconnect) the staff slams from the raised pose. True when a cast was pending. */
  resolve(source: string, origin: Vector3, dir: Dir, targets: readonly Vector3[], reduced: boolean, windup: number): boolean {
    let strike = this.strikes.find(item => item.source === source && item.resolved === undefined && item.cancelled === undefined);
    const hadCast = Boolean(strike);
    if (!strike) {
      if (this.strikes.length >= MAX_STRIKES) this.drop(this.strikes[0]);
      strike = { source, origin: origin.clone(), dir: { ...dir }, windup, reduced, age: windup, contact: false, targets: [],
        clouds: [] };
      this.strikes.push(strike);
    }
    strike.origin.copyFrom(origin); strike.dir = { ...dir }; strike.reduced = reduced;
    strike.resolved = 0; strike.targets = targets.map(at => at.clone());
    return hadCast;
  }

  /** `touchdown` runs once per strike when the staff reaches the lane (or at once with reduced motion). */
  tick(dt: number, up: Vector3, touchdown: (origin: Vector3, dir: Dir, targets: Vector3[], reduced: boolean) => void): void {
    for (let i = this.strikes.length - 1; i >= 0; i--) {
      const strike = this.strikes[i];
      strike.age += dt;
      if (strike.resolved !== undefined) strike.resolved += dt;
      else if (strike.cancelled !== undefined) strike.cancelled += dt;
      else if (strike.age > strike.windup + CAST_GRACE) { strike.cancelled = 0; debug('visual.douzhan.cancel', { source: strike.source }); }
      const done = strike.resolved !== undefined ? strike.resolved >= STAFF_LIFE
        : strike.cancelled !== undefined && strike.cancelled >= CANCEL_FADE;
      if (done) { this.drop(strike); continue; }
      const pose = this.pose(strike);
      if (strike.resolved !== undefined && !strike.contact && slamPose(strike.resolved, strike.reduced).landed) {
        strike.contact = true;
        touchdown(strike.origin, strike.dir, strike.targets, strike.reduced);
      }
      strike.staff ??= this.staffs.acquire();
      if (strike.staff) this.staffs.pose(strike.staff, strike.origin, strike.dir, pose);
      strike.lane ??= this.lanes.acquire();
      if (strike.lane) this.lanes.place(strike.lane, strike.origin, strike.dir,
        laneAlpha(strike.age, strike.windup, strike.resolved, strike.reduced) * (strike.cancelled === undefined ? 1 : fadeOut(strike.cancelled, 0, CANCEL_FADE)));
      this.clouds(strike, up);
    }
  }

  clear(): void { for (const strike of [...this.strikes]) this.drop(strike); }

  private pose(strike: Strike): StaffPose {
    if (strike.resolved !== undefined) { const { angle, scale, alpha } = slamPose(strike.resolved, strike.reduced); return { angle, scale, alpha }; }
    const pose = raisePose(strike.age, strike.windup, strike.reduced);
    return strike.cancelled === undefined ? pose : { ...pose, alpha: pose.alpha * fadeOut(strike.cancelled, 0, CANCEL_FADE) };
  }

  private clouds(strike: Strike, up: Vector3): void {
    const pivot = new Vector3(strike.origin.x + strike.dir.x * PIVOT_OFFSET, 0, strike.origin.z + strike.dir.z * PIVOT_OFFSET);
    const fade = strike.resolved !== undefined ? fadeOut(strike.resolved, 0, .12)
      : strike.cancelled !== undefined ? fadeOut(strike.cancelled, 0, CANCEL_FADE) : 1;
    for (let i = 0; i < CLOUD_COUNT; i++) {
      if (fade <= 0) { this.art.release(strike.clouds[i]); strike.clouds[i] = undefined; continue; }
      strike.clouds[i] ??= this.art.acquire('cloud');
      const mesh = strike.clouds[i];
      if (!mesh) continue;
      const pose = cloudPose(i, strike.age, strike.windup, strike.reduced), size = CLOUD_SIZE * pose.scale;
      const feet = new Vector3(pivot.x + Math.cos(pose.angle) * pose.radius, 0, pivot.z + Math.sin(pose.angle) * pose.radius);
      mesh.position.copyFrom(billboardCenter(feet, size, ARRIVAL_GROUND, up));
      mesh.scaling.setAll(size);
      mesh.visibility = pose.alpha * fade;
      this.art.frame(mesh, pose.frame, 4, 2);
    }
  }

  private drop(strike: Strike | undefined): void {
    if (!strike) return;
    this.staffs.release(strike.staff); this.lanes.release(strike.lane);
    for (const cloud of strike.clouds) this.art.release(cloud);
    const index = this.strikes.indexOf(strike);
    if (index >= 0) this.strikes.splice(index, 1);
  }
}
