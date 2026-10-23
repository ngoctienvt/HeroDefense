import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { NHU_LAI as N } from '../../../content/new-divine-design.js';
import { billboardCenter, screenUp } from './visual-kit-billboard.js';
import { KitFlipbooks } from './visual-kit-flipbooks.js';
import { KitFxBank } from './visual-kit-fx-bank.js';
import type { KitPainted } from './visual-kit-painted.js';
import { IMPACT_ANCHOR_Y, IMPACT_FRAME_COUNT, IMPACT_SECONDS, IMPACT_SIZE, impactFrame } from './visual-nhu-lai-timeline.js';

type Impact = { mesh: Mesh; at: Vector3; age: number; scale: number; reduced: boolean };
const MAX_IMPACTS = 24;

/**
 * Ground-pressure hits: the palm-earth-impact sheet (stone imprint + rolling dust) with an earth/gold shock ring and
 * debris. Used at full size by the ultimate, small on the single basic-attack target; a gold flash on each shield recipient.
 */
export class NhuLaiAccents {
  readonly books: KitFlipbooks;
  readonly bank: KitFxBank;
  private impacts: Impact[] = [];

  constructor(private scene: Scene, private art: KitPainted) {
    this.books = new KitFlipbooks(scene);
    this.bank = new KitFxBank(scene, this.books);
  }

  prepare(): void { this.art.prepare('impact', '/assets/vfx-nhulai-impact.webp', { foreground: true }); }

  /** Palm hit: the full ultimate contact (scale 1, shock ring to the server radius) or a small one (basic attack). */
  impact(at: Vector3, scale: number, reduced: boolean): void {
    this.prepare();
    if (this.impacts.length < MAX_IMPACTS) {
      const mesh = this.art.acquire('impact');
      if (mesh) this.impacts.push({ mesh, at: at.clone(), age: 0, scale, reduced });
    }
    const full = scale >= .9;
    const radius = full ? N.skillRadius : 1.6 * scale;
    this.bank.ring(at, radius, 'earth', { life: full ? .6 : .4, fill: full ? .04 : .2, rim: 1, alpha: full ? .9 : .6, reduced, order: 6 });
    if (full) this.bank.ring(at, radius * .55, 'gold', { life: .45, hold: true, alpha: .55, reduced, order: 7 });
    if (reduced) return;
    this.bank.spray('earth').ring(at, full ? 1.2 : .3, full ? 44 : 12, full ? .5 : .3, full ? 5 : 2.4, full ? 6.5 : 3.2);
    this.bank.spray('gold').ring(at, full ? radius * .5 : .2, full ? 30 : 8, .3, full ? 3 : 1.6, full ? 5 : 2.6);
  }

  /** A shield lands on one ally: gold ring at their feet and sparks rising; the shell itself follows the snapshot. */
  shieldArrive(at: Vector3, reduced: boolean): void {
    this.bank.ring(at, 2.4, 'gold', { life: .4, fill: .1, rim: 1, alpha: .7, reduced });
    if (!reduced) this.bank.spray('gold').rise(at, 1.2, 10);
  }

  tick(dt: number, time: number): void {
    const up = screenUp(this.scene);
    for (let i = this.impacts.length - 1; i >= 0; i--) {
      const hit = this.impacts[i];
      hit.age += dt;
      if (hit.age >= IMPACT_SECONDS) { this.art.release(hit.mesh); this.impacts.splice(i, 1); continue; }
      const size = IMPACT_SIZE * hit.scale;
      hit.mesh.position.copyFrom(billboardCenter(hit.at, size, IMPACT_ANCHOR_Y, up));
      hit.mesh.scaling.setAll(size);
      this.art.frame(hit.mesh, Math.min(IMPACT_FRAME_COUNT - 1, impactFrame(hit.age, hit.reduced)), 4, 2);
    }
    this.bank.tick(dt, time);
  }

  clear(): void {
    for (const hit of this.impacts) this.art.release(hit.mesh);
    this.impacts.length = 0;
    this.bank.clear();
  }
}
