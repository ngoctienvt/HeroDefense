import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { billboardCenter, screenUp } from './visual-kit-billboard.js';
import { HIENVIEN as H } from '../../../content/hienvien-design.js';
import { KitFlipbooks } from './visual-kit-flipbooks.js';
import { KitFxBank } from './visual-kit-fx-bank.js';
import type { KitPainted } from './visual-kit-painted.js';
import { ARRIVAL_LIFE, ARRIVAL_SIZE, arrivalFrame, fanDirections, HIT_LIFE, HIT_SIZE, hitFrame, RAIN_LIFE,
  RAIN_SIZE, rainPose, S8_ANCHOR_Y } from './visual-hienvien-timeline.js';

/** One pooled painted plane driven by `apply(age)` until `life`; released on expiry or clear. */
type Item = { mesh: Mesh; age: number; life: number; apply(mesh: Mesh, age: number): void };
const MAX_ITEMS = 96;

/**
 * Hiên Viên's short-lived layers, all on server event points: the 15-pulse sword rain (fall → contact hit
 * → planted fade, R1.5 crack ring), cauldron arrival dust, the impact shock and the basic five-sword qi fan.
 */
export class HienvienAccents {
  readonly bank: KitFxBank;
  private items: Item[] = [];
  /** Camera screen-up, refreshed every tick: billboards stand along it, so ground anchors follow it too. */
  private up = Vector3.Up();

  constructor(private scene: Scene, private art: KitPainted) {
    this.bank = new KitFxBank(scene, new KitFlipbooks(scene));
  }

  /** One `sword-rain-h01F` pulse: the small sword drops in under .1 s so its contact matches the server hit. */
  rain(at: Vector3, reduced: boolean): void {
    this.play('rain', RAIN_LIFE, (mesh, age) => {
      const pose = rainPose(age, reduced);
      mesh.position.copyFrom(billboardCenter(at, RAIN_SIZE, S8_ANCHOR_Y, this.up, pose.lift));
      mesh.scaling.setAll(RAIN_SIZE);
      mesh.visibility = pose.alpha;
      this.art.frame(mesh, pose.frame, 4, 2);
    });
    this.bank.after(reduced ? 0 : .08, () => this.hit(at, 1, reduced));
  }

  /** Contact: hit sheet, a crack ring of the real hit radius and a few rock chips. */
  hit(at: Vector3, scale: number, reduced: boolean): void {
    this.play('hit', reduced ? .2 : HIT_LIFE, (mesh, age) => {
      mesh.position.copyFrom(billboardCenter(at, HIT_SIZE * scale, S8_ANCHOR_Y, this.up));
      mesh.scaling.setAll(HIT_SIZE * scale);
      mesh.visibility = reduced ? .7 : 1;
      this.art.frame(mesh, reduced ? 2 : hitFrame(age), 4, 2);
    });
    if (scale < 1) return;
    this.bank.ring(at, 1.5, 'xuanyuan', { life: .5, fill: .18, rim: .8, alpha: .7, hold: true, reduced, order: 5 });
    if (!reduced) this.bank.spray('earth').ring(at, .25, 10, .2, 2.4, 4);
  }

  /** Dust and gold qi bursting from under a cauldron as it lands (no damage: pure presentation). */
  arrival(at: Vector3, reduced: boolean): void {
    this.play('arrival', reduced ? .25 : ARRIVAL_LIFE, (mesh, age) => {
      mesh.position.copyFrom(billboardCenter(at, ARRIVAL_SIZE, S8_ANCHOR_Y, this.up));
      mesh.scaling.setAll(ARRIVAL_SIZE);
      mesh.visibility = reduced ? .6 : 1;
      this.art.frame(mesh, reduced ? 1 : arrivalFrame(age), 4, 2);
    });
    if (!reduced) this.bank.spray('earth').ring(at, .6, 6, .15, 1.6, 2.6);
  }

  /** Server impact of the giant sword: shock ring to R8.5, a gold flash ring, rock burst and rising qi. */
  shock(at: Vector3, reduced: boolean): void {
    this.bank.ring(at, H.giantRadius, 'xuanyuan', { life: .55, fill: .04, rim: 1, alpha: .95, reduced, order: 6 });
    this.bank.ring(at, 2.4, 'gold', { life: .45, fill: .3, rim: 1, alpha: .8, hold: true, reduced, order: 7 });
    if (reduced) return;
    this.bank.spray('earth').ring(at, .8, 46, .3, 6.5, 8);
    this.bank.spray('earth').ring(at, H.giantRadius * .9, 40, .1, 1.5, 3.2);
    this.bank.spray('gold').rise(at, 2.2, 24);
  }

  /** `trait-h01F`: five sword-qi streaks along the server fan, length = sword reach; small hits on every target. */
  fan(origin: Vector3, direction: { x: number; z: number }, targets: readonly Vector3[], reduced: boolean): void {
    for (const dir of fanDirections(direction)) {
      const to = new Vector3(origin.x + dir.x * H.swordLength, 0, origin.z + dir.z * H.swordLength);
      this.bank.ribbon(origin, to, 'xuanyuan', { life: reduced ? .2 : .26, width: H.swordWidth * .7,
        taper: .7, height: 1.25, maxSpan: 3.2, reduced });
    }
    for (const target of targets.slice(0, 12)) this.hit(target, .4, reduced);
  }

  /** `imperial-blessing-h01F` on one ally: a quick gold ring and rising qi (the lasting marks follow the snapshot). */
  blessing(at: Vector3, reduced: boolean): void {
    this.bank.ring(at, 1.7, 'xuanyuan', { life: .45, fill: .2, rim: 1, alpha: .85, reduced, order: 6 });
    if (!reduced) this.bank.spray('gold').rise(at, .9, 10);
  }

  /** Screen-up of the active camera (shared with the strike so every billboard uses the same frame). */
  get screenUp(): Vector3 { return this.up; }

  tick(dt: number, time: number): void {
    this.up = screenUp(this.scene);
    this.bank.tick(dt, time);
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      item.age += dt;
      if (item.age >= item.life) { this.art.release(item.mesh); this.items.splice(i, 1); continue; }
      item.apply(item.mesh, item.age);
    }
  }

  clear(): void {
    for (const item of this.items) this.art.release(item.mesh);
    this.items.length = 0;
    this.bank.clear();
  }

  private play(id: string, life: number, apply: Item['apply']): void {
    if (this.items.length >= MAX_ITEMS) this.art.release(this.items.shift()?.mesh);
    const mesh = this.art.acquire(id);
    if (!mesh) return;
    this.up = screenUp(this.scene);
    apply(mesh, 0);
    this.items.push({ mesh, age: 0, life, apply });
  }
}
