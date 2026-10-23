import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { billboardCenter, farDirection } from './visual-kit-billboard.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { KitFxBank } from './visual-kit-fx-bank.js';
import type { KitPainted } from './visual-kit-painted.js';
import { BURST_GROUND, BURST_LIFE, BURST_SIZE, burstAlpha, burstDistances, burstFrame, burstStart, FRACTURE_LENGTH, FRACTURE_WIDTH,
  FRACTURE_X0, fractureHead, fractureLife, fracturePose, shockArrival } from './visual-douzhan-timeline.js';

type Dir = { x: number; z: number };
interface Burst { at: Vector3; age: number; mirror: boolean; reduced: boolean; mesh?: Mesh }
interface Fracture { origin: Vector3; dir: Dir; age: number; reduced: boolean; mesh?: Mesh }
const MAX_BURSTS = 24, MAX_FRACTURES = 4, MAX_FLARES = 12;

/**
 * Staff-slam impact along the server lane, started at touchdown. Three layers: the top-down fracture ribbon (Codex
 * art laid on the 14 x 4.5 lane, revealed from the caster to the lane end, then closing over 0.7 s), rock-and-dust bursts
 * (Codex sheet, billboards in the foreground pass) running outward along the lane with rock chips thrown, and a contact flare on
 * every monster the server listed. The sheet is drawn at a fixed slant, so a burst is only mirrored toward the lane's screen side.
 */
export class DouzhanImpacts {
  private bursts: Burst[] = [];
  private fractures: Fracture[] = [];
  private flares = 0;

  constructor(private scene: Scene, private art: KitPainted, private bank: KitFxBank) {}

  strike(origin: Vector3, dir: Dir, targets: readonly Vector3[], reduced: boolean): void {
    if (this.fractures.length >= MAX_FRACTURES) this.freeFracture(this.fractures[0]);
    this.fractures.push({ origin: origin.clone(), dir: { ...dir }, age: 0, reduced });
    const far = farDirection(this.scene), right = new Vector3(far.z, 0, -far.x);
    const mirror = dir.x * right.x + dir.z * right.z < 0;
    burstDistances(reduced).forEach((distance, i) => {
      if (this.bursts.length >= MAX_BURSTS) this.freeBurst(this.bursts[0]);
      const at = new Vector3(origin.x + dir.x * distance, 0, origin.z + dir.z * distance);
      this.bursts.push({ at, age: -burstStart(i, reduced), mirror, reduced });
      if (!reduced) this.bank.after(burstStart(i, reduced), () => this.bank.spray('earth').ring(at, .4, 9, .25, 2.4, 5.5));
    });
    for (const target of targets.slice(0, MAX_FLARES)) {
      const along = (target.x - origin.x) * dir.x + (target.z - origin.z) * dir.z;
      this.bank.after(shockArrival(along, reduced), () => {
        this.bank.ring(target, 1.3, 'gold', { life: .28, fill: .3, rim: 1, alpha: .8, hold: true, reduced, order: 5 });
        if (!reduced) this.bank.spray('gold').ring(new Vector3(target.x, 0, target.z), .3, 8, .2, 1.4, 3);
      });
    }
  }

  tick(dt: number, up: Vector3): void {
    for (let i = this.fractures.length - 1; i >= 0; i--) {
      const item = this.fractures[i];
      item.age += dt;
      if (item.age >= fractureLife(item.reduced)) { this.freeFracture(item); continue; }
      item.mesh ??= this.art.acquire('fracture', true);
      if (item.mesh) this.placeFracture(item, item.mesh);
    }
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const item = this.bursts[i];
      item.age += dt;
      if (item.age < 0) continue;
      if (item.age >= (item.reduced ? .35 : BURST_LIFE)) { this.freeBurst(item); continue; }
      item.mesh ??= this.art.acquire('slam');
      if (!item.mesh) continue;
      item.mesh.position.copyFrom(billboardCenter(item.at, BURST_SIZE, BURST_GROUND, up));
      item.mesh.scaling.set(item.mirror ? -BURST_SIZE : BURST_SIZE, BURST_SIZE, BURST_SIZE);
      item.mesh.visibility = burstAlpha(item.age, item.reduced);
      this.art.frame(item.mesh, burstFrame(item.age, item.reduced), 4, 4);
    }
  }

  clear(): void {
    for (const item of [...this.bursts]) this.freeBurst(item);
    for (const item of [...this.fractures]) this.freeFracture(item);
  }

  /** Ribbon whose painted extent (x .0267..0.9843) spans the lane; only the revealed head of the image is drawn, at true scale. */
  private placeFracture(item: Fracture, mesh: Mesh): void {
    const head = fractureHead(item.age, item.reduced), pose = fracturePose(item.age, item.reduced);
    const length = FRACTURE_LENGTH * head, start = -FRACTURE_X0 * FRACTURE_LENGTH + length / 2;
    this.art.mapUvs(mesh, base => base.map((v, i) => (i % 2 === 0 ? v * head : v)));
    mesh.rotation.y = Math.atan2(-item.dir.z, item.dir.x);
    mesh.scaling.set(length, FRACTURE_WIDTH * pose.squeeze, 1);
    mesh.position.set(item.origin.x + item.dir.x * start, .09, item.origin.z + item.dir.z * start);
    mesh.visibility = pose.alpha;
  }

  private freeBurst(item: Burst): void {
    this.art.release(item.mesh);
    const index = this.bursts.indexOf(item);
    if (index >= 0) this.bursts.splice(index, 1);
  }

  private freeFracture(item: Fracture): void {
    this.art.release(item.mesh);
    const index = this.fractures.indexOf(item);
    if (index >= 0) this.fractures.splice(index, 1);
  }
}
