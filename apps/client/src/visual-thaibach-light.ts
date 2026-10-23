import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { debug } from './debug.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import { billboardCenter } from './visual-kit-billboard.js';
import type { KitFxBank } from './visual-kit-fx-bank.js';
import type { KitPainted } from './visual-kit-painted.js';
import { cameraLook, placeStrip, resetStrip } from './visual-de-tuan-strip.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { fallLandingTime, fallPose, type FallSpec, GUIDE_ASPECT, GUIDE_LIFE, guideAlpha, guideHead, guideLength,
  LANDING_RING_LIFE, LANDING_RING_RADIUS, type Point3, printPose, PRINT_LIFE, SELF_DISTANCE, STAR_HEIGHT, UNIT_HEIGHT } from './visual-thaibach-timeline.js';

type Strip = { mesh?: Mesh; from: Point3; to: Point3; length: number; age: number };
type Fall = { star?: Mesh; print?: Mesh; at: Vector3; spec: FallSpec; age: number; landed: boolean; reduced: boolean };
const MAX_STRIPS = 6, MAX_FALLS = 12;

/**
 * What one recipient sees from Tinh Quân / Trường Canh: the guidance ribbon (Codex star-guidance art, head first, fixed
 * aspect) from the caster's star to exactly that recipient, the starlight (the ribbon's gold star) dropping onto them,
 * and at the landing a contact ring, starlight motes and a brief star footprint on the ground (the footprint is the
 * same gold star laid flat: no dedicated art exists). The ribbon never delays the heal; the shared heal/revive sheet
 * is played by the caller at the event time. No ring of area size is ever drawn (R12 is only the selection range).
 */
export class ThaibachLight {
  private strips: Strip[] = [];
  private falls: Fall[] = [];

  constructor(private scene: Scene, private art: KitPainted, private bank: KitFxBank) {}

  /** `from` = the caster's feet (undefined: no ribbon, e.g. no origin known or the recipient is the caster). */
  bless(from: Vector3 | undefined, at: Vector3, spec: FallSpec, reduced: boolean): void {
    const self = !from || Math.hypot(from.x - at.x, from.z - at.z) < SELF_DISTANCE;
    if (!self && !reduced) {
      if (this.strips.length >= MAX_STRIPS) debug('visual.thaibach.cap', { layer: 'ribbon' });
      else {
        const dx = at.x - from.x, dz = at.z - from.z;
        this.strips.push({ from: { x: from.x, y: STAR_HEIGHT, z: from.z }, to: { x: at.x, y: UNIT_HEIGHT, z: at.z },
          length: guideLength(Math.hypot(dx, dz)), age: 0 });
      }
    }
    if (this.falls.length >= MAX_FALLS) { debug('visual.thaibach.cap', { layer: 'fall' }); this.land(at, reduced); return; }
    this.falls.push({ at: at.clone(), spec, age: 0, landed: false, reduced });
  }

  tick(dt: number, up: Vector3): void {
    const look = cameraLook(this.scene);
    for (let i = this.strips.length - 1; i >= 0; i--) this.flyStrip(this.strips[i], dt, look);
    for (let i = this.falls.length - 1; i >= 0; i--) this.dropStar(this.falls[i], dt, up);
  }

  clear(): void {
    for (const strip of [...this.strips]) this.freeStrip(strip);
    for (const fall of [...this.falls]) this.freeFall(fall);
  }

  private flyStrip(strip: Strip, dt: number, look: Vector3): void {
    strip.age += dt;
    if (strip.age >= GUIDE_LIFE) { this.freeStrip(strip); return; }
    strip.mesh ??= this.art.acquire('guidance');
    if (!strip.mesh) return;
    const head = guideHead(strip.from, strip.to, strip.age);
    const ahead = guideHead(strip.from, strip.to, Math.min(strip.age + .02, GUIDE_LIFE));
    const direction = new Vector3(ahead.x - head.x, ahead.y - head.y, ahead.z - head.z);
    // Arrived (zero step): keep the heading of the whole line instead of dropping the strip.
    if (direction.lengthSquared() < 1e-6) direction.set(strip.to.x - strip.from.x, strip.to.y - strip.from.y, strip.to.z - strip.from.z);
    if (!placeStrip(strip.mesh, new Vector3(head.x, head.y, head.z), direction, look, strip.length, strip.length / GUIDE_ASPECT)) {
      this.freeStrip(strip);
      return;
    }
    strip.mesh.visibility = guideAlpha(strip.age);
  }

  private dropStar(fall: Fall, dt: number, up: Vector3): void {
    fall.age += dt;
    const pose = fallPose(fall.age, fall.spec);
    if (pose.landed && !fall.landed) { fall.landed = true; this.land(fall.at, fall.reduced); }
    const sinceLanding = fall.age - fallLandingTime(fall.spec);
    if (sinceLanding >= PRINT_LIFE) { this.freeFall(fall); return; }
    if (!fall.landed || sinceLanding < .08) {
      fall.star ??= this.art.acquire('star');
      if (fall.star) {
        const size = pose.scale * 1.1;
        fall.star.position.copyFrom(billboardCenter(new Vector3(fall.at.x, 0, fall.at.z), size, .5, up, pose.height));
        fall.star.scaling.setAll(size);
        fall.star.visibility = pose.alpha;
      }
    } else if (fall.star) { this.art.release(fall.star); fall.star = undefined; }
    if (fall.landed) {
      fall.print ??= this.art.acquire('star', true);
      if (fall.print) {
        const mark = printPose(sinceLanding);
        fall.print.position.set(fall.at.x, .04, fall.at.z);
        fall.print.alphaIndex = GROUND_ALPHA_INDEX + 3;
        fall.print.scaling.setAll(mark.scale);
        fall.print.visibility = mark.alpha;
      }
    }
  }

  private land(at: Vector3, reduced: boolean): void {
    this.bank.ring(at, LANDING_RING_RADIUS, 'changgeng', { life: LANDING_RING_LIFE, fill: .2, rim: 1, alpha: .85, hold: true, reduced, order: 5 });
    if (!reduced) {
      this.bank.spray('changgeng').ring(new Vector3(at.x, 0, at.z), .4, 14, .5, 1, 2.2);
      this.bank.spray('changgeng').rise(new Vector3(at.x, 0, at.z), .9, 5);
    }
  }

  private freeStrip(strip: Strip): void {
    resetStrip(strip.mesh);
    this.art.release(strip.mesh);
    const index = this.strips.indexOf(strip);
    if (index >= 0) this.strips.splice(index, 1);
  }

  private freeFall(fall: Fall): void {
    this.art.release(fall.star);
    this.art.release(fall.print);
    const index = this.falls.indexOf(fall);
    if (index >= 0) this.falls.splice(index, 1);
  }
}
